import { blank, cmd, comment, dim, ok, out, type TermLine } from '@/components/Terminal'

/* Identificadores de plataforma de la lección. Formatos tomados de
   docs/research/aws-2026-11.md §4.4 (ejemplo de la doc: TripPlanner_default_agent-PGgpqs8dg5). */
export const REGION = 'us-east-1'
export const ACCOUNT = '123456789012'
export const PROJECT = 'AndesOps'
export const RUNTIME_NAME = 'agent'
export const RUNTIME_ID = 'AndesOps_default_agent-Kq7mXw2RbT'
export const RUNTIME_ARN = `arn:aws:bedrock-agentcore:${REGION}:${ACCOUNT}:runtime/${RUNTIME_ID}`
export const MEMORY_ID = 'AndesOps_default_AndiMemory-Qx7LmP2dKe'
export const STACK = `AgentCore-${PROJECT}-default`
export const LOG_GROUP = `/aws/bedrock-agentcore/runtimes/${RUNTIME_ID}-DEFAULT`
export const MODEL_ID = 'global.anthropic.claude-sonnet-5-5'
export const QUESTION = '¿Dónde está mi pedido 4821?'
export const ANSWER =
  'Tu pedido 4821 (Zapatillas trekking Cordillera 41, $69.990) va en ruta con AndesExpress, seguimiento AX-88213-CL. Entrega estimada: 14 de noviembre.'

/* -------------------------------------------------------------------------- */
/* Lab 1 · antes / después                                                     */
/* -------------------------------------------------------------------------- */
export const CODE_LOCAL = `# andi_local.py · corre en tu máquina
from strands import Agent, tool
from strands.models import BedrockModel


@tool
def get_order_status(order_id: str) -> dict:
    """Estado, transportista y fecha estimada de un pedido de Andes Market.

    Args:
        order_id: Número de pedido, por ejemplo "4821".
    """
    return lookup_order(order_id)  # tu API de pedidos


model = BedrockModel(model_id="${MODEL_ID}", region_name="${REGION}")
agent = Agent(model=model, tools=[get_order_status], system_prompt=SYSTEM_PROMPT)

agent("${QUESTION}")
`

export const CODE_RUNTIME = `# app/agent/main.py · el mismo agente, envuelto para Runtime
from strands import Agent, tool
from strands.models import BedrockModel
from bedrock_agentcore.runtime import BedrockAgentCoreApp

app = BedrockAgentCoreApp()


@tool
def get_order_status(order_id: str) -> dict:
    """Estado, transportista y fecha estimada de un pedido de Andes Market.

    Args:
        order_id: Número de pedido, por ejemplo "4821".
    """
    return lookup_order(order_id)  # tu API de pedidos


model = BedrockModel(model_id="${MODEL_ID}", region_name="${REGION}")
agent = Agent(model=model, tools=[get_order_status], system_prompt=SYSTEM_PROMPT)


@app.entrypoint
def invoke(payload):
    """Recibe el JSON que llega a POST /invocations."""
    prompt = payload.get("prompt")
    if not isinstance(prompt, str) or not prompt:
        return "Error: 'prompt' must be a non-empty string"
    response = agent(prompt)
    return response.message["content"][0]["text"]


if __name__ == "__main__":
    app.run()
`

export type WrapPart = { id: string; k: string; d: string; needles: string[] }
export const WRAP_PARTS: WrapPart[] = [
  {
    id: 'app',
    k: 'BedrockAgentCoreApp()',
    d: 'Viene del paquete bedrock-agentcore (pip install bedrock-agentcore, 1.26.0). Es el servidor que habla el contrato HTTP de Runtime por ti.',
    needles: ['from bedrock_agentcore.runtime', 'app = BedrockAgentCoreApp()'],
  },
  {
    id: 'entry',
    k: '@app.entrypoint',
    d: 'Marca la función que atiende cada invocación. Recibe (payload) o (payload, context). Si es async y hace yield de los eventos de agent.stream_async(...), la respuesta sale en streaming.',
    needles: ['@app.entrypoint', 'def invoke(payload)', '"""Recibe el JSON'],
  },
  {
    id: 'valid',
    k: 'isinstance(prompt, str)',
    d: 'Práctica oficial: si en vez de texto llega un bloque toolUse, el framework podría ejecutar la herramienta directamente, sin pasar por el modelo ni por los guardrails.',
    needles: ['prompt = payload.get', 'if not isinstance', 'return "Error'],
  },
  {
    id: 'ret',
    k: 'return …["text"]',
    d: 'El agente es el mismo objeto Agent de antes. Lo que devuelves es el cuerpo de la respuesta HTTP: aquí, el texto del último mensaje.',
    needles: ['response = agent(prompt)', 'return response.message'],
  },
  {
    id: 'run',
    k: 'app.run()',
    d: 'Levanta el servidor. En local lo pruebas con python main.py y un curl a http://localhost:8080/invocations; en Runtime es lo que corre dentro de la microVM.',
    needles: ['if __name__', 'app.run()'],
  },
]

export const CODE_CURL = `python app/agent/main.py
curl -X POST http://localhost:8080/invocations \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "${QUESTION}"}'
`

export type Proto = { id: 'http' | 'mcp' | 'a2a' | 'agui'; label: string; port: string; path: string; format: string; discovery: string; note: string }
export const PROTOCOLS: Proto[] = [
  {
    id: 'http',
    label: 'HTTP',
    port: '8080',
    path: 'POST /invocations · /ws',
    format: 'JSON / SSE, WebSocket',
    discovery: 'N/A',
    note: 'Es el que usa @app.entrypoint: tu agente recibe un JSON y devuelve JSON o un stream SSE.',
  },
  {
    id: 'mcp',
    label: 'MCP',
    port: '8000',
    path: '/mcp',
    format: 'JSON-RPC',
    discovery: 'Tool listing',
    note: 'Para hospedar un servidor MCP: mcp.run(transport="streamable-http", host="0.0.0.0", port=8000, stateless_http=True).',
  },
  {
    id: 'a2a',
    label: 'A2A',
    port: '9000',
    path: '/',
    format: 'JSON-RPC 2.0',
    discovery: 'Agent Cards',
    note: 'Agent Card en /.well-known/agent-card.json. Con el SDK: serve_a2a(StrandsA2AExecutor(agent_factory=create_agent)).',
  },
  {
    id: 'agui',
    label: 'AG-UI',
    port: '8080',
    path: '/invocations (SSE) · /ws',
    format: 'Event streams',
    discovery: 'N/A',
    note: 'El cuarto protocolo, disponible desde marzo de 2026: streams de eventos para interfaces de usuario.',
  },
]

/* -------------------------------------------------------------------------- */
/* Lab 2 · terminal                                                            */
/* -------------------------------------------------------------------------- */
export const TERM_CLI: TermLine[] = [
  comment('Requisitos: Node.js 20.12+, npm, Python 3.10+, uv y credenciales AWS'),
  cmd('npm install -g @aws/agentcore'),
  out('added 1 package'),
  cmd('agentcore --version'),
  ok('1.0.3'),
  blank(),
  comment('Con --template es un agente en código; sin --template sería un harness gestionado'),
  cmd(`agentcore create --name ${PROJECT} --template agent-python-strands`),
  out(`${PROJECT}/`),
  dim('  agentcore/agentcore.json     agentcore/aws-targets.json     agentcore/cdk/'),
  dim('  app/agent/main.py     app/agent/model/load.py     app/agent/memory/session.py'),
  ok('Proyecto creado: runtime "agent" (CodeZip) + Memory + CDK + git'),
  cmd(`cd ${PROJECT}`),
  blank(),
  comment('Pega el agente de Andi en app/agent/main.py y pruébalo sin gastar en Runtime'),
  cmd('agentcore dev --mode browser'),
  out('Runtime local con hot reload'),
  dim('Agent Inspector abierto en el navegador · Ctrl+C para salir', 500),
  blank(),
  cmd('agentcore build'),
  ok('Proyecto validado y empaquetado (CodeZip)'),
  blank(),
  comment('CDK + CloudFormation. El primer deploy tarda minutos.'),
  cmd('agentcore deploy'),
  out(`Stack ${STACK}`, 500),
  dim('  rol de ejecución (principal bedrock-agentcore.amazonaws.com)', 300),
  dim(`  runtime ${RUNTIME_ID} · versión 1`, 500),
  dim('  endpoint DEFAULT', 300),
  dim(`  memory ${MEMORY_ID}`, 300),
  dim('  logging y observabilidad en CloudWatch', 700),
  ok('Deploy completo'),
  blank(),
  cmd('agentcore status --json'),
  dim(`{ "runtimes": [{ "name": "${RUNTIME_NAME}", "status": "READY",`),
  dim(`    "arn": "${RUNTIME_ARN}" }] }`),
  blank(),
  cmd(`agentcore invoke --runtime ${RUNTIME_NAME} --payload '{"prompt":"${QUESTION}"}'`),
  ok(ANSWER, 300),
  blank(),
  cmd('agentcore logs runtime --since 30m --level error'),
  dim('(sin errores en los últimos 30 minutos)'),
]

/** La etapa avanza cuando el comando que empieza con `until` ya se ejecutó. */
export const CLI_PHASES = [
  { until: 'agentcore --version', label: 'Instalar el CLI' },
  { until: 'cd ', label: 'Crear el proyecto' },
  { until: 'agentcore dev', label: 'Probar en local' },
  { until: 'agentcore build', label: 'Empaquetar' },
  { until: 'agentcore deploy', label: 'Desplegar' },
  { until: 'agentcore invoke', label: 'Verificar e invocar' },
]

export const CLI_PHASE_NOTES: { title: string; body: string }[] = [
  {
    title: 'Aún no existe nada',
    body: 'El CLI es un paquete de npm (@aws/agentcore). Reemplazó al starter toolkit de Python; si agentcore --version da error, el comando viejo lo está tapando.',
  },
  {
    title: 'El CLI instalado: 1.0.3',
    body: 'La v1.0 salió en octubre de 2026. Todavía no hay nada en tu cuenta: lo que sigue ocurre en tu disco.',
  },
  {
    title: 'Un proyecto en tu disco',
    body: 'agentcore.json describe los recursos (runtimes, memory, gateways…), aws-targets.json las cuentas y regiones destino, y cdk/ la app CDK que los crea. Tu código vive en app/agent/.',
  },
  {
    title: 'Probado en local',
    body: 'agentcore dev levanta el runtime en tu máquina con hot reload; con --mode browser abre el Agent Inspector. Solo pagas los tokens del modelo.',
  },
  {
    title: 'Paquete listo',
    body: 'agentcore build valida la especificación y empaqueta. Con la plantilla por defecto es un zip (CodeZip): sin Docker ni ECR. Límite: 250 MB comprimido, 750 MB descomprimido.',
  },
  {
    title: 'Los recursos existen',
    body: 'Un stack de CloudFormation crea el rol de ejecución, el runtime con su versión 1, el endpoint DEFAULT, la memoria y el log group. Requiere que la cuenta tenga el stack CDKToolkit (bootstrap de CDK).',
  },
  {
    title: 'READY e invocado',
    body: 'agentcore status --json te da el ARN que usará tu aplicación. agentcore invoke llama al endpoint DEFAULT con el mismo JSON que le mandabas por curl.',
  },
]

export const CODE_TREE = `${PROJECT}/
├── agentcore/
│   ├── .env.local          # secretos locales (API keys de proveedores)
│   ├── agentcore.json      # especificación del proyecto (runtimes, harnesses, memory, gateways…)
│   ├── aws-targets.json    # cuentas y regiones destino
│   └── cdk/                # app CDK (constructs @aws/agentcore-cdk)
└── app/agent/
    ├── main.py             # entrypoint y agente Strands
    ├── model/load.py       # modelo
    ├── memory/session.py   # session manager de AgentCore Memory
    └── pyproject.toml
`

/* -------------------------------------------------------------------------- */
/* Lab 3 · sesiones                                                            */
/* -------------------------------------------------------------------------- */
export const SESSION_USERS = [
  { id: 'cus_7781', name: 'Camila Rojas', ask: 'pregunta por el pedido 4821' },
  { id: 'cus_1032', name: 'Diego Fuentes', ask: 'pregunta por un reembolso' },
  { id: 'ops_014', name: 'Operaciones', ask: 'consulta stock de un SKU' },
] as const

/** UUID fijos (36 caracteres) para que la simulación sea determinista. */
export const UUIDS = [
  '8f3a1c52-7d04-4e6b-9a1f-2c5d7e90b114',
  '1b9e6d07-3c48-4f2a-8e75-a04c19d3f6b2',
  'c47d2a90-5e13-4b8c-b6f1-9d2e07a5c338',
  '5a0f8e31-9b62-4d17-a3c4-6e1b28f7d905',
  'e2c6b148-0a7d-4935-8f2e-b51c94d07a6e',
  '73d19f6a-4e85-4c02-9b3d-0f8a2c6e15b7',
  'a905c3e7-2f16-4a8d-b740-d3e61b0f9c24',
  '2e7b40d5-8c39-4f61-a52e-7b0d93c1e86f',
  'd18a6f02-b547-4e93-8c1a-4f2e70b5d369',
  '6c35e9b1-1d70-4a28-9e6f-c8a04d2b7f15',
  'f04b7d26-6a91-4c53-b08e-1e9d5c3a7042',
  '39e1a8c4-d256-4b07-a9f3-5c7e02b8d61a',
]

export const IDLE_OPTIONS = [
  { value: '60', label: '60 s' },
  { value: '300', label: '5 min' },
  { value: '900', label: '15 min · default' },
  { value: '3600', label: '1 h' },
  { value: '28800', label: '8 h' },
]
export const MAX_LIFETIME = 28800

export const SESSION_LIMITS: { k: string; v: string }[] = [
  { k: 'Hardware por sesión', v: '2 vCPU / 8 GB (hasta 8 / 32 con V2)' },
  { k: 'Payload', v: '100 MB' },
  { k: 'Petición síncrona', v: '15 min' },
  { k: 'Streaming', v: '60 min · chunk 10 MB' },
  { k: 'Job asíncrono', v: '8 h' },
  { k: 'Session storage', v: '1 GB por sesión' },
  { k: 'Sesiones activas', v: '5.000 (us-east-1, us-west-2) · 2.500 resto' },
  { k: 'Creación de sesiones', v: '25 TPS' },
]

/* -------------------------------------------------------------------------- */
/* Lab 4 · boto3                                                               */
/* -------------------------------------------------------------------------- */
export const CODE_INVOKE = `import boto3, json, uuid

agent_core_client = boto3.client("bedrock-agentcore", region_name="${REGION}")

session_id = str(uuid.uuid4())   # 36 caracteres; guárdalo por conversación

response = agent_core_client.invoke_agent_runtime(
    agentRuntimeArn="${RUNTIME_ARN}",
    runtimeSessionId=session_id,              # >= 33 caracteres
    payload=json.dumps({"prompt": "${QUESTION}"}).encode(),
    qualifier="DEFAULT",                      # opcional: endpoint
)

if "text/event-stream" in response.get("contentType", ""):
    for line in response["response"].iter_lines(chunk_size=10):
        if line:
            line = line.decode("utf-8")
            if line.startswith("data: "):
                print(line[6:])
elif response.get("contentType") == "application/json":
    body = "".join(chunk.decode("utf-8") for chunk in response.get("response", []))
    print(json.loads(body))
`

export const REQUEST_SHAPE = `agentRuntimeArn
  ${RUNTIME_ARN}
runtimeSessionId
  ${UUIDS[0]}
payload (bytes)
  {"prompt": "${QUESTION}"}
qualifier
  DEFAULT`

export const INVOKE_ERRORS: { code: string; name: string; why: string }[] = [
  { code: '400', name: 'ValidationException', why: 'La petición no cumple el formato.' },
  { code: '403', name: 'AccessDeniedException', why: 'Falta bedrock-agentcore:InvokeAgentRuntime.' },
  { code: '404', name: 'ResourceNotFoundException', why: 'ARN o endpoint (qualifier) inexistente.' },
  { code: '409', name: 'RetryableConflictException', why: '"Session operation in progress, please retry".' },
  { code: '424', name: 'RuntimeClientError', why: 'Tu contenedor devolvió 4xx/5xx: mira CloudWatch.' },
  { code: '429', name: 'ThrottlingException', why: 'Superaste la tasa de peticiones.' },
  { code: '402', name: 'ServiceQuotaExceededException', why: 'Tope de cuota (p. ej. sesiones activas).' },
]

/* -------------------------------------------------------------------------- */
/* Lab 6 · costo (us-east-1, visto 15-nov-2026)                                */
/* -------------------------------------------------------------------------- */
export const PRICE_DATE = '15-nov-2026'
export const PRICING = {
  v1: { label: 'V1 · consumo', vcpu: 0.0895, gb: 0.00945 },
  v2: { label: 'V2 · consumo', vcpu: 0.1276, gb: 0.0169 },
  v2c: { label: 'V2 · committed baseline', vcpu: 0.0997, gb: 0.0132 },
} as const
export type PlanId = keyof typeof PRICING
/** Sonnet 5.5 global, USD por 1M de tokens (input / output). */
export const MODEL_PRICE = { input: 2.0, output: 10.0 }
export const TOKENS_PER_SESSION = { input: 3000, output: 400 }
