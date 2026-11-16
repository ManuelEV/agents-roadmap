import { useEffect, useRef } from 'react'
import { Bot, Brain, User, Wrench } from 'lucide-react'
import { Lab, Panel, Pill } from '@/components/ui'
import { ChatBubbles } from '@/components/Events'
import { FlowDiagram, type FlowEdge, type FlowNode } from '@/components/Flow'
import { Narration, PlayerBar } from '@/components/Player'
import { usePlayer } from '@/lib/hooks'
import { CHUNKS, FINAL_TEXT, MODEL_ID, QUESTION, RUN_EVENTS, RUN_STEPS } from './data'

const NODES: FlowNode[] = [
  { id: 'user', x: 80, y: 150, w: 130, label: 'Camila', sub: 'cus_7781', tone: 'user', icon: User },
  { id: 'agent', x: 310, y: 150, w: 190, h: 70, label: 'Agent', sub: 'event loop de Strands', tone: 'model', icon: Bot },
  { id: 'model', x: 650, y: 60, w: 300, h: 62, label: 'BedrockModel · Converse', sub: MODEL_ID, tone: 'model', icon: Brain },
  { id: 'tool', x: 650, y: 240, w: 300, h: 62, label: 'get_order_status', sub: '@tool · función Python en tu proceso', tone: 'tool', icon: Wrench },
]
const EDGES: FlowEdge[] = [
  { from: 'user', to: 'agent' },
  { from: 'agent', to: 'model', label: 'prompt + historial + tools' },
  { from: 'agent', to: 'tool', label: 'input' },
]

export function RunLab() {
  const player = usePlayer(RUN_STEPS.length, { interval: 3800 })
  const s = RUN_STEPS[player.step]
  const answer = s.chunks === -1 ? FINAL_TEXT : s.chunks > 0 ? CHUNKS.slice(0, s.chunks).join('') : ''
  const chat: { role: 'user' | 'agent'; text: string; name?: string }[] = [{ role: 'user', text: QUESTION }]
  if (answer) chat.push({ role: 'agent', text: s.chunks === -1 ? answer : `${answer}▍`, name: 'Andi' })
  const shown = RUN_EVENTS.slice(0, s.events)
  const evsRef = useRef<HTMLDivElement>(null)
  // el evento nuevo siempre queda a la vista dentro de la lista
  useEffect(() => {
    const el = evsRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [s.events])

  return (
    <Lab
      title="Una invocación por dentro: dos llamadas al modelo, una a tu función"
      hint="Reproduce o haz clic en un paso"
      footer={
        <span className="small muted">
          Respuesta del modelo e identificadores simulados. Las claves (<code>current_tool_use</code>, <code>data</code>, <code>result</code>, <code>toolUse</code>,{' '}
          <code>toolResult</code>, <code>toolUseId</code>) y los <code>stop_reason</code> son los que documenta Strands; el interior del bloque <code>toolResult</code> está
          simplificado.
        </span>
      }
    >
      <PlayerBar player={player} labels={RUN_STEPS.map((x) => x.title)} />
      <FlowDiagram nodes={NODES} edges={EDGES} width={820} height={300} flows={s.flows} dimInactive ariaLabel="Camila, el Agent de Strands, el modelo en Bedrock y la herramienta get_order_status durante una invocación" />
      <Narration steps={RUN_STEPS} step={player.step} />
      <div className="aws-pa-hooks">
        <span className="label">hooks en este paso</span>
        {s.hooks.length === 0 && <span className="small muted">ninguno: solo llegan eventos del stream</span>}
        {s.hooks.map((h) => (
          <Pill key={h} tone="system" mono>
            {h}
          </Pill>
        ))}
        {s.stop && (
          <span className="aws-pa-stop">
            <Pill tone={s.stop === 'end_turn' ? 'ok' : 'tool'} mono>
              stop_reason: {s.stop}
            </Pill>
          </span>
        )}
      </div>
      <div className="aws-pa-run">
        <Panel title="Historial y eventos del stream" tone="model" right={<span className="small muted">{shown.length} de {RUN_EVENTS.length}</span>}>
          <div className="evs aws-pa-evs" ref={evsRef}>
            {shown.map((e, i) => (
              <div key={e.id} className={`ev${i === shown.length - 1 ? ' is-new is-hl' : ''}`} data-tone={e.tone}>
                <div className="ev-head">
                  <span>{e.head}</span>
                  {e.tag && <span className="ev-tag">{e.tag}</span>}
                  <span className="ev-time">{e.source === 'messages' ? 'historial' : 'stream'}</span>
                </div>
                {e.text && <div className="ev-text">{e.text}</div>}
                {e.chunks && (
                  <div className="aws-pa-chunks">
                    {e.chunks.map((c, j) => (
                      <code key={j} className={s.chunks !== -1 && j >= s.chunks ? 'is-pending' : ''}>
                        {`{"data": ${JSON.stringify(c)}}`}
                      </code>
                    ))}
                  </div>
                )}
                {e.block && (
                  <div className="ev-block" data-tone={e.block.tone}>
                    <span className="ev-block-label">{e.block.label}</span>
                    <code className="ev-code">{e.block.code}</code>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Lo que ve Camila" tone="user">
          <ChatBubbles items={chat} typing={s.typing} />
        </Panel>
      </div>
    </Lab>
  )
}
