import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { Code } from '@/components/Code'
import { Narration, PlayerBar } from '@/components/Player'
import { Lab, Pill } from '@/components/ui'
import { usePlayer, useTypewriter } from '@/lib/hooks'
import { AGENT_DISPLAY } from '@/sim/andes'
import { ANSWER, CHUNKS, QUESTION, SERVER_STAGES, STATIONS, WIRE_STEPS } from './data'
import { OrderCard } from './ToolCard'

/* ------------------------------------------------------------------------ */
/* Lab 1 · El recorrido del stream                                            */
/* ------------------------------------------------------------------------ */
export function PipelineLab() {
  const [sel, setSel] = useState(STATIONS[2].id)
  const st = STATIONS.find((s) => s.id === sel)!
  return (
    <Lab title="De result.stream a message.parts: cinco estaciones" hint="Haz clic en cada estación">
      <div className="vc-ui-line" role="tablist" aria-label="Recorrido del stream del agente hasta la interfaz">
        {STATIONS.map((s, i) => (
          <button key={s.id} role="tab" aria-selected={s.id === sel} className={`vc-ui-stop${s.id === sel ? ' is-active' : ''}`} data-tone={s.tone} onClick={() => setSel(s.id)}>
            <span className="vc-ui-stop-dot">{i + 1}</span>
            <span className="vc-ui-stop-txt">
              <span className="k">{s.label}</span>
              <span className="d">{s.where}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="vc-ui-station anim-fade" key={sel} data-tone={st.tone}>
        <p>{st.what}</p>
        <Code code={st.code} lang={st.lang} title={st.where} lineNumbers={false} />
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 2 · El cable, paso a paso                                              */
/* ------------------------------------------------------------------------ */
export function WireLab() {
  const player = usePlayer(WIRE_STEPS.length, { interval: 4200 })
  const step = player.step
  const s = WIRE_STEPS[step]
  const streamRef = useRef<HTMLDivElement>(null)
  const tw = useTypewriter(ANSWER, s.text === 'streaming', { cps: 55 })
  const text = s.text === 'done' ? ANSWER : tw.shown
  const visible = CHUNKS.filter((c) => c.at <= step)

  useEffect(() => {
    const el = streamRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [step])

  const parts: { type: string; state?: string }[] = []
  if (s.stepStarts >= 1) parts.push({ type: 'step-start' })
  if (s.tool) parts.push({ type: 'tool-get_order_status', state: s.tool })
  if (s.stepStarts >= 2) parts.push({ type: 'step-start' })
  if (s.text !== 'none') parts.push({ type: 'text' })

  return (
    <Lab
      title={`El cable: “${QUESTION}” parte por parte`}
      hint="Reproduce o haz clic en un paso"
      footer={
        <span className="small muted">
          Simulación. Los tipos de parte, sus campos y los estados son los del protocolo de AI SDK UI; los ids y la respuesta del modelo son de ejemplo, y la
          cantidad de deltas varía en cada ejecución.
        </span>
      }
    >
      <PlayerBar player={player} labels={WIRE_STEPS.map((x) => x.title)} />
      <div className="vc-ui-wire">
        {/* servidor */}
        <div className="vc-ui-col">
          <div className="vc-ui-col-head">
            <span className="label">Servidor</span>
            <span className="mono small muted">route.ts</span>
          </div>
          <ol className="vc-ui-stages">
            {SERVER_STAGES.map((g, i) => (
              <li key={g.label} className={i < s.stage ? 'is-done' : i === s.stage ? 'is-now' : ''} data-tone={g.tone}>
                <span className="vc-ui-stage-dot">{i < s.stage ? <Check size={11} /> : null}</span>
                <span className="vc-ui-stage-txt">
                  <span className="k">{g.label}</span>
                  <span className="d">{g.sub}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* el stream */}
        <div className="vc-ui-col">
          <div className="vc-ui-col-head">
            <span className="label">El stream</span>
            <span className="mono small muted">{visible.length} eventos SSE</span>
          </div>
          <div className="vc-ui-stream" ref={streamRef}>
            {step === 0 && (
              <div className="vc-ui-req anim-fade">
                <div className="vc-ui-req-head">POST /api/chat</div>
                <code>{`{ "messages": [ { "id": "msg_u1", "role": "user", "parts": [ { "type": "text", "text": "${QUESTION}" } ] } ] }`}</code>
                <div className="vc-ui-req-wait">esperando la respuesta…</div>
              </div>
            )}
            {visible.map((c, i) => (
              <div key={i} className={`vc-ui-chunk${c.at === step ? ' is-new' : ''}`} data-tone={c.tone}>
                <span className="p">data: </span>
                {c.type === '[DONE]' ? (
                  <b>[DONE]</b>
                ) : (
                  <>
                    {'{"type":"'}
                    <b>{c.type}</b>
                    {`"${c.rest}}`}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* la interfaz */}
        <div className="vc-ui-col">
          <div className="vc-ui-col-head">
            <span className="label">La interfaz</span>
            <Pill tone={s.status === 'ready' ? 'ok' : s.status === 'streaming' ? 'model' : 'system'} mono>
              status: {s.status}
            </Pill>
          </div>
          <div className="vc-ui-win">
            <div className="vc-ui-win-top">
              <span className="vc-ui-win-title">{AGENT_DISPLAY}</span>
            </div>
            <div className="vc-ui-win-body">
              <div className="chat">
                <div className="chat-msg is-user">
                  <div className="chat-bubble">{QUESTION}</div>
                </div>
                {s.status === 'submitted' && (
                  <div className="chat-msg">
                    <div className="chat-bubble chat-typing">
                      <i />
                      <i />
                      <i />
                    </div>
                  </div>
                )}
                {(s.tool || s.text !== 'none') && (
                  <div className="chat-msg vc-ui-wide">
                    {s.tool && <OrderCard state={s.tool} compact />}
                    {s.text !== 'none' && <div className={`chat-bubble${s.text === 'streaming' && !tw.done ? ' caret' : ''}`}>{text}</div>}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="vc-ui-partlist">
            <span className="label">message.parts</span>
            {parts.length === 0 && <span className="small muted">todavía no hay mensaje del asistente</span>}
            {parts.map((p, i) => (
              <span key={i} className="vc-ui-part" data-tone={p.type === 'text' ? 'model' : p.type === 'step-start' ? 'system' : 'tool'}>
                <span className="mono">{p.type}</span>
                {p.state && <span className="mono st">{p.state}</span>}
              </span>
            ))}
          </div>
        </div>
      </div>
      <Narration steps={WIRE_STEPS} step={step} />
    </Lab>
  )
}
