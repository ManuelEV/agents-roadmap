import type { Tone } from '@/components/ui'
import { runTool } from '@/sim/andes'

/* Todo lo de este archivo sale de docs/research/aws-2026-11.md (§1, §2, §9, §10, §11).
   Los identificadores de cuenta, ARN y nombres de target son de ejemplo, con el formato de la doc. */

export const PRICE_DATE = '15-nov-2026'
const AC = 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/'
const BR = 'https://docs.aws.amazon.com/bedrock/latest/userguide/'

/* -------------------------------------------------------------------------- */
/* Lab 1 · Mapa de piezas                                                      */
/* -------------------------------------------------------------------------- */

export type Status = 'ga' | 'disp' | 'parcial' | 'preview' | 'pre1' | 'mant' | 'retiro'
export const STATUS: Record<Status, { label: string; tone: Tone }> = {
  ga: { label: 'GA', tone: 'ok' },
  disp: { label: 'Disponible', tone: 'ok' },
  parcial: { label: 'GA parcial', tone: 'guard' },
  preview: { label: 'Preview', tone: 'guard' },
  pre1: { label: 'pre-1.0', tone: 'guard' },
  mant: { label: 'Mantenimiento', tone: 'error' },
  retiro: { label: 'En retirada', tone: 'error' },
}

export type LayerId = 'framework' | 'agentcore' | 'bedrock' | 'alrededor'
export const LAYERS: { id: LayerId; title: string; blurb: string }[] = [
  { id: 'framework', title: 'Strands Agents', blurb: 'Framework · el código que escribes' },
  { id: 'agentcore', title: 'Amazon Bedrock AgentCore', blurb: 'Operación · donde corre y se gobierna' },
  { id: 'bedrock', title: 'Amazon Bedrock', blurb: 'Modelos · la inferencia' },
  { id: 'alrededor', title: 'Alrededor', blurb: 'Productos vecinos que vas a oír nombrar' },
]

export type Piece = {
  id: string
  layer: LayerId
  name: string
  tone: Tone
  status: Status
  /** estado y fechas tal como aparecen en las release notes */
  when: string
  formerly?: string
  renamed?: boolean
  what: string
  detail: string
  doc: string
  lesson?: 'primer-agente' | 'herramientas-memoria' | 'desplegar' | 'gobernar'
}

export const PIECES: Piece[] = [
  /* --- Framework --- */
  {
    id: 'strands',
    layer: 'framework',
    name: 'Strands Agents SDK',
    tone: 'model',
    status: 'ga',
    when: 'Open source desde el 16-may-2025 · 1.0 el 15-jul-2025 · Python 1.65.0 y TypeScript 1.25.0 (13-nov-2026)',
    formerly: 'la doc lo presenta ahora como Strands Harness SDK',
    renamed: true,
    what: 'SDK open source y model-driven para escribir agentes en Python o TypeScript.',
    detail:
      'Tú declaras modelo, prompt y herramientas (@tool); el modelo decide el siguiente paso. El paquete sigue llamándose strands-agents y el repo es strands-agents/harness-sdk. Habla con Bedrock por defecto, pero tiene proveedores para Anthropic, OpenAI, Gemini, Ollama y otros.',
    doc: 'https://strandsagents.com/',
    lesson: 'primer-agente',
  },
  {
    id: 'strands-harness',
    layer: 'framework',
    name: 'Strands harness',
    tone: 'model',
    status: 'pre1',
    when: 'strands-harness 0.4.0 (12-nov-2026) · CLI @strands-agents/cli 0.3.0',
    what: 'Un agente ya ensamblado sobre el SDK, con su CLI strands.',
    detail: 'Es pre-1.0: sirve para explorar, no para fijar una API en producción. No lo confundas con AgentCore harness, que es un servicio gestionado de AWS.',
    doc: 'https://strandsagents.com/docs/user-guide/harness/quickstart/',
  },
  {
    id: 'strands-evals',
    layer: 'framework',
    name: 'Strands Evals',
    tone: 'system',
    status: 'ga',
    when: 'strands-agents-evals 1.9.0 (4-nov-2026)',
    what: 'Casos, evaluadores y experimentos para medir un agente desde Python.',
    detail: 'Defines Case y Experiment, eliges evaluadores y corres run_evaluations. Por defecto el juez es Claude en Bedrock.',
    doc: 'https://strandsagents.com/docs/user-guide/evals-sdk/quickstart/',
  },
  {
    id: 'strands-tools',
    layer: 'framework',
    name: 'strands-agents-tools',
    tone: 'tool',
    status: 'pre1',
    when: '0.9.0 (4-nov-2026)',
    what: 'Herramientas comunitarias listas: calculator, file_read, http_request…',
    detail: 'Se importan desde strands_tools. El quickstart nuevo usa además las vended tools del propio SDK (from strands.vended_tools import file_editor).',
    doc: 'https://strandsagents.com/docs/user-guide/sdk/quickstart/python/',
    lesson: 'primer-agente',
  },

  /* --- AgentCore --- */
  {
    id: 'runtime',
    layer: 'agentcore',
    name: 'Runtime',
    tone: 'system',
    status: 'ga',
    when: 'Preview jul-2025 · GA oct-2025 · platform version V2 y compute type Instances en 2026',
    what: 'Hosting serverless de agentes y herramientas, con cada sesión aislada en su propia microVM.',
    detail:
      'Habla cuatro protocolos: HTTP, MCP, A2A y AG-UI. Una sesión vive hasta 8 horas y se apaga tras 15 minutos sin actividad. Hospeda Strands, pero también LangGraph, CrewAI, LlamaIndex, Google ADK y OpenAI Agents SDK.',
    doc: `${AC}agents-tools-runtime.html`,
    lesson: 'desplegar',
  },
  {
    id: 'harness',
    layer: 'agentcore',
    name: 'Harness',
    tone: 'model',
    status: 'ga',
    when: 'Preview abr-2026 · GA anunciada en AWS Summit New York (17-jun-2026); las release notes la listan en julio',
    what: 'Loop de agente gestionado: declaras modelo, prompt y herramientas, sin escribir el loop.',
    detail:
      'CreateHarness / InvokeHarness. Corre dentro de Runtime y está «powered by Strands Agents». No deja elegir framework ni usar patrones graph/workflow; se puede exportar a código Strands.',
    doc: `${AC}harness.html`,
  },
  {
    id: 'memory',
    layer: 'agentcore',
    name: 'Memory',
    tone: 'memory',
    status: 'ga',
    when: 'GA oct-2025 · memoria episódica dic-2025 · TTL de registros y precio por consumo oct-2026',
    what: 'Memoria de corto plazo (eventos de la conversación) y de largo plazo (registros extraídos por estrategias).',
    detail: 'El corto plazo se guarda por actorId + sessionId. El largo plazo lo extrae un LLM de forma asíncrona con estrategias como SEMANTIC o USER_PREFERENCE.',
    doc: `${AC}memory.html`,
    lesson: 'herramientas-memoria',
  },
  {
    id: 'gateway',
    layer: 'agentcore',
    name: 'Gateway',
    tone: 'tool',
    status: 'ga',
    when: 'GA oct-2025 · inference y HTTP targets en 2026 · model fallback y Step Functions oct-2026',
    what: 'Punto de entrada único a las herramientas: convierte APIs, Lambda y servicios en tools MCP.',
    detail: 'El Gateway es un servidor MCP. Agrega funciones Lambda, esquemas OpenAPI, modelos Smithy y servidores MCP remotos; además hace proxy HTTP hacia agentes A2A y enruta inferencia.',
    doc: `${AC}gateway.html`,
    lesson: 'herramientas-memoria',
  },
  {
    id: 'identity',
    layer: 'agentcore',
    name: 'Identity',
    tone: 'guard',
    status: 'ga',
    when: 'GA oct-2025 · OBO token exchange abr-2026 · Consent Portal sep-2026',
    what: 'Identidad propia del agente (workload identity), OAuth entrante y saliente, API keys y token vault.',
    detail: 'El agente nunca ve secretos de larga duración: pide credenciales al token vault. Soporta acceso delegado por el usuario (3LO) y autónomo (2LO).',
    doc: `${AC}identity.html`,
    lesson: 'gobernar',
  },
  {
    id: 'policy',
    layer: 'agentcore',
    name: 'Policy',
    tone: 'guard',
    status: 'ga',
    when: 'Preview 2-dic-2025 · GA mar-2026 · Guardrails dentro de políticas en 2026',
    what: 'Control determinista de cada llamada a herramienta, aplicado en el Gateway y fuera del código del agente.',
    detail: 'Las políticas se escriben en Cedar o en Dogwood (compatible con Cedar; añade condiciones temporales). En modo ENFORCE todo está denegado salvo lo que una política permita.',
    doc: `${AC}policy.html`,
    lesson: 'gobernar',
  },
  {
    id: 'observability',
    layer: 'agentcore',
    name: 'Observability',
    tone: 'system',
    status: 'ga',
    when: 'GA oct-2025',
    what: 'Trazas, métricas y logs del agente en Amazon CloudWatch, en formato OpenTelemetry.',
    detail: 'Los agentes desplegados con el CLI quedan instrumentados automáticamente. Sirve también para agentes que corren fuera de Runtime.',
    doc: `${AC}observability.html`,
    lesson: 'gobernar',
  },
  {
    id: 'evaluations',
    layer: 'agentcore',
    name: 'Evaluations',
    tone: 'system',
    status: 'ga',
    when: 'Preview 2-dic-2025 · GA mar-2026 · batch GA en 2026 · dataset en preview',
    what: 'Evaluación de agentes sobre sus trazas: online, on-demand, batch y simulación.',
    detail: 'LLM-as-a-Judge con evaluadores integrados (Builtin.Helpfulness, Builtin.GoalSuccessRate…) o propios. Evalúa agentes dentro o fuera de Runtime.',
    doc: `${AC}evaluations.html`,
  },
  {
    id: 'optimization',
    layer: 'agentcore',
    name: 'Optimization',
    tone: 'system',
    status: 'parcial',
    when: 'Preview may-2026 · Recommendations y A/B testing GA en 2026 · Insights en preview',
    what: 'Recomendaciones generadas por IA sobre prompts y descripciones de herramientas, con A/B testing vía Gateway.',
    detail: 'Guarda la configuración en configuration bundles versionados para comparar variantes con tráfico real.',
    doc: `${AC}optimization.html`,
  },
  {
    id: 'registry',
    layer: 'agentcore',
    name: 'Registry',
    tone: 'data',
    status: 'ga',
    when: 'Preview abr-2026 · GA ago-2026',
    formerly: 'nombre completo: AWS Agent Registry',
    what: 'Catálogo gobernado de agentes, servidores MCP, herramientas, skills y recursos propios.',
    detail: 'Búsqueda híbrida sobre lo que tu organización ya publicó, para no construir dos veces la misma herramienta.',
    doc: `${AC}registry.html`,
  },
  {
    id: 'code-interpreter',
    layer: 'agentcore',
    name: 'Code Interpreter',
    tone: 'tool',
    status: 'ga',
    when: 'GA oct-2025',
    what: 'Sandbox para que el agente ejecute código Python, JavaScript o TypeScript.',
    detail: 'Una herramienta integrada: el código que escribe el modelo corre aislado, no en tu runtime.',
    doc: `${AC}code-interpreter-tool.html`,
  },
  {
    id: 'browser',
    layer: 'agentcore',
    name: 'Browser',
    tone: 'tool',
    status: 'ga',
    when: 'GA oct-2025',
    what: 'Navegador gestionado en la nube para agentes (Playwright, BrowserUse).',
    detail: 'La otra herramienta integrada: sesiones de navegador aisladas que el agente controla.',
    doc: `${AC}browser-tool.html`,
  },
  {
    id: 'web-search',
    layer: 'agentcore',
    name: 'Web Search',
    tone: 'tool',
    status: 'ga',
    when: 'Web Search Tool (connector de Gateway) GA en 2026 · API InvokeWebSearch y connector Web Answer nuevos en nov-2026',
    what: 'Búsqueda web gestionada, como connector del Gateway o como API directa.',
    detail: 'Web Answer solo está en us-east-1. Es de lo más caro del catálogo para pruebas: US$ 7,00 por 1.000 consultas (visto el 15-nov-2026).',
    doc: `${AC}web-search-api.html`,
  },
  {
    id: 'payments',
    layer: 'agentcore',
    name: 'Payments',
    tone: 'tool',
    status: 'preview',
    when: 'Preview may-2026 · si ya es GA está por confirmar en la documentación',
    what: 'Micropagos para agentes con los protocolos x402 y Machine Payments Protocol (MPP).',
    detail: 'Usa wallets de Coinbase CDP y Stripe (Privy).',
    doc: `${AC}payments.html`,
  },
  {
    id: 'cli',
    layer: 'agentcore',
    name: 'AgentCore CLI',
    tone: 'system',
    status: 'ga',
    when: 'Preview feb-2026 · GA mar-2026 (v0.4.0) · v1.0 oct-2026 · actual 1.0.3 (13-nov-2026)',
    formerly: 'reemplaza al starter toolkit de Python (bedrock-agentcore-starter-toolkit)',
    renamed: true,
    what: 'El comando agentcore: crea, prueba en local, despliega e invoca proyectos de AgentCore.',
    detail: 'Se instala con npm (@aws/agentcore). Si tienes el toolkit antiguo de pip instalado, tapa al comando nuevo: desinstálalo.',
    doc: `${AC}agentcore-get-started-cli.html`,
    lesson: 'desplegar',
  },
  {
    id: 'mcp-server',
    layer: 'agentcore',
    name: 'AgentCore MCP Server',
    tone: 'system',
    status: 'disp',
    when: 'Disponible desde abr-2026 en awslabs/mcp',
    what: 'Servidor MCP para que tu asistente de código trabaje con AgentCore.',
    detail: 'No es parte del agente de producción: es una ayuda para quien lo desarrolla.',
    doc: `${AC}mcp-getting-started.html`,
  },

  /* --- Bedrock --- */
  {
    id: 'bedrock',
    layer: 'bedrock',
    name: 'Modelos en Bedrock',
    tone: 'model',
    status: 'ga',
    when: 'GA · Claude Fable 5.2 y Mythos 5.2 llegaron el 9-nov-2026',
    what: 'Inferencia gestionada sobre modelos de Anthropic, Amazon (Nova), OpenAI, Meta, Mistral, xAI, DeepSeek, Google (Gemma) y otros.',
    detail: 'Los Claude son modelos de terceros facturados vía AWS Marketplace: aparecen en la factura bajo el proveedor, no bajo «Amazon Bedrock».',
    doc: `${BR}model-cards.html`,
  },
  {
    id: 'converse',
    layer: 'bedrock',
    name: 'Converse API',
    tone: 'model',
    status: 'ga',
    when: 'GA · solo en el endpoint bedrock-runtime',
    what: 'API unificada de chat y tool use (Converse / ConverseStream). Es la que usa Strands con BedrockModel.',
    detail:
      'Hay dos endpoints. bedrock-runtime.{region}.amazonaws.com es el recomendado y soporta Converse, perfiles entre regiones, Guardrails y prompt caching. bedrock-mantle.{region}.api.aws ofrece APIs compatibles con OpenAI y Anthropic, pero no soporta Converse, perfiles entre regiones ni Guardrails.',
    doc: `${BR}endpoints.html`,
    lesson: 'primer-agente',
  },
  {
    id: 'profiles',
    layer: 'bedrock',
    name: 'Inference profiles',
    tone: 'model',
    status: 'ga',
    when: 'GA',
    what: 'Id de modelo con prefijo de alcance (global., us., eu., au., jp.…) que enruta la petición a varias regiones.',
    detail:
      'Los Claude 5.x no tienen endpoint in-region en bedrock-runtime (salvo Opus 5.5 en Londres): se invocan con perfil, por ejemplo global.anthropic.claude-sonnet-5-5. IAM y los SCP deben permitir todas las regiones destino.',
    doc: `${BR}inference-profiles-support.html`,
    lesson: 'primer-agente',
  },
  {
    id: 'guardrails',
    layer: 'bedrock',
    name: 'Bedrock Guardrails',
    tone: 'guard',
    status: 'ga',
    when: 'GA',
    what: 'Políticas de contenido reutilizables: filtros de contenido, temas denegados, PII, grounding y Automated Reasoning.',
    detail: 'Se aplican en línea con Converse, con la API ApplyGuardrail sobre cualquier modelo, o dentro de Policy en el Gateway.',
    doc: `${BR}guardrails.html`,
    lesson: 'gobernar',
  },
  {
    id: 'kb',
    layer: 'bedrock',
    name: 'Knowledge Bases',
    tone: 'data',
    status: 'ga',
    when: 'GA · Managed Knowledge Base anunciada en el Summit de jun-2026',
    what: 'RAG gestionado, en dos tipos: Managed (recomendado) y Customer-managed.',
    detail: 'En Managed, Bedrock opera ingesta, índice y recuperación, y se integra de forma nativa con AgentCore Gateway. En Customer-managed operas tú el vector store.',
    doc: `${BR}knowledge-base.html`,
  },
  {
    id: 'caching',
    layer: 'bedrock',
    name: 'Prompt caching',
    tone: 'model',
    status: 'ga',
    when: 'GA',
    what: 'Cache checkpoints sobre system, messages y tools para no pagar el mismo prefijo a precio completo.',
    detail: 'En Claude 5.x: mínimo 512 tokens por checkpoint, máximo 4 checkpoints y TTL de 5 minutos o 1 hora.',
    doc: `${BR}prompt-caching.html`,
  },
  {
    id: 'classic',
    layer: 'bedrock',
    name: 'Bedrock Agents Classic',
    tone: 'system',
    status: 'mant',
    when: 'Lanzado en nov-2023 · sin clientes nuevos desde el 30-jul-2026',
    formerly: 'Amazon Bedrock Agents',
    renamed: true,
    what: 'El servicio de agentes de 2023 (action groups, alias). Está en modo mantenimiento.',
    detail:
      'Los clientes existentes siguen funcionando. La migración recomendada es a AgentCore harness o a agentes en código sobre AgentCore. Si un tutorial habla de action groups, es de esta generación.',
    doc: `${BR}agents-classic-maintenance-mode.html`,
  },

  /* --- Alrededor --- */
  {
    id: 'nova-act',
    layer: 'alrededor',
    name: 'Amazon Nova Act',
    tone: 'tool',
    status: 'ga',
    when: 'GA dic-2025 · solo en US East (N. Virginia)',
    what: 'Servicio para construir y operar flotas de agentes que automatizan flujos de interfaz en el navegador.',
    detail: 'Tiene modelo propio y SDK de Python, y despliega sobre AgentCore Runtime y Browser.',
    doc: 'https://docs.aws.amazon.com/nova-act/latest/userguide/what-is-nova-act.html',
  },
  {
    id: 'quick',
    layer: 'alrededor',
    name: 'AWS Quick',
    tone: 'user',
    status: 'ga',
    when: 'Lanzado como Amazon Quick Suite el 9-oct-2025',
    formerly: 'Amazon Quick Suite',
    renamed: true,
    what: 'Espacio de trabajo con IA para empleados: chat, research, flows, apps sin código y dashboards.',
    detail: 'No es donde programas agentes: es donde los empleados los usan.',
    doc: 'https://aws.amazon.com/quick/',
  },
  {
    id: 'kiro',
    layer: 'alrededor',
    name: 'Kiro',
    tone: 'system',
    status: 'disp',
    when: 'Disponible · la fecha de GA está por confirmar en la documentación',
    formerly: 'sucesor recomendado de Amazon Q Developer (IDE)',
    renamed: true,
    what: 'Sistema de ingeniería agéntica para desarrollo guiado por specs: IDE, CLI, web y app móvil.',
    detail: 'Los plugins de IDE y las suscripciones pagas de Amazon Q Developer llegan a fin de soporte el 30-abr-2027 y no aceptan altas desde el 15-may-2026.',
    doc: 'https://kiro.dev/faq/',
  },
  {
    id: 'marketplace',
    layer: 'alrededor',
    name: 'Marketplace · AI Agents and Tools',
    tone: 'data',
    status: 'ga',
    when: 'GA',
    what: 'Categoría de AWS Marketplace con agentes pre-construidos, herramientas (incluye servidores MCP), knowledge bases y guardrails.',
    detail: 'Algunos de esos agentes y herramientas se ejecutan con AgentCore Runtime o se conectan vía AgentCore Gateway.',
    doc: 'https://aws.amazon.com/marketplace/solutions/ai-agents-and-tools',
  },
]

export const LESSON_TITLES: Record<NonNullable<Piece['lesson']>, string> = {
  'primer-agente': 'Tu primer agente',
  'herramientas-memoria': 'Herramientas y memoria',
  desplegar: 'Desplegar',
  gobernar: 'Gobernar',
}

/* -------------------------------------------------------------------------- */
/* Lab 2 · El recorrido de una pregunta                                        */
/* -------------------------------------------------------------------------- */

export const REGION = 'us-east-1'
export const SESSION_ID = '3f6c1e52-8a47-4d0b-9c1e-7b2a5d9e4f10'
export const ORCH_MODEL = 'global.anthropic.claude-sonnet-5-5'
/** Nombre de tool en el Gateway: <TargetName>___<tool> (tres guiones bajos). */
export const GW_TOOL = 'OrdersTarget___get_order_status'
export const QUESTION = '¿Dónde está mi pedido 4821?'
export const ANSWER = 'Tu pedido 4821 va en ruta con AndesExpress (seguimiento AX-88213-CL). Llegada estimada: 14 de noviembre.'

const orderResult = JSON.stringify(runTool('get_order_status', { order_id: '4821' }), null, 2)

export type PathStep = {
  title: string
  body: string
  flows: string[]
  active?: string[]
  /** lo que viaja en este paso, con nombres reales de API */
  wireTitle: string
  wire: string
  lang: 'python' | 'json' | 'http' | 'text'
  pieces: { name: string; tone: Tone; lesson?: Piece['lesson'] }[]
}

export const PATH: PathStep[] = [
  {
    title: 'Camila pregunta y tu backend invoca al agente',
    body: 'Camila escribe en la app de Andes Market. Tu backend no llama al modelo: llama a AgentCore Runtime con el ARN del agente, un id de sesión y el prompt. El id de sesión debe tener al menos 33 caracteres, así que se usa un UUID.',
    flows: ['user>app', 'app>rt'],
    wireTitle: 'boto3 · cliente bedrock-agentcore',
    lang: 'python',
    wire: `ARN = (
    "arn:aws:bedrock-agentcore:${REGION}:123456789012"
    ":runtime/AndesMarket_default_agent-PGgpqs8dg5"
)
SESSION = "${SESSION_ID}"  # 33 o más
prompt = "${QUESTION}"

client.invoke_agent_runtime(
    agentRuntimeArn=ARN,
    runtimeSessionId=SESSION,
    payload=json.dumps({"prompt": prompt}).encode(),
)`,
    pieces: [{ name: 'AgentCore Runtime', tone: 'system', lesson: 'desplegar' }],
  },
  {
    title: 'Identity autentica la entrada; Runtime abre la sesión',
    body: 'La llamada entra con IAM (SigV4) o con un JWT de OAuth 2.0. Runtime asigna a esa sesión su propia microVM, con CPU, memoria y sistema de archivos aislados, y entrega el payload al entrypoint de tu agente.',
    flows: ['id>rt'],
    active: ['rt', 'id'],
    wireTitle: 'Contrato HTTP del contenedor · puerto 8080',
    lang: 'http',
    wire: `POST /invocations
X-Amzn-Bedrock-AgentCore-Runtime-Session-Id: ${SESSION_ID}
Content-Type: application/json

{"prompt": "${QUESTION}"}`,
    pieces: [
      { name: 'AgentCore Identity', tone: 'guard', lesson: 'gobernar' },
      { name: 'AgentCore Runtime', tone: 'system', lesson: 'desplegar' },
    ],
  },
  {
    title: 'Andi recupera lo que ya sabe de Camila',
    body: 'El estado en la microVM es efímero, así que el historial vive en AgentCore Memory. Los eventos de corto plazo se guardan por actor y sesión; los registros de largo plazo (preferencias, hechos) se buscan por namespace.',
    flows: ['rt>mem'],
    wireTitle: 'AgentCore Memory · lo que identifica a Camila',
    lang: 'text',
    wire: `actorId     cus_7781
sessionId   ${SESSION_ID}
corto plazo ListEvents             → los turnos de esta conversación
largo plazo RetrieveMemoryRecords  → namespace /users/cus_7781/facts`,
    pieces: [{ name: 'AgentCore Memory', tone: 'memory', lesson: 'herramientas-memoria' }],
  },
  {
    title: 'Strands llama al modelo en Bedrock',
    body: 'Strands envía a la API Converse el system prompt, el historial y las descripciones de las herramientas. El id del modelo es un perfil de inferencia global. Si el modelo lleva un guardrail, Bedrock evalúa el mensaje de Camila antes de responder.',
    flows: ['rt>bedrock', 'bedrock>guard'],
    wireTitle: 'Strands · el modelo del agente',
    lang: 'python',
    wire: `model = BedrockModel(
    model_id="${ORCH_MODEL}",
    region_name="${REGION}",
    guardrail_id="your-guardrail-id",
    guardrail_version="1",
)`,
    pieces: [
      { name: 'Strands Agents', tone: 'model', lesson: 'primer-agente' },
      { name: 'Amazon Bedrock', tone: 'model', lesson: 'primer-agente' },
      { name: 'Bedrock Guardrails', tone: 'guard', lesson: 'gobernar' },
    ],
  },
  {
    title: 'El modelo no responde: pide una herramienta',
    body: 'Claude no sabe dónde está el pedido. Termina su turno con stop_reason tool_use y Strands emite el evento current_tool_use con el nombre y los argumentos. El nombre lleva el prefijo del target porque la herramienta vive detrás del Gateway.',
    flows: ['bedrock>rt'],
    wireTitle: 'Strands · evento del stream',
    lang: 'json',
    wire: `{
  "current_tool_use": {
    "toolUseId": "tooluse_4821a",
    "name": "${GW_TOOL}",
    "input": { "order_id": "4821" }
  }
}`,
    pieces: [{ name: 'Strands Agents', tone: 'model', lesson: 'primer-agente' }],
  },
  {
    title: 'Gateway recibe la llamada MCP y Policy decide',
    body: 'Para el agente, el Gateway es un servidor MCP más. Antes de ejecutar nada, el policy engine evalúa la llamada: en modo ENFORCE todo está denegado salvo que una política lo permita. Esta sí lo permite, y el Gateway invoca la función Lambda con su propio rol.',
    flows: ['rt>gw', 'gw>lam'],
    wireTitle: 'Política Cedar adjunta al Gateway',
    lang: 'text',
    wire: `permit(principal,
  action == AgentCore::Action::"${GW_TOOL}",
  resource == AgentCore::Gateway::"<gateway-arn>");

permitida  →  Lambda recibe el nombre de la tool en
context.client_context.custom["bedrockAgentCoreToolName"]`,
    pieces: [
      { name: 'AgentCore Gateway', tone: 'tool', lesson: 'herramientas-memoria' },
      { name: 'Policy', tone: 'guard', lesson: 'gobernar' },
    ],
  },
  {
    title: 'El resultado vuelve y el modelo redacta',
    body: 'La Lambda consulta el sistema de pedidos y devuelve JSON. Strands lo agrega al historial y llama otra vez a Bedrock: segunda llamada al modelo, con todo el contexto reenviado. Ahora sí hay datos y el turno termina con end_turn.',
    flows: ['lam>gw', 'gw>rt', 'rt>bedrock'],
    wireTitle: 'Resultado de get_order_status',
    lang: 'json',
    wire: orderResult,
    pieces: [
      { name: 'AgentCore Gateway', tone: 'tool', lesson: 'herramientas-memoria' },
      { name: 'Amazon Bedrock', tone: 'model', lesson: 'primer-agente' },
    ],
  },
  {
    title: 'Respuesta a Camila; memoria y trazas quedan guardadas',
    body: 'El entrypoint devuelve el texto y tu backend lo muestra. El turno se guarda como evento en Memory (la extracción a largo plazo ocurre después, de forma asíncrona) y la traza completa queda en CloudWatch en formato OpenTelemetry.',
    flows: ['rt>app', 'app>user', 'rt>mem', 'rt>obs'],
    wireTitle: 'Lo que ve Camila',
    lang: 'text',
    wire: `Andi: ${ANSWER}`,
    pieces: [
      { name: 'AgentCore Memory', tone: 'memory', lesson: 'herramientas-memoria' },
      { name: 'Observability', tone: 'system', lesson: 'gobernar' },
    ],
  },
]

/* -------------------------------------------------------------------------- */
/* Lab 3 · Modelos y costo                                                     */
/* -------------------------------------------------------------------------- */

/** [input, output] en USD por 1M de tokens. */
type Price = [number, number]
export type RoleId = 'orq' | 'orq-dificil' | 'worker' | 'router'

export type Model = {
  id: string
  name: string
  vendor: 'Anthropic' | 'Amazon'
  baseId: string
  released: string
  ctx: number
  maxOut: number
  /** perfil global. */
  global?: Price
  /** filas del Price List sin sufijo _global (10 % más caras en Claude); en Nova, in-region us-east-1 */
  other: Price
  /** tarifa larga de Haiku 5.5 cuando el prompt supera `over` tokens */
  long?: { over: number; global: Price; other: Price }
  /** prefijo que se usa fuera del perfil global ('' = id base in-region) */
  otherPrefix: string
  role?: RoleId
  note: string
}

export const MODELS: Model[] = [
  {
    id: 'fable',
    name: 'Claude Fable 5.2',
    vendor: 'Anthropic',
    baseId: 'anthropic.claude-fable-5-2',
    released: '9-nov-2026',
    ctx: 1_000_000,
    maxOut: 128_000,
    global: [8, 40],
    other: [8.8, 44],
    otherPrefix: 'us.',
    note: 'El más caro de la tabla. temperature debe ser 1.0 o no enviarse, top_k no está soportado y el thinking va siempre activo. Solo en bedrock-runtime.',
  },
  {
    id: 'opus',
    name: 'Claude Opus 5.5',
    vendor: 'Anthropic',
    baseId: 'anthropic.claude-opus-5-5',
    released: '22-sep-2026',
    ctx: 1_000_000,
    maxOut: 128_000,
    global: [4, 20],
    other: [4.4, 22],
    otherPrefix: 'us.',
    role: 'orq-dificil',
    note: 'Para el orquestador cuando la tarea es difícil. El doble que Sonnet 5.5 en entrada y en salida.',
  },
  {
    id: 'sonnet',
    name: 'Claude Sonnet 5.5',
    vendor: 'Anthropic',
    baseId: 'anthropic.claude-sonnet-5-5',
    released: '28-sep-2026',
    ctx: 1_000_000,
    maxOut: 128_000,
    global: [2, 10],
    other: [2.2, 11],
    otherPrefix: 'us.',
    role: 'orq',
    note: 'El orquestador por defecto: es el modelo que el AgentCore CLI pone en un harness nuevo. Adaptive thinking activado por defecto, con esfuerzo high.',
  },
  {
    id: 'haiku',
    name: 'Claude Haiku 5.5',
    vendor: 'Anthropic',
    baseId: 'anthropic.claude-haiku-5-5',
    released: '7-oct-2026',
    ctx: 1_000_000,
    maxOut: 128_000,
    global: [0.1, 0.5],
    other: [0.11, 0.55],
    long: { over: 100_000, global: [0.5, 2.5], other: [0.55, 2.75] },
    otherPrefix: 'us.',
    role: 'worker',
    note: 'Para workers y subagentes: 20 veces más barato que Sonnet 5.5 en entrada. Ojo con el escalón: si el prompt pasa de 100.000 tokens, toda la petición se cobra a la tarifa larga (5×).',
  },
  {
    id: 'nova2lite',
    name: 'Nova 2 Lite',
    vendor: 'Amazon',
    baseId: 'amazon.nova-2-lite-v1:0',
    released: '2-dic-2025',
    ctx: 1_000_000,
    maxOut: 64_000,
    global: [0.3, 2.5],
    other: [0.33, 2.75],
    otherPrefix: '',
    note: 'El Nova con 1M de contexto. Tiene endpoint in-region con el id base, y perfil global.',
  },
  {
    id: 'novapro',
    name: 'Nova Pro',
    vendor: 'Amazon',
    baseId: 'amazon.nova-pro-v1:0',
    released: 'dic-2024',
    ctx: 300_000,
    maxOut: 10_000,
    other: [0.8, 3.2],
    otherPrefix: '',
    note: 'Contexto de 300K y salida máxima de 10K. Sin perfil global.',
  },
  {
    id: 'novalite',
    name: 'Nova Lite',
    vendor: 'Amazon',
    baseId: 'amazon.nova-lite-v1:0',
    released: 'dic-2024',
    ctx: 300_000,
    maxOut: 10_000,
    other: [0.06, 0.24],
    otherPrefix: '',
    role: 'router',
    note: 'Alternativa de router con más contexto que Micro (300K). Sin perfil global.',
  },
  {
    id: 'novamicro',
    name: 'Nova Micro',
    vendor: 'Amazon',
    baseId: 'amazon.nova-micro-v1:0',
    released: 'dic-2024',
    ctx: 128_000,
    maxOut: 10_000,
    other: [0.035, 0.14],
    otherPrefix: '',
    role: 'router',
    note: 'Lo más barato de la tabla, para enrutar o clasificar. Id base in-region y sin Marketplace. Su contexto es de 128K: un prompt más largo no cabe.',
  },
]

export const ROLES: { id: RoleId; label: string; model: string; why: string }[] = [
  { id: 'orq', label: 'Orquestador', model: 'sonnet', why: 'Decide qué herramienta llamar y redacta la respuesta final.' },
  { id: 'orq-dificil', label: 'Orquestador difícil', model: 'opus', why: 'Planes largos o razonamiento delicado, donde un error cuesta más que los tokens.' },
  { id: 'worker', label: 'Worker', model: 'haiku', why: 'Subagentes que ejecutan una tarea acotada muchas veces.' },
  { id: 'router', label: 'Router barato', model: 'novamicro', why: 'Clasificar la intención o enrutar antes de gastar en un modelo grande.' },
]

export const IN_STEPS = [500, 1_000, 2_000, 4_000, 8_000, 16_000, 32_000, 64_000, 100_000, 120_000, 150_000, 200_000]
export const OUT_STEPS = [50, 100, 200, 400, 800, 1_500, 3_000, 6_000, 12_000]
export const REQ_STEPS = [100, 500, 1_000, 5_000, 10_000, 50_000, 100_000]

export type Scope = 'global' | 'other'

export function priceOf(m: Model, scope: Scope, inTok: number): { price: Price; usedScope: Scope; long: boolean } {
  const usedScope: Scope = scope === 'global' && m.global ? 'global' : 'other'
  const long = !!m.long && inTok > m.long.over
  const price = long ? m.long![usedScope] : usedScope === 'global' ? m.global! : m.other
  return { price, usedScope, long }
}

export function modelIdFor(m: Model, usedScope: Scope) {
  return usedScope === 'global' ? `global.${m.baseId}` : `${m.otherPrefix}${m.baseId}`
}

/** Costo en USD de una pregunta: `calls` llamadas al modelo, cada una con inTok de entrada y outTok de salida. */
export function costPerQuestion(m: Model, scope: Scope, inTok: number, outTok: number, calls: number) {
  const { price } = priceOf(m, scope, inTok)
  return (calls * (inTok * price[0] + outTok * price[1])) / 1_000_000
}

/* -------------------------------------------------------------------------- */
/* Lab 4 · Línea de tiempo y renombres                                         */
/* -------------------------------------------------------------------------- */

export type TimeCat = 'agentcore' | 'strands' | 'modelos' | 'retiros'
export const TIME_CATS: Record<TimeCat, { label: string; tone: Tone }> = {
  agentcore: { label: 'AgentCore', tone: 'system' },
  strands: { label: 'Strands', tone: 'model' },
  modelos: { label: 'Modelos', tone: 'data' },
  retiros: { label: 'Retiros y renombres', tone: 'error' },
}

export const TIMELINE: { date: string; year: 2023 | 2025 | 2026; cat: TimeCat; text: string; key?: boolean }[] = [
  { date: 'nov-2023', year: 2023, cat: 'retiros', text: 'Lanzamiento de Amazon Bedrock Agents, el servicio que hoy se llama Classic.' },
  { date: '16-may-2025', year: 2025, cat: 'strands', text: 'Strands Agents SDK se publica como open source.', key: true },
  { date: '15-jul-2025', year: 2025, cat: 'strands', text: 'Strands Agents 1.0: agents-as-tools, handoffs, swarms, graphs, A2A y sesiones durables.' },
  { date: 'jul-2025', year: 2025, cat: 'agentcore', text: 'AgentCore en preview (AWS Summit New York 2025).', key: true },
  { date: '9-oct-2025', year: 2025, cat: 'retiros', text: 'Se lanza Amazon Quick Suite, que la web hoy muestra como AWS Quick.' },
  { date: 'oct-2025', year: 2025, cat: 'agentcore', text: 'AgentCore GA en 9 regiones: Runtime, Memory, Gateway, Identity, Code Interpreter, Browser y Observability.', key: true },
  { date: 'nov-2025', year: 2025, cat: 'agentcore', text: 'Direct code deployment (ZIP) en Runtime: desplegar sin contenedor.' },
  { date: '2-dic-2025', year: 2025, cat: 'agentcore', text: 're:Invent: Policy y Evaluations en preview, memoria episódica y streaming bidireccional.' },
  { date: 'dic-2025', year: 2025, cat: 'modelos', text: 'Nova Act GA y Nova 2 Lite.' },
  { date: 'feb-2026', year: 2026, cat: 'agentcore', text: 'AgentCore CLI en preview.' },
  { date: 'mar-2026', year: 2026, cat: 'agentcore', text: 'Policy GA, Evaluations GA y AgentCore CLI GA (v0.4.0); protocolo AG-UI y MCP stateful en Runtime.', key: true },
  { date: 'abr-2026', year: 2026, cat: 'agentcore', text: 'Harness y Registry en preview; São Paulo y Canadá Central; AgentCore MCP Server.' },
  { date: '30-abr-2026', year: 2026, cat: 'retiros', text: 'Anuncio: los plugins de IDE de Amazon Q Developer llegan a fin de soporte el 30-abr-2027. El sucesor recomendado es Kiro.' },
  { date: 'may-2026', year: 2026, cat: 'agentcore', text: 'Payments y Optimization en preview.' },
  { date: '17-jun-2026', year: 2026, cat: 'agentcore', text: 'AWS Summit New York 2026: anuncio de AgentCore harness GA, Managed Knowledge Base y Web Search en AgentCore.', key: true },
  { date: '30-jun / 24-jul-2026', year: 2026, cat: 'modelos', text: 'Claude Sonnet 5 y Claude Opus 5 en Bedrock.' },
  { date: '30-jul-2026', year: 2026, cat: 'retiros', text: 'Bedrock Agents Classic deja de aceptar clientes nuevos.', key: true },
  { date: 'ago-2026', year: 2026, cat: 'agentcore', text: 'AWS Agent Registry GA; compute type Instances en Runtime.' },
  { date: 'sep-2026', year: 2026, cat: 'modelos', text: 'Claude Opus 5.5 (22-sep) y Claude Sonnet 5.5 (28-sep).', key: true },
  { date: 'oct-2026', year: 2026, cat: 'modelos', text: 'Claude Haiku 5.5 (7-oct).' },
  { date: 'oct-2026', year: 2026, cat: 'agentcore', text: 'AgentCore CLI 1.0, que reemplaza al starter toolkit de Python; model fallback en Gateway; TTL en memoria de largo plazo.', key: true },
  { date: 'nov-2026', year: 2026, cat: 'modelos', text: 'Claude Fable 5.2 y Mythos 5.2 (9-nov).', key: true },
  { date: 'nov-2026', year: 2026, cat: 'strands', text: 'Strands 1.65.0 (13-nov); la doc pasa a llamar al SDK «Strands Harness SDK».' },
  { date: 'nov-2026', year: 2026, cat: 'agentcore', text: 'Runtime V2 en más regiones, API InvokeWebSearch y soporte de la versión 2026-07-28 de MCP.' },
]

export const RENAMES: { before: string; after: string; since: string; note: string }[] = [
  {
    before: 'Amazon Bedrock Agents',
    after: 'Amazon Bedrock Agents Classic',
    since: 'sin clientes nuevos desde el 30-jul-2026',
    note: 'Modo mantenimiento. Lo nuevo se construye con AgentCore harness o con código sobre AgentCore.',
  },
  {
    before: 'bedrock-agentcore-starter-toolkit (pip)',
    after: 'AgentCore CLI · @aws/agentcore (npm)',
    since: 'v1.0 en oct-2026',
    note: 'El comando se llama igual, agentcore. Si el paquete de pip sigue instalado, tapa al nuevo.',
  },
  {
    before: 'Strands Agents SDK',
    after: 'Strands Harness SDK (en la doc)',
    since: 'nov-2026',
    note: 'El paquete sigue siendo strands-agents y el import, from strands import Agent.',
  },
  {
    before: 'Amazon Quick Suite',
    after: 'AWS Quick',
    since: 'lanzado el 9-oct-2025',
    note: 'Es la app para empleados, no la plataforma donde programas.',
  },
  {
    before: 'Amazon Q Developer (plugins de IDE)',
    after: 'Kiro',
    since: 'fin de soporte el 30-abr-2027',
    note: 'Q Developer en la consola de AWS, la app móvil, Slack y Teams no se ve afectado.',
  },
]

/* -------------------------------------------------------------------------- */
/* Lab 5 · Equivalencias con Google Cloud                                      */
/* -------------------------------------------------------------------------- */

export type Match = 'directa' | 'aprox' | 'sin'
export const MATCH: Record<Match, { label: string; tone: Tone }> = {
  directa: { label: 'Equivalente', tone: 'ok' },
  aprox: { label: 'Aproximada', tone: 'guard' },
  sin: { label: 'Sin equivalente directo', tone: 'error' },
}

export type Equiv = { id: string; google: string; aws: string; match: Match; note: string; lesson?: Piece['lesson'] }

export const EQUIV: Equiv[] = [
  {
    id: 'plataforma',
    google: 'Gemini Enterprise Agent Platform (ex Vertex AI)',
    aws: 'Amazon Bedrock + Amazon Bedrock AgentCore',
    match: 'aprox',
    note: 'En Google es una sola plataforma. En AWS son dos marcas: Bedrock para los modelos y AgentCore para la operación.',
  },
  {
    id: 'framework',
    google: 'ADK',
    aws: 'Strands Agents',
    match: 'directa',
    note: 'Ambos son open source. ADK 2.0 es grafo-céntrico; Strands es model-driven, con Graph y Swarm como opción. AgentCore Runtime también hospeda agentes ADK.',
    lesson: 'primer-agente',
  },
  {
    id: 'runtime',
    google: 'Agent Runtime (ex Agent Engine)',
    aws: 'AgentCore Runtime',
    match: 'directa',
    note: 'La diferencia de fondo: AWS aísla cada sesión en su propia microVM, hasta 8 horas.',
    lesson: 'desplegar',
  },
  {
    id: 'lowcode',
    google: 'Managed Agents API / Agent Studio',
    aws: 'AgentCore harness',
    match: 'aprox',
    note: 'El harness es configuración en vez de código, como Managed Agents. Pero no hay un equivalente visual low-code verificado en AWS para Agent Studio.',
  },
  {
    id: 'sessions',
    google: 'Sessions',
    aws: 'Sesión de Runtime + eventos de corto plazo de Memory',
    match: 'aprox',
    note: 'En AWS la sesión de cómputo (la microVM) y el historial persistente (Memory) son cosas distintas: si la microVM se apaga, el historial sigue en Memory.',
    lesson: 'herramientas-memoria',
  },
  {
    id: 'memory',
    google: 'Memory Bank',
    aws: 'AgentCore Memory (estrategias de largo plazo)',
    match: 'directa',
    note: 'Los dos extraen recuerdos con un LLM de forma asíncrona.',
    lesson: 'herramientas-memoria',
  },
  {
    id: 'guardrails',
    google: 'Model Armor',
    aws: 'Bedrock Guardrails',
    match: 'directa',
    note: 'Guardrails suma además contextual grounding y Automated Reasoning checks.',
    lesson: 'gobernar',
  },
  {
    id: 'gateway',
    google: 'Agent Gateway',
    aws: 'AgentCore Gateway',
    match: 'directa',
    note: 'El de AWS además convierte Lambda, OpenAPI y Smithy en tools MCP y enruta inferencia.',
    lesson: 'herramientas-memoria',
  },
  {
    id: 'toolbox',
    google: 'MCP Toolbox for Databases',
    aws: '—',
    match: 'sin',
    note: 'AWS no tiene un equivalente directo: un servidor MCP para bases de datos declarado en tools.yaml. El Gateway convierte Lambda, OpenAPI y Smithy en tools MCP, así que la consulta a la base la escribes tú detrás de uno de esos targets.',
    lesson: 'herramientas-memoria',
  },
  {
    id: 'identity',
    google: 'Agent Identity',
    aws: 'AgentCore Identity',
    match: 'directa',
    note: 'Workload identity, token vault y OAuth 2LO / 3LO.',
    lesson: 'gobernar',
  },
  {
    id: 'policy',
    google: 'Políticas del pilar Govern',
    aws: 'Policy in AgentCore (Cedar / Dogwood)',
    match: 'directa',
    note: 'En AWS el enforcement es determinista y ocurre en el Gateway, fuera del código del agente.',
    lesson: 'gobernar',
  },
  { id: 'registry', google: 'Agent Registry', aws: 'AWS Agent Registry', match: 'directa', note: 'Catálogo gobernado de agentes y herramientas en ambas nubes.' },
  {
    id: 'evals',
    google: 'Evaluación de agentes / trazas',
    aws: 'AgentCore Evaluations + Observability (CloudWatch) + Strands Evals',
    match: 'directa',
    note: 'En AWS se reparte en tres piezas: evaluación gestionada, trazas en CloudWatch y evals desde el SDK.',
    lesson: 'gobernar',
  },
  { id: 'optimizer', google: 'Optimizador de prompts', aws: 'AgentCore Optimization', match: 'directa', note: 'Recomendaciones sobre prompts y descripciones de herramientas.' },
  { id: 'code', google: 'Code Execution (sandbox)', aws: 'AgentCore Code Interpreter', match: 'directa', note: 'Sandbox para el código que escribe el modelo.' },
  { id: 'browser', google: 'Computer use / navegador', aws: 'AgentCore Browser y Amazon Nova Act', match: 'directa', note: 'Browser es el navegador gestionado; Nova Act es el servicio para automatizar flujos de interfaz.' },
  { id: 'rag', google: 'RAG Engine / Vector Search', aws: 'Bedrock Knowledge Bases (Managed KB)', match: 'directa', note: 'RAG gestionado.' },
  { id: 'garden', google: 'Model Garden', aws: 'Catálogo de modelos de Bedrock', match: 'directa', note: 'El catálogo de modelos propios y de terceros.' },
  {
    id: 'modelos',
    google: 'Gemini (modelos propios)',
    aws: 'Amazon Nova',
    match: 'aprox',
    note: 'Nova es la familia propia de Amazon, pero en la práctica el modelo principal para agentes en AWS es Claude.',
  },
  { id: 'app', google: 'Gemini Enterprise (app para empleados, ex Agentspace)', aws: 'AWS Quick (ex Amazon Quick Suite)', match: 'directa', note: 'La app donde los empleados usan agentes, no donde se programan.' },
  {
    id: 'plantillas',
    google: 'Agent Garden (plantillas)',
    aws: 'Plantillas del AgentCore CLI + awslabs/amazon-bedrock-agentcore-samples',
    match: 'aprox',
    note: 'Equivalencia aproximada: en AWS las plantillas vienen del CLI y de un repositorio de ejemplos.',
    lesson: 'desplegar',
  },
  {
    id: 'a2a',
    google: 'A2A (protocolo)',
    aws: 'A2A en Runtime, Gateway y Strands',
    match: 'directa',
    note: 'Runtime hospeda servidores A2A (puerto 9000), Gateway hace passthrough HTTP y Strands trae A2AAgent y A2AServer.',
  },
  {
    id: 'marketplace',
    google: '—',
    aws: 'AWS Marketplace · AI Agents and Tools',
    match: 'sin',
    note: 'No hay un equivalente verificado del lado de Google para esta categoría de Marketplace.',
  },
  { id: 'payments', google: '—', aws: 'AgentCore Payments (x402 / MPP)', match: 'sin', note: 'No hay un equivalente verificado del lado de Google.' },
]

/* -------------------------------------------------------------------------- */
/* Sección 6 · Las tres capas en un archivo                                    */
/* -------------------------------------------------------------------------- */

export const LAYER_CODE = `from strands import Agent, tool
from strands.models import BedrockModel
from bedrock_agentcore.runtime import BedrockAgentCoreApp

app = BedrockAgentCoreApp()

@tool
def get_order_status(order_id: str) -> dict:
    """Estado, transportista y fecha estimada de un pedido.

    Args:
        order_id: Número del pedido, por ejemplo "4821".
    """
    return lookup_order(order_id)  # tu API de pedidos

model = BedrockModel(
    model_id="${ORCH_MODEL}",
    region_name="${REGION}",
)
agent = Agent(
    model=model,
    tools=[get_order_status],
    system_prompt="Eres Andi, de Andes Market.",
)

@app.entrypoint
def andes_ops(payload):
    prompt = payload.get("prompt")
    if not isinstance(prompt, str) or not prompt:
        return "Error: 'prompt' must be a non-empty string"
    response = agent(prompt)
    return response.message['content'][0]['text']

if __name__ == "__main__":
    app.run()
`

export const CODE_LAYERS: { id: string; label: string; tone: Tone; needles: string[]; note: string; lesson: NonNullable<Piece['lesson']> }[] = [
  {
    id: 'strands',
    label: 'Strands',
    tone: 'model',
    needles: ['from strands import', '@tool', 'def get_order_status', 'agent = Agent(', '    model=model', 'tools=[', 'system_prompt=', 'response = agent(prompt)'],
    note: 'El agente: una función decorada con @tool, un Agent con modelo, herramientas y system prompt, y una llamada agent(prompt) que ejecuta el loop completo.',
    lesson: 'primer-agente',
  },
  {
    id: 'bedrock',
    label: 'Bedrock',
    tone: 'data',
    needles: ['BedrockModel', 'model_id=', 'region_name='],
    note: 'El modelo: una sola llamada. El id es un perfil de inferencia global y la región se fija a mano, porque el default de Strands es otro modelo en otra región.',
    lesson: 'primer-agente',
  },
  {
    id: 'agentcore',
    label: 'AgentCore',
    tone: 'system',
    needles: ['bedrock_agentcore', 'app = BedrockAgentCoreApp()', '@app.entrypoint', 'def andes_ops', 'isinstance', 'non-empty string', 'app.run()'],
    note: 'El envoltorio para Runtime: BedrockAgentCoreApp expone /invocations en el puerto 8080 y @app.entrypoint recibe el payload. Validar que prompt sea un string es una práctica oficial.',
    lesson: 'desplegar',
  },
]
