import { useState } from 'react'
import { Database, RefreshCw, RotateCcw, Send } from 'lucide-react'
import { Lab, Toggle, type Tone } from '@/components/ui'
import { AGENT_DISPLAY } from '@/sim/andes'
import { CHAT_ID, TURNS, type StoredMsg } from './data'
import { OrderCard } from './ToolCard'

type Log = { tone: Tone; where: string; title: string; code?: string }
type Sim = { client: StoredMsg[]; db: StoredMsg[]; sent: number; log: Log[]; req: string | null; reloaded: boolean }
const EMPTY: Sim = { client: [], db: [], sent: 0, log: [], req: null, reloaded: false }

const ids = (ms: StoredMsg[]) => ms.map((m) => m.id).join(', ')

export function PersistLab() {
  const [save, setSave] = useState(false)
  const [lastOnly, setLastOnly] = useState(false)
  const [sim, setSim] = useState<Sim>(EMPTY)
  const turn = TURNS[sim.sent]

  const send = () => {
    if (!turn) return
    const context = lastOnly ? sim.db : sim.client
    const hasCtx = sim.sent === 0 || context.some((m) => m.id === 'msg_a1')
    const reply = hasCtx ? turn.withContext : turn.withoutContext
    const serverMsgs = [...context, turn.user]
    const log: Log[] = []
    const req = lastOnly
      ? `{ "message": { "id": "${turn.user.id}", "role": "user", "parts": [ … ] }, "id": "${CHAT_ID}" }`
      : `{ "messages": [ ${ids([...sim.client, turn.user])} ] }   ← ${sim.client.length + 1} UIMessage`
    log.push({ tone: 'user', where: 'cliente → servidor', title: 'POST /api/chat', code: req })
    if (lastOnly) log.push({ tone: 'memory', where: 'servidor', title: `loadChat("${CHAT_ID}")`, code: sim.db.length ? `${sim.db.length} mensajes: ${ids(sim.db)}` : '0 mensajes: no hay nada guardado' })
    log.push({
      tone: hasCtx ? 'model' : 'error',
      where: 'servidor',
      title: `El modelo ve ${serverMsgs.length} ${serverMsgs.length === 1 ? 'mensaje' : 'mensajes'}`,
      code: hasCtx ? ids(serverMsgs) : `${ids(serverMsgs)}   ← falta el turno anterior`,
    })
    log.push(
      save
        ? { tone: 'memory', where: 'servidor', title: 'onEnd → saveChat', code: `saveChat({ chatId: "${CHAT_ID}", messages })   // ${serverMsgs.length + 1} UIMessage` }
        : { tone: 'system', where: 'servidor', title: 'El stream termina', code: 'sin onEnd: la respuesta solo existe en el navegador' },
    )
    setSim({
      client: [...sim.client, turn.user, reply],
      db: save ? [...serverMsgs, reply] : sim.db,
      sent: sim.sent + 1,
      log,
      req,
      reloaded: false,
    })
  }

  const reload = () => {
    setSim({
      ...sim,
      client: sim.db,
      reloaded: true,
      req: null,
      log: [
        { tone: 'error', where: 'navegador', title: 'Recarga: el estado de useChat se pierde', code: 'messages vivía en la memoria de la pestaña' },
        sim.db.length
          ? { tone: 'memory', where: 'servidor', title: `loadChat("${CHAT_ID}")`, code: `${sim.db.length} mensajes → mensajes iniciales del chat` }
          : { tone: 'system', where: 'servidor', title: 'No hay nada que cargar', code: 'la tabla chats está vacía' },
      ],
    })
  }

  return (
    <Lab
      title="Recargar la página, con y sin guardar"
      hint="Envía, recarga y cambia los interruptores"
      footer={<span className="small muted">Simulación. saveChat y loadChat son funciones tuyas contra tu base; onEnd, originalMessages y prepareSendMessagesRequest son del AI SDK.</span>}
    >
      <div className="vc-ui-ctl">
        <Toggle label={<span>Guardar en <code>onEnd</code></span>} checked={save} onChange={setSave} />
        <Toggle label={<span>Enviar solo el último mensaje</span>} checked={lastOnly} onChange={setLastOnly} />
      </div>
      <div className="vc-ui-persist">
        <div className="vc-ui-win">
          <div className="vc-ui-win-top">
            <span className="vc-ui-win-title">{AGENT_DISPLAY}</span>
            <span className="mono small muted">useChat · {sim.client.length} en memoria</span>
          </div>
          <div className="vc-ui-win-body" key={sim.reloaded ? `r${sim.client.length}` : 'live'}>
            <div className="chat">
              {sim.client.length === 0 && (
                <p className="small muted vc-ui-evempty">
                  {sim.reloaded ? 'La página volvió vacía: la conversación no estaba guardada en ningún lado.' : 'Conversación nueva. Envía el primer mensaje.'}
                </p>
              )}
              {sim.client.map((m) =>
                m.role === 'user' ? (
                  <div key={m.id} className="chat-msg is-user">
                    <div className="chat-bubble">{m.text}</div>
                  </div>
                ) : (
                  <div key={m.id} className="chat-msg vc-ui-wide">
                    {m.card && <OrderCard state="output-available" compact />}
                    <div className="chat-bubble">{m.text}</div>
                  </div>
                ),
              )}
            </div>
          </div>
          <div className="vc-ui-win-foot">
            <button className="btn btn-primary btn-sm" onClick={send} disabled={!turn}>
              <Send size={14} /> {turn ? `Enviar: “${turn.user.text}”` : 'Fin del guion'}
            </button>
            <button className="btn btn-sm" onClick={reload}>
              <RefreshCw size={14} /> Recargar la página
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSim(EMPTY)} aria-label="Reiniciar el laboratorio">
              <RotateCcw size={13} /> Reiniciar
            </button>
          </div>
        </div>

        <div className="stack">
          <div className="vc-ui-db" data-filled={sim.db.length > 0}>
            <div className="vc-ui-db-head">
              <Database size={14} />
              <span>Tu base · tabla chats</span>
              <span className="mono small">{sim.db.length ? `1 fila · ${sim.db.length} UIMessage` : '0 filas'}</span>
            </div>
            {sim.db.length === 0 ? (
              <div className="vc-ui-db-empty">Vacía. El AI SDK no guarda nada por ti.</div>
            ) : (
              <div className="vc-ui-db-rows">
                <div className="vc-ui-db-id mono">{CHAT_ID}</div>
                {sim.db.map((m) => (
                  <div key={m.id} className="vc-ui-db-row anim-fade">
                    <span className="mono id">{m.id}</span>
                    <span className="mono role" data-tone={m.role === 'user' ? 'user' : 'model'}>
                      {m.role}
                    </span>
                    <span className="parts">
                      {m.parts.map((p, i) => (
                        <span key={i} className="vc-ui-part" data-tone={p === 'text' ? 'model' : p === 'step-start' ? 'system' : 'tool'}>
                          <span className="mono">{p}</span>
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="evs">
            {sim.log.length === 0 && <p className="small muted vc-ui-evempty">Aquí verás qué viaja en cada request y cuándo se escribe en la base.</p>}
            {sim.log.map((l, i) => (
              <div key={`${sim.sent}-${sim.reloaded}-${i}`} className="ev is-new" data-tone={l.tone}>
                <div className="ev-head">
                  {l.title}
                  <span className="ev-tag">{l.where}</span>
                </div>
                {l.code && <code className="ev-code">{l.code}</code>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Lab>
  )
}
