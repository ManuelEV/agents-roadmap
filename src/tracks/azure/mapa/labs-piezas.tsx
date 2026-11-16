import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Activity, Bot, Brain, Database, Fingerprint, Globe, MessagesSquare, Server, ShieldCheck, User, Wrench } from 'lucide-react'
import { DocLink, Lab, Pill, Segmented } from '@/components/ui'
import { Code, linesOf } from '@/components/Code'
import { FlowDiagram, type FlowEdge, type FlowNode } from '@/components/Flow'
import { Narration, PlayerBar, type StepInfo } from '@/components/Player'
import { usePlayer } from '@/lib/hooks'
import { orderById, runTool } from '@/sim/andes'
import { AZ, KIND_CODE, KIND_LABEL, KIND_ROWS, KIND_WHEN, LAYERS, LESSON_LABEL, PIECES, STATUS_LABEL, piecesOf, type AgentKind, type StatusKind } from './data'

/* ------------------------------------------------------------------------ */
/* Lab 1 · Mapa de piezas por capa                                           */
/* ------------------------------------------------------------------------ */
const STATUS_ORDER: StatusKind[] = ['ga', 'mixed', 'preview', 'retiring']

export function PieceMap() {
  const [sel, setSel] = useState('fas')
  const p = PIECES.find((x) => x.id === sel)!
  const layer = LAYERS.find((l) => l.id === p.layer)!
  return (
    <Lab title="El mapa de Microsoft Foundry" hint="Haz clic en una pieza">
      <div className="az-mapa-legend">
        {STATUS_ORDER.map((k) => (
          <span key={k} className="az-mapa-legend-item">
            <span className="az-mapa-st" data-st={k} /> {STATUS_LABEL[k]}
          </span>
        ))}
      </div>
      <div className="az-mapa-layers">
        {LAYERS.map((l) => (
          <div key={l.id} className="az-mapa-layer" data-tone={l.tone}>
            <div className="az-mapa-layer-head">
              <span className="az-mapa-layer-title">{l.title}</span>
              <span className="az-mapa-layer-blurb">{l.blurb}</span>
            </div>
            <div className="az-mapa-chips">
              {piecesOf(l.id).map((x) => (
                <button key={x.id} className={`az-mapa-chip${x.id === sel ? ' is-active' : ''}`} data-tone={x.tone} data-st={x.kind} aria-pressed={x.id === sel} onClick={() => setSel(x.id)}>
                  <span className="az-mapa-st" data-st={x.kind} />
                  <span className="az-mapa-chip-name">{x.name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="az-mapa-detail anim-fade" key={p.id} data-tone={p.tone}>
        <div className="az-mapa-detail-head">
          <h4>{p.name}</h4>
          <Pill tone={layer.tone}>{layer.title}</Pill>
        </div>
        <p className="az-mapa-detail-what">{p.what}</p>
        <dl className="az-mapa-facts">
          <div>
            <dt>Estado</dt>
            <dd>
              <span className="az-mapa-st" data-st={p.kind} /> {p.status}
            </dd>
          </div>
          {p.formerly && (
            <div>
              <dt>Antes se llamaba</dt>
              <dd className="mono">{p.formerly}</dd>
            </div>
          )}
          <div>
            <dt>Lo que conviene saber</dt>
            <dd>{p.detail}</dd>
          </div>
        </dl>
        <div className="az-mapa-detail-links">
          <DocLink href={p.docs}>Documentación oficial</DocLink>
          {p.lesson ? <Link to={`/azure/${p.lesson}`}>Se trabaja en «{LESSON_LABEL[p.lesson]}» →</Link> : <span className="muted">Esta línea solo la ubica; no tiene parada propia.</span>}
        </div>
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 2 · Prompt agent, hosted agent o Responses API                        */
/* ------------------------------------------------------------------------ */
const KINDS: AgentKind[] = ['prompt', 'hosted', 'responses']

/** Quién pone cada parte en cada tipo de agente. */
type Who = 'foundry' | 'you' | 'none'
const WHO_TEXT: Record<Who, string> = { foundry: 'Lo gestiona Foundry', you: 'Lo pones tú', none: 'No existe' }
const OWNERSHIP: { part: string; who: Record<AgentKind, Who> }[] = [
  { part: 'Agente con versiones y endpoint', who: { prompt: 'foundry', hosted: 'foundry', responses: 'none' } },
  { part: 'Bucle y lógica del agente', who: { prompt: 'foundry', hosted: 'you', responses: 'you' } },
  { part: 'Cómputo donde corre', who: { prompt: 'foundry', hosted: 'foundry', responses: 'you' } },
  { part: 'Modelo y tools integradas', who: { prompt: 'foundry', hosted: 'foundry', responses: 'foundry' } },
]

export function KindLab() {
  const [kind, setKind] = useState<AgentKind>('hosted')
  const c = KIND_CODE[kind]
  const hl = useMemo(() => linesOf(c.code, ...c.needles), [c])
  return (
    <Lab title="Tres formas de tener un agente en Foundry Agent Service" hint="Cambia de tipo y compara">
      <div className="az-mapa-kind-top">
        <Segmented options={KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))} value={kind} onChange={setKind} />
      </div>
      <div className="az-mapa-own" aria-label="Qué gestiona Foundry y qué pones tú">
        {OWNERSHIP.map((o) => (
          <div key={o.part} className="az-mapa-own-cell" data-who={o.who[kind]}>
            <span className="az-mapa-own-part">{o.part}</span>
            <span className="az-mapa-own-who">{WHO_TEXT[o.who[kind]]}</span>
          </div>
        ))}
      </div>
      <div className="az-mapa-kind-grid">
        <div className="az-mapa-kind-side">
          <p className="az-mapa-kind-when anim-fade" key={kind}>
            {KIND_WHEN[kind]}
          </p>
          <dl className="az-mapa-kv">
            {KIND_ROWS.map((r) => (
              <div key={r.k}>
                <dt>{r.k}</dt>
                <dd>{r.v[kind]}</dd>
              </div>
            ))}
          </dl>
        </div>
        <Code code={c.code} lang="python" title={c.title} highlight={hl} maxHeight={430} />
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 3 · El camino de la pregunta de Camila                                */
/* ------------------------------------------------------------------------ */
const NODES: FlowNode[] = [
  { id: 'user', x: 65, y: 185, w: 110, label: 'Camila', sub: 'clienta', tone: 'user', icon: User },
  { id: 'app', x: 215, y: 185, w: 140, h: 62, label: 'Web de Andes', sub: 'tu backend', tone: 'user', icon: Globe },
  { id: 'teams', x: 215, y: 60, w: 150, label: 'Teams', sub: 'M365 Copilot', tone: 'user', icon: MessagesSquare, cls: 'is-outside' },
  { id: 'fas', x: 400, y: 185, w: 170, h: 70, label: 'Agent Service', sub: 'endpoint del agente', tone: 'system', icon: Server },
  { id: 'gr', x: 400, y: 320, w: 160, label: 'Guardrail', sub: 'entrada y salida', tone: 'guard', icon: ShieldCheck, badge: 'preview' },
  { id: 'andi', x: 610, y: 185, w: 170, h: 70, label: 'Andi', sub: 'hosted agent', tone: 'model', icon: Bot },
  { id: 'model', x: 610, y: 60, w: 170, label: AZ.deployment, sub: 'deployment', tone: 'model', icon: Brain },
  { id: 'tool', x: 830, y: 130, w: 180, label: 'get_order_status', sub: 'function tool', tone: 'tool', icon: Wrench },
  { id: 'db', x: 830, y: 250, w: 150, label: 'Pedidos', sub: 'datos de Andes', tone: 'data', icon: Database },
  { id: 'id', x: 610, y: 320, w: 170, label: 'Entra Agent ID', sub: 'agent identity', tone: 'guard', icon: Fingerprint },
  { id: 'ai', x: 830, y: 350, w: 170, label: 'App Insights', sub: 'trazas', tone: 'system', icon: Activity },
]
const EDGES: FlowEdge[] = [
  { from: 'user', to: 'app' },
  { from: 'app', to: 'fas' },
  { from: 'teams', to: 'fas', dashed: true, label: 'Activity' },
  { from: 'fas', to: 'gr' },
  { from: 'fas', to: 'andi' },
  { from: 'andi', to: 'model' },
  { from: 'andi', to: 'tool' },
  { from: 'tool', to: 'db' },
  { from: 'andi', to: 'id', dashed: true },
  { from: 'andi', to: 'ai', dashed: true },
]

const order = orderById('4821')
const toolResult = JSON.stringify(runTool('get_order_status', { order_id: '4821' }))
const answer = `Tu pedido 4821 va en ruta con ${order?.carrier ?? 'AndesExpress'} (seguimiento ${order?.tracking ?? 'AX-88213-CL'}).`

type PathStep = StepInfo & { flows: string[]; active?: string[]; wire: string; wireLabel: string }

const PATH: PathStep[] = [
  {
    title: 'Camila pregunta en la web y tu backend llama al endpoint del agente',
    body: (
      <>
        Cada agente de Foundry tiene un endpoint por protocolo. El backend de Andes Market usa el protocolo <strong>Responses</strong>, se autentica con
        un token de Entra (scope <code>https://ai.azure.com/.default</code>) y solo necesita el rol <code>Foundry Agent Consumer</code>: el mínimo
        para invocar. Las API keys no sirven con agentes.
      </>
    ),
    flows: ['user>app', 'app>fas'],
    wireLabel: 'POST',
    wire: `${AZ.projectEndpoint}/agents/${AZ.agent}/endpoint/protocols/openai/responses\n{"input": [{"role": "user", "content": "¿Dónde está mi pedido 4821?"}]}`,
  },
  {
    title: 'El guardrail revisa la entrada',
    body: (
      <>
        Si el agente tiene un guardrail asignado, el punto de intervención <strong>User input</strong> busca ataques al prompt, contenido dañino o
        datos personales antes de que el texto llegue al modelo. Cada punto agrega unos 50–100 ms. En agentes los guardrails están en preview, y un
        hosted agent sin <code>rai_config</code> corre sin guardrail.
      </>
    ),
    flows: ['fas>gr'],
    wireLabel: 'guardrail',
    wire: 'User input → User prompt attacks: no detectado · PII: no detectado → continuar',
  },
  {
    title: 'Foundry Agent Service entrega la sesión al hosted agent',
    body: (
      <>
        Andi es un <strong>hosted agent</strong>: tu código de Agent Framework corriendo en un sandbox aislado por VM y por sesión. Foundry pone el
        endpoint, el escalado (hasta cero) y la identidad; el historial queda en una <em>conversation</em>.
      </>
    ),
    flows: ['fas>andi'],
    wireLabel: 'sesión',
    wire: 'hosted agent andes-ops · sandbox por sesión · ResponsesHostServer escuchando en :8088',
  },
  {
    title: 'Andi llama al modelo',
    body: (
      <>
        Agent Framework envía las instrucciones, el historial y las declaraciones de las tools al deployment <code>{AZ.deployment}</code> de Foundry
        Models. Ojo: <code>model</code> es el nombre de <strong>tu deployment</strong>, no el del modelo del catálogo.
      </>
    ),
    flows: ['andi>model'],
    wireLabel: 'modelo',
    wire: `FoundryChatClient(model="${AZ.deployment}")  ←  instrucciones + "¿Dónde está mi pedido 4821?" + tools[get_order_status, …]`,
  },
  {
    title: 'El modelo pide una herramienta y tu código la ejecuta',
    body: (
      <>
        La respuesta del modelo no es texto: es un <code>function_call</code>. Agent Framework ejecuta la función en tu proceso. Para leer datos que
        viven en Azure, el agente se autentica con su <strong>agent identity</strong> de Entra Agent ID, que nace sin permisos: alguien tuvo que
        asignarle RBAC.
      </>
    ),
    flows: ['model>andi', 'andi>tool', 'tool>db'],
    active: ['id'],
    wireLabel: 'function_call',
    wire: 'get_order_status(order_id="4821")',
  },
  {
    title: 'El resultado vuelve al modelo',
    body: (
      <>
        El resultado entra al contexto como <code>function_result</code> y el modelo redacta la respuesta. Un detalle que importa: los puntos de
        intervención <em>Tool call</em> y <em>Tool response</em> de los guardrails no cubren function tools ni MCP, así que esta llamada no se modera.
      </>
    ),
    flows: ['db>tool', 'tool>andi', 'andi>model'],
    wireLabel: 'function_result',
    wire: toolResult,
  },
  {
    title: 'La respuesta sale, se revisa y queda trazada',
    body: (
      <>
        El punto <strong>Output</strong> del guardrail revisa el texto y la respuesta vuelve por el mismo endpoint. Como el proyecto tiene conectado un
        recurso de Application Insights, la traza (<code>invoke_agent</code>, <code>execute_tool</code>) se registra sola; tarda de 2 a 5 minutos en
        aparecer.
      </>
    ),
    flows: ['andi>fas', 'fas>gr', 'fas>app', 'app>user', 'andi>ai'],
    wireLabel: 'respuesta',
    wire: answer,
  },
  {
    title: 'El mismo agente, otro canal: Teams',
    body: (
      <>
        Para que el equipo de soporte use a Andi desde Teams no se escribe otro agente: <strong>Publish &gt; Teams and Microsoft Copilot</strong>{' '}
        habilita el protocolo <strong>Activity</strong> en el mismo endpoint. Foundry registra el bot; no hace falta un recurso de Azure Bot Service.
      </>
    ),
    flows: ['teams>fas'],
    wireLabel: 'canal',
    wire: 'Publish > Teams and Microsoft Copilot > Direct publish > People in your organization (requiere aprobación de un admin)',
  },
]

export function PathLab() {
  const player = usePlayer(PATH.length, { interval: 4200 })
  const s = PATH[player.step]
  return (
    <Lab
      title="El camino de «¿dónde está mi pedido 4821?»"
      hint="Reproduce o salta de paso"
      footer={
        <span className="small muted">
          Recorrido simulado con los datos de Andes Market. Las rutas, protocolos, roles y nombres de span son los reales de la documentación.
        </span>
      }
    >
      <PlayerBar player={player} labels={PATH.map((p) => p.title)} />
      <FlowDiagram
        nodes={NODES}
        edges={EDGES}
        width={940}
        height={400}
        flows={s.flows}
        active={s.active}
        dimInactive
        ariaLabel="Recorrido de la pregunta de Camila por las piezas de Microsoft Foundry"
      />
      <div className="az-mapa-wire anim-fade" key={player.step}>
        <span className="az-mapa-wire-label">{s.wireLabel}</span>
        <code>{s.wire}</code>
      </div>
      <Narration steps={PATH} step={player.step} />
    </Lab>
  )
}
