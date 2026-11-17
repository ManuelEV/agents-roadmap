import { blank, cmd, comment, dim, ok, out, warn, type TermLine } from '@/components/Terminal'
import { runTool } from '@/sim/andes'

/* Identificadores propios de la plataforma (ficticios, con la forma que usa la doc). */
export const PROJECT = 'andes-ops'
export const TEAM = 'andes-market'
export const RUN_ID = 'wrun_01KA7M2Q8ZC4'
export const HOOK_TOKEN = 'refund-4821'
export const FUNCTION_ID = 'andi-ops'
export const MODEL = 'anthropic/claude-sonnet-5.5'
/** Precio visto en la API v1/models de AI Gateway el 2026-11-15 (US$ por 1M tokens). */
export const MODEL_PRICE = { input: 2, output: 10 }

/* Resultados de negocio: los mismos que en las otras secciones. */
export const ORDER_RESULT = runTool('get_order_status', { order_id: '4821' })
export const REFUND_AMOUNT = 69990
export const REFUND_PENDING = runTool('request_refund', { order_id: '4821', amount_clp: REFUND_AMOUNT, reason: 'Pedido atrasado' })
/** Lo que devuelve el paso que ejecuta el reembolso una vez aprobado (misma forma que request_refund con éxito). */
export const REFUND_DONE = { status: 'success', refund_id: 'rf_20931', amount_clp: REFUND_AMOUNT }

/* -------------------------------------------------------------------------- */
/* Límites y precios (docs/research/vercel-2026-11.md, §6 y §7)                */
/* -------------------------------------------------------------------------- */
export type PlanId = 'hobby' | 'pro' | 'enterprise'
export const PLANS: Record<PlanId, { label: string; def: number; max: number; ext: number | null }> = {
  hobby: { label: 'Hobby', def: 300, max: 300, ext: null },
  pro: { label: 'Pro', def: 300, max: 800, ext: 1800 },
  enterprise: { label: 'Enterprise', def: 300, max: 800, ext: 1800 },
}
/** Fluid compute en iad1, plan Pro (US$). */
export const FLUID = { cpuHour: 0.128, gbHour: 0.0106 }
/** Vercel Workflows bajo demanda (US$). */
export const WORKFLOW_PRICE = { perKEvents: 0.02, eventsPerStep: 3 }

export const WAITS = [
  { s: 0, label: 'sin espera' },
  { s: 30, label: '30 s' },
  { s: 300, label: '5 min' },
  { s: 1200, label: '20 min' },
  { s: 3 * 3600, label: '3 horas' },
  { s: 86400, label: '1 día' },
  { s: 7 * 86400, label: '7 días' },
]

/* -------------------------------------------------------------------------- */
/* Código                                                                      */
/* -------------------------------------------------------------------------- */
export const CODE_WORKFLOW = `// workflows/refund.ts
import { defineHook, sleep } from 'workflow';

export const refundApproval = defineHook<{
  approved: boolean;
  supervisor: string;
}>();

export async function refundWorkflow(orderId: string, reason: string) {
  'use workflow';

  const order = await getOrderStatus(orderId);
  const request = await requestRefund(orderId, order.total_clp, reason);

  if (request.status === 'pending') {
    // se suspende aquí hasta que un supervisor responda
    const events = refundApproval.create({ token: \`refund-\${orderId}\` });
    for await (const event of events) {
      if (!event.approved) return { status: 'rejected' };
      break;
    }
  }

  const refund = await issueRefund(orderId, order.total_clp);

  await sleep('1 day'); // el banco tarda en abonar
  await notifyCustomer(orderId, refund.refund_id);
  return refund;
}

async function issueRefund(orderId: string, amountClp: number) {
  'use step'; // se graba; si falla, se reintenta
  return payments.refund({ orderId, amountClp });
}
// getOrderStatus, requestRefund y notifyCustomer: igual, con 'use step'
`

export const CODE_PLAIN = `// app/api/refund/route.ts — la misma lógica, sin workflow
export const maxDuration = 300;

export async function POST(req: Request) {
  const { orderId, reason } = await req.json();

  const order = await getOrderStatus(orderId);
  const request = await requestRefund(orderId, order.total_clp, reason);

  if (request.status === 'pending') {
    // la request queda abierta mientras alguien decide
    await waitForSupervisor(orderId); // ¿3 horas?
  }

  const refund = await issueRefund(orderId, order.total_clp);
  await notifyCustomer(orderId, refund.refund_id);
  return Response.json(refund);
}
`

export const CODE_START = `// app/api/refund/route.ts — iniciar el run
import { start } from 'workflow/api';
import { refundWorkflow } from '@/workflows/refund';

export async function POST(req: Request) {
  const { orderId, reason } = await req.json();
  const run = await start(refundWorkflow, [orderId, reason]);
  return Response.json({ started: true });
}

// app/api/refund/approve/route.ts — el supervisor responde
import { refundApproval } from '@/workflows/refund';

export async function POST(req: Request) {
  // autentica al supervisor aquí: el token del hook no es un permiso
  const { orderId, approved, supervisor } = await req.json();
  await refundApproval.resume(\`refund-\${orderId}\`, { approved, supervisor });
  return new Response('OK');
}
`

export const CODE_WORKFLOW_AGENT = `// workflow/andi.ts
import { WorkflowAgent, type ModelCallStreamPart } from '@ai-sdk/workflow';
import { convertToModelMessages, isStepCount, tool, type UIMessage } from 'ai';
import { getWritable } from 'workflow';
import { z } from 'zod';

export async function chat(messages: UIMessage[]) {
  'use workflow';

  const agent = new WorkflowAgent({
    model: 'anthropic/claude-sonnet-5.5',
    instructions: 'Eres Andi, el agente de operaciones de Andes Market.',
    stopWhen: isStepCount(8), // stream() no trae tope por defecto
    tools: {
      request_refund: tool({
        description: 'Solicita un reembolso de un pedido',
        inputSchema: z.object({
          order_id: z.string(),
          amount_clp: z.number(),
          reason: z.string(),
        }),
        needsApproval: true, // el workflow se suspende hasta la respuesta
        execute: requestRefundStep,
      }),
    },
  });

  const result = await agent.stream({
    messages: await convertToModelMessages(messages),
    writable: getWritable<ModelCallStreamPart>(),
  });

  return { messages: result.messages };
}

async function requestRefundStep(input: {
  order_id: string;
  amount_clp: number;
  reason: string;
}) {
  'use step'; // paso durable, con reintentos
  return refunds.request(input);
}
`

export const CODE_GUARD = `// lib/guarded-model.ts — boceto: los guardrails son código tuyo
import { gateway, wrapLanguageModel } from 'ai';
import type { LanguageModelV4Middleware } from '@ai-sdk/provider';

const inputGuard: LanguageModelV4Middleware = {
  specificationVersion: 'v4',
  transformParams: async ({ params }) => {
    if (looksLikeInjection(lastUserText(params))) {
      throw new Error('GUARD_INPUT_BLOCKED');
    }
    return params;
  },
};

const outputGuard: LanguageModelV4Middleware = {
  specificationVersion: 'v4',
  wrapGenerate: async ({ doGenerate }) => {
    const result = await doGenerate();
    return {
      ...result,
      content: result.content.map((part) =>
        part.type === 'text'
          ? { ...part, text: redactOtherCustomers(part.text) }
          : part,
      ),
    };
  },
  // wrapStream: acumula cada bloque hasta text-end y redacta el bloque completo
};

export const guardedModel = wrapLanguageModel({
  model: gateway('anthropic/claude-sonnet-5.5'),
  middleware: [inputGuard, outputGuard], // se aplican en orden
});
`

export const CODE_BOTID = `// app/api/chat/route.ts
import { checkBotId } from 'botid/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const verification = await checkBotId();

  if (verification.isBot) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }
  // ... autentica al usuario y llama al agente con guardedModel
}
`

export const CODE_TELEMETRY = `// instrumentation.ts
import { registerOTel } from '@vercel/otel';
import { registerTelemetry } from 'ai';
import { OpenTelemetry } from '@ai-sdk/otel';

export function register() {
  registerOTel({
    serviceName: 'andes-ops',
  });

  registerTelemetry(new OpenTelemetry({ agentSpanName: 'functionId' }));
}
`

export const codeTelemetryCall = (record: boolean) => `// en el agente o en la llamada
telemetry: {
  functionId: 'andi-ops',${record ? '' : '\n  recordInputs: false,\n  recordOutputs: false,'}
},
`

export const CODE_SANDBOX = `import { Sandbox } from '@vercel/sandbox';

const sandbox = await Sandbox.create({
  name: 'andi-report-4821',
  networkPolicy: 'deny-all', // el código generado no sale a internet
  timeout: 5 * 60 * 1000,    // 5 minutos (es el valor por defecto)
});

await sandbox.writeFiles([{ path: 'report.py', content: generatedCode }]);
const result = await sandbox.runCommand('python', ['report.py']);

console.log(result.exitCode);
console.log(await result.stdout());

await sandbox.stop(); // detenido cuesta $0
`

/* -------------------------------------------------------------------------- */
/* Terminal de despliegue                                                      */
/* -------------------------------------------------------------------------- */
export const TERM_DEPLOY: TermLine[] = [
  comment('CLI de Vercel e inicio de sesión'),
  cmd('npm i -g vercel'),
  dim('added vercel@65.16.0'),
  cmd('vercel login'),
  ok('Sesión iniciada.', 200),
  blank(),
  comment('Vincula la carpeta a un proyecto del equipo'),
  cmd('vercel link'),
  ok(`Vinculado a ${TEAM}/${PROJECT} (se creó .vercel/)`, 200),
  blank(),
  comment('Baja las variables y el token OIDC para trabajar en local'),
  cmd('vercel env pull'),
  ok('Creado .env.local'),
  dim('VERCEL_OIDC_TOKEN=eyJhbGciOi…   (válido 12 horas)'),
  cmd('openssl rand -base64 32'),
  dim('q7Vd…Zk8='),
  cmd('vercel env add TOOL_APPROVAL_SECRET --environment production'),
  ok('Variable TOOL_APPROVAL_SECRET agregada a Production'),
  cmd('vercel env list'),
  out('TOOL_APPROVAL_SECRET    Encrypted    Production'),
  warn('No hay AI_GATEWAY_API_KEY en el proyecto: el gateway se autentica con OIDC.'),
  blank(),
  comment('Preview: una URL por despliegue, para probar antes de publicar'),
  cmd('vercel deploy'),
  out('Building…', 500),
  ok(`Preview: https://${PROJECT}-9f3k2x1ab-${TEAM}.vercel.app`, 300),
  blank(),
  comment('Producción'),
  cmd('vercel deploy --prod'),
  out('Building…', 500),
  ok(`Production: https://${PROJECT}.vercel.app`, 300),
  blank(),
  comment('Verifica: logs de la función y runs del workflow'),
  cmd('vercel logs'),
  dim('POST /api/refund 200'),
  cmd('npx workflow inspect runs'),
  out(`${RUN_ID}   refundWorkflow   suspendido · esperando hook ${HOOK_TOKEN}`),
]

export const DEPLOY_PHASES = [
  { until: 'vercel link', label: 'CLI e inicio de sesión' },
  { until: 'vercel env pull', label: 'Proyecto vinculado' },
  { until: 'vercel deploy', label: 'Variables y OIDC' },
  { until: 'vercel deploy --prod', label: 'Preview' },
  { until: 'vercel logs', label: 'Producción' },
]
