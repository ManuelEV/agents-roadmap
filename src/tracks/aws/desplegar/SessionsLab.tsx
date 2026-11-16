import { useReducer, useState } from 'react'
import { Cpu, RotateCcw, Send, Trash2 } from 'lucide-react'
import { Lab, Segmented } from '@/components/ui'
import { IDLE_OPTIONS, MAX_LIFETIME, SESSION_LIMITS, SESSION_USERS, UUIDS } from './data'

type Sess = { id: string; user: number; born: number; last: number; msgs: number; stopped?: { at: number; why: 'idle' | 'max' } }
type State = { now: number; idle: number; sessions: Sess[]; made: number; log: { t: number; text: string; tone: 'ok' | 'error' | 'user' }[] }
type Action = { type: 'send'; user: number } | { type: 'tick'; dt: number } | { type: 'idle'; value: number } | { type: 'reset' }

const INITIAL: State = { now: 0, idle: 900, sessions: [], made: 0, log: [] }

const clock = (s: number) => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
const span = (s: number) => (s >= 3600 ? `${+(s / 3600).toFixed(1)} h` : s >= 60 ? `${Math.round(s / 60)} min` : `${s} s`)
const short = (id: string) => `${id.slice(0, 13)}…`

/** Detiene las sesiones cuyo plazo ya venció en `now`. */
function reap(st: State): State {
  const log = [...st.log]
  const sessions = st.sessions.map((s) => {
    if (s.stopped) return s
    const byIdle = s.last + st.idle
    const byMax = s.born + MAX_LIFETIME
    const at = Math.min(byIdle, byMax)
    if (st.now < at) return s
    const why = byMax <= byIdle ? 'max' : 'idle'
    log.push({
      t: at,
      tone: 'error',
      text: `${short(s.id)} detenida: ${why === 'idle' ? `${span(st.idle)} sin actividad` : '8 h de vida máxima'}. microVM destruida, ${s.msgs} mensajes en memoria perdidos.`,
    })
    return { ...s, stopped: { at, why } as const }
  })
  return { ...st, sessions, log: log.map((l, i) => ({ l, i })).sort((a, b) => a.l.t - b.l.t || a.i - b.i).map((x) => x.l) }
}

function reducer(st: State, a: Action): State {
  if (a.type === 'reset') return INITIAL
  if (a.type === 'idle') return reap({ ...st, idle: a.value })
  if (a.type === 'tick') return reap({ ...st, now: st.now + a.dt })
  const u = SESSION_USERS[a.user]
  const live = st.sessions.find((s) => s.user === a.user && !s.stopped)
  if (live) {
    return {
      ...st,
      sessions: st.sessions.map((s) => (s === live ? { ...s, last: st.now, msgs: s.msgs + 2 } : s)),
      log: [...st.log, { t: st.now, tone: 'user', text: `${u.id} → ${short(live.id)}: misma microVM, el agente recuerda ${live.msgs} mensajes.` }],
    }
  }
  const id = UUIDS[st.made % UUIDS.length]
  const again = st.sessions.some((s) => s.user === a.user)
  return {
    ...st,
    made: st.made + 1,
    sessions: [...st.sessions, { id, user: a.user, born: st.now, last: st.now, msgs: 2 }],
    log: [...st.log, { t: st.now, tone: 'ok', text: `${u.id} → sesión ${short(id)}: microVM nueva${again ? ', sin el historial anterior' : ''}.` }],
  }
}

function Meter({ label, value, max, text }: { label: string; value: number; max: number; text: string }) {
  const r = Math.max(0, Math.min(1, value / max))
  return (
    <div className="aws-dep-meter">
      <span className="k">{label}</span>
      <span className="track">
        <span className="fill" style={{ transform: `scaleX(${r})` }} data-hot={r > 0.75 || undefined} />
      </span>
      <span className="v">{text}</span>
    </div>
  )
}

function MicroVm({ s, now, idle }: { s: Sess; now: number; idle: number }) {
  if (s.stopped)
    return (
      <div className="aws-dep-vm is-stopped">
        <div className="aws-dep-vm-head">
          <Trash2 size={14} />
          <span className="aws-dep-vm-name">microVM destruida</span>
          <span className="aws-dep-vm-state">Stopped</span>
        </div>
        <div className="aws-dep-vm-sid" title={s.id}>
          {s.id}
        </div>
        <div className="small muted">
          {s.stopped.why === 'idle' ? 'Idle timeout' : 'Vida máxima (8 h)'} a las {clock(s.stopped.at)} · memoria saneada
        </div>
      </div>
    )
  const active = now === s.last
  return (
    <div className={`aws-dep-vm anim-in${active ? ' is-active' : ''}`}>
      <div className="aws-dep-vm-head">
        <Cpu size={14} />
        <span className="aws-dep-vm-name">microVM · 2 vCPU / 8 GB</span>
        <span className="aws-dep-vm-state">{active ? 'Active' : 'Idle'}</span>
      </div>
      <div className="aws-dep-vm-sid" title={s.id}>
        {s.id}
      </div>
      <div className="small">
        <code>agent.messages</code>: <strong>{s.msgs}</strong> en memoria
      </div>
      <Meter label="inactiva" value={now - s.last} max={idle} text={`${span(now - s.last)} / ${span(idle)}`} />
      <Meter label="vida" value={now - s.born} max={MAX_LIFETIME} text={`${span(now - s.born)} / 8 h`} />
    </div>
  )
}

function IdCheck() {
  const [v, setV] = useState('camila-4821')
  const good = v.length >= 33
  return (
    <div className="aws-dep-idcheck" data-ok={good || undefined}>
      <label>
        <span className="aws-dep-idlabel">runtimeSessionId</span>
        <input className="aws-dep-input" value={v} onChange={(e) => setV(e.target.value)} spellCheck={false} aria-label="runtimeSessionId de prueba" />
      </label>
      <div className="row" style={{ gap: 6 }}>
        <button className="btn btn-sm" onClick={() => setV('camila-4821')}>
          "camila-4821"
        </button>
        <button className="btn btn-sm" onClick={() => setV('cus_7781')}>
          el id de la clienta
        </button>
        <button className="btn btn-sm" onClick={() => setV(UUIDS[0])}>
          str(uuid.uuid4())
        </button>
      </div>
      <div className="verdict">
        <strong>{v.length}</strong> caracteres · {good ? 'válido: cumple el mínimo de 33.' : `rechazado: faltan ${33 - v.length} para el mínimo de 33.`}
      </div>
    </div>
  )
}

export function SessionsLab() {
  const [st, dispatch] = useReducer(reducer, INITIAL)
  const liveCount = st.sessions.filter((s) => !s.stopped).length
  return (
    <Lab
      title="Una microVM por sesión, y cuándo se recupera"
      hint="Haz que escriban, adelanta el reloj y cambia el timeout"
      footer={
        <span className="small muted">
          Simulación del ciclo de vida documentado (Active, Idle, Stopped). Aquí tu backend crea un <code>runtimeSessionId</code> nuevo cuando la
          sesión anterior del usuario ya se detuvo.
        </span>
      }
    >
      <div className="aws-dep-sess-ctl">
        <div className="aws-dep-clock">
          <span className="label">Reloj</span>
          <span className="t mono tabular">{clock(st.now)}</span>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {[
            [60, '+1 min'],
            [300, '+5 min'],
            [900, '+15 min'],
            [7200, '+2 h'],
          ].map(([dt, label]) => (
            <button key={label} className="btn btn-sm" onClick={() => dispatch({ type: 'tick', dt: dt as number })}>
              {label}
            </button>
          ))}
          <button className="btn btn-sm btn-ghost" onClick={() => dispatch({ type: 'reset' })}>
            <RotateCcw size={13} /> Reiniciar
          </button>
        </div>
        <div className="aws-dep-idle">
          <span className="aws-dep-idlabel">idleRuntimeSessionTimeout</span>
          <Segmented options={IDLE_OPTIONS} value={String(st.idle)} onChange={(v) => dispatch({ type: 'idle', value: Number(v) })} />
        </div>
      </div>

      <div className="aws-dep-lanes">
        {SESSION_USERS.map((u, i) => {
          const mine = st.sessions.filter((s) => s.user === i)
          const live = mine.find((s) => !s.stopped)
          const dead = mine.filter((s) => s.stopped).slice(-1)
          return (
            <div className="aws-dep-lane" key={u.id}>
              <div className="who">
                <span className="n">{u.name}</span>
                <span className="i mono">{u.id}</span>
                <button className="btn btn-sm btn-primary" onClick={() => dispatch({ type: 'send', user: i })} aria-label={`${u.name} ${u.ask}`}>
                  <Send size={13} /> Escribe
                </button>
              </div>
              <div className="vms">
                {live && <MicroVm s={live} now={st.now} idle={st.idle} />}
                {dead.map((s) => (
                  <MicroVm key={s.id} s={s} now={st.now} idle={st.idle} />
                ))}
                {!mine.length && <div className="aws-dep-vm is-empty">Sin sesión: todavía no existe ninguna microVM para {u.id}.</div>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="aws-dep-sess-foot">
        <div className="aws-dep-log" aria-live="polite">
          <div className="label">
            Qué pasó · {liveCount} microVM {liveCount === 1 ? 'viva' : 'vivas'}
          </div>
          {st.log.length === 0 && <div className="small muted">Pulsa "Escribe" en dos usuarios y luego adelanta el reloj más allá del timeout.</div>}
          {st.log
            .slice(-4)
            .reverse()
            .map((l, i) => (
              <div className="line" data-tone={l.tone} key={`${st.log.length}-${i}`}>
                <span className="t mono">{clock(l.t)}</span>
                <span>{l.text}</span>
              </div>
            ))}
        </div>
        <IdCheck />
      </div>

      <div className="aws-dep-limits">
        {SESSION_LIMITS.map((l) => (
          <div key={l.k}>
            <span className="label">{l.k}</span>
            <span className="v">{l.v}</span>
          </div>
        ))}
      </div>
    </Lab>
  )
}
