import type { ReactNode } from 'react'
import type { Tone } from '@/components/ui'
import type { StepInfo } from '@/components/Player'
import { cmd, comment, blank, dim, ok, out, type TermLine } from '@/components/Terminal'
import { ANDES_TOOLS, CUSTOMER, runTool } from '@/sim/andes'

/* Identificadores de plataforma (formato de los ejemplos de la doc de AgentCore). */
export const REGION = 'us-east-1'
export const ACCOUNT = '123456789012'
export const GATEWAY_NAME = 'AndesGateway'
export const GATEWAY_ID = 'andes-gateway-a1b2c3d4e5'
export const GATEWAY_HOST = `${GATEWAY_ID}.gateway.bedrock-agentcore.${REGION}.amazonaws.com`
export const GATEWAY_URL = `https://${GATEWAY_HOST}/mcp`
export const GATEWAY_ARN = `arn:aws:bedrock-agentcore:${REGION}:${ACCOUNT}:gateway/${GATEWAY_ID}`
export const MEMORY_NAME = 'AndiMemory'
export const MEMORY_ID = 'AndesOps_default_AndiMemory-Qx7LmP2dKe'
export const MEMORY_ARN = `arn:aws:bedrock-agentcore:${REGION}:${ACCOUNT}:memory/${MEMORY_ID}`
export const TRACKING = 'AX-88213-CL'

/* -------------------------------------------------------------------------- */
/* Lab 1 · tres formas de darle una herramienta a Andi                          */
/* -------------------------------------------------------------------------- */

export type WayId = 'tool' | 'mcp' | 'gateway'

export type Zone = {
  title: string
  sub: string
  tone: Tone
  outside?: boolean
  items: { kind: 'agent' | 'code' | 'secret' | 'sys' | 'none'; label: string }[]
}

export const WAYS: Record<WayId, { label: string; file: string; code: string; needles: string[]; zones: Zone[]; rows: [string, ReactNode][] }> = {
  tool: {
    label: '@tool en Python',
    file: 'agent.py',
    code: `import os, requests
from strands import Agent, tool
from strands.models import BedrockModel

@tool
def track_shipment(tracking: str) -> dict:
    """Último evento de un envío en AndesExpress.

    Args:
        tracking (str): Código de seguimiento, p. ej. "AX-88213-CL"
    """
    resp = requests.get(
        f"{ANDESEXPRESS_URL}/v1/shipments/{tracking}",
        headers={"x-api-key": os.environ["ANDESEXPRESS_API_KEY"]},
        timeout=10,
    )
    return resp.json()

model = BedrockModel(model_id="global.anthropic.claude-sonnet-5-5", region_name="us-east-1")
agent = Agent(model=model, tools=[get_order_status, track_shipment, get_stock, request_refund])
`,
    needles: ['@tool', 'os.environ["ANDESEXPRESS_API_KEY"]', 'tools=['],
    zones: [
      {
        title: 'Proceso de Andi',
        sub: 'tu máquina o la microVM de Runtime',
        tone: 'model',
        items: [
          { kind: 'agent', label: 'Agent (Strands)' },
          { kind: 'code', label: 'get_order_status()' },
          { kind: 'code', label: 'track_shipment()' },
          { kind: 'code', label: 'get_stock()' },
          { kind: 'secret', label: 'ORDERS_DB_PASSWORD' },
          { kind: 'secret', label: 'ANDESEXPRESS_API_KEY' },
          { kind: 'secret', label: 'ERP_CLIENT_SECRET' },
        ],
      },
      {
        title: 'Sistemas de Andes Market',
        sub: 'lo que ya existe',
        tone: 'data',
        outside: true,
        items: [
          { kind: 'sys', label: 'Base de pedidos' },
          { kind: 'sys', label: 'API de AndesExpress' },
          { kind: 'sys', label: 'ERP de inventario' },
        ],
      },
    ],
    rows: [
      ['Dónde corre la tool', 'Dentro del proceso del agente, como una función más.'],
      ['Quién guarda las credenciales', 'El agente: tres secretos en sus variables de entorno.'],
      ['Sumar o cambiar una tool', 'Editas el código de Andi y lo vuelves a desplegar.'],
      ['Otro agente la necesita', 'Copia la función (y los secretos) en su propio código.'],
    ],
  },
  mcp: {
    label: 'Servidor MCP + MCPClient',
    file: 'agent.py',
    code: `from mcp.client.streamable_http import streamablehttp_client
from strands import Agent
from strands.models import BedrockModel
from strands.tools.mcp import MCPClient

# El servidor MCP de logística lo opera otro equipo; Andi solo conoce su URL.
carrier_mcp = MCPClient(
    lambda: streamablehttp_client("https://mcp.andesmarket.example/logistica/mcp"),
    tool_filters={"allowed": ["track_shipment"]},     # strings o regex; también "rejected"
)

model = BedrockModel(model_id="global.anthropic.claude-sonnet-5-5", region_name="us-east-1")
agent = Agent(model=model, tools=[carrier_mcp])       # ciclo de vida gestionado automáticamente
agent("¿Por dónde viene el envío AX-88213-CL?")
`,
    needles: ['MCPClient(', 'streamablehttp_client("', 'tool_filters', 'tools=[carrier_mcp]'],
    zones: [
      {
        title: 'Proceso de Andi',
        sub: 'tu máquina o la microVM de Runtime',
        tone: 'model',
        items: [
          { kind: 'agent', label: 'Agent (Strands)' },
          { kind: 'agent', label: 'MCPClient × 3' },
          { kind: 'none', label: 'sin secretos de negocio: solo URLs' },
        ],
      },
      {
        title: 'Servidores MCP',
        sub: 'uno por sistema; los operas tú',
        tone: 'tool',
        items: [
          { kind: 'code', label: 'pedidos: get_order_status' },
          { kind: 'code', label: 'logística: track_shipment' },
          { kind: 'code', label: 'inventario: get_stock' },
          { kind: 'secret', label: 'un secreto en cada servidor' },
        ],
      },
      {
        title: 'Sistemas de Andes Market',
        sub: 'lo que ya existe',
        tone: 'data',
        outside: true,
        items: [
          { kind: 'sys', label: 'Base de pedidos' },
          { kind: 'sys', label: 'API de AndesExpress' },
          { kind: 'sys', label: 'ERP de inventario' },
        ],
      },
    ],
    rows: [
      ['Dónde corre la tool', 'En el servidor MCP: un subproceso (stdio) o un servicio remoto (Streamable HTTP, SSE).'],
      ['Quién guarda las credenciales', 'Cada servidor MCP guarda la suya. El agente ya no las ve.'],
      ['Sumar o cambiar una tool', 'Cambias el servidor; Andi la descubre con tools/list al conectarse.'],
      ['Otro agente la necesita', 'Se conecta al mismo servidor. Pero hay tres servidores que hospedar, autenticar y vigilar.'],
    ],
  },
  gateway: {
    label: 'Target en AgentCore Gateway',
    file: 'agent.py',
    code: `from mcp.client.streamable_http import streamablehttp_client
from strands import Agent
from strands.models import BedrockModel
from strands.tools.mcp.mcp_client import MCPClient

GATEWAY_URL = "${GATEWAY_URL}"

gateway = MCPClient(lambda: streamablehttp_client(
    GATEWAY_URL, headers={"Authorization": f"Bearer {token}"}
))

model = BedrockModel(model_id="global.anthropic.claude-sonnet-5-5", region_name="us-east-1")
with gateway:
    tools = gateway.list_tools_sync()      # paginar con pagination_token si hay muchas
    agent = Agent(model=model, tools=tools)
    agent("¿Por dónde viene el envío AX-88213-CL?")
`,
    needles: ['GATEWAY_URL = ', 'headers={"Authorization"', 'list_tools_sync()'],
    zones: [
      {
        title: 'Proceso de Andi',
        sub: 'tu máquina o la microVM de Runtime',
        tone: 'model',
        items: [
          { kind: 'agent', label: 'Agent (Strands)' },
          { kind: 'agent', label: 'MCPClient × 1' },
          { kind: 'none', label: 'solo un token de entrada, de corta vida' },
        ],
      },
      {
        title: 'AgentCore Gateway',
        sub: 'un endpoint /mcp, administrado',
        tone: 'system',
        items: [
          { kind: 'code', label: 'target OrdersDb · Lambda' },
          { kind: 'code', label: 'target AndesExpress · OpenAPI' },
          { kind: 'code', label: 'target InventoryErp · servidor MCP' },
          { kind: 'secret', label: 'rol de servicio (IAM)' },
          { kind: 'secret', label: 'credential providers de Identity' },
        ],
      },
      {
        title: 'Sistemas de Andes Market',
        sub: 'lo que ya existe',
        tone: 'data',
        outside: true,
        items: [
          { kind: 'sys', label: 'Base de pedidos' },
          { kind: 'sys', label: 'API de AndesExpress' },
          { kind: 'sys', label: 'ERP de inventario' },
        ],
      },
    ],
    rows: [
      ['Dónde corre la tool', 'En el target: una Lambda, la API que ya existía o un servidor MCP. El Gateway traduce MCP a cada uno.'],
      ['Quién guarda las credenciales', 'El Gateway: su rol de servicio y los credential providers de AgentCore Identity.'],
      ['Sumar o cambiar una tool', 'Agregas un target. El código de Andi no cambia: sigue llamando a list_tools_sync().'],
      ['Otro agente la necesita', 'Apunta al mismo Gateway. Hay un solo lugar donde autenticar, registrar y aplicar políticas.'],
    ],
  },
}

/* -------------------------------------------------------------------------- */
/* Lab 2 · targets, tools/list y búsqueda semántica                             */
/* -------------------------------------------------------------------------- */

export type TargetId = 'orders' | 'carrier' | 'erp'

export const TARGETS: { id: TargetId; name: string; system: string; kind: string; outbound: string; outboundShort: string; tools: string[] }[] = [
  {
    id: 'orders',
    name: 'OrdersDb',
    system: 'Base de pedidos',
    kind: 'Función Lambda',
    outbound: 'Rol de servicio del gateway (IAM, SigV4). No hay secreto que guardar.',
    outboundShort: 'IAM · rol de servicio',
    tools: ['get_order_status', 'request_refund'],
  },
  {
    id: 'carrier',
    name: 'AndesExpress',
    system: 'API del transportista',
    kind: 'Esquema OpenAPI',
    outbound: 'API key guardada en un credential provider de Identity.',
    outboundShort: 'API key · Identity',
    tools: ['track_shipment'],
  },
  {
    id: 'erp',
    name: 'InventoryErp',
    system: 'ERP de inventario',
    kind: 'Servidor MCP remoto',
    outbound: 'OAuth client guardado en un credential provider de Identity.',
    outboundShort: 'OAuth client · Identity',
    tools: ['get_stock'],
  },
]

export const gwToolName = (target: string, tool: string) => `${target}___${tool}`

const schemaOf = (tool: string) => {
  const t = ANDES_TOOLS.find((x) => x.name === tool)!
  const props = Object.fromEntries(Object.entries(t.args).map(([k, v]) => [k, { type: v }]))
  return { description: t.description, inputSchema: { type: 'object', properties: props, required: Object.keys(t.args) } }
}

export const SEARCH_TOOL = 'x_amz_bedrock_agentcore_search'

/** Respuesta de tools/list del Gateway según los targets activos (formato JSON-RPC de MCP). */
export function toolsListResponse(on: Record<TargetId, boolean>, search: boolean) {
  const tools: Record<string, unknown>[] = []
  if (search) tools.push({ name: SEARCH_TOOL, inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } })
  for (const t of TARGETS) if (on[t.id]) for (const tool of t.tools) tools.push({ name: gwToolName(t.name, tool), ...schemaOf(tool) })
  return { jsonrpc: '2.0', id: 1, result: { tools } }
}

export const CATEGORIES: { id: string; title: string; mode: string; kinds: { label: string; andes?: boolean }[] }[] = [
  {
    id: 'mcp',
    title: 'MCP targets',
    mode: 'Agregación: todo aparece como un único servidor MCP virtual.',
    kinds: [
      { label: 'Funciones Lambda', andes: true },
      { label: 'Etapas de API Gateway REST' },
      { label: 'Esquemas OpenAPI', andes: true },
      { label: 'Modelos Smithy' },
      { label: 'Servidores MCP remotos', andes: true },
      { label: 'Plantillas de integración (Salesforce, Slack, JIRA, Zoom…)' },
      { label: 'Connectors integrados (Web Search Tool, Step Functions…)' },
    ],
  },
  {
    id: 'http',
    title: 'HTTP targets',
    mode: 'Passthrough: el tráfico pasa sin traducción.',
    kinds: [{ label: 'Agentes de AgentCore Runtime' }, { label: 'Otros agentes (A2A)' }, { label: 'Servidores MCP externos' }, { label: 'Cualquier HTTP' }],
  },
  {
    id: 'inference',
    title: 'Inference targets',
    mode: 'Enrutan tráfico LLM según el campo model, con fallback de modelo.',
    kinds: [{ label: 'Bedrock' }, { label: 'OpenAI' }, { label: 'Anthropic' }],
  },
]

export type InboundId = 'CUSTOM_JWT' | 'AWS_IAM' | 'NONE'
export const INBOUND: Record<InboundId, { label: string; carries: string; note: string }> = {
  CUSTOM_JWT: {
    label: 'JWT',
    carries: 'Authorization: Bearer <JWT>',
    note: 'El Gateway valida el token contra tu proveedor de identidad. Es lo que usa el resto de esta lección.',
  },
  AWS_IAM: {
    label: 'IAM',
    carries: 'petición firmada con SigV4',
    note: 'Quien llama es un rol o usuario de IAM. Cómodo cuando el agente ya corre con un rol de AWS.',
  },
  NONE: {
    label: 'NONE',
    carries: 'nada',
    note: 'Cualquiera que conozca la URL puede llamar. Solo para desarrollo: es lo que usa el quickstart oficial.',
  },
}

export const SEARCH_QUERIES: { id: string; q: string; scores: Record<string, number> }[] = [
  { id: 'q1', q: '¿por dónde viene mi paquete?', scores: { track_shipment: 0.86, get_order_status: 0.71, get_stock: 0.22, request_refund: 0.14 } },
  { id: 'q2', q: '¿queda stock de la mochila azul?', scores: { get_stock: 0.9, get_order_status: 0.31, track_shipment: 0.17, request_refund: 0.12 } },
  { id: 'q3', q: 'quiero devolver el polar', scores: { request_refund: 0.88, get_order_status: 0.58, track_shipment: 0.2, get_stock: 0.19 } },
]

/* -------------------------------------------------------------------------- */
/* Lab 3 · una tool call a través del Gateway                                   */
/* -------------------------------------------------------------------------- */

const SHIPMENT = runTool('track_shipment', { tracking: TRACKING })
const CARRIER_TOOL = gwToolName('AndesExpress', 'track_shipment')

export type Hop = 'in' | 'vault' | 'out' | null

export type CallStep = StepInfo & {
  flows: string[]
  hop: Hop
  payloadTitle: string
  payloadLang: 'http' | 'json' | 'text'
  payload: string
}

export const CALL_STEPS: CallStep[] = [
  {
    title: 'Camila pregunta',
    body: (
      <>
        El mensaje entra al agente Strands. Andi todavía no sabe qué herramientas existen: no hay ninguna función <code>@tool</code> en su código, solo un{' '}
        <code>MCPClient</code> apuntando al Gateway.
      </>
    ),
    flows: ['user>agent'],
    hop: null,
    payloadTitle: 'mensaje del usuario',
    payloadLang: 'text',
    payload: `¿Por dónde viene mi envío ${TRACKING}?`,
  },
  {
    title: 'tools/list: Andi descubre sus herramientas',
    body: (
      <>
        <code>list_tools_sync()</code> envía un <code>tools/list</code> al endpoint <code>/mcp</code>. La petición lleva el token de <strong>entrada</strong>: el
        authorizer del Gateway lo valida antes de responder. Los nombres vuelven como <code>&lt;TargetName&gt;___&lt;tool&gt;</code>, con tres guiones bajos.
      </>
    ),
    flows: ['agent>gateway'],
    hop: 'in',
    payloadTitle: 'Andi → Gateway',
    payloadLang: 'http',
    payload: `POST /mcp HTTP/1.1
Host: ${GATEWAY_HOST}
Authorization: Bearer eyJraWQiOiJhbmRlcy…
Content-Type: application/json

{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}`,
  },
  {
    title: 'El modelo elige la tool',
    body: (
      <>
        Strands pasa las descripciones al modelo en Bedrock. El modelo no sabe que hay un Gateway: ve una herramienta más y pide usarla. En el stream de Strands
        aparece como <code>current_tool_use</code>.
      </>
    ),
    flows: ['agent>model'],
    hop: null,
    payloadTitle: 'evento current_tool_use (Strands)',
    payloadLang: 'json',
    payload: JSON.stringify({ current_tool_use: { toolUseId: 'tooluse_9fK2mQ', name: CARRIER_TOOL, input: { tracking: TRACKING } } }, null, 2),
  },
  {
    title: 'tools/call con el token de entrada',
    body: (
      <>
        El <code>MCPClient</code> traduce el pedido del modelo a un <code>tools/call</code>. Otra vez viaja el JWT: el Gateway autentica <em>quién llama</em> en
        cada petición. Aquí es también donde Policy puede permitir o negar la llamada (lo verás en <em>Gobernar</em>).
      </>
    ),
    flows: ['agent>gateway'],
    hop: 'in',
    payloadTitle: 'Andi → Gateway',
    payloadLang: 'http',
    payload: `POST /mcp HTTP/1.1
Host: ${GATEWAY_HOST}
Authorization: Bearer eyJraWQiOiJhbmRlcy…
Content-Type: application/json

${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: CARRIER_TOOL, arguments: { tracking: TRACKING } } }, null, 2)}`,
  },
  {
    title: 'Auth saliente: el Gateway busca la credencial',
    body: (
      <>
        El target <code>AndesExpress</code> es un esquema OpenAPI que pide API key. El Gateway la obtiene de un credential provider de AgentCore Identity, que
        la guarda en el token vault. <strong>Andi nunca ve ese secreto</strong>: ni en su código, ni en su entorno, ni en el contexto del modelo.
      </>
    ),
    flows: ['gateway>identity'],
    hop: 'vault',
    payloadTitle: 'configuración del target (resumen)',
    payloadLang: 'text',
    payload: `target            AndesExpress  (esquema OpenAPI)
auth saliente     API key
credential provider   andesexpress-api-key   ← AgentCore Identity
guardada en       token vault`,
  },
  {
    title: 'El Gateway llama a la API real',
    body: (
      <>
        Con el esquema OpenAPI, el Gateway convierte el <code>tools/call</code> en la petición HTTP que la API del transportista ya entendía, y le agrega la
        credencial de <strong>salida</strong>. La API de AndesExpress es ficticia; la traducción MCP → HTTP es lo que hace el producto.
      </>
    ),
    flows: ['gateway>target'],
    hop: 'out',
    payloadTitle: 'Gateway → AndesExpress',
    payloadLang: 'http',
    payload: `GET /v1/shipments/${TRACKING} HTTP/1.1
Host: api.andesexpress.example
x-api-key: ••••••••••••••••
Accept: application/json`,
  },
  {
    title: 'La respuesta vuelve como resultado MCP',
    body: (
      <>
        El JSON del transportista regresa envuelto en un resultado <code>tools/call</code>. Para Strands es un resultado de herramienta como cualquier otro y
        lo agrega a la conversación.
      </>
    ),
    flows: ['target>gateway', 'gateway>agent'],
    hop: null,
    payloadTitle: 'Gateway → Andi',
    payloadLang: 'json',
    payload: JSON.stringify({ jsonrpc: '2.0', id: 2, result: { content: [{ type: 'text', text: JSON.stringify(SHIPMENT) }], isError: false } }, null, 2),
  },
  {
    title: 'Andi responde',
    body: (
      <>
        Segunda llamada al modelo, ahora con el resultado. Dos credenciales distintas cruzaron dos tramos distintos, y el agente solo tocó la primera.
      </>
    ),
    flows: ['agent>model', 'agent>user'],
    hop: null,
    payloadTitle: 'respuesta al usuario',
    payloadLang: 'text',
    payload: `Tu envío ${TRACKING} está en reparto en Valparaíso.\nLa entrega estimada es el 14 de noviembre.`,
  },
]

/* -------------------------------------------------------------------------- */
/* Lab 4 · ¿qué sobrevive?                                                      */
/* -------------------------------------------------------------------------- */

export type ScenarioId = 'turn' | 'vm' | 'new' | 'other'
export const SCENARIOS: { id: ScenarioId; label: string; desc: string }[] = [
  { id: 'turn', label: 'Siguiente turno', desc: 'Camila escribe otro mensaje un minuto después, en la misma conversación.' },
  { id: 'vm', label: 'El proceso muere', desc: 'Pasaron 15 minutos sin actividad y Runtime destruyó la microVM de la sesión (o reiniciaste tu script). Camila vuelve con el mismo session_id.' },
  { id: 'new', label: 'Sesión nueva', desc: 'Camila vuelve la próxima semana. Es otra conversación: otro session_id, la misma clienta.' },
  { id: 'other', label: 'Otro cliente', desc: 'Escribe Tomás (cus_9034). Otro actor, otra sesión.' },
]

export const LAYERS: { id: string; title: string; api: string; tone: Tone; what: string; by: Record<ScenarioId, [boolean, string]> }[] = [
  {
    id: 'ram',
    title: 'agent.messages',
    api: 'Agent() sin nada más',
    tone: 'system',
    what: 'La lista de mensajes en la memoria del proceso.',
    by: {
      turn: [true, 'Sigue en la RAM del proceso.'],
      vm: [false, 'Vivía en la microVM: muere con ella.'],
      new: [false, 'Proceso nuevo, lista vacía.'],
      other: [false, 'Nunca debe compartirse entre clientes.'],
    },
  },
  {
    id: 'session',
    title: 'Session manager de Strands',
    api: 'SnapshotSessionManager + S3Storage',
    tone: 'memory',
    what: 'El estado del agente, guardado por session_id en disco o S3.',
    by: {
      turn: [true, 'Se guarda tras cada turno.'],
      vm: [true, 'Se restaura desde S3 con el mismo session_id.'],
      new: [false, 'Otro session_id: empieza en blanco.'],
      other: [false, 'Otro session_id: empieza en blanco.'],
    },
  },
  {
    id: 'events',
    title: 'Memory · corto plazo',
    api: 'CreateEvent / ListEvents',
    tone: 'memory',
    what: 'Eventos crudos por actorId + sessionId, retenidos hasta 365 días.',
    by: {
      turn: [true, 'Cada turno es un evento más.'],
      vm: [true, 'Los eventos viven en el servicio, no en la microVM.'],
      new: [false, 'Siguen guardados bajo la sesión anterior, pero la nueva parte sin turnos.'],
      other: [false, 'Otro actorId: no hay eventos suyos.'],
    },
  },
  {
    id: 'records',
    title: 'Memory · largo plazo',
    api: 'RetrieveMemoryRecords',
    tone: 'memory',
    what: 'Registros que las estrategias extraen de los eventos, organizados en namespaces.',
    by: {
      turn: [true, 'Con un matiz: la extracción es asíncrona, puede no estar lista aún.'],
      vm: [true, 'Viven en el servicio.'],
      new: [true, 'El namespace es por cliente, no por sesión: aquí está el valor.'],
      other: [false, 'Su namespace /users/cus_9034/… está vacío.'],
    },
  },
]

export const SESSION_CODE = `from strands import Agent
from strands.session import SnapshotSessionManager
from strands.storage import LocalFileStorage, S3Storage
from strands.agent.conversation_manager import SlidingWindowConversationManager

session_manager = SnapshotSessionManager(
    session_id="soporte-2026-11-12",
    storage=S3Storage(bucket="andes-agent-sessions", prefix="production/"),  # o LocalFileStorage("./sessions/")
)
agent = Agent(
    session_manager=session_manager,                                          # qué se guarda
    conversation_manager=SlidingWindowConversationManager(window_size=10),    # qué entra a la ventana
)
`

/* -------------------------------------------------------------------------- */
/* Lab 5 · memoria en dos sesiones                                              */
/* -------------------------------------------------------------------------- */

export const SESSION_1 = 'soporte-2026-11-12'
export const SESSION_2 = 'soporte-2026-11-13'
export const OTHER_ACTOR = 'cus_9034'

const ORDER = runTool('get_order_status', { order_id: '4821' }) as { carrier: string; tracking: string; eta: string }

export const TURNS_1: { role: 'USER' | 'ASSISTANT'; text: string }[] = [
  { role: 'USER', text: 'Hola, soy Camila. ¿Dónde está mi pedido 4821?' },
  { role: 'ASSISTANT', text: `Va en ruta con ${ORDER.carrier}, seguimiento ${ORDER.tracking}. Llega el 14 de noviembre.` },
  { role: 'USER', text: 'Gracias. Desde ahora avísame por WhatsApp, no por correo. Y siempre despacho a Valparaíso.' },
  { role: 'ASSISTANT', text: 'Anotado.' },
  { role: 'USER', text: 'El polar del pedido 4790 me quedó chico. ¿Lo puedo cambiar por talla L?' },
  { role: 'ASSISTANT', text: 'Sí, estás dentro del plazo de 30 días. Dejo registrada la solicitud de cambio.' },
]

export type StrategyId = 'SEMANTIC' | 'USER_PREFERENCE' | 'SUMMARIZATION'

export const STRATEGIES: { id: StrategyId; label: string; extracts: string; template: string; ns: (actor: string) => string; records: string[] }[] = [
  {
    id: 'SEMANTIC',
    label: 'SEMANTIC',
    extracts: 'hechos',
    template: '/users/{actorId}/facts/',
    ns: (a) => `/users/${a}/facts/`,
    records: ['El pedido 4821 va en ruta con AndesExpress (AX-88213-CL).', 'El polar del pedido 4790 le quedó chico; pidió cambiarlo por talla L.'],
  },
  {
    id: 'USER_PREFERENCE',
    label: 'USER_PREFERENCE',
    extracts: 'preferencias',
    template: '/users/{actorId}/preferences/',
    ns: (a) => `/users/${a}/preferences/`,
    records: ['Prefiere avisos por WhatsApp, no por correo.', 'Despacha siempre a Valparaíso.'],
  },
  {
    id: 'SUMMARIZATION',
    label: 'SUMMARIZATION',
    extracts: 'resumen de la sesión',
    template: '/summaries/{actorId}/{sessionId}/',
    ns: (a) => `/summaries/${a}/${SESSION_1}/`,
    records: ['Consultó por el pedido 4821 y pidió cambiar por talla L el polar del pedido 4790.'],
  },
]

export const QUESTION_2 = '¿En qué quedó lo del polar? Y avísame cuando llegue el otro pedido.'

export const MEMORY_STEPS: StepInfo[] = [
  {
    title: 'Sesión 1: cada turno se guarda como evento',
    body: (
      <>
        Mientras conversan, el session manager llama a <code>CreateEvent</code> con <code>actorId</code> y <code>sessionId</code>. Son los mensajes tal cual,
        sin interpretar: eso es la memoria de corto plazo.
      </>
    ),
  },
  {
    title: 'Después: las estrategias extraen en segundo plano',
    body: (
      <>
        Cada estrategia activa lee los eventos nuevos y escribe registros en su namespace (extracción + consolidación). Es <strong>asíncrono</strong>, y solo
        procesa eventos guardados después de que la estrategia quedó <code>ACTIVE</code>.
      </>
    ),
  },
  {
    title: 'Sesión 2: qué se carga al empezar',
    body: (
      <>
        Los turnos anteriores solo vuelven si el <code>sessionId</code> es el mismo. Los registros de largo plazo se buscan por significado con{' '}
        <code>RetrieveMemoryRecords</code> dentro de los namespaces del cliente que escribe.
      </>
    ),
  },
  {
    title: 'Andi responde con lo que encontró',
    body: <>Lo que no está en los turnos recuperados ni en los registros, Andi no lo sabe y tiene que preguntarlo otra vez.</>,
  },
]

export { CUSTOMER }

/* -------------------------------------------------------------------------- */
/* Código final, terminal y consola                                             */
/* -------------------------------------------------------------------------- */

export const FINAL_CODE = `import os
from mcp.client.streamable_http import streamablehttp_client
from strands import Agent
from strands.models import BedrockModel
from strands.tools.mcp.mcp_client import MCPClient
from bedrock_agentcore.memory.integrations.strands.config import AgentCoreMemoryConfig, RetrievalConfig
from bedrock_agentcore.memory.integrations.strands.session_manager import AgentCoreMemorySessionManager

REGION = "${REGION}"
GATEWAY_URL = "${GATEWAY_URL}"
MEMORY_ID = os.environ["MEMORY_ANDIMEMORY_ID"]      # MEMORY_<NAME>_ID: el runtime la expone sola

model = BedrockModel(model_id="global.anthropic.claude-sonnet-5-5", region_name=REGION)

def answer(prompt: str, actor_id: str, session_id: str, token: str) -> str:
    # Uno por conversación: nunca un session manager global compartido entre clientes.
    session_manager = AgentCoreMemorySessionManager(
        AgentCoreMemoryConfig(
            memory_id=MEMORY_ID, session_id=session_id, actor_id=actor_id,
            retrieval_config={
                f"/users/{actor_id}/facts/": RetrievalConfig(top_k=3, relevance_score=0.5),
                f"/users/{actor_id}/preferences/": RetrievalConfig(top_k=3, relevance_score=0.5),
            },
        ),
        REGION,
    )
    gateway = MCPClient(lambda: streamablehttp_client(
        GATEWAY_URL, headers={"Authorization": f"Bearer {token}"}
    ))
    with gateway:                                    # el agente se usa dentro del with
        agent = Agent(
            model=model,
            tools=gateway.list_tools_sync(),
            session_manager=session_manager,
            system_prompt=SYSTEM_PROMPT,
        )
        result = agent(prompt)
    return result.message["content"][0]["text"]

print(answer("¿En qué quedó lo del polar?", "cus_7781", "soporte-2026-11-13", token))
`

export const CODE_PARTS: { id: string; label: string; tone: Tone; needles: string[]; note: ReactNode }[] = [
  {
    id: 'gateway',
    label: 'Herramientas',
    tone: 'tool',
    needles: ['GATEWAY_URL', 'gateway = MCPClient', 'headers={"Authorization"', 'with gateway', 'tools=gateway.list_tools_sync()', '    ))'],
    note: (
      <>
        Ni una función <code>@tool</code>, ni un secreto de negocio. Las herramientas llegan del Gateway en tiempo de ejecución; el token de entrada es de quien
        está conversando.
      </>
    ),
  },
  {
    id: 'memory',
    label: 'Memoria',
    tone: 'memory',
    needles: ['MEMORY_ID', 'AgentCoreMemorySessionManager(', 'AgentCoreMemoryConfig(', 'retrieval_config', 'RetrievalConfig(top_k', 'session_manager=session_manager', '        REGION,'],
    note: (
      <>
        Un solo objeto hace las dos cosas: guarda cada turno como evento (corto plazo) y, antes de responder, busca en los namespaces de{' '}
        <code>retrieval_config</code> (largo plazo). Es el archivo que la plantilla del CLI genera en <code>app/agent/memory/session.py</code>.
      </>
    ),
  },
  {
    id: 'scope',
    label: 'Por conversación',
    tone: 'user',
    needles: ['def answer(', '# Uno por conversación', 'session_id=session_id, actor_id=actor_id', 'f"/users/{actor_id}'],
    note: (
      <>
        <code>actor_id</code> y <code>session_id</code> entran como parámetros y el agente se arma dentro de la función. Un <code>Agent</code> a nivel de módulo
        se reutiliza entre invocaciones: en multiusuario mezclaría clientes.
      </>
    ),
  },
]

const LIST_OUT = JSON.stringify(toolsListResponse({ orders: true, carrier: false, erp: false }, false))

export const TERM_SETUP: TermLine[] = [
  comment('Un gateway y su primer target: la Lambda que consulta la base de pedidos'),
  cmd(`agentcore add gateway --name ${GATEWAY_NAME} --authorizer-type NONE`),
  dim('  NONE = sin autenticación entrante; solo para desarrollo'),
  ok(`✓ gateway ${GATEWAY_NAME} agregado a agentcore/agentcore.json`, 300),
  cmd(
    `agentcore add gateway-target --gateway ${GATEWAY_NAME} --target-configuration '{"name": "OrdersDb", "targetType": "lambdaFunctionArn", "lambdaFunctionArn": {"lambdaArn": "arn:aws:lambda:${REGION}:${ACCOUNT}:function:andes-orders", "toolSchemaFile": "tools.json"}}'`,
  ),
  ok('✓ target OrdersDb agregado', 300),
  blank(),
  comment('Una memoria con una estrategia de largo plazo'),
  cmd(`agentcore add memory --name ${MEMORY_NAME} --strategies SEMANTIC`),
  ok(`✓ memory ${MEMORY_NAME} agregada`, 300),
  blank(),
  cmd('agentcore deploy'),
  out(`Desplegando stack AgentCore-AndesOps-default …`, 700),
  ok('✓ Deploy completo (2–3 minutos con memoria)', 400),
  blank(),
  comment('Probar el endpoint MCP sin escribir un agente'),
  cmd(`agentcore invoke --gateway ${GATEWAY_NAME} --path /mcp --payload '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'`),
  out(LIST_OUT.slice(0, 118) + ' …', 400),
  blank(),
  comment('La memoria: estado, eventos y registros'),
  cmd(`agentcore memory get --id ${MEMORY_ID}`),
  ok('status: ACTIVE', 300),
  cmd(`agentcore memory event list --id ${MEMORY_ID} --actor-id cus_7781 --session-id ${SESSION_1}`),
  out('6 eventos', 300),
  cmd(`agentcore memory record list --id ${MEMORY_ID} --namespace-path /`),
  out('/users/cus_7781/facts/   El pedido 4821 va en ruta con AndesExpress (AX-88213-CL).'),
  out('/users/cus_7781/facts/   El polar del pedido 4790 le quedó chico; pidió cambiarlo por talla L.'),
]

export const LAMBDA_CODE = `def lambda_handler(event, context):
    # El Gateway dice qué tool pidió el agente, con el prefijo del target:
    tool_name = context.client_context.custom["bedrockAgentCoreToolName"]
    tool = tool_name.split("___", 1)[1]      # "OrdersDb___get_order_status" -> "get_order_status"
    ...                                      # despacha a tu función y devuelve su resultado
`

export const CONSOLE_STEPS: StepInfo[] = [
  {
    title: 'Página Gateways',
    body: (
      <>
        La consola de AgentCore lista los gateways en <code>/bedrock-agentcore/toolsAndGateways</code>. Lo que desplegaste con el CLI aparece aquí; selecciónalo.
      </>
    ),
  },
  {
    title: 'Log delivery → Add',
    body: <>Dentro del gateway, el panel <strong>Log delivery</strong> envía sus logs a un destino. Sin esto no verás qué tools se llamaron ni con qué resultado.</>,
  },
  {
    title: 'Tracing → Edit',
    body: <>El panel <strong>Tracing</strong> activa las trazas del gateway: cada <code>tools/call</code> queda como span junto a los del agente.</>,
  },
  {
    title: 'Resources → Memory',
    body: (
      <>
        En el panel izquierdo, bajo <strong>Resources</strong>, está <strong>Memory</strong>. Arriba tienes <strong>Create memory</strong>; la que creó el CLI ya
        figura en la lista.
      </>
    ),
  },
  {
    title: 'Tracing: Edit → Enable → Save',
    body: <>La memoria tiene los mismos dos paneles, <strong>Log delivery</strong> y <strong>Tracing</strong>. En Tracing: <strong>Edit</strong>, <strong>Enable</strong>, <strong>Save</strong>.</>,
  },
]
