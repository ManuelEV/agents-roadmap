import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Bot, Brain, Database, Eye, KeyRound, Server, ShieldCheck, User, Wrench, Zap } from 'lucide-react'
import { DocLink, Lab, Pill, Segmented } from '@/components/ui'
import { Code, linesOf } from '@/components/Code'
import { FlowDiagram, type FlowEdge, type FlowNode } from '@/components/Flow'
import { Narration, PlayerBar } from '@/components/Player'
import { usePlayer } from '@/lib/hooks'
import { CODE_LAYERS, LAYERS, LAYER_CODE, LESSON_TITLES, PATH, PIECES, STATUS, type Piece } from './data'

/* ------------------------------------------------------------------------ */
/* Lab 1 · Mapa de piezas por capa                                           */
/* ------------------------------------------------------------------------ */
type Filter = 'todo' | 'ga' | 'nuevo' | 'cambio'
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'todo', label: 'Todo' },
  { value: 'ga', label: 'GA' },
  { value: 'nuevo', label: 'Preview o pre-1.0' },
  { value: 'cambio', label: 'Renombrado o retirado' },
]
const matches = (p: Piece, f: Filter) =>
  f === 'todo' ||
  (f === 'ga' && p.status === 'ga') ||
  (f === 'nuevo' && (p.status === 'preview' || p.status === 'pre1' || p.status === 'parcial')) ||
  (f === 'cambio' && (!!p.renamed || p.status === 'mant' || p.status === 'retiro'))

export function PieceMap() {
  const [sel, setSel] = useState('runtime')
  const [filter, setFilter] = useState<Filter>('todo')
  const piece = PIECES.find((p) => p.id === sel)!
  const count = PIECES.filter((p) => matches(p, filter)).length
  return (
    <Lab title="Mapa de piezas, por capa" hint="Haz clic en una pieza; filtra por estado">
      <div className="row aws-mapa-filter">
        <span className="label">Resaltar</span>
        <Segmented options={FILTERS} value={filter} onChange={setFilter} />
        <span className="small muted">
          {count} de {PIECES.length} piezas
        </span>
      </div>
      <div className="aws-mapa-map">
        <div className="aws-mapa-layers">
          {LAYERS.map((l) => (
            <div key={l.id} className="aws-mapa-layer" data-layer={l.id}>
              <div className="aws-mapa-layer-head">
                <span className="t">{l.title}</span>
                <span className="b">{l.blurb}</span>
              </div>
              <div className="aws-mapa-pieces">
                {PIECES.filter((p) => p.layer === l.id).map((p) => (
                  <button
                    key={p.id}
                    className={`aws-mapa-piece${p.id === sel ? ' is-active' : ''}${matches(p, filter) ? '' : ' is-off'}`}
                    data-tone={p.tone}
                    onClick={() => setSel(p.id)}
                    aria-pressed={p.id === sel}
                  >
                    <span className="n">{p.name}</span>
                    <span className="s" data-tone={STATUS[p.status].tone}>
                      <i /> {STATUS[p.status].label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="aws-mapa-detail anim-fade" key={piece.id} data-tone={piece.tone}>
          <div className="aws-mapa-detail-layer">{LAYERS.find((l) => l.id === piece.layer)!.title}</div>
          <h4>{piece.name}</h4>
          <div className="row" style={{ gap: 6 }}>
            <Pill tone={STATUS[piece.status].tone}>{STATUS[piece.status].label}</Pill>
          </div>
          <p className="what">{piece.what}</p>
          <p>{piece.detail}</p>
          <dl>
            <dt>Estado</dt>
            <dd>{piece.when}</dd>
            {piece.formerly && (
              <>
                <dt>Nombre</dt>
                <dd>{piece.formerly}</dd>
              </>
            )}
          </dl>
          <div className="aws-mapa-detail-links">
            <DocLink href={piece.doc}>Documentación oficial</DocLink>
            {piece.lesson ? (
              <Link to={`/aws/${piece.lesson}`}>Se trabaja en «{LESSON_TITLES[piece.lesson]}» →</Link>
            ) : (
              <span className="muted">Esta línea no la trabaja en detalle.</span>
            )}
          </div>
        </div>
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 2 · El recorrido de una pregunta                                      */
/* ------------------------------------------------------------------------ */
const NODES: FlowNode[] = [
  { id: 'user', x: 65, y: 195, w: 110, label: 'Camila', sub: 'clienta', tone: 'user', icon: User },
  { id: 'app', x: 215, y: 195, w: 150, label: 'App de Andes', sub: 'tu backend', tone: 'user', icon: Server },
  { id: 'id', x: 215, y: 62, w: 140, label: 'Identity', sub: 'auth entrante', tone: 'guard', icon: KeyRound },
  { id: 'rt', x: 445, y: 195, w: 220, h: 74, label: 'AgentCore Runtime', sub: 'Andi · Strands en microVM', tone: 'model', icon: Bot },
  { id: 'bedrock', x: 445, y: 62, w: 220, label: 'Amazon Bedrock', sub: 'Converse · Sonnet 5.5', tone: 'model', icon: Brain },
  { id: 'guard', x: 700, y: 62, w: 170, label: 'Guardrails', sub: 'filtros y PII', tone: 'guard', icon: ShieldCheck },
  { id: 'gw', x: 700, y: 195, w: 200, h: 66, label: 'AgentCore Gateway', sub: 'MCP + Policy', tone: 'tool', icon: Wrench },
  { id: 'lam', x: 905, y: 195, w: 150, label: 'AWS Lambda', sub: 'API de pedidos', tone: 'data', icon: Zap },
  { id: 'mem', x: 445, y: 335, w: 220, label: 'AgentCore Memory', sub: 'eventos y registros', tone: 'memory', icon: Database },
  { id: 'obs', x: 700, y: 335, w: 200, label: 'Observability', sub: 'CloudWatch · OTel', tone: 'system', icon: Eye },
]
const EDGES: FlowEdge[] = [
  { from: 'user', to: 'app' },
  { from: 'app', to: 'rt' },
  { from: 'id', to: 'rt', dashed: true },
  { from: 'rt', to: 'bedrock' },
  { from: 'bedrock', to: 'guard' },
  { from: 'rt', to: 'gw' },
  { from: 'gw', to: 'lam' },
  { from: 'rt', to: 'mem' },
  { from: 'rt', to: 'obs', dashed: true },
]

export function PathLab() {
  const player = usePlayer(PATH.length, { interval: 4200 })
  const s = PATH[player.step]
  return (
    <Lab
      title="Una pregunta de Camila, pieza por pieza"
      hint="Reproduce o salta de paso"
      footer={
        <span className="small muted">
          Recorrido simulado. Los nombres de API, cabeceras, eventos y el formato del ARN son reales; la cuenta, el ARN y el target <code>OrdersTarget</code> son de ejemplo.
        </span>
      }
    >
      <PlayerBar player={player} labels={PATH.map((p) => p.title)} />
      <FlowDiagram
        nodes={NODES}
        edges={EDGES}
        width={990}
        height={390}
        flows={s.flows}
        active={s.active}
        dimInactive
        ariaLabel="Recorrido de una pregunta por Runtime, Identity, Memory, Bedrock, Guardrails, Gateway, Lambda y Observability"
      />
      <div className="aws-mapa-path">
        <div>
          <Narration steps={PATH} step={player.step} />
          <div className="aws-mapa-path-pieces">
            {s.pieces.map((p) =>
              p.lesson ? (
                <Link key={p.name} to={`/aws/${p.lesson}`} className="aws-mapa-chip" data-tone={p.tone}>
                  <i /> {p.name} <span>· {LESSON_TITLES[p.lesson]}</span>
                </Link>
              ) : (
                <span key={p.name} className="aws-mapa-chip" data-tone={p.tone}>
                  <i /> {p.name}
                </span>
              ),
            )}
          </div>
        </div>
        <Code key={player.step} code={s.wire} lang={s.lang} title={s.wireTitle} />
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 6 · Las tres capas en un archivo                                      */
/* ------------------------------------------------------------------------ */
export function LayersCodeLab() {
  const [sel, setSel] = useState(CODE_LAYERS[0].id)
  const layer = CODE_LAYERS.find((l) => l.id === sel)!
  const hl = useMemo(() => linesOf(LAYER_CODE, ...layer.needles), [layer])
  return (
    <Lab title="Tres capas en un archivo" hint="Elige una capa para ver qué líneas le pertenecen">
      <div className="aws-mapa-code">
        <Code code={LAYER_CODE} lang="python" title="app/agent/main.py" highlight={hl} dim maxHeight={760} />
        <div className="aws-mapa-code-side">
          {CODE_LAYERS.map((l) => (
            <button key={l.id} className={`aws-mapa-codelayer${l.id === sel ? ' is-active' : ''}`} data-tone={l.tone} onClick={() => setSel(l.id)} aria-pressed={l.id === sel}>
              <span className="k">
                <i /> {l.label}
                <span className="c">{linesOf(LAYER_CODE, ...l.needles).length} líneas</span>
              </span>
              <span className="d">{l.note}</span>
            </button>
          ))}
          <Link to={`/aws/${layer.lesson}`} className="small">
            Se trabaja en «{LESSON_TITLES[layer.lesson]}» →
          </Link>
        </div>
      </div>
    </Lab>
  )
}
