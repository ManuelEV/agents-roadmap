import { useEffect, useMemo, useRef, useState } from 'react'
import { PauseCircle, ShieldAlert, ThumbsDown, ThumbsUp } from 'lucide-react'
import { Lab } from '@/components/ui'
import { Code, linesOf } from '@/components/Code'
import { Narration, PlayerBar } from '@/components/Player'
import { usePlayer } from '@/lib/hooks'
import { fmtClp } from '@/sim/andes'
import { APPROVAL_CODE, BIG_ARGS, BIG_ORDER, LIMIT, approvalContents, approvalSteps, type Decision } from './data'

const WAIT_STEP = 5
const RUNS: { n: 1 | 2 | 3; from: number; label: string; done: string }[] = [
  { n: 1, from: 0, label: 'agent.run() 1', done: 'termina con texto' },
  { n: 2, from: 3, label: 'agent.run() 2', done: 'devuelve una solicitud de aprobación' },
  { n: 3, from: 6, label: 'agent.run() 3', done: 'reanuda con la respuesta' },
]

export function ApprovalLab() {
  const [decision, setDecision] = useState<Decision>(null)
  const steps = useMemo(() => approvalSteps(decision), [decision])
  const contents = useMemo(() => approvalContents(decision), [decision])
  const player = usePlayer(steps.length, { interval: 3800 })
  const playerRef = useRef(player)
  playerRef.current = player
  const step = Math.min(player.step, steps.length - 1)
  const s = steps[step]

  // al decidir, la lista de pasos crece: salta al primero del run 3
  useEffect(() => {
    if (decision) playerRef.current.goTo(WAIT_STEP + 1)
  }, [decision])

  // la lista crece hacia abajo: mantén a la vista el contenido nuevo sin mover la página
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [step, decision])

  const reset = () => {
    setDecision(null)
    player.reset()
  }
  const visible = contents.filter((c) => c.step <= step)
  const lastStep = visible.length ? visible[visible.length - 1].step : -1
  const waiting = step >= 4 && step <= WAIT_STEP && decision === null
  const currentRun = step >= 6 ? 3 : step >= 3 ? 2 : 1

  return (
    <Lab
      title={`Dos reembolsos, una aprobación: ${fmtClp(29990)} pasa solo, ${fmtClp(BIG_ORDER.total)} espera a una persona`}
      hint="Reproduce; en el paso 6 decides tú"
      footer={
        <span className="small muted">
          Respuestas del modelo simuladas. Los valores de content.type son los reales de Agent Framework; el resto de los campos se muestra resumido y la forma exacta de construir la respuesta de aprobación queda a confirmar en la documentación de function tools.
        </span>
      }
    >
      <div className="row" style={{ gap: 10 }}>
        <PlayerBar player={player} labels={steps.map((x) => x.title)} />
        {decision && (
          <button className="btn btn-sm btn-ghost" onClick={reset}>
            Probar la otra decisión
          </button>
        )}
      </div>

      <div className="az-hw-runs" aria-label="Llamadas a agent.run en esta sesión">
        {RUNS.map((r) => {
          const state = r.n < currentRun ? 'done' : r.n === currentRun ? 'current' : 'todo'
          return (
            <div key={r.n} className={`az-hw-run is-${state}${r.n === 2 && waiting ? ' is-waiting' : ''}`}>
              <span className="mono">{r.label}</span>
              <span className="small">{state === 'todo' ? 'aún no ocurre' : r.n === 2 && waiting ? 'terminó sin ejecutar la herramienta' : r.done}</span>
            </div>
          )
        })}
        <div className="az-hw-run-session small muted">
          misma <span className="mono">session</span> en las tres
        </div>
      </div>

      <div className="az-hw-approval">
        <div className="stack">
          <Narration steps={steps} step={step} />
          {step >= 4 && decision === null && (
            <div className="az-hw-ask anim-in">
              <div className="t">
                {step === WAIT_STEP ? <ShieldAlert size={16} /> : <PauseCircle size={16} />} {step === WAIT_STEP ? 'Bandeja del supervisor' : 'Run detenido: falta una aprobación'}
              </div>
              <div className="h">
                Reembolso de {fmtClp(BIG_ORDER.total)} del pedido {BIG_ORDER.id} · supera el tope automático de {fmtClp(LIMIT)}.
              </div>
              <div className="meta">refund_with_approval({JSON.stringify(BIG_ARGS)})</div>
              {step === WAIT_STEP && (
                <div className="row">
                  <button className="btn btn-primary" onClick={() => setDecision('approved')}>
                    <ThumbsUp size={14} /> Aprobar
                  </button>
                  <button className="btn" onClick={() => setDecision('rejected')}>
                    <ThumbsDown size={14} /> Rechazar
                  </button>
                </div>
              )}
            </div>
          )}
          {decision && (
            <div className="az-hw-decided" data-tone={decision === 'approved' ? 'ok' : 'error'}>
              Decisión del supervisor: <strong>{decision === 'approved' ? 'aprobado' : 'rechazado'}</strong>. {decision === 'approved' ? 'La función se ejecutó una vez, después de la respuesta.' : 'La función nunca se ejecutó.'}
            </div>
          )}
          <Code code={APPROVAL_CODE} lang="python" title="andes_ops/refunds.py" highlight={linesOf(APPROVAL_CODE, ...s.needles)} dim={s.needles.length > 0} maxHeight={300} />
        </div>

        <div className="stack">
          <div className="label">Contenidos de la sesión · content.type</div>
          <div className="evs az-hw-contents" ref={listRef}>
            {visible.map((c, i) => {
              const first = i === 0 || visible[i - 1].run !== c.run
              return (
                <div key={`${c.step}-${i}-${c.type}`}>
                  {first && <div className="az-hw-run-sep mono">agent.run() {c.run}</div>}
                  <div className={`ev${c.step === lastStep && c.step === step ? ' is-new is-hl' : ''}`} data-tone={c.tone}>
                    <div className="ev-head">
                      {c.type}
                      <span className="ev-tag">{c.by}</span>
                    </div>
                    {c.text && <div className="ev-text">{c.text}</div>}
                    {c.code && <code className="ev-code">{c.code}</code>}
                  </div>
                </div>
              )
            })}
            {waiting && (
              <div className="az-hw-idle small">
                <PauseCircle size={14} /> Sin proceso en espera: solo la sesión guardada.
              </div>
            )}
          </div>
        </div>
      </div>
    </Lab>
  )
}
