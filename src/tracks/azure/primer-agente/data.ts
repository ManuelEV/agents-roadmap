import { cmd, comment, dim, ok, out, type TermLine } from '@/components/Terminal'
import type { Tone } from '@/components/ui'
import { runTool } from '@/sim/andes'

/* Identificadores propios de la plataforma (formato de docs/research/azure-2026-11.md §1.2 y §3.2). */
export const PROJECT_ENDPOINT = 'https://andes-foundry.services.ai.azure.com/api/projects/andes-ops'
export const DEPLOYMENT = 'gpt-5.4-mini'
export const AF_VERSION = '1.26.0'

export const Q1 = '¿Dónde está mi pedido 4821?'
export const Q2 = '¿y cuándo llega?'
export const TOOL_RESULT = runTool('get_order_status', { order_id: '4821' })
export const TOOL_RESULT_JSON = JSON.stringify(TOOL_RESULT)
export const TEXT_CHUNKS = [
  'Tu pedido 4821 (Zapatillas trekking Cordillera 41, $69.990) ',
  'va en ruta con AndesExpress, seguimiento AX-88213-CL. ',
  'La entrega estimada es el 14 de noviembre.',
]
export const FINAL_TEXT = TEXT_CHUNKS.join('')

/* -------------------------------------------------------------------------- */
/* Lab 1 · el archivo completo                                                 */
/* -------------------------------------------------------------------------- */
export const AGENT_CODE = `import asyncio
import json
from typing import Annotated

from agent_framework import Agent, tool
from agent_framework.foundry import FoundryChatClient
from azure.identity import AzureCliCredential
from pydantic import Field

ORDERS = {
    "4821": {"state": "en_ruta", "items": ["1× Zapatillas trekking Cordillera 41"],
             "total_clp": 69990, "carrier": "AndesExpress", "tracking": "AX-88213-CL",
             "eta": "2026-11-14"},
}

INSTRUCTIONS = """Eres Andi, el agente de operaciones de Andes Market (retail online en Chile).
Usa las herramientas para cualquier dato de pedidos. Nunca inventes números ni fechas.
Responde en español neutro, breve y concreto. Formatea montos como $69.990."""


@tool(approval_mode="never_require")
def get_order_status(
    order_id: Annotated[str, Field(description='Número del pedido, por ejemplo "4821".')],
) -> str:
    """Estado y seguimiento de un pedido. Úsala cuando pregunten por un pedido concreto."""
    order = ORDERS.get(order_id.strip())
    if order is None:
        return json.dumps({"status": "error", "error_message": f"No existe el pedido {order_id}."})
    return json.dumps({"status": "success", "order_id": order_id, **order}, ensure_ascii=False)


agent = Agent(
    client=FoundryChatClient(
        project_endpoint="${PROJECT_ENDPOINT}",
        model="${DEPLOYMENT}",            # nombre de TU deployment
        credential=AzureCliCredential(),
    ),
    name="andes_ops",
    instructions=INSTRUCTIONS,
    tools=[get_order_status],
)


async def main() -> None:
    result = await agent.run("${Q1}")
    print(result.text)


asyncio.run(main())
`

export type AnatomyPart = { id: string; label: string; desc: string; needles: string[]; tone: Tone }
export const ANATOMY: AnatomyPart[] = [
  {
    id: 'imports',
    label: 'imports',
    desc: 'Agent y tool salen de agent_framework; el cliente de Foundry, de agent_framework.foundry; la credencial, de azure.identity. Todo llega con pip install agent-framework.',
    needles: ['from agent_framework', 'from azure.identity', 'from pydantic'],
    tone: 'system',
  },
  {
    id: 'client',
    label: 'client=FoundryChatClient(...)',
    desc: 'El chat client es el puente con el modelo. El Agent no sabe de Azure: recibe un cliente y le delega cada llamada. Cambiar de proveedor es cambiar esta pieza.',
    needles: ['client=FoundryChatClient(', 'project_endpoint=', 'model="', 'credential=AzureCliCredential()', '    ),'],
    tone: 'model',
  },
  {
    id: 'endpoint',
    label: 'project_endpoint',
    desc: 'La URL de tu proyecto de Foundry: https://<recurso>.services.ai.azure.com/api/projects/<proyecto>. El portal la muestra en la pantalla de bienvenida del proyecto.',
    needles: ['project_endpoint='],
    tone: 'data',
  },
  {
    id: 'model',
    label: 'model',
    desc: 'No es el id del modelo del catálogo: es el nombre de TU deployment. Si lo desplegaste con otro nombre, va ese nombre aquí.',
    needles: ['model="'],
    tone: 'model',
  },
  {
    id: 'credential',
    label: 'credential=AzureCliCredential()',
    desc: 'Sin API key en el código. AzureCliCredential usa la sesión que abriste con az login en esta máquina.',
    needles: ['credential=AzureCliCredential()', 'from azure.identity'],
    tone: 'guard',
  },
  {
    id: 'instructions',
    label: 'name + instructions',
    desc: 'instructions es el system prompt: persona, reglas y cuándo usar las herramientas. También se puede pasar por run, como argumento directo de agent.run().',
    needles: ['name="andes_ops"', 'instructions=INSTRUCTIONS', 'INSTRUCTIONS = """', 'Usa las herramientas', 'Responde en español'],
    tone: 'user',
  },
  {
    id: 'tools',
    label: 'tools=[get_order_status]',
    desc: 'Una lista de funciones Python. El framework arma el esquema que ve el modelo con el nombre, el docstring y los type hints, y ejecuta la función cuando el modelo la pide.',
    needles: ['tools=[get_order_status]', 'def get_order_status(', 'order_id: Annotated', ') -> str:', '"""Estado y seguimiento'],
    tone: 'tool',
  },
  {
    id: 'decorator',
    label: '@tool(approval_mode=...)',
    desc: 'El decorador es opcional: sin él la función sirve igual. Lo que agrega aquí es approval_mode. "never_require" es para ejemplos; la documentación recomienda "always_require" en producción.',
    needles: ['@tool(approval_mode'],
    tone: 'guard',
  },
  {
    id: 'run',
    label: 'await agent.run(...)',
    desc: 'Un run completo: todas las llamadas al modelo y a tus funciones que hagan falta. Devuelve un AgentResponse; result.text es el texto final.',
    needles: ['result = await agent.run', 'print(result.text)', 'asyncio.run(main())'],
    tone: 'accent',
  },
]

/* -------------------------------------------------------------------------- */
/* Lab 2 · función → definición de la tool                                     */
/* -------------------------------------------------------------------------- */
export type SchemaOpts = { doc: boolean; field: boolean; hint: 'str' | 'int'; deco: boolean; ctx: boolean }
export type SchemaKey = keyof SchemaOpts
export const SCHEMA_DEFAULT: SchemaOpts = { doc: true, field: true, hint: 'str', deco: true, ctx: false }

const DOC = 'Estado y seguimiento de un pedido. Úsala cuando pregunten por un pedido concreto.'
const FIELD_DESC = 'Número del pedido, por ejemplo "4821".'

export function buildSchema(o: SchemaOpts): { py: string; json: string } {
  const py: string[] = []
  if (o.deco) py.push('@tool(approval_mode="never_require")')
  py.push('def get_order_status(')
  py.push(o.field ? `    order_id: Annotated[${o.hint}, Field(description='${FIELD_DESC}')],` : `    order_id: ${o.hint},`)
  if (o.ctx) py.push('    ctx: FunctionInvocationContext,')
  py.push(') -> str:')
  if (o.doc) py.push(`    """${DOC}"""`)
  py.push('    ...')

  const prop: Record<string, string> = { type: o.hint === 'str' ? 'string' : 'integer' }
  if (o.field) prop.description = FIELD_DESC
  const def: Record<string, unknown> = { name: 'get_order_status' }
  if (o.doc) def.description = DOC
  def.parameters = { type: 'object', properties: { order_id: prop } }
  return { py: py.join('\n'), json: JSON.stringify(def, null, 2) }
}

export const SCHEMA_NOTES: Record<SchemaKey, { pyNeedles: string[]; jsonNeedles: string[]; on: string; off: string }> = {
  doc: {
    pyNeedles: ['"""'],
    jsonNeedles: ['"description": "Estado'],
    on: 'El docstring es la descripción de la tool. Es lo único que el modelo lee para decidir si la llama: escribe para él, y di cuándo usarla.',
    off: 'Sin docstring no hay descripción que enviar. Al modelo le queda solo el nombre get_order_status para adivinar cuándo conviene llamarla.',
  },
  field: {
    pyNeedles: ['order_id:'],
    jsonNeedles: ['"description": "Número'],
    on: 'Annotated[..., Field(description=...)] agrega la descripción del parámetro. Aquí va el formato esperado y un ejemplo.',
    off: 'Con solo order_id: str el modelo conoce el tipo pero no qué poner. Puede enviar "pedido 4821", "#4821" o el código de seguimiento.',
  },
  hint: {
    pyNeedles: ['order_id:'],
    jsonNeedles: ['"type": "string"', '"type": "integer"'],
    on: 'Anotado como int, el modelo debe enviar un número. Sirve para cantidades; para identificadores que pueden llevar ceros o letras conviene str.',
    off: 'El type hint str se convierte en el tipo del parámetro. El modelo envía "4821" como texto.',
  },
  deco: {
    pyNeedles: ['@tool'],
    jsonNeedles: [],
    on: '@tool no cambia la definición: nombre, descripción y parámetros salen de la función. Lo que el decorador aporta aquí es approval_mode.',
    off: 'Sin @tool la definición es idéntica: cualquier función Python sirve como herramienta. Pierdes el lugar donde declarar approval_mode.',
  },
  ctx: {
    pyNeedles: ['ctx'],
    jsonNeedles: [],
    on: 'Un parámetro ctx: FunctionInvocationContext queda oculto al modelo: no aparece en parameters. Recibe datos solo-runtime que pasas con agent.run(..., function_invocation_kwargs={"user_id": "cus_7781"}).',
    off: 'Sin ctx, todo lo que la función necesita tiene que venir en argumentos que el modelo redacta. Nunca dejes ahí el id del cliente: es un dato de tu sesión, no del modelo.',
  },
}

/* -------------------------------------------------------------------------- */
/* Lab 3 · un run con streaming                                                */
/* -------------------------------------------------------------------------- */
export const STREAM_CODE = `# devuelve un ResponseStream
stream = agent.run(PREGUNTA, stream=True)

# cada update es un AgentResponseUpdate
async for update in stream:
    for content in update.contents:
        if content.type == "function_call":
            print("[el modelo pide una función]")
        elif content.type == "function_result":
            print("[la función respondió]")
    if update.text:
        print(update.text, end="", flush=True)

# AgentResponse agregado
final = await stream.get_final_response()
print(final.text, len(final.messages))
`

export type StreamUpdate = { type: 'function_call' | 'function_result' | 'text'; tone: Tone; payload: string; text: string }
export const UPDATES: StreamUpdate[] = [
  { type: 'function_call', tone: 'model', payload: 'get_order_status({"order_id": "4821"})', text: '' },
  { type: 'function_result', tone: 'tool', payload: TOOL_RESULT_JSON, text: '' },
  { type: 'text', tone: 'model', payload: '', text: TEXT_CHUNKS[0] },
  { type: 'text', tone: 'model', payload: '', text: TEXT_CHUNKS[1] },
  { type: 'text', tone: 'model', payload: '', text: TEXT_CHUNKS[2] },
]

export type RunStep = {
  title: string
  body: string
  flows: string[]
  /** cuántos updates ya llegaron */
  updates: number
  /** updates que llegan en este paso (índices) */
  fresh: number[]
  /** trozos de texto visibles en la burbuja */
  chunks: number
  typing: boolean
  codeNeedles: string[]
}
export const RUN_STEPS: RunStep[] = [
  {
    title: 'Tu script llama a agent.run(..., stream=True)',
    body: 'Con stream=True, run() no espera el final: devuelve un ResponseStream que recorres con async for. Todavía no viajó nada al modelo.',
    flows: ['user>agent'],
    updates: 0,
    fresh: [],
    chunks: 0,
    typing: true,
    codeNeedles: ['stream = agent.run('],
  },
  {
    title: 'Primera llamada al modelo',
    body: `El Agent junta las instructions, el mensaje de Camila y la definición de get_order_status. FoundryChatClient lo envía al deployment ${DEPLOYMENT} de tu proyecto, autenticado con la sesión de az login.`,
    flows: ['agent>client', 'client>model'],
    updates: 0,
    fresh: [],
    chunks: 0,
    typing: true,
    codeNeedles: ['stream = agent.run('],
  },
  {
    title: 'El modelo no escribe: pide una función',
    body: 'Llega el primer AgentResponseUpdate. Su update.text está vacío; en update.contents trae un Content con type "function_call": el nombre de la tool y los argumentos que el modelo redactó.',
    flows: ['model>client', 'client>agent'],
    updates: 1,
    fresh: [0],
    chunks: 0,
    typing: true,
    codeNeedles: ['async for update', 'for content in update.contents', 'content.type == "function_call"', 'el modelo pide'],
  },
  {
    title: 'El framework ejecuta tu función',
    body: 'Como la tool se declaró con approval_mode="never_require", nadie tiene que aprobar: Agent Framework llama a get_order_status("4821") en tu proceso Python. El modelo nunca toca tu base de datos.',
    flows: ['agent>tool'],
    updates: 1,
    fresh: [],
    chunks: 0,
    typing: true,
    codeNeedles: ['for content in update.contents'],
  },
  {
    title: 'El resultado vuelve como function_result',
    body: 'Lo que devolvió la función se envuelve en un Content de type "function_result" y se agrega a la conversación del run. También lo ves pasar por el stream.',
    flows: ['tool>agent'],
    updates: 2,
    fresh: [1],
    chunks: 0,
    typing: true,
    codeNeedles: ['content.type == "function_result"', 'la función respondió'],
  },
  {
    title: 'Segunda llamada al modelo',
    body: 'El Agent vuelve a llamar al modelo, ahora con la llamada y su resultado en la conversación. El bucle seguiría si el modelo pidiera otra función; esta vez tiene todo para redactar.',
    flows: ['agent>client', 'client>model'],
    updates: 2,
    fresh: [],
    chunks: 0,
    typing: true,
    codeNeedles: ['async for update'],
  },
  {
    title: 'El texto llega por trozos',
    body: 'Ahora los updates traen Content de type "text". update.text es el atajo para leerlo: cada trozo se imprime apenas llega y la burbuja de Camila crece.',
    flows: ['model>client', 'client>agent'],
    updates: 4,
    fresh: [2, 3],
    chunks: 2,
    typing: false,
    codeNeedles: ['if update.text', 'print(update.text'],
  },
  {
    title: 'Fin del stream: get_final_response()',
    body: 'Llega el último trozo y el async for termina. get_final_response() te da el AgentResponse agregado: .text con la respuesta completa y .messages con los mensajes del run (cada Message tiene .role, .text y .contents).',
    flows: ['agent>user'],
    updates: 5,
    fresh: [4],
    chunks: 3,
    typing: false,
    codeNeedles: ['final = await stream.get_final_response()', 'print(final.text'],
  },
]

/* -------------------------------------------------------------------------- */
/* Lab 4 · sesión sí / no                                                      */
/* -------------------------------------------------------------------------- */
export const SESSION_CODE = {
  off: `first = await agent.run("${Q1}")
second = await agent.run("${Q2}")
`,
  on: `session = agent.create_session()
first = await agent.run("${Q1}", session=session)
second = await agent.run("${Q2}", session=session)
`,
}

export const ANSWER_NO_SESSION = 'Para decirte cuándo llega necesito el número del pedido. ¿Me lo indicas?'
export const ANSWER_SESSION = 'Tu pedido 4821 tiene entrega estimada para el 14 de noviembre. Sigue en ruta con AndesExpress.'

export type CtxItem = { kind: string; tone: Tone; text: string; mono?: boolean; fromSession?: boolean }
const TURN1_ITEMS: CtxItem[] = [
  { kind: 'mensaje del usuario', tone: 'user', text: Q1 },
  { kind: 'function_call', tone: 'model', text: 'get_order_status({"order_id": "4821"})', mono: true },
  { kind: 'function_result', tone: 'tool', text: TOOL_RESULT_JSON, mono: true },
  { kind: 'texto del agente', tone: 'model', text: FINAL_TEXT },
]
/** Lo que el modelo tiene a la vista al terminar cada turno. */
export function contextFor(session: boolean, turn: 1 | 2): CtxItem[] {
  if (turn === 1) return TURN1_ITEMS
  const q2: CtxItem = { kind: 'mensaje del usuario', tone: 'user', text: Q2 }
  return session ? [...TURN1_ITEMS.map((i) => ({ ...i, fromSession: true })), q2] : [q2]
}

export const SESSION_PERSIST_CODE = `serialized = session.to_dict()                       # persistir
resumed = AgentSession.from_dict(serialized)         # restaurar

# retomar una conversación que ya vive en el servicio
session = agent.get_session(service_session_id="<service-conversation-id>")
`

/* -------------------------------------------------------------------------- */
/* Lab 5 · terminal                                                            */
/* -------------------------------------------------------------------------- */
export const TERM_SETUP: TermLine[] = [
  comment('Agent Framework exige Python >= 3.11'),
  cmd('python --version'),
  out('Python 3.12.7'),
  cmd(`pip install agent-framework==${AF_VERSION}`),
  dim('Collecting agent-framework…', 500),
  ok(`Successfully installed agent-framework-${AF_VERSION} …`),
  cmd(`echo "agent-framework==${AF_VERSION}" > requirements.txt`),
  comment('AzureCliCredential usa esta sesión'),
  cmd('az login'),
  dim('(se abre el navegador para que inicies sesión)', 700),
  ok('sesión iniciada · suscripción activa: Andes Market'),
  comment('el endpoint del proyecto también está en la pantalla de bienvenida del portal'),
  cmd(
    'az cognitiveservices account project show --name andes-market --resource-group andes-rg --project-name andes-ops --query \'properties.endpoints."AI Foundry API"\' --output tsv',
  ),
  out(PROJECT_ENDPOINT),
  cmd('python andi.py', 900),
  ok(FINAL_TEXT),
]

export const CLIENT_EXPLICIT = `agent = Agent(
    client=FoundryChatClient(
        project_endpoint="${PROJECT_ENDPOINT}",
        model="${DEPLOYMENT}",            # nombre de TU deployment
        credential=AzureCliCredential(),
    ),
    name="andes_ops",
    instructions=INSTRUCTIONS,
    tools=[get_order_status],
)
`

export const CLIENT_ENV = `# .env
# FOUNDRY_PROJECT_ENDPOINT=${PROJECT_ENDPOINT}
# FOUNDRY_MODEL=${DEPLOYMENT}

from dotenv import load_dotenv

load_dotenv()   # Agent Framework no carga .env por ti

agent = Agent(
    client=FoundryChatClient(credential=AzureCliCredential()),
    name="andes_ops",
    instructions=INSTRUCTIONS,
    tools=[get_order_status],
)
`

export const CLIENT_SHORT = `client = FoundryChatClient(credential=AzureCliCredential())

# atajo: el cliente crea el Agent
agent = client.as_agent(instructions=INSTRUCTIONS, tools=[get_order_status])

# límites del bucle de funciones
client.function_invocation_configuration.update(
    {"max_iterations": 5, "max_function_calls": 20, "max_duration_seconds": 30.0}
)
`

/* -------------------------------------------------------------------------- */
/* Versiones (PyPI, leído el 15-nov-2026)                                      */
/* -------------------------------------------------------------------------- */
export const PACKAGES: { name: string; version: string; stable: boolean; use: string }[] = [
  { name: 'agent-framework-core', version: '1.26.0', stable: true, use: 'Agent, tool, sesiones, streaming' },
  { name: 'agent-framework-foundry', version: '1.16.2', stable: true, use: 'FoundryChatClient' },
  { name: 'agent-framework-orchestrations', version: '1.4.2', stable: true, use: 'orquestaciones multiagente' },
  { name: 'agent-framework-ag-ui', version: '1.8.1', stable: true, use: 'protocolo AG-UI' },
  { name: 'agent-framework-devui', version: '1.0.0b261112', stable: false, use: 'DevUI local' },
  { name: 'agent-framework-a2a', version: '1.0.0b261112', stable: false, use: 'A2A' },
  { name: 'agent-framework-foundry-hosting', version: '1.0.0b261112', stable: false, use: 'hosting en Foundry' },
]
