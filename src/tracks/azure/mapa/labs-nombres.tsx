import { useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Lab, Pill, Segmented, Slider } from '@/components/ui'
import { fmtInt, fmtUsd } from '@/sim/andes'
import {
  EQUIVS,
  EQUIV_LABEL,
  EQUIV_TONE,
  IMPACT_LABEL,
  IMPACT_TONE,
  MODELS,
  RENAMES,
  RENAME_GROUPS,
  ROLES,
  TIERS,
  TIMELINE,
  VERIFIED,
  type EquivKind,
  type RenameImpact,
  type RoleId,
  type TierId,
} from './data'

/* ------------------------------------------------------------------------ */
/* Lab 4 · Decodificador de nombres                                          */
/* ------------------------------------------------------------------------ */
type ImpactFilter = 'todos' | RenameImpact

export function RenameDecoder() {
  const [filter, setFilter] = useState<ImpactFilter>('todos')
  const [sel, setSel] = useState('assistants')
  const visible = useMemo(() => RENAMES.filter((r) => filter === 'todos' || r.impact === filter), [filter])
  const r = visible.find((x) => x.id === sel) ?? visible[0]

  return (
    <Lab title="Decodificador de tutoriales viejos" hint="Elige el nombre que encontraste">
      <div className="az-mapa-dec-filter">
        <Segmented
          options={[
            { value: 'todos', label: `Todos (${RENAMES.length})` },
            { value: 'nombre', label: 'Solo nombre' },
            { value: 'codigo', label: 'Reescribir' },
            { value: 'retiro', label: 'Con retiro' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </div>
      <div className="az-mapa-dec">
        <div className="az-mapa-dec-list">
          {RENAME_GROUPS.map((g) => {
            const items = visible.filter((x) => x.group === g)
            if (!items.length) return null
            return (
              <div key={g} className="az-mapa-dec-group">
                <div className="label">{g}</div>
                {items.map((x) => (
                  <button key={x.id} className={`az-mapa-old${x.id === r.id ? ' is-active' : ''}`} data-tone={IMPACT_TONE[x.impact]} aria-pressed={x.id === r.id} onClick={() => setSel(x.id)}>
                    <span className="az-mapa-old-dot" />
                    <span>{x.old}</span>
                  </button>
                ))}
              </div>
            )
          })}
        </div>

        <div className="az-mapa-dec-panel anim-fade" key={r.id}>
          <div className="az-mapa-dec-pair">
            <div className="az-mapa-dec-box is-old">
              <div className="label">El tutorial dice</div>
              <div className="az-mapa-dec-name">{r.old}</div>
            </div>
            <ArrowRight size={20} className="az-mapa-dec-arrow" aria-hidden />
            <div className="az-mapa-dec-box is-new">
              <div className="label">Hoy es</div>
              <div className="az-mapa-dec-name">{r.now}</div>
            </div>
          </div>
          <div className="az-mapa-dec-meta">
            <Pill tone={IMPACT_TONE[r.impact]}>{IMPACT_LABEL[r.impact]}</Pill>
            <span className="small muted">{r.since}</span>
          </div>
          <dl className="az-mapa-facts">
            <div>
              <dt>Qué cambió</dt>
              <dd>{r.changed}</dd>
            </div>
            <div>
              <dt>Qué queda del nombre viejo</dt>
              <dd>{r.survives}</dd>
            </div>
          </dl>
        </div>
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Línea de tiempo                                                           */
/* ------------------------------------------------------------------------ */
export function Timeline() {
  return (
    <ol className="az-mapa-tl" aria-label="Línea de tiempo de Microsoft Foundry, 2024 a 2027">
      {TIMELINE.map((t) => (
        <li key={t.date + t.text} data-state={t.state}>
          <span className="az-mapa-tl-dot" />
          <span className="az-mapa-tl-date">{t.date}</span>
          <span className="az-mapa-tl-text">{t.text}</span>
        </li>
      ))}
    </ol>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 5 · Modelo por rol y costo                                            */
/* ------------------------------------------------------------------------ */
export function ModelLab() {
  const [roleId, setRoleId] = useState<RoleId>('orquestador')
  const role = ROLES.find((x) => x.id === roleId)!
  const [calls, setCalls] = useState(role.calls)
  const [inTok, setInTok] = useState(role.inTok)
  const [outTok, setOutTok] = useState(role.outTok)
  const [cache, setCache] = useState(role.cache)
  const [tierId, setTierId] = useState<TierId>('global')
  const tier = TIERS.find((t) => t.id === tierId)!

  const pickRole = (id: RoleId) => {
    const p = ROLES.find((x) => x.id === id)!
    setRoleId(id)
    setCalls(p.calls)
    setInTok(p.inTok)
    setOutTok(p.outTok)
    setCache(p.cache)
  }

  const rows = useMemo(() => {
    const monthlyCalls = calls * 30
    return MODELS.map((m) => {
      const cachedTok = inTok * (cache / 100)
      const perCall = ((inTok - cachedTok) * m.input + cachedTok * m.cached + outTok * m.output) / 1_000_000
      return { m, cost: perCall * monthlyCalls * tier.factor, perCall: perCall * tier.factor }
    })
  }, [calls, inTok, outTok, cache, tier])
  const max = Math.max(...rows.map((x) => x.cost))
  const best = rows.find((x) => x.m.id === role.picks[0])!
  const top = rows[0]

  return (
    <Lab
      title="Qué modelo para qué rol, y cuánto cuesta"
      hint="Elige un rol y mueve los controles"
      footer={
        <span className="small muted">
          Precios indicativos en US$ por 1M de tokens: Azure Retail Prices API, {tier.id === 'global' ? 'Global Standard' : `${tier.label} estimado sobre Global Standard`},
          región eastus2, consultada el {VERIFIED}. En modelos con dos precios se usa el de contexto corto. Confírmalos en la página de precios de Azure
          antes de presupuestar.
        </span>
      }
    >
      <div className="az-mapa-model-top">
        <Segmented options={ROLES.map((x) => ({ value: x.id, label: x.label }))} value={roleId} onChange={pickRole} />
        <Segmented options={TIERS.map((t) => ({ value: t.id, label: t.label }))} value={tierId} onChange={setTierId} />
      </div>
      <p className="az-mapa-model-why anim-fade" key={roleId}>
        {role.why}
      </p>
      <div className="az-mapa-model-grid">
        <div className="az-mapa-sliders">
          <Slider label="Llamadas al modelo por día" value={calls} min={500} max={50000} step={500} onChange={setCalls} format={fmtInt} />
          <Slider label="Tokens de entrada por llamada" value={inTok} min={100} max={20000} step={100} onChange={setInTok} format={fmtInt} />
          <Slider label="Tokens de salida por llamada" value={outTok} min={10} max={2000} step={10} onChange={setOutTok} format={fmtInt} />
          <Slider label="Entrada servida desde caché" value={cache} min={0} max={90} step={5} onChange={setCache} format={(v) => `${v} %`} />
          <p className="small muted az-mapa-tier-note">{tier.note}</p>
        </div>
        <div className="az-mapa-bars" role="table" aria-label="Costo mensual estimado por modelo">
          {rows.map(({ m, cost }) => {
            const pick = role.picks.includes(m.id)
            return (
              <div key={m.id} className={`az-mapa-bar${pick ? ' is-pick' : ''}`} role="row">
                <span className="az-mapa-bar-name" role="cell">
                  {m.id}
                  {pick && <span className="az-mapa-bar-pick">sugerido</span>}
                </span>
                <span className="az-mapa-bar-track" role="presentation">
                  <span className="az-mapa-bar-fill" style={{ transform: `scaleX(${Math.max(0.004, cost / max)})` }} />
                </span>
                <span className="az-mapa-bar-cost tabular" role="cell">
                  {fmtUsd(cost, cost < 100 ? 2 : 0)}
                </span>
                {m.note && (
                  <span className="az-mapa-bar-note" data-tone={m.noteTone} role="cell">
                    {m.note}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <div className="az-mapa-model-sum">
        <div>
          <div className="label">{best.m.id} · al mes</div>
          <div className="az-mapa-model-big tabular">{fmtUsd(best.cost, best.cost < 100 ? 2 : 0)}</div>
          <div className="small muted">
            {fmtInt(calls * 30)} llamadas · {fmtUsd(best.perCall)} cada una
          </div>
        </div>
        <div>
          <div className="label">Frente a {top.m.id}</div>
          <div className="az-mapa-model-big tabular">{best.cost > 0 ? `${(top.cost / best.cost).toFixed(1).replace('.', ',')}× menos` : '—'}</div>
          <div className="small muted">mismo tráfico, mismo nivel de servicio</div>
        </div>
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 6 · Equivalencias Azure ↔ Google Cloud                                */
/* ------------------------------------------------------------------------ */
type EquivFilter = 'todas' | EquivKind

export function EquivLab() {
  const [filter, setFilter] = useState<EquivFilter>('todas')
  const [sel, setSel] = useState<string | null>('gateway')
  const rows = EQUIVS.filter((e) => filter === 'todas' || e.kind === filter)
  const count = (k: EquivKind) => EQUIVS.filter((e) => e.kind === k).length

  return (
    <Lab
      title="Azure ↔ Google Cloud"
      hint="Haz clic en una fila"
      footer={
        <span className="small muted">
          La clasificación directa / parcial / sin equivalente es una lectura de este tutorial a partir de la documentación de ambas nubes, no una tabla
          oficial de Microsoft ni de Google.
        </span>
      }
    >
      <div className="az-mapa-eq-filter">
        <Segmented
          options={[
            { value: 'todas', label: `Todas (${EQUIVS.length})` },
            { value: 'directa', label: `Directas (${count('directa')})` },
            { value: 'parcial', label: `Parciales (${count('parcial')})` },
            { value: 'ninguna', label: `Sin equivalente (${count('ninguna')})` },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </div>
      <div className="az-mapa-eq">
        <div className="az-mapa-eq-head">
          <span>En Azure</span>
          <span>En Google Cloud</span>
        </div>
        {rows.map((e) => {
          const open = e.id === sel
          return (
            <div key={e.id} className={`az-mapa-eq-row${open ? ' is-open' : ''}`} data-tone={EQUIV_TONE[e.kind]}>
              <button className="az-mapa-eq-btn" aria-expanded={open} onClick={() => setSel(open ? null : e.id)}>
                <span className={`az-mapa-eq-cell${e.azure === '—' ? ' is-none' : ''}`}>
                  <span className="az-mapa-eq-dot" />
                  {e.azure === '—' ? 'Nada verificado' : e.azure}
                </span>
                <span className={`az-mapa-eq-cell${e.google === '—' ? ' is-none' : ''}`}>{e.google === '—' ? 'Nada verificado' : e.google}</span>
              </button>
              {open && (
                <div className="az-mapa-eq-note anim-fade">
                  <Pill tone={EQUIV_TONE[e.kind]}>{EQUIV_LABEL[e.kind]}</Pill>
                  <span>{e.note}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Lab>
  )
}
