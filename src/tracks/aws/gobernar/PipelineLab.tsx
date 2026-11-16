import { useMemo, useState } from 'react'
import { Bot, Gavel, ScanSearch, ShieldCheck, User, Wrench } from 'lucide-react'
import { Lab, Panel, Segmented } from '@/components/ui'
import { Code } from '@/components/Code'
import { FlowDiagram, type FlowEdge, type FlowNode } from '@/components/Flow'
import { Narration, PlayerBar } from '@/components/Player'
import { usePlayer } from '@/lib/hooks'
import { SCENARIOS, type LayerStatus, type StageId, type Verdict } from './data'

const NODES: FlowNode[] = [
  { id: 'user', x: 92, y: 165, w: 150, h: 62, label: 'Camila', sub: 'cus_7781', tone: 'user', icon: User },
  { id: 'gin', x: 290, y: 72, w: 172, label: 'Guardrail', sub: 'modelo · INPUT', tone: 'guard', icon: ShieldCheck },
  { id: 'model', x: 490, y: 165, w: 164, h: 70, label: 'Andi', sub: 'Strands · Bedrock', tone: 'model', icon: Bot },
  { id: 'pol', x: 692, y: 72, w: 172, label: 'Policy engine', sub: 'Gateway · ENFORCE', tone: 'guard', icon: Gavel },
  { id: 'tool', x: 886, y: 165, w: 164, h: 62, label: 'Target', sub: 'Lambda · OrdersDb', tone: 'tool', icon: Wrench },
  { id: 'gres', x: 692, y: 258, w: 172, label: 'Guardrails', sub: 'en Policy · tools', tone: 'guard', icon: ScanSearch },
  { id: 'gout', x: 290, y: 258, w: 172, label: 'Guardrail', sub: 'modelo · OUTPUT', tone: 'guard', icon: ShieldCheck },
]
const EDGES: FlowEdge[] = [
  { from: 'user', to: 'gin' },
  { from: 'gin', to: 'model' },
  { from: 'model', to: 'pol' },
  { from: 'pol', to: 'tool' },
  { from: 'tool', to: 'gres' },
  { from: 'gres', to: 'model' },
  { from: 'model', to: 'gout' },
  { from: 'gout', to: 'user' },
]

const BAD: Verdict[] = ['BLOQUEA', 'deny', 'rechaza']
const STATUS_LABEL: Record<LayerStatus, string> = { stop: 'lo detiene', backup: 'respaldo', blind: 'no lo ve' }

export function PipelineLab() {
  const [scen, setScen] = useState(SCENARIOS[0].id)
  const sc = SCENARIOS.find((s) => s.id === scen)!
  const player = usePlayer(sc.steps.length, { interval: 4200 })
  const step = Math.min(player.step, sc.steps.length - 1)
  const cur = sc.steps[step]

  const nodes = useMemo(() => {
    const seen = new Map<StageId, Verdict>()
    sc.steps.slice(0, step + 1).forEach((s) => s.verdict && seen.set(s.at, s.verdict))
    return NODES.map((n) => {
      const v = seen.get(n.id as StageId)
      if (!v) return n
      return { ...n, badge: v, cls: BAD.includes(v) ? 'aws-gob-n-bad' : 'aws-gob-n-ok' }
    })
  }, [sc, step])

  const reply = cur.reply
  return (
    <Lab
      title="Dónde actúa cada control"
      hint="Elige un caso y reproduce"
      footer={
        <span className="small muted">
          Veredictos y respuestas <strong>simulados</strong>. El orden de las capas, lo que evalúa cada una y sus puntos ciegos son los documentados; el resumen de
          cada decisión es una ilustración, no el formato de log real.
        </span>
      }
    >
      <div className="aws-gob-scen">
        <Segmented
          options={SCENARIOS.map((s) => ({ value: s.id, label: s.label }))}
          value={scen}
          onChange={(v) => {
            setScen(v)
            player.reset()
          }}
        />
      </div>
      <PlayerBar player={player} labels={sc.steps.map((s) => s.title)} />
      <FlowDiagram
        nodes={nodes}
        edges={EDGES}
        width={980}
        height={330}
        flows={cur.flows}
        active={[cur.at]}
        ariaLabel="Recorrido de un mensaje: guardrail de entrada, modelo, policy engine en el gateway, target, guardrails sobre el resultado, guardrail de salida"
      />
      <Narration steps={sc.steps} step={step} />
      <div className="aws-gob-pipe-grid">
        <div key={`${scen}-${step}`} className="anim-fade">
          <Code code={cur.wire.code} lang={cur.wire.lang} title={cur.wire.title} maxHeight={250} />
        </div>
        <Panel title="Lo que ve Camila" tone="user">
          <div className="chat">
            <div className="chat-msg is-user">
              <div className="chat-bubble">{sc.message}</div>
            </div>
            {reply ? (
              <div className="chat-msg">
                <div className="chat-bubble">{reply}</div>
              </div>
            ) : (
              <span className="small muted">Andi todavía no responde…</span>
            )}
          </div>
        </Panel>
      </div>
      <div className="aws-gob-layers" aria-label="Qué capa detiene este caso">
        {sc.layers.map((l) => (
          <div key={l.name} className="aws-gob-layer" data-status={l.status}>
            <span className="aws-gob-layer-st">{STATUS_LABEL[l.status]}</span>
            <strong>{l.name}</strong>
            <span className="aws-gob-layer-why">{l.why}</span>
          </div>
        ))}
      </div>
    </Lab>
  )
}
