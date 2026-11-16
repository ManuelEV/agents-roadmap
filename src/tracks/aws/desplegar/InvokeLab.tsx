import { Box, Cloud, Server, Sparkles, Wrench } from 'lucide-react'
import { Lab, Panel } from '@/components/ui'
import { Code, linesOf } from '@/components/Code'
import { FlowDiagram, type FlowEdge, type FlowNode } from '@/components/Flow'
import { Narration, PlayerBar, type StepInfo } from '@/components/Player'
import { usePlayer } from '@/lib/hooks'
import { runTool } from '@/sim/andes'
import { ANSWER, CODE_INVOKE, MODEL_ID, REQUEST_SHAPE, UUIDS } from './data'

const NODES: FlowNode[] = [
  { id: 'app', x: 110, y: 70, w: 190, label: 'Tu backend', sub: 'boto3 · SigV4', tone: 'user', icon: Server },
  { id: 'api', x: 380, y: 70, w: 220, label: 'AgentCore Runtime', sub: 'bedrock-agentcore', tone: 'system', icon: Cloud },
  { id: 'vm', x: 680, y: 70, w: 230, h: 64, label: 'microVM de la sesión', sub: ':8080 /invocations', tone: 'model', icon: Box },
  { id: 'llm', x: 560, y: 200, w: 220, label: 'Amazon Bedrock', sub: 'Claude Sonnet 5.5', tone: 'model', icon: Sparkles },
  { id: 'tool', x: 830, y: 200, w: 200, label: 'get_order_status', sub: 'order_id="4821"', tone: 'tool', icon: Wrench },
]
const EDGES: FlowEdge[] = [
  { from: 'app', to: 'api' },
  { from: 'api', to: 'vm' },
  { from: 'vm', to: 'llm' },
  { from: 'vm', to: 'tool' },
]

type Step = StepInfo & { hl: string[]; flows: string[]; show: 'none' | 'req' | 'tool' | 'json' | 'sse' }
const STEPS: Step[] = [
  {
    title: 'El cliente del data plane',
    body: (
      <>
        <code>boto3.client("bedrock-agentcore")</code> invoca agentes. Crear o actualizar runtimes es otro cliente:{' '}
        <code>bedrock-agentcore-control</code>. Quien llama necesita el permiso <code>bedrock-agentcore:InvokeAgentRuntime</code>.
      </>
    ),
    hl: ['agent_core_client = boto3.client'],
    flows: [],
    show: 'none',
  },
  {
    title: 'Cuatro campos en la petición',
    body: (
      <>
        El ARN del runtime, un <code>runtimeSessionId</code> de 33 caracteres o más, el <code>payload</code> en bytes (el JSON que recibirá tu
        entrypoint) y, opcional, el endpoint en <code>qualifier</code>. Repite el mismo id para continuar la conversación.
      </>
    ),
    hl: ['session_id = str(uuid', 'agentRuntimeArn=', 'runtimeSessionId=', 'payload=', 'qualifier='],
    flows: ['app>api'],
    show: 'req',
  },
  {
    title: 'Runtime lleva la petición a la microVM de esa sesión',
    body: (
      <>
        Si el id es nuevo, arranca una microVM; si ya existe, reutiliza la suya. A tu contenedor le llega un <code>POST /invocations</code> en el
        puerto 8080 con el header <code>X-Amzn-Bedrock-AgentCore-Runtime-Session-Id</code>.
      </>
    ),
    hl: ['response = agent_core_client.invoke_agent_runtime('],
    flows: ['api>vm'],
    show: 'req',
  },
  {
    title: 'El entrypoint corre el ciclo del agente',
    body: (
      <>
        Dentro de la microVM pasa lo mismo que en tu máquina: el modelo pide <code>get_order_status</code>, Strands la ejecuta y el modelo redacta
        la respuesta. Las llamadas a Bedrock salen con el rol de ejecución del runtime.
      </>
    ),
    hl: ['response = agent_core_client.invoke_agent_runtime('],
    flows: ['vm>llm', 'vm>tool'],
    show: 'tool',
  },
  {
    title: 'Vuelven dos campos: contentType y response',
    body: (
      <>
        <code>response</code> es un stream de bytes. Si el entrypoint devolvió un valor, <code>contentType</code> es{' '}
        <code>application/json</code>: junta los chunks y haz <code>json.loads</code>.
      </>
    ),
    hl: ['elif response.get("contentType")', 'body = "".join', 'print(json.loads(body))'],
    flows: ['vm>api', 'api>app'],
    show: 'json',
  },
  {
    title: 'Si el entrypoint hace yield, llega como SSE',
    body: (
      <>
        Con un entrypoint <code>async</code> que hace <code>yield</code> de los eventos de <code>agent.stream_async(...)</code>, el{' '}
        <code>contentType</code> es <code>text/event-stream</code>: lee línea a línea y quédate con las que empiezan por <code>data: </code>.
      </>
    ),
    hl: ['if "text/event-stream"', 'for line in response["response"]', 'if line:', 'line = line.decode', 'if line.startswith', 'print(line[6:])'],
    flows: ['vm>api', 'api>app'],
    show: 'sse',
  },
]

const TOOL_RESULT = JSON.stringify(runTool('get_order_status', { order_id: '4821' }), null, 2)

export function InvokeLab() {
  const player = usePlayer(STEPS.length, { interval: 4200 })
  const s = STEPS[player.step]
  return (
    <Lab title="invoke_agent_runtime, paso a paso" hint="Reproduce y sigue las líneas resaltadas" footer={<span className="small muted">La API, los campos y el código son reales; los valores de respuesta están simulados con los datos de Andes Market.</span>}>
      <PlayerBar player={player} labels={STEPS.map((x) => x.title)} />
      <FlowDiagram nodes={NODES} edges={EDGES} width={960} height={250} flows={s.flows} dimInactive={s.flows.length > 0} active={player.step === 0 ? ['app'] : []} ariaLabel="Recorrido de una invocación a AgentCore Runtime" />
      <div className="aws-dep-invoke">
        <Code code={CODE_INVOKE} lang="python" title="backend/ask_andi.py" highlight={linesOf(CODE_INVOKE, ...s.hl)} dim maxHeight={440} />
        <div className="stack">
          <Narration steps={STEPS} step={player.step} />
          <div key={s.show} className="anim-fade stack">
            {s.show === 'none' && <div className="aws-dep-note">Todavía no viaja nada. Avanza para ver la petición.</div>}
            {s.show === 'req' && (
              <Panel title="Petición" tone="user" right={<span className="mono small">{UUIDS[0].length} caracteres de id</span>}>
                <pre className="aws-dep-pre">{REQUEST_SHAPE}</pre>
              </Panel>
            )}
            {s.show === 'tool' && (
              <Panel title="Dentro de la microVM" tone="tool" right={<span className="mono small">{MODEL_ID}</span>}>
                <pre className="aws-dep-pre">{`get_order_status(order_id="4821")\n${TOOL_RESULT}`}</pre>
              </Panel>
            )}
            {s.show === 'json' && (
              <Panel title="Respuesta" tone="model" right={<span className="mono small">application/json</span>}>
                <pre className="aws-dep-pre">{`{\n  "contentType": "application/json",\n  "response": <stream de bytes>\n}\n\njson.loads(body) →\n"${ANSWER}"`}</pre>
              </Panel>
            )}
            {s.show === 'sse' && (
              <Panel title="Respuesta en streaming" tone="model" right={<span className="mono small">text/event-stream</span>}>
                <pre className="aws-dep-pre">{`{\n  "contentType": "text/event-stream",\n  "response": <stream de bytes>\n}\n\ndata: <un evento por cada yield>\ndata: <…>\ndata: <…>`}</pre>
              </Panel>
            )}
          </div>
        </div>
      </div>
    </Lab>
  )
}
