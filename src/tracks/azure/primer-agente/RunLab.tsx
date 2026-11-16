import { useMemo } from 'react'
import { Bot, Brain, Cable, User, Wrench } from 'lucide-react'
import { Lab, Panel } from '@/components/ui'
import { Code, linesOf } from '@/components/Code'
import { FlowDiagram, type FlowEdge, type FlowNode } from '@/components/Flow'
import { Narration, PlayerBar } from '@/components/Player'
import { usePlayer } from '@/lib/hooks'
import { DEPLOYMENT, Q1, RUN_STEPS, STREAM_CODE, TEXT_CHUNKS, UPDATES } from './data'

const NODES: FlowNode[] = [
  { id: 'user', x: 90, y: 130, w: 140, label: 'Camila', sub: 'tu script', tone: 'user', icon: User },
  { id: 'agent', x: 300, y: 130, w: 160, h: 64, label: 'Agent', sub: 'andes_ops', tone: 'model', icon: Bot },
  { id: 'client', x: 540, y: 56, w: 200, label: 'FoundryChatClient', sub: 'AzureCliCredential', tone: 'system', icon: Cable },
  { id: 'model', x: 790, y: 56, w: 180, label: DEPLOYMENT, sub: 'deployment en Foundry', tone: 'model', icon: Brain, cls: 'is-outside' },
  { id: 'tool', x: 540, y: 204, w: 200, label: 'get_order_status', sub: 'función Python local', tone: 'tool', icon: Wrench },
]
const EDGES: FlowEdge[] = [
  { from: 'user', to: 'agent' },
  { from: 'agent', to: 'client' },
  { from: 'client', to: 'model' },
  { from: 'agent', to: 'tool' },
]

export function RunLab() {
  const player = usePlayer(RUN_STEPS.length, { interval: 3600 })
  const s = RUN_STEPS[player.step]
  const hl = useMemo(() => linesOf(STREAM_CODE, ...s.codeNeedles), [s])
  const text = TEXT_CHUNKS.slice(0, s.chunks).join('')
  return (
    <Lab
      title="Un run por dentro: del mensaje al último trozo de texto"
      hint="Reproduce o haz clic en un paso"
      footer={
        <span className="small muted">
          Simulación. La forma es la real: <code>AgentResponseUpdate</code> con <code>.text</code> y <code>.contents</code>, y cada <code>Content</code> discriminado
          por <code>content.type</code>. La cantidad de trozos y la respuesta del modelo son simuladas; el resultado de la función es el de Andes Market.
        </span>
      }
    >
      <PlayerBar player={player} labels={RUN_STEPS.map((x) => x.title)} />
      <div className="az-pa-run-flow">
        <FlowDiagram nodes={NODES} edges={EDGES} width={900} height={260} flows={s.flows} dimInactive ariaLabel="Camila, el Agent, FoundryChatClient, el deployment del modelo y la función get_order_status durante un run" />
      </div>
      <Narration steps={RUN_STEPS} step={player.step} />
      <div className="az-pa-run-grid">
        <Panel title="Updates del stream" tone="model" right={<span className="mono small">{s.updates} de {UPDATES.length}</span>}>
          {s.updates === 0 ? (
            <div className="az-pa-empty">Todavía no llegó ningún update: la petición va camino al modelo.</div>
          ) : (
            <div className="evs">
              {UPDATES.slice(0, s.updates).map((u, i) => (
                <div key={i} className={`ev${s.fresh.includes(i) ? ' is-new is-hl' : ''}`} data-tone={u.tone}>
                  <div className="ev-head">
                    AgentResponseUpdate
                    <span className="ev-tag">content.type = "{u.type}"</span>
                    <span className="ev-time">#{i + 1}</span>
                  </div>
                  {u.type === 'text' ? (
                    <div className="ev-text">
                      <span className="az-pa-attr">update.text</span> {u.text}
                    </div>
                  ) : (
                    <>
                      <div className="ev-block">
                        <code className="ev-code">{u.payload}</code>
                      </div>
                      <div className="az-pa-attr az-pa-attr-empty">update.text vacío</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>
        <div className="stack">
          <Panel title="Lo que ve Camila" tone="user">
            <div className="chat az-pa-chat">
              <div className="chat-msg is-user">
                <div className="chat-bubble">{Q1}</div>
              </div>
              <div className="chat-msg">
                <div className="chat-name">Andi</div>
                {s.chunks === 0 ? (
                  <div className="chat-bubble chat-typing" aria-label="Andi está trabajando">
                    <i />
                    <i />
                    <i />
                  </div>
                ) : (
                  <div className="chat-bubble">
                    {text}
                    {s.chunks < TEXT_CHUNKS.length && <span className="caret" />}
                  </div>
                )}
              </div>
            </div>
          </Panel>
          <Code code={STREAM_CODE} lang="python" title="andi_stream.py (dentro de main)" highlight={hl} dim />
        </div>
      </div>
    </Lab>
  )
}
