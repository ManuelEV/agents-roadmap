import type { Tone } from '@/components/ui'
import { REFUND_POLICY, fmtClp, orderById, runTool } from '@/sim/andes'

/* Identificadores propios del escenario (inventados; los formatos de API son los de la investigación). */
export const MODEL_DEPLOYMENT = 'gpt-5.4-mini'
export const MCP_URL = 'https://mcp.andesmarket.example/inventario/mcp'
export const LIMIT = REFUND_POLICY.autoApproveMaxClp

const SMALL = orderById('4790')!
const BIG = orderById('4821')!

/* ========================================================================== */
/* Lab 1 · La misma herramienta, tres lugares donde corre                      */
/* ========================================================================== */

export type SourceId = 'function' | 'local' | 'hosted'

export const SOURCE_CODE: Record<SourceId, string> = {
  function: `from typing import Annotated

from agent_framework import Agent, tool
from agent_framework.foundry import FoundryChatClient
from azure.identity import AzureCliCredential
from pydantic import Field


@tool(approval_mode="never_require")
def get_stock(
    sku: Annotated[str, Field(description="SKU del producto, p. ej. ZAP-TRK-41.")],
) -> str:
    """Stock disponible de un SKU en la bodega."""
    return erp.stock(sku)            # tu código, en tu proceso


andi = Agent(
    client=FoundryChatClient(credential=AzureCliCredential()),
    name="andes_ops",
    instructions=ROOT_INSTRUCTION,
    tools=[get_stock],
)`,
  local: `from agent_framework import Agent, MCPStreamableHTTPTool
from agent_framework.foundry import FoundryChatClient
from azure.identity import AzureCliCredential

async with (
    MCPStreamableHTTPTool(
        name="Inventario Andes",
        url="${MCP_URL}",
        header_provider=lambda _kwargs: {"Authorization": f"Bearer {api_key}"},
        allowed_tools=["get_stock"],
    ) as inventario,
    Agent(
        client=FoundryChatClient(credential=AzureCliCredential()),
        name="andes_ops",
        instructions=ROOT_INSTRUCTION,
    ) as andi,
):
    result = await andi.run("¿Queda stock de ZAP-TRK-41?", tools=inventario)

# servidor como proceso hijo (stdio):
# MCPStdioTool(name="calculator", command="uvx", args=["mcp-server-calculator"])`,
  hosted: `from agent_framework import Agent
from agent_framework.foundry import FoundryChatClient
from azure.identity import AzureCliCredential

client = FoundryChatClient(credential=AzureCliCredential())

inventario = client.get_mcp_tool(
    name="Inventario Andes",
    url="${MCP_URL}",
    approval_mode="always_require",
    allowed_tools=["get_stock"],
)

andi = Agent(
    client=client,
    name="andes_ops",
    instructions=ROOT_INSTRUCTION,
    tools=[inventario],
)`,
}

export const SOURCE_INFO: Record<SourceId, { label: string; file: string; runs: string; schema: string; auth: string; when: string; needles: string[] }> = {
  function: {
    label: 'Función Python',
    file: 'andes_ops/tools.py',
    runs: 'En tu proceso. Agent Framework recibe el function_call del modelo, ejecuta la función y devuelve el function_result.',
    schema: 'Sale del nombre, el docstring y los type hints (Annotated + Field describe cada parámetro). Con o sin @tool.',
    auth: 'La que tenga tu proceso: credenciales del ERP, variables de entorno, la identidad con la que corre.',
    when: 'La lógica es tuya y vive con el agente. Es la opción con menos piezas.',
    needles: ['@tool(approval_mode', 'def get_stock(', 'tools=[get_stock]'],
  },
  local: {
    label: 'MCP local',
    file: 'andes_ops/agent.py',
    runs: 'El código de la herramienta corre en el servidor MCP. Tu proceso es el cliente MCP: descubre las herramientas, recibe el function_call y hace la llamada al servidor.',
    schema: 'Lo publica el servidor. allowed_tools filtra qué herramientas ve el modelo.',
    auth: 'Los headers los pones tú (header_provider o static_headers). El token nunca sale de tu proceso hacia el modelo.',
    when: 'Otro equipo ya expone el sistema por MCP, o el servidor solo es alcanzable desde tu red. Con MCPStdioTool el servidor es un proceso hijo.',
    needles: ['MCPStreamableHTTPTool(', 'url=', 'header_provider', 'allowed_tools', 'tools=inventario'],
  },
  hosted: {
    label: 'MCP hospedado',
    file: 'andes_ops/agent.py',
    runs: 'El servicio del modelo llama al servidor MCP. Tu proceso solo declara la herramienta; no hace la llamada de red.',
    schema: 'Lo publica el servidor y lo lee el servicio. allowed_tools también filtra aquí.',
    auth: 'Los headers viajan en la declaración (headers=). El servidor tiene que ser alcanzable desde el servicio, no desde tu red.',
    when: 'El servidor es público o ya está detrás de un gateway, y no quieres que tu proceso sea el intermediario.',
    needles: ['client.get_mcp_tool(', 'url=', 'approval_mode=', 'allowed_tools', 'tools=[inventario]'],
  },
}

export const STOCK_RESULT = runTool('get_stock', { sku: 'ZAP-TRK-41' })

/** Herramientas que publica el servidor MCP de inventario del escenario. */
export const MCP_SERVER_TOOLS = [
  { name: 'get_stock', what: 'lee stock', list: 'never' as const },
  { name: 'reserve_stock', what: 'aparta unidades', list: null },
  { name: 'adjust_stock', what: 'corrige inventario', list: 'always' as const },
]

export const approvalModeCode = (withDefault: boolean) => `MCPStreamableHTTPTool(
    name="Inventario Andes",
    url="${MCP_URL}",
    approval_mode={
        "always_require_approval": ["adjust_stock"],
        "never_require_approval": ["get_stock"],${withDefault ? '\n        "default": "always_require",' : ''}
    },
)`

/* ========================================================================== */
/* Lab 2 · Aprobación humana                                                   */
/* ========================================================================== */

export const APPROVAL_CODE = `import json
from typing import Annotated

from agent_framework import Agent, tool
from agent_framework.foundry import FoundryChatClient
from azure.identity import AzureCliCredential
from pydantic import Field

REFUND_AUTO_MAX_CLP = 50_000


@tool(approval_mode="never_require")
def request_refund(
    order_id: Annotated[str, Field(description="Número de pedido.")],
    amount_clp: Annotated[int, Field(description="Monto en pesos chilenos.")],
    reason: Annotated[str, Field(description="Motivo que dio el cliente.")],
) -> str:
    """Reembolsa un pedido si el monto no supera el tope automático."""
    if amount_clp > REFUND_AUTO_MAX_CLP:
        return json.dumps({"status": "pending", "message": "Requiere aprobación de supervisor."})
    return json.dumps(payments.refund(order_id, amount_clp, reason))


@tool(approval_mode="always_require")
def refund_with_approval(
    order_id: Annotated[str, Field(description="Número de pedido.")],
    amount_clp: Annotated[int, Field(description="Monto en pesos chilenos.")],
    reason: Annotated[str, Field(description="Motivo que dio el cliente.")],
) -> str:
    """Reembolsa un monto sobre el tope. Solo se ejecuta si un supervisor aprueba."""
    return json.dumps(payments.refund(order_id, amount_clp, reason))


andi = Agent(
    client=FoundryChatClient(credential=AzureCliCredential()),
    name="andes_ops",
    instructions=ROOT_INSTRUCTION,
    tools=[get_order_status, request_refund, refund_with_approval],
)

session = andi.create_session()
result = await andi.run("Reembolsa el pedido 4821.", session=session)

for message in result.messages:
    for content in message.contents:
        if content.type == "function_approval_request":
            ...   # muéstrasela al supervisor; el run ya terminó`

export type Decision = 'approved' | 'rejected' | null

export type RunContent = {
  /** paso del lab en el que aparece */
  step: number
  /** a qué llamada agent.run() pertenece */
  run: 1 | 2 | 3
  /** valor real de content.type */
  type: string
  tone: Tone
  /** quién lo produjo (etiqueta nuestra, no un campo) */
  by: string
  text?: string
  code?: string
}

const smallArgs = { order_id: SMALL.id, amount_clp: SMALL.total, reason: 'producto dañado' }
const bigArgs = { order_id: BIG.id, amount_clp: BIG.total, reason: 'atraso en la entrega' }
const call = (name: string, args: Record<string, unknown>) => `${name}(${JSON.stringify(args)})`

export const APPROVED_RESULT = { ...runTool('request_refund', smallArgs), refund_id: 'rf_20932', amount_clp: BIG.total }

export function approvalContents(decision: Decision): RunContent[] {
  const base: RunContent[] = [
    { step: 0, run: 1, type: 'text', tone: 'user', by: 'Camila', text: `Quiero el reembolso del pedido ${SMALL.id}, el polar llegó con una costura rota.` },
    { step: 1, run: 1, type: 'function_call', tone: 'model', by: 'modelo', code: call('request_refund', smallArgs) },
    { step: 1, run: 1, type: 'function_result', tone: 'tool', by: 'tu proceso', code: JSON.stringify(runTool('request_refund', smallArgs)) },
    { step: 2, run: 1, type: 'text', tone: 'model', by: 'modelo', text: `Listo: inicié el reembolso de ${fmtClp(SMALL.total)} del pedido ${SMALL.id} (ref. rf_20931).` },
    { step: 3, run: 2, type: 'text', tone: 'user', by: 'Camila', text: `Y reembolsa también el ${BIG.id}: son ${fmtClp(BIG.total)} y sigue sin llegar.` },
    { step: 3, run: 2, type: 'function_call', tone: 'model', by: 'modelo', code: call('request_refund', bigArgs) },
    { step: 3, run: 2, type: 'function_result', tone: 'tool', by: 'tu proceso', code: JSON.stringify(runTool('request_refund', bigArgs)) },
    { step: 4, run: 2, type: 'function_approval_request', tone: 'guard', by: 'Agent Framework', code: call('refund_with_approval', bigArgs) },
  ]
  if (decision === 'approved')
    return [
      ...base,
      { step: 6, run: 3, type: 'function_approval_response', tone: 'guard', by: 'supervisor', text: 'aprobado' },
      { step: 6, run: 3, type: 'function_result', tone: 'tool', by: 'tu proceso', code: JSON.stringify(APPROVED_RESULT) },
      { step: 7, run: 3, type: 'text', tone: 'model', by: 'modelo', text: `Aprobado por un supervisor: reembolso de ${fmtClp(BIG.total)} del pedido ${BIG.id} en curso (ref. rf_20932).` },
    ]
  if (decision === 'rejected')
    return [
      ...base,
      { step: 6, run: 3, type: 'function_approval_response', tone: 'error', by: 'supervisor', text: 'rechazado' },
      { step: 7, run: 3, type: 'text', tone: 'model', by: 'modelo', text: `El supervisor no aprobó el reembolso de ${fmtClp(BIG.total)}: el pedido ${BIG.id} sigue en ruta. Puedo avisarte apenas se entregue o gestionar la devolución cuando llegue.` },
    ]
  return base
}

export type ApprovalStep = { title: string; body: string; needles: string[] }

const APPROVAL_BASE: ApprovalStep[] = [
  { title: `Run 1 · Camila pide el reembolso del ${SMALL.id}`, body: `Son ${fmtClp(SMALL.total)}, bajo el tope de ${fmtClp(LIMIT)}. Es un agent.run() normal sobre una sesión.`, needles: ['session = andi.create_session()'] },
  {
    title: 'request_refund no pide permiso: se ejecuta',
    body: 'La herramienta está declarada con approval_mode="never_require". Agent Framework ejecuta la función en cuanto el modelo emite el function_call y le devuelve el function_result.',
    needles: ['@tool(approval_mode="never_require")', 'def request_refund('],
  },
  { title: 'El run 1 termina con texto', body: 'Con el resultado en el contexto, el modelo redacta la respuesta. result.text trae el mensaje final.', needles: ['return json.dumps(payments.refund(order_id, amount_clp, reason))'] },
  {
    title: `Run 2 · ahora son ${fmtClp(BIG.total)}`,
    body: `El modelo vuelve a llamar a request_refund. La función se ejecuta, pero el tope vive en su código: devuelve status "pending" en vez de mover plata.`,
    needles: ['if amount_clp > REFUND_AUTO_MAX_CLP:', '"status": "pending"'],
  },
  {
    title: 'El modelo elige refund_with_approval y el run se detiene',
    body: 'Esa herramienta es always_require. Agent Framework no la ejecuta: el run devuelve un contenido de tipo function_approval_request con la llamada pendiente. No hay texto final y no se movió plata.',
    needles: ['@tool(approval_mode="always_require")', 'def refund_with_approval(', 'if content.type == "function_approval_request":'],
  },
  {
    title: 'El supervisor decide',
    body: 'Tu aplicación encontró la solicitud en result.messages y se la muestra a una persona. Nada corre mientras tanto: no hay un proceso esperando, solo la sesión con el historial. Decide tú.',
    needles: ['for message in result.messages:', 'for content in message.contents:'],
  },
]
const APPROVAL_YES: ApprovalStep[] = [
  {
    title: 'Run 3 · la respuesta entra como contenido',
    body: 'Tu aplicación llama otra vez a agent.run() con la misma sesión y un contenido function_approval_response. Recién ahora Agent Framework ejecuta refund_with_approval, una sola vez.',
    needles: ['def refund_with_approval(', 'return json.dumps(payments.refund(order_id, amount_clp, reason))'],
  },
  { title: 'El modelo confirma a Camila', body: 'El function_result quedó en el historial y el modelo cierra el turno con texto.', needles: [] },
]
const APPROVAL_NO: ApprovalStep[] = [
  {
    title: 'Run 3 · la respuesta es un rechazo',
    body: 'El mismo contenido function_approval_response, con la decisión contraria. La función no se ejecuta: no hay function_result de éxito que el modelo pueda citar.',
    needles: ['def refund_with_approval('],
  },
  { title: 'El modelo explica y ofrece otra salida', body: 'Con el rechazo en el historial, el modelo no puede afirmar un reembolso que no ocurrió.', needles: [] },
]

export const approvalSteps = (d: Decision): ApprovalStep[] => [...APPROVAL_BASE, ...(d === 'approved' ? APPROVAL_YES : d === 'rejected' ? APPROVAL_NO : [])]

export const BIG_ORDER = BIG
export const BIG_ARGS = bigArgs

/* ========================================================================== */
/* Lab 3 · Middleware                                                          */
/* ========================================================================== */

export const MIDDLEWARE_CODE = `from collections.abc import Awaitable, Callable
from agent_framework import AgentContext, AgentMiddleware, AgentResponse, Message

class SecurityAgentMiddleware(AgentMiddleware):
    async def process(self, context: AgentContext, call_next: Callable[[], Awaitable[None]]) -> None:
        last_message = context.messages[-1] if context.messages else None
        if last_message and last_message.text and "password" in last_message.text.lower():
            context.result = AgentResponse(
                messages=[Message("assistant", ["Detected sensitive information, the request is blocked."])]
            )
            return                      # no llamar a call_next() corta la ejecución
        await call_next()

andi = Agent(client=client, instructions=ROOT_INSTRUCTION, middleware=[SecurityAgentMiddleware()])`

export type LayerId = 'agent' | 'chat' | 'function'
export const LAYERS: Record<LayerId, { label: string; context: string; decorator: string; fires: string; use: string; tone: Tone }> = {
  agent: {
    label: 'agent',
    context: 'AgentContext',
    decorator: '@agent_middleware',
    fires: 'Una vez por agent.run(): envuelve el run completo.',
    use: 'Bloquear un pedido antes de gastar un token, registrar quién preguntó, reemplazar el resultado (context.result).',
    tone: 'model',
  },
  chat: {
    label: 'chat',
    context: 'ChatContext',
    decorator: '@chat_middleware',
    fires: 'En cada llamada al modelo dentro del loop de herramientas: aquí, dos veces.',
    use: 'Ver o recortar lo que se envía al modelo, medir cada llamada.',
    tone: 'user',
  },
  function: {
    label: 'function',
    context: 'FunctionInvocationContext',
    decorator: '@function_middleware',
    fires: 'En cada ejecución de una herramienta: aquí, una vez.',
    use: 'Auditar argumentos y resultados, validar una regla de negocio justo antes de ejecutar.',
    tone: 'tool',
  },
}

/** Línea de tiempo de un run con una herramienta (el reembolso del 4790). */
export const RUN_TIMELINE: { id: string; label: string; sub: string; layer: LayerId }[] = [
  { id: 'c1', label: 'llamada al modelo 1', sub: 'emite function_call', layer: 'chat' },
  { id: 'f1', label: 'request_refund', sub: 'se ejecuta la función', layer: 'function' },
  { id: 'c2', label: 'llamada al modelo 2', sub: 'redacta la respuesta', layer: 'chat' },
]

/* ========================================================================== */
/* Lab 4 · Workflow en grafo                                                   */
/* ========================================================================== */

export const WORKFLOW_CODE = `from dataclasses import dataclass
from typing_extensions import Never
from agent_framework import (
    Executor, InMemoryCheckpointStorage, WorkflowBuilder, WorkflowContext,
    executor, handler, response_handler,
)

@dataclass
class RefundCase:
    order_id: str
    reason: str
    amount_clp: int = 0

@executor(id="classify")
async def classify(text: str, ctx: WorkflowContext[RefundCase]) -> None:
    result = await triage.run(text)              # un Agent que responde "4821|atraso"
    order_id, reason = result.text.split("|")
    await ctx.send_message(RefundCase(order_id, reason))

@executor(id="check_order")
async def check_order(case: RefundCase, ctx: WorkflowContext[RefundCase]) -> None:
    case.amount_clp = orders.total_clp(case.order_id)       # tu código
    await ctx.send_message(case)

class SupervisorGate(Executor):
    @handler
    async def ask(self, case: RefundCase, ctx: WorkflowContext[RefundCase, str]) -> None:
        await ctx.request_info(request_data=case, response_type=bool)

    @response_handler
    async def on_decision(self, original_request: RefundCase, response: bool,
                          ctx: WorkflowContext[RefundCase, str]) -> None:
        if response:
            await ctx.send_message(original_request)
        else:
            await ctx.yield_output(f"Reembolso del pedido {original_request.order_id} rechazado.")

@executor(id="execute_refund")
async def execute_refund(case: RefundCase, ctx: WorkflowContext[Never, str]) -> None:
    refund_id = payments.refund(case.order_id, case.amount_clp, case.reason)
    await ctx.yield_output(f"Reembolso {refund_id} por {case.amount_clp} CLP.")

gate = SupervisorGate(id="supervisor_gate")
storage = InMemoryCheckpointStorage()
workflow = (
    WorkflowBuilder(start_executor=classify, checkpoint_storage=storage)
    .add_edge(classify, check_order)
    .add_edge(check_order, execute_refund, condition=lambda c: c.amount_clp <= 50_000)
    .add_edge(check_order, gate, condition=lambda c: c.amount_clp > 50_000)
    .add_edge(gate, execute_refund)
    .build()
)`

export const WORKFLOW_CALLER_CODE = `pending: dict[str, bool] = {}
async for event in workflow.run("Reembolsa el pedido 4821, sigue sin llegar", stream=True):
    if event.type == "request_info":
        pending[event.request_id] = await ask_supervisor(event.data)   # tu interfaz

async for event in workflow.run(stream=True, responses=pending):
    if event.type == "output":
        print(event.data)

# tras una caída: retomar desde el último checkpoint guardado
checkpoints = await storage.list_checkpoints(workflow_name=workflow.name)
async for event in workflow.run(checkpoint_id=checkpoints[-1].checkpoint_id, stream=True):
    ...`

export type WfScenario = 'auto' | 'approval'
export const WF_SCENARIOS: Record<WfScenario, { label: string; message: string; orderId: string; amount: number; reason: string }> = {
  auto: { label: `Pedido ${SMALL.id} · ${fmtClp(SMALL.total)}`, message: `Reembolsa el pedido ${SMALL.id}, el polar llegó roto`, orderId: SMALL.id, amount: SMALL.total, reason: 'producto dañado' },
  approval: { label: `Pedido ${BIG.id} · ${fmtClp(BIG.total)}`, message: `Reembolsa el pedido ${BIG.id}, sigue sin llegar`, orderId: BIG.id, amount: BIG.total, reason: 'atraso' },
}

export const REQUEST_ID = 'req-4821-01'

export type WfEvent = {
  step: number
  /** valor real de event.type */
  type: string
  tone: Tone
  executor_id?: string
  request_id?: string
  data?: string
  /** etiqueta nuestra */
  note?: string
}

export type WfStep = {
  title: string
  body: string
  active: string[]
  flows: string[]
  /** superstep que termina en este paso (y deja un checkpoint) */
  superstep?: number
  /** el stream termina con una solicitud pendiente */
  pending?: boolean
  final?: string
  needles: string[]
}

const ss = (step: number, n: number, executorId: string, extra: WfEvent[] = []): WfEvent[] => [
  { step, type: 'superstep_started', tone: 'system', note: `superstep ${n}` },
  { step, type: 'executor_invoked', tone: 'tool', executor_id: executorId },
  ...extra,
  { step, type: 'executor_completed', tone: 'tool', executor_id: executorId },
  { step, type: 'superstep_completed', tone: 'memory', note: `superstep ${n} · checkpoint guardado` },
]

export function workflowRun(scenario: WfScenario, decision: Decision): { steps: WfStep[]; events: WfEvent[] } {
  const sc = WF_SCENARIOS[scenario]
  const caseData = (amount: number) => `RefundCase(order_id="${sc.orderId}", reason="${sc.reason}", amount_clp=${amount})`
  const okOutput = `Reembolso ${scenario === 'auto' ? 'rf_20931' : 'rf_20932'} por ${sc.amount} CLP.`

  const steps: WfStep[] = [
    {
      title: 'workflow.run(mensaje, stream=True)',
      body: 'El mensaje entra por el start_executor. A partir de aquí no decide un modelo qué sigue: lo deciden las aristas. Cada cosa que pasa llega como un WorkflowEvent con su type.',
      active: ['in'],
      flows: ['in>classify'],
      needles: ['WorkflowBuilder(start_executor=classify'],
    },
    {
      title: 'classify convierte texto en un RefundCase',
      body: 'Es el único nodo que usa un modelo (un agente de triage dentro del handler). Con ctx.send_message entrega el caso tipado al siguiente nodo. Al cerrar el superstep se guarda un checkpoint.',
      active: ['classify'],
      flows: ['classify>check_order'],
      superstep: 1,
      needles: ['@executor(id="classify")', 'await ctx.send_message(RefundCase(order_id, reason))', '.add_edge(classify, check_order)'],
    },
    {
      title: `check_order lee el monto: ${fmtClp(sc.amount)}`,
      body: `Código determinista: consulta el pedido y completa amount_clp. Las dos aristas condicionales que salen de aquí evalúan el caso; solo ${scenario === 'auto' ? 'la de ≤ 50.000' : 'la de > 50.000'} se cumple.`,
      active: ['check_order'],
      flows: [scenario === 'auto' ? 'check_order>execute_refund' : 'check_order>supervisor_gate'],
      superstep: 2,
      needles: ['@executor(id="check_order")', scenario === 'auto' ? 'condition=lambda c: c.amount_clp <= 50_000' : 'condition=lambda c: c.amount_clp > 50_000'],
    },
  ]
  const events: WfEvent[] = [
    { step: 0, type: 'started', tone: 'system' },
    ...ss(1, 1, 'classify'),
    ...ss(2, 2, 'check_order'),
  ]

  if (scenario === 'auto') {
    steps.push({
      title: 'execute_refund hace el reembolso y entrega la salida',
      body: 'ctx.yield_output produce el evento output: es el resultado del workflow. Ningún humano intervino porque el grafo no pasó por supervisor_gate.',
      active: ['execute_refund', 'out'],
      flows: ['execute_refund>out'],
      superstep: 3,
      final: okOutput,
      needles: ['@executor(id="execute_refund")', 'await ctx.yield_output(f"Reembolso {refund_id}'],
    })
    events.push(...ss(3, 3, 'execute_refund', [{ step: 3, type: 'output', tone: 'ok', executor_id: 'execute_refund', data: okOutput }]))
    return { steps, events }
  }

  steps.push({
    title: 'supervisor_gate pide una decisión y el stream termina',
    body: 'ctx.request_info emite un evento request_info con un request_id y el caso como data. El superstep se cierra y el checkpoint guarda también la solicitud pendiente. El workflow queda detenido: decide tú.',
    active: ['supervisor_gate'],
    flows: [],
    superstep: 3,
    pending: true,
    needles: ['await ctx.request_info(request_data=case, response_type=bool)'],
  })
  events.push(...ss(3, 3, 'supervisor_gate', [{ step: 3, type: 'request_info', tone: 'guard', executor_id: 'supervisor_gate', request_id: REQUEST_ID, data: caseData(sc.amount) }]))

  if (decision === 'approved') {
    steps.push(
      {
        title: 'workflow.run(stream=True, responses=pending)',
        body: 'La respuesta True llega al @response_handler del mismo executor, junto con la solicitud original. Como aprobó, reenvía el caso por la arista hacia execute_refund.',
        active: ['supervisor_gate'],
        flows: ['supervisor_gate>execute_refund'],
        superstep: 4,
        needles: ['@response_handler', 'if response:', 'await ctx.send_message(original_request)', '.add_edge(gate, execute_refund)'],
      },
      {
        title: 'execute_refund hace el reembolso y entrega la salida',
        body: 'El mismo nodo que en el camino automático: el grafo garantiza que solo se llega aquí por una de las dos aristas.',
        active: ['execute_refund', 'out'],
        flows: ['execute_refund>out'],
        superstep: 5,
        final: okOutput,
        needles: ['@executor(id="execute_refund")', 'await ctx.yield_output(f"Reembolso {refund_id}'],
      },
    )
    events.push(...ss(4, 4, 'supervisor_gate'), ...ss(5, 5, 'execute_refund', [{ step: 5, type: 'output', tone: 'ok', executor_id: 'execute_refund', data: okOutput }]))
  } else if (decision === 'rejected') {
    const out = `Reembolso del pedido ${sc.orderId} rechazado.`
    steps.push({
      title: 'workflow.run(stream=True, responses=pending)',
      body: 'La respuesta False llega al @response_handler. No envía nada a execute_refund: produce la salida del workflow directamente. El nodo que mueve plata nunca se invocó.',
      active: ['supervisor_gate', 'out'],
      flows: ['supervisor_gate>out'],
      superstep: 4,
      final: out,
      needles: ['@response_handler', 'else:', 'await ctx.yield_output(f"Reembolso del pedido'],
    })
    events.push(...ss(4, 4, 'supervisor_gate', [{ step: 4, type: 'output', tone: 'error', executor_id: 'supervisor_gate', data: out }]))
  }
  return { steps, events }
}

/* ========================================================================== */
/* Lab 5 · Orquestaciones listas                                               */
/* ========================================================================== */

export type PatternId = 'sequential' | 'concurrent' | 'handoff' | 'groupchat' | 'magentic'

export type PatternNode = { id: string; x: number; y: number; label: string; sub?: string; tone: Tone; w?: number }
export type Pattern = {
  label: string
  builder: string
  code: string
  when: string
  avoid: string
  nodes: PatternNode[]
  edges: { from: string; to: string; dashed?: boolean; curve?: number }[]
  beats: { flows: string[]; note: string }[]
}

export const PATTERNS: Record<PatternId, Pattern> = {
  sequential: {
    label: 'Secuencial',
    builder: 'SequentialBuilder',
    code: `workflow = SequentialBuilder(participants=[redactor, revisor]).build()
events = await workflow.run("Responde a Camila por el atraso del pedido 4821.")
final = events.get_outputs()[0]                   # AgentResponse`,
    when: 'Los pasos tienen un orden fijo y cada uno parte de lo que dejó el anterior: redactar y luego revisar contra la política.',
    avoid: 'Si los pasos no dependen entre sí, estás pagando latencia en fila.',
    nodes: [
      { id: 'in', x: 70, y: 110, label: 'Tarea', tone: 'user', w: 100 },
      { id: 'a', x: 250, y: 110, label: 'redactor', sub: 'Agent', tone: 'model' },
      { id: 'b', x: 450, y: 110, label: 'revisor', sub: 'Agent', tone: 'model' },
      { id: 'out', x: 630, y: 110, label: 'Salida', tone: 'ok', w: 100 },
    ],
    edges: [{ from: 'in', to: 'a' }, { from: 'a', to: 'b' }, { from: 'b', to: 'out' }],
    beats: [
      { flows: ['in>a'], note: 'La tarea llega al primer participante.' },
      { flows: ['a>b'], note: 'El revisor recibe lo que escribió el redactor.' },
      { flows: ['b>out'], note: 'La salida es la respuesta del último participante.' },
    ],
  },
  concurrent: {
    label: 'Concurrente',
    builder: 'ConcurrentBuilder',
    code: `workflow = ConcurrentBuilder(participants=[pedidos, inventario, logistica]).build()
# opcional: .with_aggregator(fn) para combinar las respuestas`,
    when: 'Varias miradas independientes sobre la misma pregunta: estado del pedido, stock para reponer y situación del transportista, a la vez.',
    avoid: 'Si un agente necesita el resultado de otro, no son independientes.',
    nodes: [
      { id: 'in', x: 70, y: 110, label: 'Tarea', tone: 'user', w: 100 },
      { id: 'a', x: 290, y: 36, label: 'pedidos', sub: 'Agent', tone: 'model' },
      { id: 'b', x: 290, y: 110, label: 'inventario', sub: 'Agent', tone: 'model' },
      { id: 'c', x: 290, y: 184, label: 'logistica', sub: 'Agent', tone: 'model' },
      { id: 'out', x: 540, y: 110, label: 'Agregador', sub: 'with_aggregator', tone: 'ok', w: 160 },
    ],
    edges: [
      { from: 'in', to: 'a' }, { from: 'in', to: 'b' }, { from: 'in', to: 'c' },
      { from: 'a', to: 'out' }, { from: 'b', to: 'out' }, { from: 'c', to: 'out' },
    ],
    beats: [
      { flows: ['in>a', 'in>b', 'in>c'], note: 'La misma tarea sale hacia todos al mismo tiempo.' },
      { flows: ['a>out', 'b>out', 'c>out'], note: 'Las respuestas se juntan; con with_aggregator decides cómo.' },
    ],
  },
  handoff: {
    label: 'Handoff',
    builder: 'HandoffBuilder',
    code: `workflow = (
    HandoffBuilder(name="customer_support_handoff",
                   participants=[triage_agent, refund_agent, order_agent])
    .with_start_agent(triage_agent)
    .build()
)`,
    when: 'Atención al cliente: un agente de entrada entiende el caso y le pasa la conversación al especialista, que sigue hablando con la persona.',
    avoid: 'Solo acepta participantes Agent y por defecto todos pueden pasarle a todos (malla): con muchos agentes cuesta predecir el recorrido.',
    nodes: [
      { id: 'in', x: 70, y: 110, label: 'Camila', tone: 'user', w: 100 },
      { id: 'a', x: 270, y: 110, label: 'triage_agent', sub: 'inicio', tone: 'model', w: 160 },
      { id: 'b', x: 520, y: 46, label: 'refund_agent', sub: 'Agent', tone: 'model', w: 160 },
      { id: 'c', x: 520, y: 174, label: 'order_agent', sub: 'Agent', tone: 'model', w: 160 },
    ],
    edges: [{ from: 'in', to: 'a' }, { from: 'a', to: 'b' }, { from: 'a', to: 'c' }, { from: 'b', to: 'c', dashed: true }],
    beats: [
      { flows: ['in>a'], note: 'Camila escribe; responde el agente de inicio.' },
      { flows: ['a>b'], note: 'triage_agent cede el control a refund_agent.' },
      { flows: ['b>in'], note: 'El especialista necesita un dato: llega un request_info con HandoffAgentUserRequest.' },
      { flows: ['in>b'], note: 'Respondes con HandoffAgentUserRequest.create_response(texto) y workflow.run(responses=...).' },
    ],
  },
  groupchat: {
    label: 'Group chat',
    builder: 'GroupChatBuilder',
    code: `workflow = GroupChatBuilder(
    participants=[analista, redactor],
    termination_condition=lambda conversation: len(conversation) >= 4,
    selection_func=round_robin_selector,          # o orchestrator_agent=...
).build()`,
    when: 'Hace falta ida y vuelta sobre una misma conversación: un analista y un redactor que afinan el aviso de una promoción hasta que cierre.',
    avoid: 'Sin termination_condition la conversación no tiene dónde parar.',
    nodes: [
      { id: 'in', x: 70, y: 110, label: 'Tarea', tone: 'user', w: 100 },
      { id: 'o', x: 290, y: 110, label: 'Selector', sub: 'selection_func', tone: 'system', w: 160 },
      { id: 'a', x: 540, y: 46, label: 'analista', sub: 'Agent', tone: 'model' },
      { id: 'b', x: 540, y: 174, label: 'redactor', sub: 'Agent', tone: 'model' },
    ],
    edges: [{ from: 'in', to: 'o' }, { from: 'o', to: 'a' }, { from: 'o', to: 'b' }],
    beats: [
      { flows: ['in>o'], note: 'La tarea abre la conversación compartida.' },
      { flows: ['o>a'], note: 'El selector da el turno al analista.' },
      { flows: ['a>o'], note: 'Su mensaje vuelve a la conversación.' },
      { flows: ['o>b'], note: 'Turno del redactor, que ve todo lo anterior.' },
      { flows: ['b>o'], note: 'Se repite hasta que termination_condition devuelve True.' },
    ],
  },
  magentic: {
    label: 'Magentic',
    builder: 'MagenticBuilder',
    code: `workflow = MagenticBuilder(
    participants=[researcher_agent, coder_agent],
    manager_agent=manager_agent,
    max_round_count=10, max_stall_count=3, max_reset_count=2,
).build()`,
    when: 'Tarea abierta cuyo plan no conoces de antemano: investigar por qué subieron los atrasos de AndesExpress y proponer qué hacer.',
    avoid: 'Es el patrón más caro y menos predecible; fija los tres límites y, si importa, revisa el plan con enable_plan_review=True.',
    nodes: [
      { id: 'in', x: 70, y: 110, label: 'Tarea', tone: 'user', w: 100 },
      { id: 'm', x: 290, y: 110, label: 'manager_agent', sub: 'plan y progreso', tone: 'model', w: 170 },
      { id: 'a', x: 550, y: 46, label: 'researcher_agent', sub: 'Agent', tone: 'model', w: 170 },
      { id: 'b', x: 550, y: 174, label: 'coder_agent', sub: 'Agent', tone: 'model', w: 170 },
    ],
    edges: [{ from: 'in', to: 'm' }, { from: 'm', to: 'a' }, { from: 'm', to: 'b' }],
    beats: [
      { flows: ['in>m'], note: 'El manager arma un plan a partir de la tarea.' },
      { flows: ['m>a'], note: 'Asigna el primer paso a un participante.' },
      { flows: ['a>m'], note: 'Evalúa el avance con lo que vuelve.' },
      { flows: ['m>b'], note: 'Reasigna; cada vuelta cuenta contra max_round_count.' },
      { flows: ['b>m'], note: 'max_stall_count y max_reset_count acotan cuántos estancamientos y reinicios tolera antes de cortar.' },
      { flows: ['m>in'], note: 'Cuando considera cumplida la tarea, entrega el resultado.' },
    ],
  },
}
