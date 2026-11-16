import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { Lab, Pill, Segmented, Toggle } from '@/components/ui'
import { Narration, PlayerBar } from '@/components/Player'
import { usePlayer } from '@/lib/hooks'
import { runTool } from '@/sim/andes'
import { CUSTOMER, LAYERS, MEMORY_STEPS, OTHER_ACTOR, QUESTION_2, SCENARIOS, SESSION_1, SESSION_2, STRATEGIES, TRACKING, TURNS_1, type ScenarioId, type StrategyId } from './data'

/* ------------------------------------------------------------------------ */
/* Lab 4 · ¿qué sobrevive?                                                   */
/* ------------------------------------------------------------------------ */

export function SurviveLab() {
  const [sc, setSc] = useState<ScenarioId>('vm')
  const scenario = SCENARIOS.find((s) => s.id === sc)!
  return (
    <Lab title="Cuatro lugares donde puede vivir la conversación: ¿qué sobrevive?" hint="Elige qué pasa después">
      <Segmented options={SCENARIOS.map((s) => ({ value: s.id, label: s.label }))} value={sc} onChange={setSc} />
      <p className="aws-hm-scenario anim-fade" key={sc}>
        {scenario.desc}
      </p>
      <div className="aws-hm-layers">
        {LAYERS.map((l) => {
          const [okk, why] = l.by[sc]
          return (
            <div key={l.id} className={`aws-hm-layer${okk ? ' is-ok' : ' is-lost'}`} data-tone={l.tone}>
              <div className="aws-hm-layer-title">{l.title}</div>
              <div className="aws-hm-layer-api">{l.api}</div>
              <div className="aws-hm-layer-what">{l.what}</div>
              <div className="aws-hm-layer-verdict anim-fade" key={sc}>
                <span className="mark">{okk ? <Check size={14} /> : <X size={14} />}</span>
                <span>
                  <strong>{okk ? 'Sobrevive.' : 'Se pierde.'}</strong> {why}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 5 · dos sesiones, estrategias y namespaces                            */
/* ------------------------------------------------------------------------ */

const SHIP = runTool('track_shipment', { tracking: TRACKING }) as { last_event: string }

export function MemoryLab() {
  const player = usePlayer(MEMORY_STEPS.length, { interval: 4200 })
  const step = player.step
  const [strat, setStrat] = useState<Record<StrategyId, boolean>>({ SEMANTIC: true, USER_PREFERENCE: false, SUMMARIZATION: false })
  const [activeBefore, setActiveBefore] = useState<'antes' | 'despues'>('antes')
  const [sess, setSess] = useState<'nueva' | 'misma'>('nueva')
  const [actor, setActor] = useState<'camila' | 'otro'>('camila')

  const isCamila = actor === 'camila'
  const actorId = isCamila ? CUSTOMER.id : OTHER_ACTOR
  const session2 = isCamila && sess === 'misma' ? SESSION_1 : SESSION_2
  const history = isCamila && sess === 'misma'
  const extracted = activeBefore === 'antes'
  const enabled = STRATEGIES.filter((s) => strat[s.id])
  const anyStrategy = enabled.length > 0
  const hits = isCamila && extracted ? enabled : []
  const has = (id: StrategyId) => hits.some((h) => h.id === id)

  const knowsPolar = history || has('SEMANTIC') || has('SUMMARIZATION')
  const knowsOrder = history || has('SEMANTIC') || has('SUMMARIZATION')
  const knowsChannel = history || has('USER_PREFERENCE')
  const parts: { ok: boolean; text: string; src: string }[] = [
    knowsPolar
      ? { ok: true, text: 'El cambio del polar del pedido 4790 por talla L sigue registrado.', src: history ? 'turnos' : has('SEMANTIC') ? 'facts' : 'summary' }
      : { ok: false, text: '¿De qué polar me hablas? Necesito el número del pedido.', src: 'sin datos' },
    knowsOrder
      ? { ok: true, text: `Tu pedido 4821 está: ${SHIP.last_event.toLowerCase()}.`, src: history ? 'turnos' : has('SEMANTIC') ? 'facts' : 'summary' }
      : { ok: false, text: '¿Cuál es el otro pedido?', src: 'sin datos' },
    knowsChannel
      ? { ok: true, text: 'Te aviso por WhatsApp apenas lo entreguen.', src: history ? 'turnos' : 'preferences' }
      : { ok: false, text: '¿Por dónde prefieres que te avise?', src: 'sin datos' },
  ]
  const known = parts.filter((p) => p.ok).length

  return (
    <Lab
      title="Dos sesiones: qué recuerda Andi según lo que configures"
      hint="Cambia los controles y reproduce"
      footer={
        <span className="small muted">
          Conversación y extracción simuladas; lo que escribe cada estrategia depende del modelo que la ejecuta. Las operaciones (<code>CreateEvent</code>,{' '}
          <code>RetrieveMemoryRecords</code>), los nombres de estrategia y el formato de los namespaces son reales.
        </span>
      }
    >
      <div className="aws-hm-ctl">
        <div className="aws-hm-ctl-group">
          <span className="label">Estrategias de largo plazo</span>
          <div className="row" style={{ gap: 14 }}>
            {STRATEGIES.map((s) => (
              <Toggle key={s.id} label={<span className="mono small">{s.label}</span>} checked={strat[s.id]} onChange={(v) => setStrat((x) => ({ ...x, [s.id]: v }))} />
            ))}
          </div>
        </div>
        <div className="aws-hm-ctl-group">
          <span className="label">Quedaron ACTIVE</span>
          <Segmented
            options={[
              { value: 'antes', label: 'antes de la sesión 1' },
              { value: 'despues', label: 'después' },
            ]}
            value={activeBefore}
            onChange={setActiveBefore}
          />
        </div>
        <div className="aws-hm-ctl-group">
          <span className="label">En la sesión 2 escribe</span>
          <Segmented
            options={[
              { value: 'camila', label: `Camila · ${CUSTOMER.id}` },
              { value: 'otro', label: `Tomás · ${OTHER_ACTOR}` },
            ]}
            value={actor}
            onChange={setActor}
          />
        </div>
        <div className="aws-hm-ctl-group">
          <span className="label">sessionId de la sesión 2</span>
          <Segmented
            options={[
              { value: 'nueva', label: 'nuevo' },
              { value: 'misma', label: 'el mismo' },
            ]}
            value={sess}
            onChange={setSess}
          />
        </div>
      </div>

      <PlayerBar player={player} labels={MEMORY_STEPS.map((s) => s.title)} />

      <div className="aws-hm-mem">
        {/* corto plazo */}
        <div className={`aws-hm-col${step === 0 ? ' is-active' : ''}`} data-tone="memory">
          <div className="aws-hm-col-head">
            <span>Corto plazo · eventos</span>
            <Pill tone="memory" mono>
              CreateEvent × {TURNS_1.length}
            </Pill>
          </div>
          <div className="aws-hm-key">
            actorId <b>{CUSTOMER.id}</b> · sessionId <b>{SESSION_1}</b>
          </div>
          <div className="evs">
            {TURNS_1.map((t, i) => (
              <div key={i} className="ev" data-tone={t.role === 'USER' ? 'user' : 'model'}>
                <div className="ev-head">
                  {t.role}
                  <span className="ev-time">evento {i + 1}</span>
                </div>
                <div className="ev-text">{t.text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* largo plazo */}
        <div className={`aws-hm-col${step === 1 ? ' is-active' : ''}${step < 1 ? ' is-pending' : ''}`} data-tone="memory">
          <div className="aws-hm-col-head">
            <span>Largo plazo · registros</span>
            <Pill tone="memory" mono>
              asíncrono
            </Pill>
          </div>
          {!anyStrategy && <div className="aws-hm-empty">Sin estrategias, la memoria solo guarda eventos. No se extrae nada.</div>}
          {anyStrategy && !extracted && (
            <div className="aws-hm-empty is-warn">
              Las estrategias quedaron <code>ACTIVE</code> después de la sesión 1. Solo procesan eventos posteriores: estos namespaces están vacíos.
            </div>
          )}
          {enabled.map((s) => (
            <div key={s.id} className="aws-hm-ns">
              <div className="aws-hm-ns-path">{s.ns(CUSTOMER.id)}</div>
              <div className="aws-hm-ns-meta">
                {s.label} · {s.extracts} · plantilla <code>{s.template}</code>
              </div>
              {extracted && step >= 1 ? (
                s.records.map((r) => (
                  <div key={r} className="aws-hm-rec">
                    {r}
                  </div>
                ))
              ) : (
                <div className="aws-hm-rec is-none">{extracted ? 'pendiente de extracción' : '0 registros'}</div>
              )}
            </div>
          ))}
        </div>

        {/* sesión 2 */}
        <div className={`aws-hm-col${step >= 2 ? ' is-active' : ''}${step < 2 ? ' is-pending' : ''}`} data-tone="user">
          <div className="aws-hm-col-head">
            <span>Sesión 2 · al día siguiente</span>
            {step >= 3 && (
              <Pill tone={known === 3 ? 'ok' : known === 0 ? 'error' : 'guard'} mono>
                recuerda {known}/3
              </Pill>
            )}
          </div>
          <div className="aws-hm-key">
            actorId <b>{actorId}</b> · sessionId <b>{session2}</b>
          </div>
          {step < 2 && <div className="aws-hm-empty">Todavía no empieza.</div>}
          <div className="aws-hm-load" hidden={step < 2}>
            <div>
              <code>get_last_k_turns(k=5)</code>
              <span className={history ? 'yes' : 'no'}>{history ? '3 turnos' : '0 turnos'}</span>
            </div>
            {(anyStrategy ? enabled : STRATEGIES.slice(0, 1)).map((s) => (
              <div key={s.id}>
                <code>{s.ns(actorId).replace(SESSION_1, '…')}</code>
                <span className={has(s.id) ? 'yes' : 'no'}>{has(s.id) ? `${s.records.length} registros` : '0 registros'}</span>
              </div>
            ))}
          </div>
          {step >= 2 && (
            <div className="chat" style={{ marginTop: 10 }}>
              <div className="chat-msg is-user">
                <div className="chat-bubble">{QUESTION_2}</div>
              </div>
              {step >= 3 && (
                <div className="chat-msg">
                  <div className="chat-name">Andi</div>
                  <div className="chat-bubble aws-hm-answer">
                    {parts.map((p, i) => (
                      <span key={i} className={p.ok ? 'is-known' : 'is-asked'} title={p.src}>
                        {p.text}
                        <sup>{p.src}</sup>{' '}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Narration steps={MEMORY_STEPS} step={step} />
    </Lab>
  )
}
