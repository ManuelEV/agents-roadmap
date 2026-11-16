import { blank, cmd, comment, dim, ok, out, warn, type TermLine } from '@/components/Terminal'

/* Identificadores de Azure del escenario (inventados; el FORMATO sale de la investigación). */
export const FOUNDRY_RESOURCE = 'andes-foundry'
export const FOUNDRY_PROJECT = 'andes-ops'
export const PROJECT_ENDPOINT = `https://${FOUNDRY_RESOURCE}.services.ai.azure.com/api/projects/${FOUNDRY_PROJECT}`
export const REGION = 'eastus2'
export const PROMPT_AGENT = 'andes-ops'
export const HOSTED_AGENT = 'andes-ops-hosted'
export const PROMPT_MODEL = 'gpt-5-mini'
export const HOSTED_MODEL = 'gpt-5.4-mini'
export const TEMPLATE_URL =
  'https://github.com/microsoft-foundry/foundry-samples/blob/main/samples/python/hosted-agents/agent-framework/responses/01-basic/azure.yaml'

/* ------------------------------ Prompt agent ------------------------------ */

export const CODE_VERSIONS = `from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient
from azure.ai.projects.models import PromptAgentDefinition, MCPTool
from openai.types.responses.response_input_param import McpApprovalResponse, ResponseInputParam

project = AIProjectClient(
    endpoint="${PROJECT_ENDPOINT}",
    credential=DefaultAzureCredential(),   # Entra ID: los agentes no aceptan API key
)
INSTRUCTIONS = "Eres Andi, agente de operaciones de Andes Market. Responde breve y en español."

# v1 · solo instrucciones + modelo
v1 = project.agents.create_version(
    agent_name="${PROMPT_AGENT}",
    definition=PromptAgentDefinition(
        model="${PROMPT_MODEL}",            # el nombre de TU deployment
        instructions=INSTRUCTIONS,
    ),
)

# v2 · la misma definición + el servidor MCP del transportista
carrier = MCPTool(
    server_label="andesexpress",
    server_url="https://mcp.andesexpress.example/mcp",
    require_approval="always",
    project_connection_id="andesexpress-mcp",
)
v2 = project.agents.create_version(
    agent_name="${PROMPT_AGENT}",
    definition=PromptAgentDefinition(model="${PROMPT_MODEL}", instructions=INSTRUCTIONS, tools=[carrier]),
)
print(f"Agent created (id: {v2.id}, name: {v2.name}, version: {v2.version})")

# Invocar: cliente OpenAI ya enlazado al agente, por NOMBRE
openai = project.get_openai_client(agent_name="${PROMPT_AGENT}")
conversation = openai.conversations.create()
response = openai.responses.create(
    conversation=conversation.id,
    input="¿Dónde va el envío AX-88213-CL?",
)

# Si el agente pidió aprobación para llamar al MCP, respóndela en la misma conversación
approvals: ResponseInputParam = []
for item in response.output:
    if item.type == "mcp_approval_request" and item.id:
        approvals.append(McpApprovalResponse(type="mcp_approval_response", approve=True, approval_request_id=item.id))
if approvals:
    response = openai.responses.create(conversation=conversation.id, input=approvals)
print(response.output_text)

# Limpieza de una versión que ya no usas
project.agents.delete_version(agent_name="${PROMPT_AGENT}", agent_version=v1.version)
`

export const REQ_BY_PROJECT = `POST {project_endpoint}/openai/v1/responses
Authorization: Bearer <token de Entra>
Content-Type: application/json

{
  "input": "¿Dónde va el envío AX-88213-CL?",
  "conversation": "<conversation.id>",
  "agent_reference": {
    "name": "${PROMPT_AGENT}",
    "type": "agent_reference"
  }
}
`

/* Tools integradas (investigación §4.3). `toolbox`/`direct`: dónde se puede usar. */
export type BuiltinTool = { name: string; toolbox: boolean; direct: boolean | 'harness'; preview?: boolean; note?: string }
export const BUILTIN_TOOLS: BuiltinTool[] = [
  { name: 'MCP', toolbox: true, direct: true },
  { name: 'Web search', toolbox: true, direct: true },
  { name: 'Azure AI Search', toolbox: true, direct: true },
  { name: 'Code interpreter', toolbox: true, direct: true },
  { name: 'File search', toolbox: true, direct: true },
  { name: 'OpenAPI', toolbox: true, direct: true },
  { name: 'A2A', toolbox: true, direct: true },
  { name: 'Browser automation', toolbox: true, direct: true, preview: true },
  { name: 'Fabric IQ', toolbox: true, direct: true, preview: true },
  { name: 'Work IQ', toolbox: true, direct: true, preview: true },
  { name: 'Function calling', toolbox: false, direct: true, note: 'se ejecuta en tu cliente, no en el servicio' },
  { name: 'Grounding with Bing', toolbox: false, direct: true },
  { name: 'Azure Functions', toolbox: false, direct: true },
  { name: 'Computer use', toolbox: false, direct: true, preview: true },
  { name: 'Image generation', toolbox: false, direct: true, preview: true },
  { name: 'SharePoint', toolbox: false, direct: true, preview: true },
  { name: 'Fabric data agent', toolbox: false, direct: true, preview: true },
  { name: 'Memory (memory_search_preview)', toolbox: false, direct: true, preview: true },
  { name: 'Skills', toolbox: true, direct: 'harness', preview: true, note: 'directa solo con Copilot harness' },
  { name: 'Tool search', toolbox: true, direct: false },
  { name: 'Reminder tool', toolbox: true, direct: false },
]
/** Lo que soporta gpt-5-mini en Agent Service según la tabla de límites (investigación §2.7). */
export const MINI_TOOLS = ['MCP', 'Web search', 'Code interpreter', 'File search', 'Work IQ']

export const OLD_NEW: { old: string; now: string; note: string }[] = [
  { old: 'Threads', now: 'Conversations', note: 'El historial que el servicio guarda por ti.' },
  { old: 'Messages', now: 'Items', note: 'Mensajes, llamadas a tools y aprobaciones son ítems de la conversación.' },
  { old: 'Runs', now: 'Responses', note: 'Cada turno es un responses.create; no hay un run que consultar por polling.' },
  { old: 'Assistants', now: 'Agent Versions', note: 'create_version genera una versión inmutable del agente.' },
  { old: 'azure-ai-projects 1.x · azure-ai-agents', now: 'azure-ai-projects 2.x + cliente OpenAI', note: 'El código 2.x es incompatible con 1.x.' },
  { old: 'api-version mensual', now: 'Rutas estables v1 (/openai/v1/)', note: 'La Assistants API se retiró el 26-ago-2026.' },
  { old: 'Agent applications (publicar)', now: 'Agent endpoint', note: 'La experiencia anterior quedó como legacy.' },
]

/* ------------------------------ Hosted agent ------------------------------ */

export const CODE_HOSTED = `import os

from agent_framework import Agent
from agent_framework.foundry import FoundryChatClient
from agent_framework_foundry_hosting import ResponsesHostServer
from azure.identity import DefaultAzureCredential

# las @tool de Andi que escribiste en las paradas anteriores
from tools import get_order_status, track_shipment, get_stock, request_refund


def main() -> None:
    client = FoundryChatClient(
        project_endpoint=os.environ["FOUNDRY_PROJECT_ENDPOINT"],   # lo inyecta la plataforma
        model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],        # nombre de TU deployment
        credential=DefaultAzureCredential(),
    )
    agent = Agent(
        client=client,
        name="andes_ops",
        instructions="Eres Andi, agente de operaciones de Andes Market. Responde breve y en español.",
        tools=[get_order_status, track_shipment, get_stock, request_refund],
        default_options={"store": False},
    )
    server = ResponsesHostServer(agent)   # expone el protocolo Responses
    server.run()                          # escucha en el puerto 8088


if __name__ == "__main__":
    main()
`

export const TERM_DEPLOY: TermLine[] = [
  comment('Sesión de Azure CLI y de azd (dos logins distintos)'),
  cmd('az login'),
  cmd('azd auth login'),
  ok('Logged in to Azure.'),
  cmd('azd ext install microsoft.foundry'),
  out('Extension installed: azd ai agent', 200),
  blank(),
  comment('Scaffold desde la plantilla oficial; luego reemplazas main.py por el agente de Andi'),
  cmd(`azd ai agent init --template "${TEMPLATE_URL}" --deploy-mode code --src .`),
  out('Creado azure.yaml (un solo archivo en la raíz; no hay agent.yaml)'),
  dim('  servicio host: azure.ai.project  → deployments'),
  dim('  servicio host: azure.ai.agent    → kind: hosted · protocols: responses 2.0.0'),
  dim('  env: PYTHONNOUSERSITE: "1"       (no declares FOUNDRY_PROJECT_ENDPOINT)'),
  blank(),
  comment('Crea la infraestructura'),
  cmd('azd provision'),
  out('Foundry account + proyecto (con managed identity)', 500),
  out(`Deployment del modelo: ${HOSTED_MODEL}`, 400),
  out('Azure Container Registry', 400),
  out('Application Insights', 300),
  out('Log Analytics workspace', 300),
  ok('Provision completo.'),
  blank(),
  comment('Prueba local antes de subir'),
  cmd('azd ai agent run'),
  out('Agente escuchando en http://localhost:8088 · inspector abierto', 300),
  cmd(`curl -X POST http://localhost:8088/responses -H "Content-Type: application/json" -d '{"input":"¿Dónde está mi pedido 4821?","stream":false}'`),
  dim('{ … "Tu pedido 4821 va en ruta con AndesExpress (AX-88213-CL)…" }'),
  blank(),
  comment('Despliegue: empaqueta un ZIP y Foundry construye la imagen'),
  cmd('azd deploy'),
  out('Empaquetando código (ZIP)…', 500),
  out('Foundry está construyendo la imagen…', 1400),
  ok(`Hosted agent ${HOSTED_AGENT} · nueva versión inmutable · endpoint activo`),
  dim(`${PROJECT_ENDPOINT}/agents/${HOSTED_AGENT}/endpoint/protocols/openai/responses`),
  blank(),
  cmd('azd ai agent invoke "¿Dónde está mi pedido 4821?"'),
  out('Tu pedido 4821 (Zapatillas trekking Cordillera 41) va en ruta con AndesExpress, seguimiento AX-88213-CL.', 300),
  cmd('azd ai agent monitor --follow'),
  dim('… logs de la sesión en vivo (Ctrl+C para salir)'),
  blank(),
  comment('Al terminar de experimentar'),
  cmd('azd down'),
  warn('Borra todo si este entorno creó el proyecto. Application Insights y Log Analytics cobran por ingesta mientras existan.'),
]

export const CODE_INVOKE = `from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient

project = AIProjectClient(
    endpoint="${PROJECT_ENDPOINT}",
    credential=DefaultAzureCredential(),
)

# Cliente OpenAI enlazado al endpoint del agente
openai = project.get_openai_client(agent_name="${HOSTED_AGENT}")

# Una conversación por cliente/caso: el historial vive en Foundry
conversation = openai.conversations.create()

response = openai.responses.create(
    conversation=conversation.id,
    input="¿Dónde está mi pedido 4821?",
)
print(response.output_text)

# Segundo turno: misma conversación, el agente recuerda el contexto
response = openai.responses.create(
    conversation=conversation.id,
    input="¿Y el 5102?",
)
print(response.output_text)
`

export const CODE_INVOKE_REST = `export AZURE_AI_AUTH_TOKEN=$(az account get-access-token \\
  --scope https://ai.azure.com/.default --query accessToken -o tsv)

curl -X POST "${PROJECT_ENDPOINT}/agents/${HOSTED_AGENT}/endpoint/protocols/openai/responses?api-version=v1" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $AZURE_AI_AUTH_TOKEN" \\
  -d '{"input": [{"role": "user", "content": "¿Dónde está mi pedido 4821?"}]}'
`

/* --------------------------------- Estado --------------------------------- */

export const STATE_ROWS: { what: string; basic: string; standard: string }[] = [
  { what: 'Conversaciones, mensajes y definiciones de agentes', basic: 'Almacenamiento gestionado por Microsoft', standard: 'Azure Cosmos DB for NoSQL (tuyo)' },
  { what: 'Archivos y adjuntos', basic: 'Almacenamiento gestionado por Microsoft', standard: 'Azure Storage (Blob) (tuyo)' },
  { what: 'Vector stores e índices', basic: 'Búsqueda vectorial gestionada', standard: 'Azure AI Search (tuyo)' },
]

/** Tamaños documentados de sandbox por sesión (página de conceptos de hosted agents). */
export const SIZES = [
  { id: 's', label: '0,5 vCPU / 1 GiB', vcpu: 0.5, gib: 1 },
  { id: 'm', label: '1 vCPU / 2 GiB', vcpu: 1, gib: 2 },
  { id: 'l', label: '2 vCPU / 4 GiB', vcpu: 2, gib: 4 },
] as const
/** Referencia SIN CONFIRMAR: Azure Retail Prices API, eastus, leída el 15-nov-2026. */
export const PRICE_VCPU_H = 0.0994
export const PRICE_GIB_H = 0.0118
