import { useMemo, useState } from 'react'
import { Lab, Segmented } from '@/components/ui'
import { Code } from '@/components/Code'
import { FlowDiagram, type FlowEdge, type FlowNode } from '@/components/Flow'
import { PlayerBar } from '@/components/Player'
import { usePlayer } from '@/lib/hooks'
import { PATTERNS, type PatternId } from './data'

const IDS = Object.keys(PATTERNS) as PatternId[]

export function OrchestrationLab() {
  const [id, setId] = useState<PatternId>('sequential')
  const p = PATTERNS[id]
  const player = usePlayer(p.beats.length, { interval: 1900, loop: true })
  const beat = p.beats[Math.min(player.step, p.beats.length - 1)]
  const nodes: FlowNode[] = useMemo(() => p.nodes.map((n) => ({ ...n, h: 52 })), [p])
  const edges: FlowEdge[] = p.edges

  const pick = (v: PatternId) => {
    setId(v)
    player.reset()
    player.play()
  }

  return (
    <Lab title="Cinco orquestaciones listas: cómo se mueven los mensajes" hint="Elige un patrón; se anima solo">
      <Segmented options={IDS.map((v) => ({ value: v, label: PATTERNS[v].label }))} value={id} onChange={pick} />
      <div className="az-hw-orch-stage">
        <FlowDiagram key={id} nodes={nodes} edges={edges} flows={beat.flows} dimInactive width={700} height={222} packetDur={0.9} ariaLabel={`Flujo de mensajes del patrón ${p.label}`} />
        <PlayerBar player={player} labels={p.beats.map((b) => b.note)} />
        <div className="az-hw-beat anim-fade" key={`${id}-${player.step}`}>
          {beat.note}
        </div>
      </div>
      <div className="az-hw-orch">
        <Code code={p.code} lang="python" title={`agent_framework.orchestrations · ${p.builder}`} />
        <div className="cmp anim-fade" key={id}>
          <div className="cmp-row">
            <span className="k">Úsalo cuando</span>
            <span>{p.when}</span>
          </div>
          <div className="cmp-row">
            <span className="k">Cuidado</span>
            <span>{p.avoid}</span>
          </div>
        </div>
      </div>
    </Lab>
  )
}
