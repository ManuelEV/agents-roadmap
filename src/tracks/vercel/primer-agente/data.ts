import { cmd, comment, dim, ok, out, type TermLine } from '@/components/Terminal'
import type { Tone } from '@/components/ui'
import { runTool } from '@/sim/andes'

/* Hechos (nombres, imports, opciones, ids de modelo, precios): docs/research/vercel-2026-11.md §2, §3 y §13.
   Respuestas del modelo, ids de tool call y conteos de tokens: simulados. */

export const MODEL_ID = 'anthropic/claude-sonnet-5.5'
export const QUESTION = '¿Dónde está mi pedido 4821?'
export const FINAL_TEXT =
  'Tu pedido 4821 (Zapatillas trekking Cordillera 41, $69.990) va en ruta con AndesExpress, seguimiento AX-88213-CL. La entrega estimada es el 14 de noviembre.'

/* ----------------------------- Lab 1 · anatomía ---------------------------- */

export const AGENT_CODE = `import { ToolLoopAgent, tool, isStepCount } from 'ai';
import { z } from 'zod';
import { ORDERS } from './orders';

export const andi = new ToolLoopAgent({
  model: 'anthropic/claude-sonnet-5.5',
  instructions:
    'Eres Andi, el agente de operaciones de Andes Market. ' +
    'Usa las herramientas para cualquier dato de pedidos. ' +
    'Nunca inventes números de pedido ni fechas.',
  tools: {
    getOrderStatus: tool({
      description:
        'Estado, transportista y fecha estimada de un pedido de ' +
        'Andes Market. Úsala cuando pregunten por un pedido concreto.',
      inputSchema: z.object({
        orderId: z.string().describe('Número del pedido, por ejemplo "4821"'),
      }),
      execute: async ({ orderId }) => {
        const order = ORDERS[orderId.trim()];
        if (!order) {
          return { status: 'error', error_message: \`No existe el pedido \${orderId}.\` };
        }
        return { status: 'success', ...order };
      },
    }),
  },
  stopWhen: isStepCount(5),
});

const result = await andi.generate({
  prompt: '¿Dónde está mi pedido 4821?',
});

for (const step of result.steps) {
  console.log(step.finishReason, step.toolCalls.map((c) => c.toolName));
}
console.log(result.text);
`

export type AnatomyPart = { id: string; label: string; desc: string; needles: string[]; tone: Tone }
export const ANATOMY: AnatomyPart[] = [
  {
    id: 'class',
    label: 'new ToolLoopAgent({ … })',
    desc: 'La clase de agente del paquete ai: modelo + tools en loop, todo en memoria. Acepta los mismos ajustes que generateText y streamText.',
    needles: ["import { ToolLoopAgent, tool, isStepCount } from 'ai';", 'export const andi = new ToolLoopAgent({'],
    tone: 'model',
  },
  {
    id: 'model',
    label: 'model',
    desc: 'Un string "proveedor/modelo". AI Gateway es el proveedor por defecto del SDK: con solo el string, la llamada ya pasa por el gateway.',
    needles: ["model: 'anthropic/claude-sonnet-5.5'"],
    tone: 'model',
  },
  {
    id: 'instructions',
    label: 'instructions',
    desc: 'El prompt de sistema: persona y reglas. En versiones anteriores del SDK se llamaba system; en v7 es instructions.',
    needles: ['instructions:', "'Eres Andi", "'Usa las herramientas", "'Nunca inventes"],
    tone: 'user',
  },
  {
    id: 'tools',
    label: 'tools: { getOrderStatus }',
    desc: 'Un objeto, no una lista: la clave es el nombre que ve el modelo y el que aparece luego en toolName. Cada valor se crea con tool().',
    needles: ['tools: {', 'getOrderStatus: tool({'],
    tone: 'tool',
  },
  {
    id: 'description',
    label: 'description',
    desc: 'Lo que el modelo lee para decidir si llama la tool. Escríbela para él: qué devuelve y cuándo usarla.',
    needles: ['description:', "'Estado, transportista", "'Andes Market. Úsala"],
    tone: 'tool',
  },
  {
    id: 'schema',
    label: 'inputSchema',
    desc: 'Un esquema Zod (o JSON Schema). Hace dos trabajos: se convierte en la definición que recibe el modelo y tipa el argumento de execute.',
    needles: ['inputSchema: z.object({', 'orderId: z.string()', "import { z } from 'zod';"],
    tone: 'data',
  },
  {
    id: 'execute',
    label: 'execute',
    desc: 'Tu código. Recibe el input ya tipado y devuelve un objeto serializable. Un pedido inexistente se devuelve como dato (status "error"), para que el modelo lo lea y responda.',
    needles: ['execute: async ({ orderId })', 'const order = ORDERS', 'if (!order)', "return { status: 'error'", "return { status: 'success'"],
    tone: 'tool',
  },
  {
    id: 'stop',
    label: 'stopWhen',
    desc: 'El tope del loop. Sin esta línea, ToolLoopAgent usa isStepCount(20). Poner un número explícito es la primera defensa contra un loop caro.',
    needles: ['stopWhen: isStepCount(5)'],
    tone: 'guard',
  },
  {
    id: 'generate',
    label: 'andi.generate() → result',
    desc: 'Corre el loop completo y devuelve el resultado: text es la respuesta del último paso y steps el detalle de cada paso.',
    needles: ['const result = await andi.generate({', "prompt: '¿Dónde está mi pedido 4821?'", 'for (const step of result.steps)', 'console.log(step.finishReason', 'console.log(result.text)'],
    tone: 'system',
  },
]

/* ----------------------- Lab 2 · lo que recibe el modelo ------------------- */

export type SchemaOpts = { describe: boolean; optional: boolean; strict: boolean }

const DESCRIBE_TEXT = 'Número del pedido, por ejemplo "4821"'
const TOOL_DESC = 'Estado, transportista y fecha estimada de un pedido de Andes Market. Úsala cuando pregunten por un pedido concreto.'

export function toolSource(o: SchemaOpts): string {
  let field = 'z.string()'
  if (o.strict) field += '.regex(/^\\d{4}$/)'
  if (o.optional) field += '.optional()'
  const fieldLines = o.describe
    ? [`    orderId: ${field}`, `      .describe('${DESCRIBE_TEXT}'),`]
    : [`    orderId: ${field},`]
  return [
    'getOrderStatus: tool({',
    '  description:',
    "    'Estado, transportista y fecha estimada de un pedido de ' +",
    "    'Andes Market. Úsala cuando pregunten por un pedido concreto.',",
    '  inputSchema: z.object({',
    ...fieldLines,
    '  }),',
    '  execute: async ({ orderId }) => { /* … */ },',
    '}),',
  ].join('\n')
}

export function toolDefinition(o: SchemaOpts) {
  const prop: Record<string, string> = { type: 'string' }
  if (o.strict) prop.pattern = '^\\d{4}$'
  if (o.describe) prop.description = DESCRIBE_TEXT
  return {
    name: 'getOrderStatus',
    description: TOOL_DESC,
    inputSchema: {
      type: 'object',
      properties: { orderId: prop },
      required: o.optional ? [] : ['orderId'],
    },
  }
}

export type ModelInput = { id: string; label: string; raw: string; value: Record<string, unknown> }
export const MODEL_INPUTS: ModelInput[] = [
  { id: 'ok', label: '"4821"', raw: '{ "orderId": "4821" }', value: { orderId: '4821' } },
  { id: 'num', label: '4821 (número)', raw: '{ "orderId": 4821 }', value: { orderId: 4821 } },
  { id: 'text', label: '"pedido 4821"', raw: '{ "orderId": "pedido 4821" }', value: { orderId: 'pedido 4821' } },
  { id: 'empty', label: '{ } vacío', raw: '{ }', value: {} },
]

export type Validation = { ok: boolean; issue?: string; output?: Record<string, unknown> }
export function validateInput(o: SchemaOpts, input: Record<string, unknown>): Validation {
  const v = input.orderId
  if (v === undefined) {
    if (!o.optional) return { ok: false, issue: 'orderId: se esperaba string, llegó undefined' }
  } else if (typeof v !== 'string') {
    return { ok: false, issue: `orderId: se esperaba string, llegó ${typeof v}` }
  } else if (o.strict && !/^\d{4}$/.test(v)) {
    return { ok: false, issue: 'orderId: el string no cumple el patrón /^\\d{4}$/' }
  }
  return { ok: true, output: runTool('get_order_status', { order_id: v === undefined ? 'undefined' : String(v).trim() }) }
}

/* -------------------------- Lab 3 · una corrida ---------------------------- */

export const CALL_ID = 'call_Zt41aQ'
export const ORDER_OUTPUT = runTool('get_order_status', { order_id: '4821' })

export type RunStep = {
  title: string
  body: string
  flows: string[]
  /** 0 oculto · 1 llamada en curso · 2 con toolCalls · 3 con toolResults */
  s0: 0 | 1 | 2 | 3
  /** 0 oculto · 1 llamada en curso · 2 con texto */
  s1: 0 | 1 | 2
  typing: boolean
  answer: boolean
  /** nota corta sobre la decisión del loop */
  loop: string
  loopTone: Tone
}

export const RUN_STEPS: RunStep[] = [
  {
    title: 'andi.generate({ prompt })',
    body: 'Tu código llama al agente con la pregunta de Camila. Todavía no hay pasos: result.steps empieza vacío y el loop arranca.',
    flows: ['user>agent'],
    s0: 0,
    s1: 0,
    typing: true,
    answer: false,
    loop: 'loop iniciado · 0 pasos',
    loopTone: 'system',
  },
  {
    title: 'Paso 1: la llamada sale al gateway',
    body: 'El SDK arma la petición: instructions, el mensaje del usuario y la definición de getOrderStatus (nombre, description y el JSON Schema del input). El string del modelo la enruta por AI Gateway hasta Anthropic.',
    flows: ['agent>gateway', 'gateway>model'],
    s0: 1,
    s1: 0,
    typing: true,
    answer: false,
    loop: 'paso 1 en curso',
    loopTone: 'model',
  },
  {
    title: 'El modelo responde con una tool call',
    body: 'No vuelve texto: vuelve { toolCallId, toolName, input }. El finishReason del paso es "tool-calls", la señal de que el loop tiene trabajo pendiente.',
    flows: ['model>gateway', 'gateway>agent'],
    s0: 2,
    s1: 0,
    typing: true,
    answer: false,
    loop: 'finishReason: tool-calls',
    loopTone: 'tool',
  },
  {
    title: 'El SDK valida el input y corre execute',
    body: 'El input se comprueba contra inputSchema: orderId es un string, pasa. Recién entonces el SDK llama a tu función con { orderId: "4821" }, ya tipado.',
    flows: ['agent>tool'],
    s0: 2,
    s1: 0,
    typing: true,
    answer: false,
    loop: 'inputSchema ✓ → execute',
    loopTone: 'tool',
  },
  {
    title: 'El resultado cierra el paso 1',
    body: 'Lo que devolvió execute queda en steps[0].toolResults con el mismo toolCallId. Como el paso tiene resultados de tools, ahora se evalúa stopWhen: va 1 paso de 5, el loop sigue.',
    flows: ['tool>agent'],
    s0: 3,
    s1: 0,
    typing: true,
    answer: false,
    loop: 'stopWhen: isStepCount(5) → 1 de 5, sigue',
    loopTone: 'guard',
  },
  {
    title: 'Paso 2: otra llamada, ahora con el resultado',
    body: 'El SDK vuelve a llamar al modelo con todo el historial: la pregunta, la tool call y el tool-result. Por eso los tokens de entrada suben respecto del paso 1.',
    flows: ['agent>gateway', 'gateway>model'],
    s0: 3,
    s1: 1,
    typing: true,
    answer: false,
    loop: 'paso 2 en curso',
    loopTone: 'model',
  },
  {
    title: 'El modelo redacta y el loop termina',
    body: 'Esta vez vuelve texto y finishReason "stop". Un paso sin tool calls termina el loop por sí solo: stopWhen ni siquiera se evalúa.',
    flows: ['model>gateway', 'gateway>agent'],
    s0: 3,
    s1: 2,
    typing: true,
    answer: false,
    loop: 'finishReason: stop → fin del loop',
    loopTone: 'ok',
  },
  {
    title: 'result.text llega a Camila',
    body: 'generate() resuelve. result.text es el texto del último paso; result.steps tiene los 2 pasos; result.toolCalls y result.toolResults juntan los de todos los pasos y result.usage suma los tokens.',
    flows: ['agent>user'],
    s0: 3,
    s1: 2,
    typing: false,
    answer: true,
    loop: 'result.steps.length = 2',
    loopTone: 'ok',
  },
]

export const STEP_USAGE = [
  { inputTokens: 618, outputTokens: 21, totalTokens: 639 },
  { inputTokens: 724, outputTokens: 58, totalTokens: 782 },
]

/* ------------------------- Lab 4 · control del loop ------------------------ */

export const MULTI_QUESTION = '¿Dónde está mi pedido 4821 y hay stock de la mochila azul?'
export const MULTI_ANSWER =
  'Tu pedido 4821 está en reparto en Valparaíso con AndesExpress (AX-88213-CL); la entrega estimada es el 14 de noviembre. La Mochila 30L azul está sin stock en Santiago: la reposición llega el 18 de noviembre.'

export type PlanStep = {
  tool?: string
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  text?: string
  inTok: number
  outTok: number
}
export const PLAN: PlanStep[] = [
  { tool: 'getOrderStatus', input: { orderId: '4821' }, output: runTool('get_order_status', { order_id: '4821' }), inTok: 702, outTok: 21 },
  { tool: 'trackShipment', input: { tracking: 'AX-88213-CL' }, output: runTool('track_shipment', { tracking: 'AX-88213-CL' }), inTok: 811, outTok: 24 },
  { tool: 'getStock', input: { sku: 'MOCH-30L-AZ' }, output: runTool('get_stock', { sku: 'MOCH-30L-AZ' }), inTok: 902, outTok: 22 },
  { text: MULTI_ANSWER, inTok: 1006, outTok: 71 },
]

export type LoopOutcome = {
  ran: number
  reason: 'finished' | 'stepCount' | 'hasToolCall'
  text: string
  finishReason: string
  inTok: number
  outTok: number
  toolResults: number
}
export function simulateLoop(limit: number, stopOnStock: boolean): LoopOutcome {
  let ran = 0
  let reason: LoopOutcome['reason'] = 'finished'
  for (const s of PLAN) {
    ran++
    if (!s.tool) break
    // stopWhen solo se evalúa cuando el último paso tiene resultados de tools
    if (stopOnStock && s.tool === 'getStock') {
      reason = 'hasToolCall'
      break
    }
    if (ran >= limit) {
      reason = 'stepCount'
      break
    }
  }
  const done = PLAN.slice(0, ran)
  const last = done[done.length - 1]
  return {
    ran,
    reason,
    text: last.text ?? '',
    finishReason: last.tool ? 'tool-calls' : 'stop',
    inTok: done.reduce((a, s) => a + s.inTok, 0),
    outTok: done.reduce((a, s) => a + s.outTok, 0),
    toolResults: done.filter((s) => s.tool).length,
  }
}

export const PREPARE_STEP_CODE = `const andi = new ToolLoopAgent({
  model: 'anthropic/claude-sonnet-5.5',
  tools: { getOrderStatus, trackShipment, getStock },
  stopWhen: [isStepCount(5), hasToolCall('getStock')],
  // corre antes de cada paso; lo que devuelve aplica a ese paso
  prepareStep: ({ steps }) =>
    steps.length === 0
      ? { activeTools: ['getOrderStatus'] }
      : { model: 'anthropic/claude-haiku-5.5' },
});
`

/* --------------------------- Lab 5 · cambiar modelo ------------------------ */

/* US$ por 1M de tokens, API v1/models de AI Gateway, 2026-11-15. */
export const PRICE_DATE = '15-nov-2026'
export const MODELS = [
  { id: 'anthropic/claude-sonnet-5.5', input: 2.0, output: 10.0, role: 'el que usa la documentación del AI SDK en casi todos sus ejemplos' },
  { id: 'openai/gpt-6.1-terra', input: 1.0, output: 5.0, role: 'buena opción para un worker o sub-agente' },
  { id: 'google/gemini-3.8-flash', input: 0.75, output: 3.75, role: 'otra opción para un worker' },
  { id: 'anthropic/claude-haiku-5.5', input: 0.1, output: 0.5, role: 'barato para ejercicios, routers y clasificadores' },
]

/* ------------------------------ Lab 6 · terminal --------------------------- */

export const TERM_SETUP: TermLine[] = [
  comment('AI SDK 7 exige Node.js 22 o superior y es solo ESM'),
  cmd('node --version'),
  out('v24.11.0'),
  cmd('mkdir andi-agent && cd andi-agent'),
  cmd('pnpm init'),
  dim('Wrote to andi-agent/package.json'),
  comment('en package.json agrega  "type": "module"'),
  cmd('pnpm add ai zod dotenv'),
  out('dependencies:'),
  ok('+ ai 7.0.173'),
  ok('+ zod 4.6.7'),
  ok('+ dotenv'),
  cmd('pnpm add -D @types/node tsx typescript'),
  out('devDependencies:'),
  ok('+ @types/node'),
  ok('+ tsx'),
  ok('+ typescript', 300),
  comment('.env.local  →  AI_GATEWAY_API_KEY=xxxxxxxxx'),
  cmd('pnpm tsx andi.ts', 900),
  out("tool-calls [ 'getOrderStatus' ]"),
  out('stop []', 300),
  ok(FINAL_TEXT),
]

/* ------------------------------- MCP --------------------------------------- */

export const MCP_CODE = `import { ToolLoopAgent, isStepCount } from 'ai';
import { createMCPClient } from '@ai-sdk/mcp';

const mcpClient = await createMCPClient({
  transport: {
    type: 'http',
    url: 'https://erp.andesmarket.example/mcp',
    headers: { Authorization: 'Bearer my-api-key' },
  },
});

try {
  const erpTools = await mcpClient.tools();

  const andi = new ToolLoopAgent({
    model: 'anthropic/claude-sonnet-5.5',
    tools: { ...erpTools, getOrderStatus },
    stopWhen: isStepCount(5),
  });

  const result = await andi.generate({
    prompt: '¿Hay stock de la mochila azul?',
  });
  console.log(result.text);
} finally {
  await mcpClient.close();
}
`

export type McpPart = { id: string; label: string; desc: string; needles: string[] }
export const MCP_PARTS: McpPart[] = [
  {
    id: 'client',
    label: 'createMCPClient',
    desc: 'Viene de @ai-sdk/mcp, un paquete aparte. Es un cliente liviano: su trabajo es convertir las tools de un servidor MCP en tools del AI SDK.',
    needles: ["import { createMCPClient } from '@ai-sdk/mcp';", 'const mcpClient = await createMCPClient({'],
  },
  {
    id: 'transport',
    label: 'transport',
    desc: 'http es el recomendado en producción; también existe sse. stdio queda solo para servidores locales. En v7 el transporte ya no sigue redirecciones por defecto (redirect: "error").',
    needles: ['transport: {', "type: 'http',", 'url:', 'headers:'],
  },
  {
    id: 'tools',
    label: 'mcpClient.tools()',
    desc: 'Descubre todas las tools del servidor. Si pasas schemas con inputSchema y outputSchema por nombre, carga solo las declaradas y con tipos.',
    needles: ['const erpTools = await mcpClient.tools();'],
  },
  {
    id: 'mix',
    label: 'tools: { ...erpTools, getOrderStatus }',
    desc: 'Para el agente son tools como cualquier otra: conviven con las que definiste con tool() y entran al mismo loop, con el mismo stopWhen.',
    needles: ['tools: { ...erpTools, getOrderStatus },'],
  },
  {
    id: 'close',
    label: 'mcpClient.close()',
    desc: 'Cierra siempre el cliente, con try/finally o en el callback onEnd. Dejarlo abierto es uno de los errores comunes.',
    needles: ['try {', '} finally {', 'await mcpClient.close();'],
  },
]
