import type { Tone } from '@/components/ui'

/* Todos los datos salen de docs/research/vercel-2026-11.md (verificado el 2026-11-15). */

export const PRICE_DATE = '15-nov-2026'

/* -------------------------------------------------------------------------- */
/* Lab 1 · Mapa por capas                                                      */
/* -------------------------------------------------------------------------- */

export type LayerId = 'app' | 'sdk' | 'gateway' | 'platform'

export const LAYERS: { id: LayerId; title: string; blurb: string; tone: Tone }[] = [
  { id: 'app', title: 'Tu app', blurb: 'Lo que ve la persona: el chat dentro de tu producto.', tone: 'user' },
  { id: 'sdk', title: 'Tu código · AI SDK', blurb: 'El agente es TypeScript tuyo, en una ruta de tu servidor.', tone: 'model' },
  { id: 'gateway', title: 'Gateway', blurb: 'Un proxy de modelos entre tu código y los proveedores.', tone: 'accent' },
  { id: 'platform', title: 'Plataforma Vercel', blurb: 'Donde corre: cómputo, ejecución durable, aislamiento.', tone: 'system' },
]

export type Piece = {
  id: string
  layer: LayerId
  name: string
  tone: Tone
  what: string
  detail: string
  status: string
  since: string
  pkg?: string
  docs: string
  /** parada de esta línea donde se trabaja */
  lesson?: 'primer-agente' | 'interfaz' | 'produccion'
}

export const PIECES: Piece[] = [
  {
    id: 'ui',
    layer: 'app',
    name: 'AI SDK UI · useChat',
    tone: 'user',
    what: 'Hooks de chat para React, Vue, Svelte y Angular.',
    detail:
      'useChat hace POST a /api/chat y pinta la respuesta mientras llega. Cada mensaje trae parts ordenadas: texto, llamadas a tools con su estado, pasos. No guarda nada: el historial lo persistes tú.',
    status: 'Estable',
    since: 'Vigente en v7',
    pkg: '@ai-sdk/react@4.0.177',
    docs: 'https://ai-sdk.dev/docs/ai-sdk-ui/overview',
    lesson: 'interfaz',
  },
  {
    id: 'elements',
    layer: 'app',
    name: 'AI Elements',
    tone: 'user',
    what: 'Componentes React (sobre shadcn/ui) para interfaces de chat.',
    detail:
      'Piezas prearmadas como Message o MessageResponse. Ojo: la propia documentación avisa que se muda a shadcn/ui y que el paquete ai-elements queda deprecado a fines de noviembre de 2026; en proyectos nuevos se instala desde shadcn/ui.',
    status: 'Se muda a shadcn/ui',
    since: '2025-08-06',
    pkg: 'ai-elements@1.9.1',
    docs: 'https://elements.ai-sdk.dev',
    lesson: 'interfaz',
  },
  {
    id: 'chat-sdk',
    layer: 'app',
    name: 'Chat SDK',
    tone: 'user',
    what: 'Un solo código para bots en Slack, Teams, Google Chat, Discord, Telegram o WhatsApp.',
    detail:
      'Si tu "interfaz" no es una web sino un canal de mensajería, esta es la pieza. Es open source; el blog del 2026-03-19 lo presentó como beta pública (estado actual a confirmar en la documentación).',
    status: 'Open source · beta pública (mar-2026)',
    since: '2026-03-19',
    pkg: 'chat@4.45.0',
    docs: 'https://chat-sdk.dev',
  },
  {
    id: 'core',
    layer: 'sdk',
    name: 'AI SDK Core',
    tone: 'model',
    what: 'generateText, streamText, tools, salida estructurada, middleware y telemetría.',
    detail:
      'El paquete ai: la capa que llama al modelo y ejecuta tus tools. La versión 7 exige Node.js 22 o superior y es solo ESM. Todo lo demás del SDK se apoya aquí.',
    status: 'Estable · v7',
    since: '7.0.0 el 2026-06-25',
    pkg: 'ai@7.0.173',
    docs: 'https://ai-sdk.dev/docs/ai-sdk-core/overview',
    lesson: 'primer-agente',
  },
  {
    id: 'tla',
    layer: 'sdk',
    name: 'ToolLoopAgent',
    tone: 'model',
    what: 'La clase de agente recomendada: modelo + tools en un loop, en memoria.',
    detail:
      'Lo que en Google es LlmAgent de ADK. Corre entero dentro del proceso: si el proceso muere, se pierde el progreso. Por defecto corta a los 20 pasos. Se sirve a la interfaz con createAgentUIStreamResponse.',
    status: 'Estable',
    since: 'Vigente en v7',
    pkg: 'ai@7.0.173',
    docs: 'https://ai-sdk.dev/docs/agents/building-agents',
    lesson: 'primer-agente',
  },
  {
    id: 'wfa',
    layer: 'sdk',
    name: 'WorkflowAgent',
    tone: 'model',
    what: 'Agente durable que corre dentro de un workflow.',
    detail:
      'Reemplaza a DurableAgent. Las tools marcadas con "use step" son pasos con reintentos; el agente puede suspenderse esperando una aprobación y seguir días después. Requiere workflow@5.',
    status: 'Estable',
    since: 'AI SDK 7 (2026-06-25)',
    pkg: '@ai-sdk/workflow@2.0.105',
    docs: 'https://ai-sdk.dev/docs/agents/workflow-agent',
    lesson: 'produccion',
  },
  {
    id: 'harness',
    layer: 'sdk',
    name: 'HarnessAgent',
    tone: 'model',
    what: 'Corre un harness completo (Claude Code, Codex, Pi…) detrás de la API del AI SDK.',
    detail:
      'Usa un adaptador por harness y una sesión que es dueña del estado. Devuelve los mismos tipos que generateText y streamText. Los paquetes son experimentales: la documentación avisa que habrá cambios incompatibles.',
    status: 'Experimental',
    since: '2026-06-12',
    pkg: '@ai-sdk/harness@1.0.184',
    docs: 'https://ai-sdk.dev/docs/ai-sdk-harnesses/overview',
  },
  {
    id: 'mcp',
    layer: 'sdk',
    name: 'MCP · cliente y servidor',
    tone: 'tool',
    what: 'createMCPClient convierte tools de un servidor MCP en tools del AI SDK; mcp-handler crea un servidor MCP en una ruta de Next.js.',
    detail:
      'El cliente es liviano: descubre tools, recursos y prompts. Hay que cerrarlo al terminar. mcp-handler sirve para escribir tu propio servidor; no es un toolbox de bases de datos listo.',
    status: 'Disponible',
    since: 'mcp-handler 2.0.0 el 2026-07-29',
    pkg: '@ai-sdk/mcp@2.0.99 · mcp-handler@2.4.0',
    docs: 'https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools',
    lesson: 'primer-agente',
  },
  {
    id: 'wf-sdk',
    layer: 'sdk',
    name: 'Workflow SDK',
    tone: 'data',
    what: 'Funciones durables con las directivas "use workflow" y "use step". Open source.',
    detail:
      'Antes se llamaba Workflow DevKit. Escribes código async normal; el SDK lo reproduce desde un log de eventos, reintenta pasos y puede dormir días sin consumir cómputo. El mismo código corre en local, en Vercel o en otra infraestructura.',
    status: 'Estable',
    since: 'Beta 2025-10-23 · estable 2026-04-16',
    pkg: 'workflow@5.5.0',
    docs: 'https://workflow-sdk.dev',
    lesson: 'produccion',
  },
  {
    id: 'eve',
    layer: 'sdk',
    name: 'eve',
    tone: 'model',
    what: 'Framework open source "filesystem-first" para agentes backend durables, sobre el AI SDK.',
    detail:
      'Para cuando quieres el agente de producción completo (canales, cron, aprobaciones, memoria, eve eval) sin armar las piezas. En npm la versión latest es una release candidate; su estado formal está a confirmar en la documentación.',
    status: 'Release candidate en npm',
    since: '2026-06-17',
    pkg: 'eve@1.0.0-rc.18',
    docs: 'https://ai-sdk.dev/docs/agents/eve',
  },
  {
    id: 'gateway',
    layer: 'gateway',
    name: 'AI Gateway',
    tone: 'accent',
    what: 'API alojada que enruta a cientos de modelos con una sola credencial.',
    detail:
      'Vive en https://ai-gateway.vercel.sh. En el AI SDK es el proveedor por defecto: un string "proveedor/modelo" ya pasa por él. Hace ruteo, fallbacks, presupuestos y registro de costos. No hace falta desplegar en Vercel para usarlo. Es un proxy de modelos: no gobierna tools ni agentes.',
    status: 'GA · todos los planes',
    since: 'GA 2025-08-21',
    pkg: '@ai-sdk/gateway@4.0.146',
    docs: 'https://vercel.com/docs/ai-gateway',
    lesson: 'produccion',
  },
  {
    id: 'fluid',
    layer: 'platform',
    name: 'Fluid compute',
    tone: 'system',
    what: 'El modelo de cómputo de Vercel Functions: concurrencia dentro de la instancia y cobro de CPU solo cuando tu código ejecuta.',
    detail:
      'Un agente pasa casi todo su tiempo esperando al modelo. Con Active CPU ese tiempo de espera no cuenta como CPU (la memoria sí se cobra durante toda la vida de la instancia). La ruta del agente tiene un tope de duración: 300 s por defecto.',
    status: 'Por defecto en proyectos nuevos',
    since: '2025-04-23 · Active CPU 2025-06-25',
    docs: 'https://vercel.com/docs/fluid-compute',
    lesson: 'produccion',
  },
  {
    id: 'workflows',
    layer: 'platform',
    name: 'Vercel Workflows',
    tone: 'data',
    what: 'La infraestructura administrada que ejecuta el Workflow SDK.',
    detail:
      'Las Functions ejecutan el código, Vercel Queues encola y hay persistencia administrada. La duración de un run y de un sleep no tiene límite; cada paso individual sigue el límite de Vercel Functions.',
    status: 'GA',
    since: 'GA 2026-04-16',
    docs: 'https://vercel.com/docs/workflows',
    lesson: 'produccion',
  },
  {
    id: 'sandbox',
    layer: 'platform',
    name: 'Vercel Sandbox',
    tone: 'tool',
    what: 'microVMs aisladas para ejecutar código no confiable o generado por el agente.',
    detail:
      'Lo que en Google es Code Execution. Es un producto general de microVMs: creas el sandbox, corres comandos, lo detienes. La memoria se cobra aunque la CPU esté inactiva: detenlo al terminar.',
    status: 'GA',
    since: 'GA 2026-01-30',
    pkg: '@vercel/sandbox@4.0.0',
    docs: 'https://vercel.com/docs/vercel-sandbox',
    lesson: 'produccion',
  },
  {
    id: 'botid',
    layer: 'platform',
    name: 'BotID · Firewall',
    tone: 'guard',
    what: 'CAPTCHA invisible para la ruta del agente y rate limiting en el borde.',
    detail:
      'Protegen el endpoint, no el contenido: frenan bots y abuso de requests. No detectan prompt injection ni datos sensibles; eso lo construyes tú. Los contadores del rate limit son por región.',
    status: 'BotID GA · todos los planes',
    since: 'BotID GA 2025-06-25',
    pkg: 'botid@1.5.13',
    docs: 'https://vercel.com/docs/botid',
    lesson: 'produccion',
  },
  {
    id: 'obs',
    layer: 'platform',
    name: 'Observabilidad',
    tone: 'system',
    what: 'Logs, trazas y métricas de la plataforma, con pestaña propia para AI Gateway y para Workflows.',
    detail:
      'El AI SDK emite OpenTelemetry desde el paquete @ai-sdk/otel. El gateway registra cada request: modelo, intentos por proveedor, latencia, tokens y costo. Todo es exportable a terceros.',
    status: 'Todos los planes',
    since: 'Telemetría en @ai-sdk/otel desde v7',
    pkg: '@ai-sdk/otel@1.0.173',
    docs: 'https://vercel.com/docs/observability',
    lesson: 'produccion',
  },
]

/* -------------------------------------------------------------------------- */
/* Lab 2 · Lo traes tú                                                         */
/* -------------------------------------------------------------------------- */

export type Have = 'si' | 'parcial' | 'no'

export type Need = {
  id: string
  need: string
  tone: Tone
  vercel: { have: Have; piece: string; note: string }
  google: { have: Have; piece: string }
}

export const NEEDS: Need[] = [
  {
    id: 'framework',
    need: 'Un framework para el loop del agente',
    tone: 'model',
    vercel: { have: 'si', piece: 'AI SDK · ToolLoopAgent', note: 'Equivalentes en concepto. ADK es Python primero; el AI SDK es TypeScript.' },
    google: { have: 'si', piece: 'ADK · LlmAgent' },
  },
  {
    id: 'modelos',
    need: 'Acceso a modelos de varios proveedores',
    tone: 'model',
    vercel: { have: 'si', piece: 'AI Gateway + Marketplace', note: 'El gateway es multi-proveedor por diseño: cambiar de modelo es cambiar un string.' },
    google: { have: 'si', piece: 'Model Garden' },
  },
  {
    id: 'hosting',
    need: 'Hosting del agente',
    tone: 'system',
    vercel: { have: 'si', piece: 'Vercel Functions (Fluid) + Workflows', note: 'No hay un "runtime de agentes" único: una ruta HTTP para el loop corto y Workflows para lo durable.' },
    google: { have: 'si', piece: 'Agent Runtime' },
  },
  {
    id: 'durable',
    need: 'Flujos de varios pasos que sobreviven reinicios',
    tone: 'data',
    vercel: { have: 'si', piece: 'Workflow SDK + WorkflowAgent', note: 'Vercel usa código async normal con "use workflow" y "use step", no un grafo declarativo.' },
    google: { have: 'si', piece: 'ADK Workflows / grafos' },
  },
  {
    id: 'sandbox',
    need: 'Ejecutar código generado, aislado',
    tone: 'tool',
    vercel: { have: 'si', piece: 'Vercel Sandbox', note: 'Equivalente; Sandbox es un producto general de microVMs.' },
    google: { have: 'si', piece: 'Code Execution' },
  },
  {
    id: 'obs',
    need: 'Trazas y costos',
    tone: 'system',
    vercel: { have: 'si', piece: 'Observability + AI Gateway + OTel', note: 'Comparable, y exportable a terceros (Langfuse, Braintrust, Datadog…).' },
    google: { have: 'si', piece: 'Cloud Trace' },
  },
  {
    id: 'sesiones',
    need: 'Sesiones: guardar la conversación',
    tone: 'memory',
    vercel: { have: 'no', piece: 'Ninguno administrado', note: 'Guardas UIMessage[] en tu propia base (un Postgres o Redis del Marketplace) al terminar cada respuesta.' },
    google: { have: 'si', piece: 'Sessions (VertexAiSessionService)' },
  },
  {
    id: 'memoria',
    need: 'Memoria de largo plazo',
    tone: 'memory',
    vercel: { have: 'no', piece: 'Ninguno de primera parte', note: 'Proveedores externos (Mem0, Letta, Supermemory, Redis…) o una tool propia. eve sí trae memoria persistente.' },
    google: { have: 'si', piece: 'Memory Bank' },
  },
  {
    id: 'guardrails',
    need: 'Guardrails de contenido (injection, PII)',
    tone: 'guard',
    vercel: { have: 'no', piece: 'Ninguno de primera parte', note: 'Middleware propio con wrapLanguageModel, un modelo juez barato o un servicio externo. BotID y el WAF protegen el endpoint, no el contenido.' },
    google: { have: 'si', piece: 'Model Armor' },
  },
  {
    id: 'tool-gateway',
    need: 'Punto de control para tools y agentes',
    tone: 'guard',
    vercel: { have: 'no', piece: 'AI Gateway no es esto', note: 'Agent Gateway de Google gobierna tráfico de agentes y tools (MCP/A2A, deny por defecto). AI Gateway es un proxy de modelos. Lo más cercano aquí: Firewall/WAF, BotID y toolApproval.' },
    google: { have: 'si', piece: 'Agent Gateway' },
  },
  {
    id: 'identidad',
    need: 'Identidad propia por agente',
    tone: 'guard',
    vercel: { have: 'parcial', piece: 'OIDC del proyecto', note: 'El token OIDC identifica al proyecto o despliegue, no a cada agente. No hay IAM por agente.' },
    google: { have: 'si', piece: 'Agent Identity (SPIFFE, IAM)' },
  },
  {
    id: 'registro',
    need: 'Registro de agentes',
    tone: 'system',
    vercel: { have: 'no', piece: 'Ninguno', note: 'Vercel Connect cataloga conectores, pero no se verificó como registro de agentes.' },
    google: { have: 'si', piece: 'Agent Registry' },
  },
  {
    id: 'a2a',
    need: 'A2A: que otro agente le delegue tareas',
    tone: 'model',
    vercel: { have: 'no', piece: 'Sin soporte de primera parte', note: 'Solo un proveedor comunitario (a2a-ai-provider). eve permite llamar a otro despliegue de eve como sub-agente.' },
    google: { have: 'si', piece: 'A2A' },
  },
  {
    id: 'evals',
    need: 'Un framework de evaluación',
    tone: 'data',
    vercel: { have: 'no', piece: 'Ninguno en el AI SDK', note: 'El SDK trae mocks deterministas (ai/test) para pruebas unitarias; la evaluación la haces con integraciones externas, o con eve eval si usas eve.' },
    google: { have: 'si', piece: 'adk eval · Gen AI Evaluation Service' },
  },
  {
    id: 'app-empleados',
    need: 'Una app lista donde los empleados usan agentes',
    tone: 'user',
    vercel: { have: 'no', piece: 'Ninguno', note: 'Lo más parecido es llevar el agente a Slack o Teams con Chat SDK. Aquí la interfaz es tu producto.' },
    google: { have: 'si', piece: 'Gemini Enterprise' },
  },
]

/* -------------------------------------------------------------------------- */
/* Lab 4 · Modelos y precios (API v1/models de AI Gateway, 2026-11-15)          */
/* -------------------------------------------------------------------------- */

export type ModelRow = { id: string; input: number; output: number; context: string; role?: 'orquestador' | 'worker' | 'router' }

export const MODELS: ModelRow[] = [
  { id: 'anthropic/claude-fable-5.2', input: 8, output: 40, context: '1M' },
  { id: 'anthropic/claude-opus-5.5', input: 4, output: 20, context: '1M', role: 'orquestador' },
  { id: 'anthropic/claude-sonnet-5.5', input: 2, output: 10, context: '1M', role: 'orquestador' },
  { id: 'anthropic/claude-haiku-5.5', input: 0.1, output: 0.5, context: '1M', role: 'router' },
  { id: 'openai/gpt-6-astra', input: 10, output: 50, context: '1.05M' },
  { id: 'openai/gpt-6.1-sol', input: 2, output: 10, context: '1.05M' },
  { id: 'openai/gpt-6.1-terra', input: 1, output: 5, context: '1.05M', role: 'worker' },
  { id: 'openai/gpt-6-luna', input: 0.1, output: 0.5, context: '1.05M', role: 'router' },
  { id: 'google/gemini-4-argon', input: 2, output: 10, context: '1M' },
  { id: 'google/gemini-4-hydrogen', input: 1.5, output: 7.5, context: '1M' },
  { id: 'google/gemini-3.8-flash', input: 0.75, output: 3.75, context: '1M', role: 'worker' },
  { id: 'google/gemini-3.5-flash-lite', input: 0.3, output: 2.5, context: '1M' },
]

export const ROLE_NOTE: Record<NonNullable<ModelRow['role']>, string> = {
  orquestador: 'Orquestador: decide qué tools llamar y redacta la respuesta.',
  worker: 'Worker o sub-agente: tareas acotadas que delega el orquestador.',
  router: 'Router o clasificador barato: decide a dónde va cada mensaje.',
}

/* -------------------------------------------------------------------------- */
/* Código: tres formas de nombrar un modelo                                    */
/* -------------------------------------------------------------------------- */

export const MODEL_ID_CODE = `import { generateText, gateway, createGateway } from 'ai';
import { openai } from '@ai-sdk/openai';

// 1. Un string "proveedor/modelo" ya pasa por AI Gateway (proveedor por defecto)
await generateText({ model: 'anthropic/claude-sonnet-5.5', prompt });

// 2. Lo mismo, explícito
await generateText({ model: gateway('anthropic/claude-sonnet-5.5'), prompt });

// 3. Una instancia propia del gateway (otra key, otro equipo)
const andesGateway = createGateway({ apiKey: process.env.AI_GATEWAY_API_KEY });
await generateText({ model: andesGateway('openai/gpt-6.1-terra'), prompt });

// 4. Sin gateway: el proveedor directo (pnpm add @ai-sdk/openai)
await generateText({ model: openai('gpt-6-astra'), prompt });
`

/* -------------------------------------------------------------------------- */
/* Lab 5 · Decodificador v5/v6 → v7                                            */
/* -------------------------------------------------------------------------- */

export const OLD_CODE = `// app/api/chat/route.ts — estilo v5/v6: así lo verás en tutoriales
import { streamText, convertToModelMessages, tool, stepCountIs } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: 'anthropic/claude-sonnet-5.5',
    system: 'Eres Andi, el agente de operaciones de Andes Market.',
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      request_refund: tool({
        description: 'Solicita el reembolso de un pedido.',
        inputSchema: z.object({
          order_id: z.string(),
          amount_clp: z.number(),
          reason: z.string(),
        }),
        needsApproval: true,
        execute: async (input) => requestRefund(input),
      }),
    },
    experimental_telemetry: { isEnabled: true },
    onFinish: () => console.log('fin'),
  });

  return result.toUIMessageStreamResponse();
}
`

export const NEW_CODE = `// app/api/chat/route.ts — AI SDK 7
import {
  streamText, convertToModelMessages, tool, isStepCount,
  createUIMessageStreamResponse, toUIMessageStream,
} from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: 'anthropic/claude-sonnet-5.5',
    instructions: 'Eres Andi, el agente de operaciones de Andes Market.',
    messages: await convertToModelMessages(messages),
    stopWhen: isStepCount(5),
    tools: {
      request_refund: tool({
        description: 'Solicita el reembolso de un pedido.',
        inputSchema: z.object({
          order_id: z.string(),
          amount_clp: z.number(),
          reason: z.string(),
        }),
        execute: async (input) => requestRefund(input),
      }),
    },
    toolApproval: {
      request_refund: ({ amount_clp }) =>
        amount_clp > 50000 ? 'user-approval' : undefined,
    },
    telemetry: { functionId: 'andes-ops' },
    onEnd: () => console.log('fin'),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
`

export type Rename = {
  id: string
  before: string
  after: string
  note: string
  oldNeedles: string[]
  newNeedles: string[]
}

export const RENAMES: Rename[] = [
  {
    id: 'system',
    before: 'system',
    after: 'instructions',
    note: 'El prompt de sistema ahora se llama instructions, igual en generateText, streamText y ToolLoopAgent.',
    oldNeedles: ['system:'],
    newNeedles: ['instructions:'],
  },
  {
    id: 'await',
    before: 'convertToModelMessages()',
    after: 'await convertToModelMessages()',
    note: 'Es asíncrona desde AI SDK 6. Sin el await pasas una promesa como historial. Hasta la guía de despliegue oficial conserva el ejemplo sin await.',
    oldNeedles: ['messages: convertToModelMessages'],
    newNeedles: ['await convertToModelMessages'],
  },
  {
    id: 'steps',
    before: 'stepCountIs(n) · maxSteps',
    after: 'isStepCount(n)',
    note: 'El límite de pasos va en stopWhen. maxSteps es todavía más viejo. Recuerda el default: generateText y streamText paran tras un solo paso; ToolLoopAgent, tras 20.',
    oldNeedles: ['stepCountIs'],
    newNeedles: ['isStepCount'],
  },
  {
    id: 'approval',
    before: 'needsApproval',
    after: 'toolApproval',
    note: 'La política de aprobación sale de la tool y pasa a un mapa por tool: puede ser un estado fijo o una función que mira los argumentos. Aquí, solo los reembolsos sobre $50.000 CLP piden aprobación.',
    oldNeedles: ['needsApproval'],
    newNeedles: ['toolApproval', 'amount_clp }) =>', "'user-approval'"],
  },
  {
    id: 'telemetry',
    before: 'experimental_telemetry',
    after: 'telemetry',
    note: 'OpenTelemetry salió del paquete ai y vive en @ai-sdk/otel. Una vez registrada una integración con registerTelemetry, la telemetría queda activa por defecto: ya no hace falta isEnabled: true.',
    oldNeedles: ['experimental_telemetry'],
    newNeedles: ['telemetry:'],
  },
  {
    id: 'callbacks',
    before: 'onFinish · onStepFinish',
    after: 'onEnd · onStepEnd',
    note: 'Los callbacks de ciclo de vida se renombraron en pareja con onStart y onStepStart.',
    oldNeedles: ['onFinish'],
    newNeedles: ['onEnd'],
  },
  {
    id: 'stream',
    before: 'toUIMessageStreamResponse()',
    after: 'createUIMessageStreamResponse(…)',
    note: 'La respuesta para useChat se arma con dos funciones del paquete ai a partir de result.stream (que antes se llamaba fullStream).',
    oldNeedles: ['toUIMessageStreamResponse'],
    newNeedles: ['createUIMessageStreamResponse', 'toUIMessageStream'],
  },
]

/** Renombres que no caben en el ejemplo de código. */
export const OTHER_RENAMES: { before: string; after: string; note: string }[] = [
  { before: 'result.fullStream', after: 'result.stream', note: 'Todas las partes del stream de streamText.' },
  { before: 'parameters (en tool())', after: 'inputSchema', note: 'parameters es de v4.' },
  { before: 'totalUsage', after: 'usage', note: 'usage ya es el total de todos los pasos; el del último es finalStep.usage.' },
  { before: 'DurableAgent · workflow/ai', after: 'WorkflowAgent · @ai-sdk/workflow', note: 'Y con él, maxSteps → stopWhen.' },
  { before: 'Workflow DevKit · useworkflow.dev', after: 'Workflow SDK · workflow-sdk.dev', note: 'El producto administrado es Vercel Workflows.' },
  { before: 'require("ai") · Node 18/20', after: 'import · Node 22+', note: 'v7 es solo ESM.' },
]

/* -------------------------------------------------------------------------- */
/* Línea de tiempo                                                             */
/* -------------------------------------------------------------------------- */

export const TIMELINE: { date: string; what: string; major?: boolean }[] = [
  { date: '2025-04-23', what: 'Fluid compute por defecto en proyectos nuevos' },
  { date: '2025-07-31', what: 'AI SDK 5', major: true },
  { date: '2025-08-21', what: 'AI Gateway GA' },
  { date: '2025-10-23', what: 'Workflow Development Kit, beta pública' },
  { date: '2025-12-22', what: 'AI SDK 6', major: true },
  { date: '2026-01-30', what: 'Vercel Sandbox GA' },
  { date: '2026-04-16', what: 'Vercel Workflows GA' },
  { date: '2026-06-25', what: 'AI SDK 7: Node 22+, solo ESM, WorkflowAgent, toolApproval', major: true },
  { date: '2026-09-30', what: 'workflow@5.0.0' },
  { date: '2026-11-12', what: '@vercel/sandbox@4.0.0' },
]
