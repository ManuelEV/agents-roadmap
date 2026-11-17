import type { Tone } from '@/components/ui'

/* Todos los datos salen de docs/research/azure-2026-11.md (verificado el 15-nov-2026). */

export const L = 'https://learn.microsoft.com/en-us/azure/foundry'
export const AF = 'https://learn.microsoft.com/en-us/agent-framework'
export const VERIFIED = '15-nov-2026'

/* -------------------------------------------------------------------------- */
/* Identificadores de Azure para Andes Market (formato de la documentación)    */
/* -------------------------------------------------------------------------- */
export const AZ = {
  resource: 'andes-foundry',
  project: 'andes-ops',
  agent: 'andes-ops',
  deployment: 'gpt-5.4-mini',
  projectEndpoint: 'https://andes-foundry.services.ai.azure.com/api/projects/andes-ops',
}

/* -------------------------------------------------------------------------- */
/* Lab 1 · Mapa de piezas                                                      */
/* -------------------------------------------------------------------------- */
export type LayerId = 'build' | 'platform' | 'run' | 'govern' | 'publish'
export type StatusKind = 'ga' | 'mixed' | 'preview' | 'retiring'

export const STATUS_LABEL: Record<StatusKind, string> = {
  ga: 'GA',
  mixed: 'GA con partes en preview',
  preview: 'Preview',
  retiring: 'Se retira',
}

export type Layer = { id: LayerId; title: string; blurb: string; tone: Tone }

export const LAYERS: Layer[] = [
  { id: 'build', title: 'Construir', blurb: 'Código open source que corre en tu máquina o en cualquier nube.', tone: 'model' },
  { id: 'platform', title: 'Plataforma', blurb: 'Un recurso de Azure con proyectos, modelos y conocimiento.', tone: 'system' },
  { id: 'run', title: 'Ejecutar', blurb: 'Foundry Agent Service: dónde vive y corre el agente.', tone: 'data' },
  { id: 'govern', title: 'Gobernar', blurb: 'Identidad, filtros, flota y trazas.', tone: 'guard' },
  { id: 'publish', title: 'Publicar', blurb: 'Los canales por donde llega la gente (y otros agentes).', tone: 'user' },
]

export type LessonSlug = 'primer-agente' | 'herramientas-workflows' | 'desplegar' | 'gobernar'

export const LESSON_LABEL: Record<LessonSlug, string> = {
  'primer-agente': 'Tu primer agente con Agent Framework',
  'herramientas-workflows': 'Herramientas, MCP y workflows',
  desplegar: 'Desplegar en Foundry Agent Service',
  gobernar: 'Gobernar: identidad, guardrails, evaluación y trazas',
}

export type Piece = {
  id: string
  layer: LayerId
  name: string
  tone: Tone
  kind: StatusKind
  status: string
  formerly?: string
  what: string
  detail: string
  docs: string
  lesson?: LessonSlug
}

export const PIECES: Piece[] = [
  /* Construir */
  {
    id: 'af',
    layer: 'build',
    name: 'Microsoft Agent Framework',
    tone: 'model',
    kind: 'ga',
    status: '1.0 GA el 3-abr-2026 (Python y .NET). Go en preview pública.',
    formerly: 'Semantic Kernel + AutoGen',
    what: 'El framework open source con el que programas el agente: agentes, tools, MCP, A2A y workflows en grafo.',
    detail:
      'Se instala con pip install agent-framework (Python 3.11 o superior). No está atado a Foundry: el mismo Agent funciona con FoundryChatClient o con OpenAIChatClient. Sale una versión por semana, así que fija la versión en requirements.txt.',
    docs: `${AF}/overview/`,
    lesson: 'primer-agente',
  },
  {
    id: 'af-workflows',
    layer: 'build',
    name: 'Workflows de Agent Framework',
    tone: 'model',
    kind: 'ga',
    status: 'Parte del framework. La API funcional (@workflow, @step) es experimental y solo Python.',
    what: 'Orquestación en grafo con WorkflowBuilder: executors unidos por aristas, checkpoints y pausas para que un humano apruebe.',
    detail:
      'Es el reemplazo que Microsoft recomienda para los workflows visuales del portal, que se retiran el 1-dic-2026. Los builders multiagente (secuencial, concurrente, handoff, group chat, Magentic) viven en agent_framework.orchestrations.',
    docs: `${AF}/concepts/workflows/builder-and-execution`,
    lesson: 'herramientas-workflows',
  },
  {
    id: 'devui',
    layer: 'build',
    name: 'DevUI',
    tone: 'system',
    kind: 'preview',
    status: 'Beta. La documentación la declara "sample app", no apta para producción.',
    what: 'Interfaz local para chatear con tus agentes y workflows mientras desarrollas.',
    detail: 'Se instala con pip install agent-framework-devui --pre y se lanza con devui ./agents --port 8080: la UI queda en http://localhost:8080 y expone una API en /v1/*.',
    docs: `${AF}/integrations/by-component/ui/devui/`,
  },
  {
    id: 'foundry-local',
    layer: 'build',
    name: 'Foundry Local',
    tone: 'model',
    kind: 'ga',
    status: 'Su página no lleva etiqueta de preview; estado y fecha de GA a confirmar en la documentación.',
    what: 'Inferencia local en tu dispositivo, con una API compatible con OpenAI.',
    detail: 'Sirve para probar un agente sin suscripción de Azure y sin pagar tokens. No es parte de Foundry Agent Service.',
    docs: 'https://learn.microsoft.com/en-us/azure/foundry-local/what-is-foundry-local',
  },

  /* Plataforma */
  {
    id: 'foundry',
    layer: 'platform',
    name: 'Microsoft Foundry',
    tone: 'system',
    kind: 'ga',
    status: 'Portal nuevo en GA (ai.azure.com, con el toggle "New Foundry" encendido).',
    formerly: 'Azure AI Studio → Azure AI Foundry',
    what: 'La plataforma paraguas: unifica agentes, modelos y herramientas bajo un solo recurso de Azure, con RBAC, red y políticas comunes.',
    detail:
      'El portal tiene cuatro secciones: Build (el proyecto actual), Operate (todos los proyectos), Manage (proyecto y recurso) y Docs. El portal anterior sigue existiendo como "Foundry (classic)".',
    docs: `${L}/what-is-foundry`,
  },
  {
    id: 'resource',
    layer: 'platform',
    name: 'Foundry resource + projects',
    tone: 'system',
    kind: 'ga',
    status: 'GA.',
    formerly: 'Hub + Azure OpenAI + Azure AI Services',
    what: 'Un único recurso de Azure (kind AIServices) con proyectos dentro. Cada proyecto tiene su endpoint.',
    detail:
      'El endpoint de proyecto tiene la forma https://<recurso>.services.ai.azure.com/api/projects/<proyecto> y es lo que le pasas a los SDK. Por debajo, el tipo de recurso sigue siendo Microsoft.CognitiveServices/accounts, y se crea con az cognitiveservices account create.',
    docs: `${L}/how-to/create-projects`,
    lesson: 'desplegar',
  },
  {
    id: 'models',
    layer: 'platform',
    name: 'Foundry Models',
    tone: 'model',
    kind: 'ga',
    status: 'GA.',
    what: 'El catálogo: "más de 10.000 modelos" en dos categorías, sold by Azure y from partners and community.',
    detail:
      'Los modelos OpenAI (gpt-5.4, gpt-5.4-mini, gpt-6.1-sol…) son vendidos por Azure. Claude está en la categoría de partners: requiere suscripción de Azure Marketplace y se factura en Claude Consumption Units. Un modelo se usa a través de un deployment tuyo, y ese nombre es el que escribes en model=.',
    docs: `${L}/concepts/foundry-models-overview`,
  },
  {
    id: 'router',
    layer: 'platform',
    name: 'Model router',
    tone: 'model',
    kind: 'ga',
    status: 'GA (deployment model-router, versión 2025-11-18).',
    what: 'Un modelo entrenado que enruta cada prompt, en tiempo real, al LLM más adecuado de un subconjunto que tú eliges.',
    detail:
      'Tres modos: Balanced (por defecto), Cost y Quality. Se despliega como cualquier modelo y se elige como modelo del agente; el campo model de la respuesta dice quién respondió. La ventana efectiva la limita el modelo más pequeño del subconjunto.',
    docs: `${L}/openai/concepts/model-router`,
  },
  {
    id: 'iq',
    layer: 'platform',
    name: 'Foundry IQ',
    tone: 'data',
    kind: 'mixed',
    status: 'GA parcial (API en GA, portal en preview) según la tabla de GA; otra página oficial lo marca Preview. A confirmar.',
    what: 'La capa de conocimiento: una knowledge base multi-fuente con agentic retrieval. Por debajo usa Azure AI Search.',
    detail: 'Es la respuesta de Foundry al RAG gestionado. Work IQ y Fabric IQ son capas hermanas (contexto de Microsoft 365 y datos de negocio) que se exponen como tools, en preview.',
    docs: `${L}/agents/concepts/what-is-foundry-iq`,
  },

  /* Ejecutar */
  {
    id: 'fas',
    layer: 'run',
    name: 'Foundry Agent Service',
    tone: 'system',
    kind: 'mixed',
    status: 'GA, con sub-funciones en preview.',
    formerly: 'Azure AI Agent Service',
    what: 'La plataforma gestionada para construir, desplegar y escalar agentes. Ofrece tres formas de tener uno: prompt agent, hosted agent o Responses API.',
    detail:
      'Habla cinco protocolos: Responses (compatible con OpenAI), Invocations (JSON libre), Invocations por WebSocket (voz), Activity (se puentea solo al publicar en Teams) y A2A. Crear y ejecutar agentes no tiene cargo adicional: pagas tokens y tools; los hosted agents suman cómputo.',
    docs: `${L}/agents/overview`,
    lesson: 'desplegar',
  },
  {
    id: 'prompt',
    layer: 'run',
    name: 'Prompt agents',
    tone: 'model',
    kind: 'ga',
    status: 'GA. Los de voz (sobre Voice Live) están en preview.',
    what: 'Agente declarativo: instrucciones + modelo + tools. Sin código de runtime ni infraestructura.',
    detail: 'Se define en el portal, con el SDK (PromptAgentDefinition), por REST o con azd. Cada create_version produce una versión inmutable del agente.',
    docs: `${L}/agents/concepts/prompt-agents`,
    lesson: 'desplegar',
  },
  {
    id: 'hosted',
    layer: 'run',
    name: 'Hosted agents',
    tone: 'model',
    kind: 'ga',
    status: 'GA desde el 9-jul-2026.',
    what: 'Tu código (contenedor o .zip) en un sandbox aislado por VM y por sesión, con endpoint, identidad y escalado gestionados.',
    detail:
      'Acepta Agent Framework, LangGraph, OpenAI Agents SDK, Anthropic Agent SDK, Copilot SDK o código propio, en Python y C#. CPU y memoria son por sesión: el costo se multiplica por la concurrencia.',
    docs: `${L}/agents/concepts/hosted-agents`,
    lesson: 'desplegar',
  },
  {
    id: 'responses',
    layer: 'run',
    name: 'Responses API',
    tone: 'model',
    kind: 'ga',
    status: 'GA.',
    formerly: 'Assistants API',
    what: 'El "agente efímero": llamas /openai/v1/responses desde tu app y no existe ningún recurso de agente en Foundry.',
    detail: 'La definición (instrucciones, tools, bucle) vive en tu aplicación. Es también el protocolo sobre el que están construidos los agentes de Foundry (Agents v2): Conversations, Items, Responses y Agent Versions.',
    docs: `${L}/agents/quickstarts/responses-api`,
    lesson: 'desplegar',
  },
  {
    id: 'toolbox',
    layer: 'run',
    name: 'Toolboxes',
    tone: 'tool',
    kind: 'ga',
    status: 'GA. La integración con Agent Framework (FoundryToolbox) está en beta.',
    what: 'Un conjunto de tools detrás de un único endpoint MCP gestionado, con autenticación y versionado.',
    detail: 'Dentro caben MCP, Web search, Azure AI Search, Code interpreter, File search, OpenAPI y A2A. Function calling no entra: se ejecuta en el cliente.',
    docs: `${L}/agents/concepts/toolbox-overview`,
    lesson: 'herramientas-workflows',
  },
  {
    id: 'memory',
    layer: 'run',
    name: 'Memory',
    tone: 'memory',
    kind: 'preview',
    status: 'Preview.',
    what: 'Memoria de largo plazo gestionada: memory stores separados por scope.',
    detail: 'No la confundas con el historial: las Conversations guardan los mensajes de una conversación; Memory guarda lo que vale la pena recordar entre conversaciones.',
    docs: `${L}/agents/how-to/memory-usage`,
  },
  {
    id: 'wf-portal',
    layer: 'run',
    name: 'Workflows del portal',
    tone: 'system',
    kind: 'retiring',
    status: 'Preview, con retiro el 1-dic-2026.',
    what: 'El diseñador visual de orquestación multiagente del portal.',
    detail: 'No construyas sobre esto. El reemplazo recomendado es Microsoft Agent Framework (WorkflowBuilder).',
    docs: `${L}/agents/concepts/workflow`,
  },

  /* Gobernar */
  {
    id: 'entra',
    layer: 'govern',
    name: 'Microsoft Entra Agent ID',
    tone: 'guard',
    kind: 'ga',
    status: 'GA. La delegación en nombre del usuario para tools está en preview.',
    what: 'El marco de identidad de Entra para agentes: cada agente nuevo recibe su agent identity blueprint y su agent identity al crearse.',
    detail:
      'La identidad nace sin permisos sobre recursos: hay que asignarle RBAC a mano. No hay secretos que rotar, porque Foundry crea una federated identity credential en el blueprint.',
    docs: 'https://learn.microsoft.com/en-us/entra/agent-id/',
    lesson: 'gobernar',
  },
  {
    id: 'guardrails',
    layer: 'govern',
    name: 'Guardrails',
    tone: 'guard',
    kind: 'mixed',
    status: 'GA para modelos; en preview para agentes.',
    what: 'Una colección con nombre de controles. Cada control define un riesgo, los puntos de intervención y una acción.',
    detail:
      'Cuatro puntos de intervención: User input, Tool call, Tool response y Output (los dos del medio, en preview y solo para agentes). Los modelos llevan por defecto el guardrail Microsoft.DefaultV2. La moderación de tool calls no cubre MCP ni function tools.',
    docs: `${L}/guardrails/guardrails-overview`,
    lesson: 'gobernar',
  },
  {
    id: 'content-safety',
    layer: 'govern',
    name: 'Azure AI Content Safety',
    tone: 'guard',
    kind: 'ga',
    status: 'GA, con funciones puntuales en preview.',
    what: 'El servicio de clasificación (Prompt Shields, protected material, task adherence…) que alimenta los guardrails.',
    detail: 'También es una API independiente, útil para agentes que corren fuera de Foundry.',
    docs: 'https://learn.microsoft.com/en-us/azure/ai-services/content-safety/overview',
    lesson: 'gobernar',
  },
  {
    id: 'tracing',
    layer: 'govern',
    name: 'Trazas en Application Insights',
    tone: 'system',
    kind: 'ga',
    status: 'El tracing es GA para prompt agents y hosted agents.',
    what: 'Observabilidad sobre OpenTelemetry: conectas un recurso de Application Insights al proyecto y las trazas del servidor se activan sin cambiar código.',
    detail: 'Los spans siguen las convenciones GenAI de OpenTelemetry (invoke_agent, execute_tool…). Agent Framework emite trazas automáticamente cuando el tracing está habilitado en el proyecto.',
    docs: `${L}/observability/how-to/trace-agent-setup`,
    lesson: 'gobernar',
  },
  {
    id: 'control-plane',
    layer: 'govern',
    name: 'Foundry Control Plane',
    tone: 'guard',
    kind: 'preview',
    status: 'Preview según la tabla de GA; su propia página no lo etiqueta. A confirmar.',
    what: 'La gestión de flota: inventario, cumplimiento y seguridad de todos los agentes de la suscripción. Es el botón Operate del portal.',
    detail: 'Paneles Overview, Assets y Compliance. Ya no se pueden registrar "custom agents" nuevos: se deprecan el 7-may-2027 en favor de los "external agents".',
    docs: `${L}/control-plane/overview`,
  },
  {
    id: 'agent365',
    layer: 'govern',
    name: 'Microsoft Agent 365',
    tone: 'guard',
    kind: 'ga',
    status: 'GA para el segmento Commercial, con licencia por usuario.',
    what: 'El plano de control y observabilidad de los agentes de la organización, con registro en el Microsoft 365 admin center (Agents > All agents).',
    detail: 'Entra Agent ID está disponible para todos los clientes de Entra; extender funciones de seguridad a los agentes requiere Agent 365.',
    docs: 'https://learn.microsoft.com/en-us/microsoft-agent-365/overview',
  },
  {
    id: 'gateway',
    layer: 'govern',
    name: 'AI Gateway',
    tone: 'guard',
    kind: 'mixed',
    status: 'Azure API Management es GA; la integración con Foundry está en preview.',
    what: 'Gateway de IA sobre Azure API Management: límites de tokens, caché semántica, content safety, MCP y A2A.',
    detail: 'En Foundry se activa en Manage > AI Gateway. Con límites por proyecto, superar los TPM devuelve 429 y superar la cuota, 403.',
    docs: 'https://learn.microsoft.com/en-us/azure/api-management/genai-gateway-capabilities',
  },

  /* Publicar */
  {
    id: 'teams',
    layer: 'publish',
    name: 'Teams y Microsoft 365 Copilot',
    tone: 'user',
    kind: 'ga',
    status: 'GA.',
    what: 'El canal de los empleados. Se publica desde el agente con Publish > Teams and Microsoft Copilot.',
    detail:
      'Publicar habilita el protocolo Activity y Foundry se encarga del registro del bot: no necesitas un recurso de Azure Bot Service. "Just you" no pide aprobación; "People in your organization" la pide en el Microsoft 365 admin center.',
    docs: `${L}/agents/how-to/publish-copilot`,
    lesson: 'desplegar',
  },
  {
    id: 'a2a',
    layer: 'publish',
    name: 'A2A entrante',
    tone: 'model',
    kind: 'mixed',
    status: 'A2A v1.0 en GA; v0.3 en preview.',
    what: 'El endpoint por el que otros agentes le delegan tareas al tuyo.',
    detail: 'Sin selector de versión Foundry sirve v0.3; la v1.0 se pide con el header A2A-Version: 1.0. Solo JSON-RPC, solo texto y sin streaming. No se configura en el portal.',
    docs: `${L}/agents/how-to/enable-agent-to-agent-endpoint`,
  },
  {
    id: 'copilot-studio',
    layer: 'publish',
    name: 'Copilot Studio',
    tone: 'user',
    kind: 'preview',
    status: 'La conexión con Foundry está en preview.',
    what: 'El constructor low-code de Microsoft. Puede llamar a un agente de Foundry como agente externo.',
    detail: 'El agente de Foundry debe tener habilitado el endpoint Activity; si no, la conexión falla con un 400.',
    docs: 'https://learn.microsoft.com/en-us/microsoft-copilot-studio/add-agent-foundry-agent',
  },
  {
    id: 'm365-sdk',
    layer: 'publish',
    name: 'Microsoft 365 Agents SDK / Toolkit',
    tone: 'system',
    kind: 'ga',
    status: 'GA.',
    what: 'El SDK de "plomería" de canales (Teams, Copilot, web) y la herramienta de scaffolding y publicación.',
    detail: 'Es la vía pro-code para canales de Microsoft 365. Los pasos de publicación con el Toolkit no están verificados en este tutorial: a confirmar en la documentación.',
    docs: 'https://learn.microsoft.com/en-us/microsoft-365/agents-sdk/agents-sdk-overview',
  },
]

export const piecesOf = (layer: LayerId) => PIECES.filter((p) => p.layer === layer)

/* -------------------------------------------------------------------------- */
/* Lab 2 · Tres formas de tener un agente                                      */
/* -------------------------------------------------------------------------- */
export type AgentKind = 'prompt' | 'hosted' | 'responses'

export const KIND_LABEL: Record<AgentKind, string> = {
  prompt: 'Prompt agent',
  hosted: 'Hosted agent',
  responses: 'Responses API',
}

export const KIND_ROWS: { k: string; v: Record<AgentKind, string> }[] = [
  {
    k: 'Qué defines',
    v: {
      prompt: 'Instrucciones, modelo y tools (portal, SDK, REST o azd)',
      hosted: 'Tu código, como contenedor o .zip',
      responses: 'Nada en Foundry: la definición vive en tu app',
    },
  },
  { k: 'Código de runtime', v: { prompt: 'Ninguno', hosted: 'Tu lógica de agente', responses: 'Tu app' } },
  {
    k: 'Frameworks',
    v: {
      prompt: '— (opcional: Microsoft Copilot harness, en preview)',
      hosted: 'Agent Framework, LangGraph, OpenAI Agents SDK, Anthropic Agent SDK, Copilot SDK o propio',
      responses: 'Cualquiera',
    },
  },
  { k: 'Cómputo', v: { prompt: 'Totalmente gestionado', hosted: 'Sandbox gestionado por sesión', responses: 'El tuyo' } },
  { k: 'Costo', v: { prompt: 'Inferencia + tools', hosted: 'Inferencia + tools + cómputo del contenedor', responses: 'Inferencia + tools' } },
]

export const KIND_WHEN: Record<AgentKind, string> = {
  prompt:
    'Elígelo cuando el comportamiento cabe en instrucciones + tools integradas. Foundry guarda el agente como un recurso con versiones inmutables y tú solo lo invocas.',
  hosted:
    'Elígelo cuando necesitas tu propio bucle: herramientas en código, workflows, aprobación humana. Es donde termina el agente que escribirás con Agent Framework en esta sección.',
  responses:
    'Elígelo cuando ya tienes una aplicación que orquesta y solo quieres el modelo y las tools de Foundry. No queda ningún agente que versionar, publicar ni gobernar en el portal.',
}

export const KIND_CODE: Record<AgentKind, { title: string; code: string; needles: string[] }> = {
  prompt: {
    title: 'crear_prompt_agent.py · azure-ai-projects 2.x',
    needles: ['create_version', 'PromptAgentDefinition(', 'get_openai_client(agent_name'],
    code: `from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient
from azure.ai.projects.models import PromptAgentDefinition

project = AIProjectClient(
    endpoint="${AZ.projectEndpoint}",
    credential=DefaultAzureCredential(),
)

# El agente queda guardado en Foundry como una versión inmutable
agent = project.agents.create_version(
    agent_name="${AZ.agent}",
    definition=PromptAgentDefinition(
        model="${AZ.deployment}",  # nombre de TU deployment
        instructions="Eres Andi, el agente de operaciones de Andes Market.",
    ),
)

# Cliente OpenAI ya enlazado al agente
openai = project.get_openai_client(agent_name="${AZ.agent}")
conversation = openai.conversations.create()
response = openai.responses.create(
    conversation=conversation.id,
    input="¿Dónde está mi pedido 4821?",
)
print(response.output_text)
`,
  },
  hosted: {
    title: 'main.py · Agent Framework dentro de un hosted agent',
    needles: ['agent = Agent(', 'ResponsesHostServer(agent)', 'server.run()'],
    code: `import os
from agent_framework import Agent
from agent_framework.foundry import FoundryChatClient
from agent_framework_foundry_hosting import ResponsesHostServer
from azure.identity import DefaultAzureCredential

def main() -> None:
    client = FoundryChatClient(
        project_endpoint=os.environ["FOUNDRY_PROJECT_ENDPOINT"],
        model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
        credential=DefaultAzureCredential(),
    )
    # Tu código: aquí van tus tools, tu middleware, tus workflows
    agent = Agent(
        client=client,
        instructions="Eres Andi, el agente de operaciones de Andes Market.",
        default_options={"store": False},
    )
    server = ResponsesHostServer(agent)
    server.run()                       # escucha en el puerto 8088

if __name__ == "__main__":
    main()
`,
  },
  responses: {
    title: 'app.py · sin recurso de agente en Foundry',
    needles: ['get_openai_client()', 'model="'],
    code: `from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient

project = AIProjectClient(
    endpoint="${AZ.projectEndpoint}",
    credential=DefaultAzureCredential(),
)

# Cliente OpenAI del proyecto, sin agente: tú pasas el modelo en cada llamada
openai = project.get_openai_client()
response = openai.responses.create(
    model="${AZ.deployment}",          # nombre de TU deployment
    input="¿Dónde está mi pedido 4821?",
)
print(response.output_text)
`,
  },
}

/* -------------------------------------------------------------------------- */
/* Lab 4 · Decodificador de nombres                                            */
/* -------------------------------------------------------------------------- */
export type RenameImpact = 'nombre' | 'codigo' | 'retiro'

export const IMPACT_LABEL: Record<RenameImpact, string> = {
  nombre: 'Solo cambia el nombre',
  codigo: 'Hay que reescribir',
  retiro: 'Tiene fecha de retiro',
}
export const IMPACT_TONE: Record<RenameImpact, Tone> = { nombre: 'ok', codigo: 'tool', retiro: 'error' }

export type Rename = {
  id: string
  group: 'Marca y portal' | 'API y SDK' | 'Framework' | 'Roles e identidad' | 'Modelos'
  old: string
  now: string
  impact: RenameImpact
  changed: string
  survives: string
  since: string
}

export const RENAME_GROUPS: Rename['group'][] = ['Marca y portal', 'API y SDK', 'Framework', 'Roles e identidad', 'Modelos']

export const RENAMES: Rename[] = [
  {
    id: 'studio',
    group: 'Marca y portal',
    old: 'Azure AI Studio',
    now: 'Microsoft Foundry',
    impact: 'nombre',
    changed: 'Dos renombres seguidos: Azure AI Studio pasó a Azure AI Foundry en Ignite 2024 y a Microsoft Foundry en Ignite 2025.',
    survives: 'El tipo de recurso de Azure sigue siendo Microsoft.CognitiveServices/accounts y el CLI sigue siendo az cognitiveservices.',
    since: '19-nov-2024 y 18-nov-2025',
  },
  {
    id: 'ai-foundry',
    group: 'Marca y portal',
    old: 'Azure AI Foundry',
    now: 'Microsoft Foundry',
    impact: 'nombre',
    changed: 'La plataforma perdió el "Azure AI" del nombre. El portal actual se llama simplemente Foundry.',
    survives: 'La propiedad del endpoint de proyecto en el CLI todavía se consulta como properties.endpoints."AI Foundry API".',
    since: 'Ignite 2025 (18-nov-2025)',
  },
  {
    id: 'classic',
    group: 'Marca y portal',
    old: 'El portal "de siempre" (hubs, pestañas viejas)',
    now: 'Foundry (classic)',
    impact: 'nombre',
    changed: 'El portal anterior quedó como "Foundry (classic)". Las guías actuales piden encender el toggle "New Foundry" del banner superior.',
    survives: 'Las capturas de pantalla de tutoriales viejos corresponden al portal clásico: los menús no coinciden con Build / Operate / Manage / Docs.',
    since: 'Guía de navegación del 11-sep-2026',
  },
  {
    id: 'hub',
    group: 'Marca y portal',
    old: 'Hub + Azure OpenAI + Azure AI Services',
    now: 'Foundry resource (con proyectos)',
    impact: 'codigo',
    changed: 'Tres recursos se volvieron uno solo, de kind AIServices, con proyectos dentro. El endpoint ahora es https://<recurso>.services.ai.azure.com/api/projects/<proyecto>.',
    survives: 'Los roles que empiezan con "Cognitive Services" o "Azure AI Developer" siguen existiendo, pero la documentación pide no usarlos.',
    since: 'Tabla "Evolution of Foundry" (13-ago-2026)',
  },
  {
    id: 'cognitive',
    group: 'Marca y portal',
    old: 'Azure Cognitive Services / Azure AI Services',
    now: 'Foundry Tools',
    impact: 'nombre',
    changed: 'Los servicios de IA preconstruidos se agrupan como Foundry Tools.',
    survives: 'Azure AI Content Safety conserva su nombre y su documentación sigue bajo /azure/ai-services/. Si tendrá un nombre nuevo, está por confirmar.',
    since: 'Tabla "Evolution of Foundry" (13-ago-2026)',
  },
  {
    id: 'agent-service',
    group: 'Marca y portal',
    old: 'Azure AI Agent Service',
    now: 'Foundry Agent Service',
    impact: 'nombre',
    changed: 'Se presentó en Ignite 2024 como Azure AI Agent Service, llegó a GA en Build 2025 como "Azure AI Foundry Agent Service" y hoy es Foundry Agent Service.',
    survives: 'El paquete azure-ai-agents (1.1.0, de agosto de 2025) sigue en PyPI, pero los quickstarts ya no lo usan.',
    since: 'Ignite 2024 → Build 2025 → Ignite 2025',
  },
  {
    id: 'assistants',
    group: 'API y SDK',
    old: 'Assistants API: Threads, Messages, Runs, Assistants',
    now: 'Responses API: Conversations, Items, Responses, Agent Versions',
    impact: 'codigo',
    changed: 'Los agentes pasaron a "Agents v2" sobre la Responses API. Un thread ahora es una conversation y un assistant, una versión de agente. La Assistants API se retiró el 26-ago-2026.',
    survives: 'Nada del código viejo funciona: es otra forma de API. Si un tutorial crea threads y runs, es de la generación anterior.',
    since: 'Retiro: 26-ago-2026',
  },
  {
    id: 'sdk',
    group: 'API y SDK',
    old: 'azure-ai-projects 1.x, azure-ai-agents, azure-ai-inference',
    now: 'azure-ai-projects 2.x + cliente OpenAI()',
    impact: 'codigo',
    changed: 'El SDK actual es azure-ai-projects 2.x (los quickstarts piden >=2.3.0) y se invoca con project.get_openai_client(). El código 2.x es incompatible con 1.x. azure-ai-inference se retiró el 26-ago-2026.',
    survives: 'El nombre del paquete azure-ai-projects es el mismo: mira la versión antes de copiar un ejemplo.',
    since: 'Quickstart del 4-nov-2026',
  },
  {
    id: 'api-version',
    group: 'API y SDK',
    old: 'api-version mensual en cada llamada',
    now: 'Rutas estables v1 (/openai/v1/)',
    impact: 'codigo',
    changed: 'La inferencia usa rutas estables /openai/v1/ en lugar de una api-version con fecha.',
    survives: 'Las rutas REST de agentes del quickstart todavía llevan ?api-version=v1.',
    since: 'Tabla "Evolution of Foundry" (13-ago-2026)',
  },
  {
    id: 'agent-apps',
    group: 'API y SDK',
    old: 'Agent applications (para publicar)',
    now: 'Agent endpoint',
    impact: 'codigo',
    changed: 'Las "agent applications" son ahora la experiencia de publicación legacy. El modelo nuevo es el endpoint del agente; sus detalles de migración están por confirmar en la documentación.',
    survives: 'La página de agent applications sigue publicada, marcada como legacy.',
    since: 'Página del 19-jun-2026',
  },
  {
    id: 'portal-workflows',
    group: 'API y SDK',
    old: 'Workflows visuales del portal',
    now: 'Workflows de Microsoft Agent Framework',
    impact: 'retiro',
    changed: 'El diseñador visual se retira; el reemplazo recomendado es escribir el workflow con Agent Framework (WorkflowBuilder).',
    survives: 'Siguen en preview en el portal hasta la fecha de retiro.',
    since: 'Retiro: 1-dic-2026',
  },
  {
    id: 'sk',
    group: 'Framework',
    old: 'Semantic Kernel',
    now: 'Microsoft Agent Framework',
    impact: 'codigo',
    changed: 'El README de Semantic Kernel dice "Semantic Kernel is now Microsoft Agent Framework!". Agent Framework 1.0 es GA desde el 3-abr-2026.',
    survives: 'Los imports y clases son otros: hoy es from agent_framework import Agent, tool.',
    since: 'Presentado el 1-oct-2025',
  },
  {
    id: 'autogen',
    group: 'Framework',
    old: 'AutoGen',
    now: 'Microsoft Agent Framework',
    impact: 'codigo',
    changed: 'El repositorio de AutoGen dice que el proyecto "has been archived and is no longer actively maintained by Microsoft". Sus patrones multiagente viven ahora en agent_framework.orchestrations.',
    survives: 'Los nombres de los patrones (group chat, Magentic, handoff) sí se reconocen en los builders nuevos.',
    since: 'Presentado el 1-oct-2025',
  },
  {
    id: 'mcp-ws',
    group: 'Framework',
    old: 'MCPWebsocketTool',
    now: 'MCPStreamableHTTPTool',
    impact: 'codigo',
    changed: 'MCPWebsocketTool se eliminó en Agent Framework para Python 1.23.',
    survives: 'MCPStdioTool sigue igual para servidores locales por stdio.',
    since: 'Python 1.23',
  },
  {
    id: 'roles',
    group: 'Roles e identidad',
    old: 'Azure AI User, Azure AI Owner, Azure AI Account Owner, Azure AI Project Manager',
    now: 'Foundry User, Foundry Owner, Foundry Account Owner, Foundry Project Manager',
    impact: 'nombre',
    changed: 'Los roles cambiaron "Azure AI" por "Foundry" y apareció uno nuevo, Foundry Agent Consumer, que solo permite invocar endpoints de agentes.',
    survives: 'Los IDs de rol no cambiaron y los nombres viejos aún aparecen en algunos sitios. En scripts, usa el GUID: Foundry User es 53ca6127-db72-4b80-b1b0-d745d6d5456d.',
    since: 'Página de RBAC del 16-sep-2026',
  },
  {
    id: 'identity',
    group: 'Roles e identidad',
    old: 'Identidad compartida del proyecto hasta publicar',
    now: 'Agent identity propia desde que se crea el agente',
    impact: 'codigo',
    changed: 'Cada agente nuevo recibe su agent identity blueprint y su agent identity al crearse. La identidad compartida queda para agentes legacy.',
    survives: 'Al migrar, las asignaciones de rol no se transfieren: la identidad nueva nace sin permisos.',
    since: 'Página del 28-oct-2026',
  },
  {
    id: 'custom-agents',
    group: 'Roles e identidad',
    old: 'Registrar "custom agents" en Foundry Control Plane',
    now: 'External agents',
    impact: 'retiro',
    changed: 'Ya no se pueden registrar custom agents nuevos. El reemplazo son los "external agents"; su registro no está verificado en este tutorial.',
    survives: 'Los custom agents ya registrados siguen hasta la fecha de deprecación.',
    since: 'Deprecación: 7-may-2027',
  },
  {
    id: 'o-family',
    group: 'Modelos',
    old: 'o1, o3, o3-mini, o4-mini',
    now: 'gpt-5.6-sol (o1, o3) y gpt-5.6-terra (o3-mini, o4-mini)',
    impact: 'retiro',
    changed: 'La familia o* se retira con reemplazos indicados en la tabla de retiros.',
    survives: 'o4-mini todavía figura entre los cuatro modelos con cuota en Tier 0 (Free).',
    since: 'Retiro: 19-nov-2026',
  },
  {
    id: 'gpt4',
    group: 'Modelos',
    old: 'gpt-4o, gpt-4o-mini, gpt-4.1',
    now: 'Familias gpt-5.x y gpt-6.x',
    impact: 'retiro',
    changed: 'gpt-4o (2024-05-13) se retira el 14-ene-2027; el resto de gpt-4o, gpt-4o-mini y la familia gpt-4.1, el 14-abr-2027.',
    survives: 'Siguen desplegables hoy, pero no conviene usarlos en nada nuevo.',
    since: 'Retiro: 14-ene-2027 y 14-abr-2027',
  },
]

/* -------------------------------------------------------------------------- */
/* Línea de tiempo                                                             */
/* -------------------------------------------------------------------------- */
export type TimelineItem = { date: string; text: string; state: 'past' | 'now' | 'future' }

export const TIMELINE: TimelineItem[] = [
  { date: '19-nov-2024', text: 'Ignite 2024: Azure AI Studio pasa a Azure AI Foundry; se presenta Azure AI Agent Service.', state: 'past' },
  { date: '19-may-2025', text: 'Build 2025: el servicio de agentes llega a GA.', state: 'past' },
  { date: '1-oct-2025', text: 'Se presenta Microsoft Agent Framework, que une Semantic Kernel y AutoGen.', state: 'past' },
  { date: '18-nov-2025', text: 'Ignite 2025: la plataforma ya se llama Microsoft Foundry. Hosted agents, memoria, Foundry IQ y Control Plane, en preview.', state: 'past' },
  { date: '3-abr-2026', text: 'Agent Framework 1.0 GA (.NET y Python).', state: 'past' },
  { date: '2-jun-2026', text: 'Build 2026: Foundry IQ GA como capa de conocimiento; preview de Toolboxes, Memory y A2A entrante.', state: 'past' },
  { date: '9-jul-2026', text: 'Hosted agents GA. En julio también Toolboxes GA.', state: 'past' },
  { date: '26-ago-2026', text: 'Se retiran azure-ai-inference y la Assistants API.', state: 'past' },
  { date: '15-nov-2026', text: 'Fecha en que se verificó este contenido.', state: 'now' },
  { date: '17 a 20-nov-2026', text: 'Ignite 2026 (anunciado; aún no ocurrió).', state: 'future' },
  { date: '19-nov-2026', text: 'Se retira la familia o*.', state: 'future' },
  { date: '1-dic-2026', text: 'Se retiran los Workflows visuales del portal.', state: 'future' },
  { date: '7-may-2027', text: 'Se deprecan los "custom agents" del Control Plane.', state: 'future' },
]

/* -------------------------------------------------------------------------- */
/* Lab 5 · Modelos y costos                                                    */
/* Precios: Azure Retail Prices API, Global Standard, eastus2, 15-nov-2026.    */
/* US$ por 1M de tokens. En modelos con dos precios se usa el de contexto      */
/* corto.                                                                      */
/* -------------------------------------------------------------------------- */
export type ModelPrice = {
  id: string
  input: number
  cached: number
  output: number
  /** nota verificada sobre su uso en Agent Service */
  note?: string
  noteTone?: Tone
  twoTier?: boolean
}

export const MODELS: ModelPrice[] = [
  { id: 'gpt-5.5', input: 5, cached: 0.5, output: 30, twoTier: true, note: 'Fila propia en la tabla de tools · puede requerir pedir cuota', noteTone: 'ok' },
  { id: 'gpt-5.4', input: 2.5, cached: 0.25, output: 15, twoTier: true, note: 'Fila propia en la tabla de tools', noteTone: 'ok' },
  { id: 'gpt-6.1-sol', input: 2, cached: 0.1, output: 10, twoTier: true, note: 'Sin fila en la tabla de tools', noteTone: 'guard' },
  { id: 'gpt-5.6-terra', input: 2, cached: 0.2, output: 12, twoTier: true, note: 'Sin fila en la tabla de tools', noteTone: 'guard' },
  { id: 'gpt-5.4-mini', input: 0.75, cached: 0.075, output: 4.5, note: 'El de los ejemplos oficiales de Agent Framework', noteTone: 'ok' },
  { id: 'gpt-5-mini', input: 0.25, cached: 0.025, output: 2, note: 'Tools limitadas en Agent Service', noteTone: 'guard' },
  { id: 'gpt-5.4-nano', input: 0.2, cached: 0.02, output: 1.25 },
  { id: 'gpt-6-luna', input: 0.1, cached: 0.01, output: 0.5, twoTier: true, note: 'Sin fila en la tabla de tools', noteTone: 'guard' },
  { id: 'gpt-5-nano', input: 0.05, cached: 0.005, output: 0.4, note: 'Se retira el 9-feb-2027', noteTone: 'guard' },
]

export type RoleId = 'orquestador' | 'worker' | 'router'

export type RolePreset = {
  id: RoleId
  label: string
  picks: string[]
  why: string
  calls: number
  inTok: number
  outTok: number
  cache: number
}

export const ROLES: RolePreset[] = [
  {
    id: 'orquestador',
    label: 'Orquestador',
    picks: ['gpt-5.4', 'gpt-5.5'],
    why: 'Decide qué herramienta o sub-agente usar y redacta la respuesta final. gpt-5.4 (o gpt-5.5 si tienes cuota): tienen fila propia en la tabla de tools de Agent Service y 1M de contexto.',
    calls: 6000,
    inTok: 6000,
    outTok: 500,
    cache: 50,
  },
  {
    id: 'worker',
    label: 'Worker',
    picks: ['gpt-5.4-mini'],
    why: 'Ejecuta una tarea acotada con pocas tools. gpt-5.4-mini es el modelo que usan los ejemplos oficiales de Agent Framework y de azure.yaml.',
    calls: 12000,
    inTok: 2500,
    outTok: 300,
    cache: 30,
  },
  {
    id: 'router',
    label: 'Router barato',
    picks: ['gpt-5.4-nano', 'gpt-5-nano'],
    why: 'Clasifica la intención y deriva: entrada corta, salida de pocas palabras. gpt-5.4-nano o gpt-5-nano son los más baratos del catálogo.',
    calls: 30000,
    inTok: 400,
    outTok: 20,
    cache: 0,
  },
]

export type TierId = 'global' | 'datazone' | 'batch'
export const TIERS: { id: TierId; label: string; factor: number; note: string }[] = [
  { id: 'global', label: 'Global Standard', factor: 1, note: 'El recomendado para empezar: lanza primero, precio más bajo y mayor cuota.' },
  { id: 'datazone', label: 'Data Zone', factor: 1.1, note: 'Los datos se procesan dentro de una zona (US, EU o APAC). En la API de precios aparece aproximadamente un 10 % más caro.' },
  { id: 'batch', label: 'Batch', factor: 0.5, note: 'Asíncrono, con 50 % de descuento. Sirve para evaluaciones o cargas nocturnas, no para un agente que conversa.' },
]

/* -------------------------------------------------------------------------- */
/* Lab 6 · Equivalencias con Google Cloud                                      */
/* -------------------------------------------------------------------------- */
export type EquivKind = 'directa' | 'parcial' | 'ninguna'
export const EQUIV_LABEL: Record<EquivKind, string> = { directa: 'Equivalente directo', parcial: 'Equivalente parcial', ninguna: 'Sin equivalente verificado' }
export const EQUIV_TONE: Record<EquivKind, Tone> = { directa: 'ok', parcial: 'guard', ninguna: 'error' }

export type Equiv = { id: string; google: string; azure: string; kind: EquivKind; note: string }

export const EQUIVS: Equiv[] = [
  { id: 'fw', google: 'ADK', azure: 'Microsoft Agent Framework', kind: 'directa', note: 'El framework open source de cada casa: agentes, tools, workflows en grafo, MCP y A2A.' },
  { id: 'devui', google: 'adk web', azure: 'DevUI (devui ./agents)', kind: 'parcial', note: 'Cumplen el mismo papel, pero DevUI está en beta y su documentación la declara "sample app".' },
  { id: 'platform', google: 'Gemini Enterprise Agent Platform (antes Vertex AI)', azure: 'Microsoft Foundry', kind: 'directa', note: 'La plataforma paraguas de cada nube.' },
  { id: 'runtime', google: 'Agent Runtime', azure: 'Foundry hosted agents', kind: 'directa', note: 'Ambos alojan tu código. Foundry aísla cada sesión en una VM.' },
  { id: 'declarative', google: 'Managed Agents API / Agent Studio', azure: 'Prompt agents', kind: 'directa', note: 'El agente declarativo, sin código.' },
  { id: 'sessions', google: 'Sessions', azure: 'Conversations', kind: 'directa', note: 'En hosted agents se suman las sessions (cómputo y archivos) y un state store clave-valor.' },
  { id: 'memory', google: 'Memory Bank', azure: 'Foundry Memory', kind: 'parcial', note: 'Memory Bank es GA; la memoria de Foundry sigue en preview.' },
  { id: 'catalog', google: 'Model Garden', azure: 'Foundry Models', kind: 'directa', note: 'El catálogo de modelos.' },
  {
    id: 'models',
    google: 'Gemini (modelos propios)',
    azure: 'Modelos OpenAI vendidos por Azure',
    kind: 'parcial',
    note: 'Google usa sus propios modelos; Microsoft revende los de OpenAI. Su modelo propio de razonamiento, MAI-Thinking-1, está en preview.',
  },
  { id: 'router', google: '—', azure: 'Model router', kind: 'ninguna', note: 'No hay un equivalente verificado del lado de Google en la investigación de este tutorial.' },
  { id: 'armor', google: 'Model Armor', azure: 'Guardrails de Foundry / Azure AI Content Safety', kind: 'parcial', note: 'En agentes de Foundry los guardrails están en preview. Prompt Shields es la pieza que detecta ataques al prompt.' },
  { id: 'identity', google: 'Agent Identity (SPIFFE)', azure: 'Microsoft Entra Agent ID', kind: 'directa', note: 'Misma idea, mecanismo distinto: Entra usa blueprints + OAuth/OBO; Google usa SPIFFE + mTLS.' },
  {
    id: 'gateway',
    google: 'Agent Gateway',
    azure: 'AI Gateway (API Management) + Toolbox',
    kind: 'parcial',
    note: 'No hay una pieza única: API Management gobierna tráfico y tokens; Toolbox centraliza tools tras MCP. Ninguno está documentado como "deny por defecto", como sí lo está Agent Gateway.',
  },
  { id: 'registry', google: 'Agent Registry', azure: 'Agent 365 / Foundry Control Plane (Assets)', kind: 'parcial', note: 'Hay dos registros y están convergiendo bajo Agent 365.' },
  { id: 'rag', google: 'RAG Engine / Vector Search', azure: 'Foundry IQ / Azure AI Search / File search', kind: 'directa', note: 'Conocimiento y recuperación gestionados.' },
  { id: 'dbtoolbox', google: 'MCP Toolbox for Databases', azure: '—', kind: 'ninguna', note: 'Sin equivalente verificado. Lo más cercano es un Toolbox de Foundry con un servidor MCP propio.' },
  { id: 'app', google: 'Gemini Enterprise (app para empleados)', azure: 'Microsoft 365 Copilot + Teams', kind: 'directa', note: 'Se publica desde Foundry con Publish > Teams and Microsoft Copilot.' },
  { id: 'lowcode', google: 'Agent Studio (low-code)', azure: 'Copilot Studio', kind: 'directa', note: 'Copilot Studio puede llamar a agentes de Foundry (en preview).' },
  { id: 'eval', google: 'Evaluación de agentes (adk eval)', azure: 'Evaluaciones en la nube de Foundry (client.evals)', kind: 'parcial', note: 'Foundry no tiene un CLI de evaluación tan directo; existe azd ai agent eval run.' },
  { id: 'trace', google: 'Cloud Trace', azure: 'Application Insights (Azure Monitor)', kind: 'directa', note: 'Ambos sobre OpenTelemetry.' },
  { id: 'cli', google: 'Agents CLI (agents-cli)', azure: 'azd ai agent (extensión microsoft.foundry)', kind: 'directa', note: 'El CLI para crear, correr y desplegar agentes.' },
  { id: 'deploy', google: 'adk deploy agent_engine', azure: 'azd deploy / azd up', kind: 'directa', note: 'El comando que sube tu código al hosting gestionado.' },
  { id: 'workflows', google: 'Workflows de ADK 2.0', azure: 'Workflows de Agent Framework (WorkflowBuilder)', kind: 'directa', note: 'Ojo: los workflows visuales del portal de Foundry se retiran; el equivalente es el del framework.' },
]
