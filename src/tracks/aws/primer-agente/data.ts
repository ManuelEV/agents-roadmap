import { cmd, comment, dim, ok, out, type TermLine } from '@/components/Terminal'
import type { Tone } from '@/components/ui'
import { runTool } from '@/sim/andes'

/* Todo lo que aparece aquí (imports, clases, claves de eventos, ids de modelo, precios)
   sale de docs/research/aws-2026-11.md, secciones 2, 3 y 11. */

export const QUESTION = '¿Dónde está mi pedido 4821?'
export const FINAL_TEXT =
  'Tu pedido 4821 (Zapatillas trekking Cordillera 41, $69.990) va en ruta con AndesExpress, seguimiento AX-88213-CL. La entrega estimada es el 14 de noviembre.'
export const MODEL_ID = 'global.anthropic.claude-sonnet-5-5'
export const REGION = 'us-east-1'

/* -------------------------------------------------------------------------- */
/* Lab 1 · el archivo completo                                                 */
/* -------------------------------------------------------------------------- */

export const AGENT_CODE = `from strands import Agent, tool
from strands.models import BedrockModel

# En producción esto es tu API de pedidos; aquí, un dict.
ORDERS = {
    "4821": {
        "state": "en_ruta",
        "items": ["1× Zapatillas trekking Cordillera 41"],
        "total_clp": 69990,
        "carrier": "AndesExpress",
        "tracking": "AX-88213-CL",
        "eta": "2026-11-14",
    },
}

SYSTEM_PROMPT = """Eres Andi, el agente de operaciones de Andes Market (retail online en Chile).
Usa las herramientas para cualquier dato de pedidos. Nunca inventes números ni fechas.
Responde en español neutro, breve y concreto. Formatea montos como $69.990."""


@tool
def get_order_status(order_id: str) -> dict:
    """Devuelve el estado, los ítems y el seguimiento de un pedido de Andes Market.

    Úsala cuando el usuario pregunte por un pedido concreto.

    Args:
        order_id (str): Número del pedido, por ejemplo "4821"

    Returns:
        dict: status "success" con los datos del pedido, o status "error" con error_message
    """
    order = ORDERS.get(order_id.strip())
    if order is None:
        return {"status": "error", "error_message": f"No existe el pedido {order_id}."}
    return {"status": "success", "order_id": order_id, **order}


model = BedrockModel(
    model_id="${MODEL_ID}",
    region_name="${REGION}",
)

agent = Agent(
    model=model,
    system_prompt=SYSTEM_PROMPT,
    tools=[get_order_status],
)

if __name__ == "__main__":
    result = agent("${QUESTION}")
    print(f"\\n[stop_reason] {result.stop_reason}")
`

export type AnatomyPart = { id: string; label: string; desc: string; needles: string[]; tone: Tone }
export const ANATOMY: AnatomyPart[] = [
  {
    id: 'import',
    label: 'from strands import Agent, tool',
    desc: 'Todo el SDK que necesitas hoy: la clase Agent y el decorador tool. El paquete se llama strands-agents; el módulo, strands.',
    needles: ['from strands import Agent, tool', 'from strands.models import BedrockModel'],
    tone: 'system',
  },
  {
    id: 'tool',
    label: '@tool',
    desc: 'Convierte una función Python normal en una herramienta. No escribes ningún esquema: Strands lo arma a partir de la función.',
    needles: ['@tool', 'def get_order_status'],
    tone: 'tool',
  },
  {
    id: 'hints',
    label: 'order_id: str',
    desc: 'Los type hints le dicen al modelo qué parámetros existen y de qué tipo. Es la mitad de lo que el modelo lee de tu función.',
    needles: ['def get_order_status(order_id: str)'],
    tone: 'tool',
  },
  {
    id: 'doc',
    label: 'docstring',
    desc: 'La otra mitad: qué hace la herramienta, cuándo usarla y qué significa cada argumento (sección Args). Se escribe para el modelo, no para tu equipo.',
    needles: ['"""Devuelve', 'Úsala cuando', 'Args:', 'order_id (str):', 'Returns:', 'dict: status', '    """'],
    tone: 'tool',
  },
  {
    id: 'return',
    label: 'return {...}',
    desc: 'Lo que devuelves es lo que el modelo lee como resultado. Un pedido que no existe es un resultado más: devuelve un mensaje claro y deja que el modelo decida qué decir.',
    needles: ['"status": "error"', '"status": "success"'],
    tone: 'data',
  },
  {
    id: 'model',
    label: 'BedrockModel(model_id, region_name)',
    desc: 'Qué modelo y en qué región. El id lleva el prefijo del perfil de inferencia (global.). Si no pasas model, Strands usa Claude Sonnet 4.6 en us-west-2.',
    needles: ['model = BedrockModel(', 'model_id=', 'region_name=', 'model=model'],
    tone: 'model',
  },
  {
    id: 'prompt',
    label: 'system_prompt',
    desc: 'Persona y reglas de Andi. Viaja en cada llamada al modelo junto con el historial y las herramientas.',
    needles: ['SYSTEM_PROMPT = """', 'Usa las herramientas', 'Responde en español', 'system_prompt=SYSTEM_PROMPT'],
    tone: 'user',
  },
  {
    id: 'tools',
    label: 'tools=[get_order_status]',
    desc: 'La lista de herramientas que el modelo puede pedir. Aquí va la función decorada; en la próxima parada, también clientes MCP.',
    needles: ['tools=[get_order_status]'],
    tone: 'tool',
  },
  {
    id: 'call',
    label: 'agent("…") → AgentResult',
    desc: 'El agente se invoca como una función. Devuelve un AgentResult con el mensaje final, el stop_reason, métricas y trazas. Mientras corre, el texto se imprime en consola.',
    needles: ['result = agent(', 'result.stop_reason'],
    tone: 'accent',
  },
]

/* -------------------------------------------------------------------------- */
/* Lab 2 · de la función al tool spec                                          */
/* -------------------------------------------------------------------------- */

export type SpecOpts = { doc: 'full' | 'vague'; args: boolean; hint: 'str' | 'int' }

const DOC_FULL = ['Devuelve el estado, los ítems y el seguimiento de un pedido de Andes Market.', '', 'Úsala cuando el usuario pregunte por un pedido concreto.']
const DOC_VAGUE = ['Obtiene un pedido.']
const ARG_DESC: Record<SpecOpts['hint'], string> = {
  str: 'Número del pedido, por ejemplo "4821"',
  int: 'Número del pedido, por ejemplo 4821',
}

export function buildFunction(o: SpecOpts): string {
  const lines = [`@tool`, `def get_order_status(order_id: ${o.hint}) -> dict:`]
  const doc = o.doc === 'full' ? DOC_FULL : DOC_VAGUE
  if (!o.args && doc.length === 1) {
    lines.push(`    """${doc[0]}"""`)
  } else {
    lines.push(`    """${doc[0]}`)
    for (const l of doc.slice(1)) lines.push(l ? `    ${l}` : '')
    if (o.args) {
      lines.push('', '    Args:', `        order_id (${o.hint}): ${ARG_DESC[o.hint]}`)
    }
    lines.push('    """')
  }
  lines.push('    order = ORDERS.get(order_id.strip())', '    ...')
  return lines.join('\n')
}

export function buildSpec(o: SpecOpts): Record<string, unknown> {
  const prop: Record<string, string> = { type: o.hint === 'str' ? 'string' : 'integer' }
  if (o.args) prop.description = ARG_DESC[o.hint]
  return {
    name: 'get_order_status',
    description: (o.doc === 'full' ? DOC_FULL : DOC_VAGUE).filter(Boolean).join(' '),
    parameters: { type: 'object', properties: { order_id: prop } },
  }
}

export const toolInput = (o: SpecOpts) => (o.hint === 'str' ? '{"order_id": "4821"}' : '{"order_id": 4821}')

/* -------------------------------------------------------------------------- */
/* Lab 3 · una invocación paso a paso                                          */
/* -------------------------------------------------------------------------- */

const TOOL_USE_ID = 'tooluse_Kq3vZ8'
export const TOOL_RESULT = runTool('get_order_status', { order_id: '4821' })
export const CHUNKS = ['Tu pedido 4821 ', '(Zapatillas trekking ', 'Cordillera 41, $69.990) ', 'va en ruta con AndesExpress, ', 'seguimiento AX-88213-CL. ', 'La entrega estimada es ', 'el 14 de noviembre.']

export type RunEvent = {
  id: string
  tone: Tone
  /** de dónde sale: una entrada de agent.messages o una clave del stream */
  source: 'messages' | 'stream'
  head: string
  tag?: string
  text?: string
  block?: { label: string; tone: Tone; code: string }
  chunks?: string[]
}

export const RUN_EVENTS: RunEvent[] = [
  { id: 'm0', tone: 'user', source: 'messages', head: 'agent.messages[0] · usuario', block: { label: 'content[0]', tone: 'user', code: JSON.stringify({ text: QUESTION }) } },
  {
    id: 's1',
    tone: 'tool',
    source: 'stream',
    head: 'evento del stream · current_tool_use',
    block: { label: 'event["current_tool_use"]', tone: 'tool', code: JSON.stringify({ toolUseId: TOOL_USE_ID, name: 'get_order_status', input: { order_id: '4821' } }) },
  },
  {
    id: 'm1',
    tone: 'model',
    source: 'messages',
    head: 'agent.messages[1] · modelo',
    tag: 'stop_reason: tool_use',
    block: { label: 'content[0] · toolUse', tone: 'tool', code: JSON.stringify({ toolUse: { toolUseId: TOOL_USE_ID, name: 'get_order_status', input: { order_id: '4821' } } }) },
  },
  {
    id: 'm2',
    tone: 'data',
    source: 'messages',
    head: 'agent.messages[2] · resultado de la herramienta',
    block: { label: 'content[0] · toolResult', tone: 'data', code: JSON.stringify({ toolResult: { toolUseId: TOOL_USE_ID, content: TOOL_RESULT } }) },
  },
  { id: 's2', tone: 'model', source: 'stream', head: `evento del stream · data × ${CHUNKS.length}`, chunks: CHUNKS },
  {
    id: 'm3',
    tone: 'model',
    source: 'messages',
    head: 'agent.messages[3] · modelo',
    tag: 'stop_reason: end_turn',
    block: { label: 'content[0]', tone: 'model', code: JSON.stringify({ text: FINAL_TEXT }) },
  },
  {
    id: 's3',
    tone: 'ok',
    source: 'stream',
    head: 'evento del stream · result',
    block: { label: 'event["result"] → AgentResult', tone: 'ok', code: `result.stop_reason  →  "end_turn"\nresult.message["content"][0]["text"]  →  "Tu pedido 4821 (Zapatillas trekking…"` },
  },
]

export type RunStep = {
  title: string
  body: string
  /** cuántos RUN_EVENTS se ven */
  events: number
  flows: string[]
  /** hooks de Strands que corresponden a este momento */
  hooks: string[]
  /** trozos de texto ya visibles en el chat (0 = nada, -1 = respuesta completa) */
  chunks: number
  typing?: boolean
  stop?: 'tool_use' | 'end_turn'
}

export const RUN_STEPS: RunStep[] = [
  {
    title: 'agent("¿Dónde está mi pedido 4821?")',
    body: 'Invocas el agente como una función. Strands agrega el mensaje de Camila al historial (agent.messages) y arranca el event loop.',
    events: 1,
    flows: ['user>agent'],
    hooks: ['BeforeInvocationEvent', 'MessageAddedEvent'],
    chunks: 0,
  },
  {
    title: 'Primera llamada al modelo',
    body: `El agente envía tres cosas: el system_prompt, el historial y el tool spec de get_order_status. BedrockModel lo manda por la API Converse de Bedrock al perfil ${MODEL_ID}.`,
    events: 1,
    flows: ['agent>model'],
    hooks: ['BeforeModelCallEvent'],
    chunks: 0,
    typing: true,
  },
  {
    title: 'El modelo no escribe: pide una herramienta',
    body: 'La respuesta es un bloque toolUse con el nombre de la herramienta y el input que el modelo armó leyendo tu docstring. En el stream lo ves como current_tool_use. El stop_reason de esta llamada es tool_use, así que el loop sigue.',
    events: 3,
    flows: ['model>agent'],
    hooks: ['AfterModelCallEvent', 'MessageAddedEvent'],
    chunks: 0,
    typing: true,
    stop: 'tool_use',
  },
  {
    title: 'Strands ejecuta tu función Python',
    body: 'El modelo solo pidió; quien llama a get_order_status("4821") es Strands, en tu proceso. Aquí es donde un hook puede mirar (o frenar) la llamada antes de que ocurra.',
    events: 3,
    flows: ['agent>tool'],
    hooks: ['BeforeToolsEvent', 'BeforeToolCallEvent'],
    chunks: 0,
    typing: true,
  },
  {
    title: 'El resultado vuelve como toolResult',
    body: 'El dict que devolvió tu función se guarda en el historial dentro de un bloque toolResult, atado al mismo toolUseId de la petición. El modelo todavía no lo ha visto.',
    events: 4,
    flows: ['tool>agent'],
    hooks: ['AfterToolCallEvent', 'AfterToolsEvent', 'MessageAddedEvent'],
    chunks: 0,
    typing: true,
  },
  {
    title: 'Segunda llamada al modelo',
    body: 'Mismo system_prompt, mismas herramientas, pero el historial ahora trae la pregunta, el toolUse y el toolResult. Con eso el modelo ya puede responder.',
    events: 4,
    flows: ['agent>model'],
    hooks: ['BeforeModelCallEvent'],
    chunks: 0,
    typing: true,
  },
  {
    title: 'El texto llega en trozos',
    body: 'Cada trozo es un evento con la clave data. El callback handler por defecto los imprime en consola a medida que llegan; con stream_async los recibes tú.',
    events: 5,
    flows: ['model>agent', 'agent>user'],
    hooks: [],
    chunks: 4,
  },
  {
    title: 'Sin más tool calls: end_turn',
    body: 'El modelo no pidió otra herramienta, así que su mensaje es la respuesta. El loop termina con stop_reason end_turn y el último evento del stream trae el AgentResult.',
    events: 7,
    flows: ['agent>user'],
    hooks: ['AfterModelCallEvent', 'MessageAddedEvent', 'AfterInvocationEvent'],
    chunks: -1,
    stop: 'end_turn',
  },
]

/* -------------------------------------------------------------------------- */
/* Lab 4 · qué modelo corre de verdad                                          */
/* -------------------------------------------------------------------------- */

export type ModelChoice = {
  id: string
  label: string
  /** id base, sin prefijo de perfil */
  base: string
  /** prefijos de perfil ofrecidos en el lab */
  scopes: string[]
  /** ¿se puede invocar con el id base (endpoint in-region)? */
  inRegion: boolean
  role: string
  /** USD por 1M de tokens (input, output) */
  priceGlobal?: [number, number]
  priceOther?: [number, number]
  priceNote?: string
  note?: string
}

export const MODELS: ModelChoice[] = [
  {
    id: 'sonnet',
    label: 'Claude Sonnet 5.5',
    base: 'anthropic.claude-sonnet-5-5',
    scopes: ['global', 'us', 'eu', 'au'],
    inRegion: false,
    role: 'Orquestador: el que conversa y decide',
    priceGlobal: [2, 10],
    priceOther: [2.2, 11],
  },
  {
    id: 'haiku',
    label: 'Claude Haiku 5.5',
    base: 'anthropic.claude-haiku-5-5',
    scopes: ['global', 'us', 'ca', 'eu', 'au', 'jp'],
    inRegion: false,
    role: 'Worker barato: 20 veces menos que Sonnet 5.5 en input',
    priceGlobal: [0.1, 0.5],
    priceOther: [0.11, 0.55],
    priceNote: 'Prompts de hasta 100.000 tokens; sobre eso, toda la petición pasa a 0.50 / 2.50.',
  },
  {
    id: 'opus',
    label: 'Claude Opus 5.5',
    base: 'anthropic.claude-opus-5-5',
    scopes: ['global', 'us', 'eu'],
    inRegion: false,
    role: 'Orquestador para tareas difíciles',
    priceGlobal: [4, 20],
    priceOther: [4.4, 22],
    note: 'El id base solo se admite en eu-west-2 (Londres). La lista completa de perfiles geográficos está a confirmar en su model card.',
  },
  {
    id: 'nova',
    label: 'Amazon Nova Micro',
    base: 'amazon.nova-micro-v1:0',
    scopes: ['us', 'eu'],
    inRegion: true,
    role: 'Router o clasificador: lo más barato de la tabla',
    priceOther: [0.035, 0.14],
    priceNote: 'Precio in-region en us-east-1. No tiene perfil global.',
  },
]

export type RegionMode = 'explicit' | 'env' | 'none'

/* -------------------------------------------------------------------------- */
/* Lab 5 · terminal                                                            */
/* -------------------------------------------------------------------------- */

export const TERM_RUN: TermLine[] = [
  comment('Python 3.10 o superior'),
  cmd('pip install strands-agents'),
  dim('Collecting strands-agents'),
  ok('Successfully installed strands-agents-1.65.0', 300),
  comment('credenciales de Bedrock: en local, lo más rápido es una API key de Bedrock'),
  cmd('export AWS_BEARER_TOKEN_BEDROCK="pega-aquí-tu-api-key"'),
  comment('alternativas: aws configure, AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY, o un rol IAM'),
  cmd('python -u agent.py'),
  ok(FINAL_TEXT, 500),
  out('[stop_reason] end_turn', 300),
  comment('el mismo agente, pero recibiendo tú los eventos'),
  cmd('python -u stream.py'),
  dim('[tool] get_order_status', 500),
  ok(FINAL_TEXT, 400),
  out('[stop_reason] end_turn'),
]

/* -------------------------------------------------------------------------- */
/* Lab 6 · claves del stream                                                   */
/* -------------------------------------------------------------------------- */

export const STREAM_CODE = `import asyncio
from strands import Agent
from agent import SYSTEM_PROMPT, get_order_status, model

agent = Agent(
    model=model,
    system_prompt=SYSTEM_PROMPT,
    tools=[get_order_status],
    callback_handler=None,   # sin esto, el texto se imprime dos veces
)

async def main():
    seen = set()
    async for event in agent.stream_async("${QUESTION}"):
        if "current_tool_use" in event:
            use = event["current_tool_use"]
            if use.get("toolUseId") not in seen:
                seen.add(use.get("toolUseId"))
                print(f"[tool] {use.get('name')}")
        elif "data" in event:
            print(event["data"], end="", flush=True)
        elif "result" in event:
            print(f"\\n[stop_reason] {event['result'].stop_reason}")

asyncio.run(main())
`

export type StreamKey = { key: string; group: 'ciclo' | 'modelo' | 'tools'; desc: string; needles: string[] }
export const STREAM_KEYS: StreamKey[] = [
  { key: 'init_event_loop', group: 'ciclo', desc: 'Marca de ciclo de vida: el event loop se inicializa.', needles: [] },
  { key: 'start_event_loop', group: 'ciclo', desc: 'Marca de ciclo de vida: empieza una vuelta del loop.', needles: [] },
  { key: 'event_loop_throttled_delay', group: 'ciclo', desc: 'Marca de ciclo de vida: el loop está esperando por throttling antes de reintentar.', needles: [] },
  { key: 'message', group: 'ciclo', desc: 'Un mensaje completo que se agregó al historial (por ejemplo, el que trae el toolUse o el toolResult).', needles: [] },
  { key: 'event', group: 'ciclo', desc: 'El evento crudo del modelo, tal como lo entrega el proveedor. Útil para depurar, ruidoso para una UI.', needles: [] },
  { key: 'force_stop', group: 'ciclo', desc: 'El loop se detuvo a la fuerza; viene acompañado de force_stop_reason.', needles: [] },
  { key: 'result', group: 'ciclo', desc: 'El último evento: trae el AgentResult final, el mismo objeto que devuelve agent("…").', needles: ['"result" in event', "event['result']"] },
  { key: 'data', group: 'modelo', desc: 'Un trozo de texto de la respuesta. Es la clave que usas para pintar la respuesta en vivo.', needles: ['"data" in event', 'event["data"]'] },
  { key: 'delta', group: 'modelo', desc: 'El delta crudo del modelo del que salió ese trozo.', needles: [] },
  { key: 'reasoning', group: 'modelo', desc: 'Razonamiento del modelo, cuando lo expone. Llega con reasoningText, reasoning_signature o redactedContent.', needles: [] },
  { key: 'current_tool_use', group: 'tools', desc: 'La herramienta que el modelo está pidiendo: toolUseId, name e input. Sirve para mostrar "consultando tu pedido…".', needles: ['"current_tool_use" in event', 'event["current_tool_use"]', 'use.get('] },
  { key: 'tool_stream_event', group: 'tools', desc: 'Datos que una herramienta emite mientras corre (campos tool_use y data).', needles: [] },
]

export const GROUP_LABEL: Record<StreamKey['group'], { label: string; tone: Tone }> = {
  ciclo: { label: 'Ciclo de vida', tone: 'system' },
  modelo: { label: 'Modelo', tone: 'model' },
  tools: { label: 'Herramientas', tone: 'tool' },
}

/* -------------------------------------------------------------------------- */
/* Sección 6 · hooks y límites                                                 */
/* -------------------------------------------------------------------------- */

export const HOOK_CODE = `from strands.hooks import BeforeToolCallEvent

def log_tool(event: BeforeToolCallEvent) -> None:
    print(f"Tool called: {event.tool_use['name']}")

agent.add_hook(log_tool)   # el tipo de evento se infiere del type hint
agent("${QUESTION}")
# Tool called: get_order_status
`

export const LIMITS_CODE = `result = agent(
    "${QUESTION}",
    limits={"turns": 5, "total_tokens": 10000},
)
if result.stop_reason == "limit_turns":
    print("Se acabó el presupuesto de turnos")
`

export const STOP_REASONS = ['end_turn', 'tool_use', 'max_tokens', 'guardrail_intervened', 'interrupt', 'cancelled', 'limit_turns', 'limit_total_tokens', 'limit_output_tokens', 'limit_structured_output_attempts']
