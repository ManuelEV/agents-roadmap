import { useMemo, useState } from 'react'
import { Code, linesOf } from '@/components/Code'
import { Narration, PlayerBar, type StepInfo } from '@/components/Player'
import { Lab, Panel, Segmented } from '@/components/ui'
import { usePlayer } from '@/lib/hooks'
import { GUARD_SCENARIOS, STAGES, guardRun, type GuardScenarioId, type StageId, type Verdict } from './data'

const VERDICT_LABEL: Partial<Record<Verdict, string>> = { pass: 'pasa', block: 'bloquea', blind: 'no lo ve', hold: 'retenida', skip: 'no corre' }

const OUTCOME = {
  blocked: { tone: 'ok', text: 'Detenido por el guardrail' },
  leak: { tone: 'error', text: 'Pasó sin que nadie lo revisara' },
  held: { tone: 'ok', text: 'Detenido por tu código, no por el guardrail' },
  ok: { tone: 'guard', text: 'Lo frenó la herramienta, no el guardrail' },
} as const

export function GuardrailLab() {
  const [scen, setScen] = useState<GuardScenarioId>('jailbreak')
  const [on, setOn] = useState(false)
  const sc = GUARD_SCENARIOS.find((x) => x.id === scen)!
  const run = useMemo(() => guardRun(scen, on), [scen, on])

  const steps = useMemo<(StepInfo & { stage: StageId })[]>(
    () =>
      STAGES.map((st) => ({
        stage: st.id,
        title: st.id === 'user' ? 'Entra el mensaje' : st.id === 'reply' ? 'Lo que vuelve a tu aplicación' : `${st.label}${st.guard ? ` · ${VERDICT_LABEL[run.verdicts[st.id]] ?? ''}` : ''}`,
        body: run.notes[st.id] ?? (run.verdicts[st.id] === 'skip' ? 'Esta etapa no llega a ejecutarse: el flujo se cortó antes.' : 'Sin novedad en esta etapa.'),
      })),
    [run],
  )
  const player = usePlayer(steps.length, { interval: 3800 })
  const step = Math.min(player.step, steps.length - 1)
  const last = step === steps.length - 1
  const out = OUTCOME[run.outcome]

  return (
    <Lab
      title="Qué ve el guardrail y qué no"
      hint="Elige un escenario y reproduce"
      footer={
        <span className="small muted">
          Veredictos <strong>simulados</strong> a partir de lo que la documentación dice que cada punto cubre. El código HTTP 400 / <code>content_filter</code>, el item{' '}
          <code>mcp_approval_request</code> y la respuesta de Prompt Shields tienen la forma real; el resto del cuerpo de cada respuesta no se reproduce aquí.
        </span>
      }
    >
      <div className="az-gob-scen" role="tablist" aria-label="Escenarios">
        {GUARD_SCENARIOS.map((x, i) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={x.id === scen}
            className={`az-gob-scen-btn${x.id === scen ? ' is-active' : ''}`}
            onClick={() => {
              setScen(x.id)
              setOn(false)
              player.reset()
            }}
          >
            <span className="n">{i + 1}</span>
            {x.label}
          </button>
        ))}
      </div>
      <div className="az-gob-setup">
        <p className="small" style={{ margin: 0 }}>
          {sc.setup}
        </p>
        {sc.option && (
          <Segmented
            options={[
              { value: 'off', label: sc.option.off },
              { value: 'on', label: sc.option.on },
            ]}
            value={on ? 'on' : 'off'}
            onChange={(v) => setOn(v === 'on')}
          />
        )}
      </div>
      <PlayerBar player={player} labels={STAGES.map((s) => s.label)} />
      <div className="az-gob-pipe" role="group" aria-label="Recorrido del turno por los cuatro puntos de intervención">
        {STAGES.map((st, i) => {
          const v = run.verdicts[st.id]
          const reached = i <= step
          return (
            <button
              key={st.id}
              className={`az-gob-stage${st.guard ? ' is-guard' : ''}${reached ? ` v-${v}` : ' is-future'}${i === step ? ' is-current' : ''}`}
              data-tone={st.tone}
              onClick={() => player.goTo(i)}
              aria-label={`${st.label}: ${reached ? (VERDICT_LABEL[v] ?? 'alcanzada') : 'pendiente'}`}
            >
              <span className="verdict">{reached && VERDICT_LABEL[v] ? VERDICT_LABEL[v] : ' '}</span>
              <span className="lbl">{st.label}</span>
              <span className="sub">{st.sub}</span>
            </button>
          )
        })}
      </div>
      <div className="az-gob-pipe-grid">
        <Narration steps={steps} step={step} />
        <Panel title="Mensaje y resultado" tone="user">
          <div className="chat">
            <div className="chat-msg is-user">
              <div className="chat-bubble">{run.message}</div>
            </div>
          </div>
          {last ? (
            <div className="az-gob-result anim-fade" data-tone={out.tone}>
              <span className="az-gob-result-tag">{out.text}</span>
              <code>{run.reply}</code>
            </div>
          ) : (
            <p className="small muted" style={{ margin: '10px 0 0' }}>
              El resultado aparece en el último paso.
            </p>
          )}
        </Panel>
      </div>
      <div style={{ marginTop: 12 }}>
        <Code code={run.code} lang={run.lang} title={run.codeTitle} highlight={linesOf(run.code, ...run.needles)} />
      </div>
    </Lab>
  )
}
