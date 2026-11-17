import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Lab, Pill, Segmented, Slider, Stat } from '@/components/ui'
import { Code } from '@/components/Code'
import { fmtInt, fmtUsd } from '@/sim/andes'
import {
  EQUIV,
  IN_STEPS,
  LESSON_TITLES,
  MATCH,
  MODELS,
  OUT_STEPS,
  PRICE_DATE,
  REGION,
  REQ_STEPS,
  ROLES,
  TIMELINE,
  TIME_CATS,
  costPerQuestion,
  modelIdFor,
  priceOf,
  type Match,
  type Scope,
  type TimeCat,
} from './data'

const tok = (n: number) => (n >= 1_000_000 ? `${n / 1_000_000}M` : n >= 1000 ? `${n / 1000}K` : String(n))
const perM = (n: number) => `US$ ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}`

/* ------------------------------------------------------------------------ */
/* Lab 3 · Elegir modelo y ver el costo                                      */
/* ------------------------------------------------------------------------ */
export function ModelCostLab() {
  const [modelId, setModelId] = useState('sonnet')
  const [scope, setScope] = useState<Scope>('global')
  const [inI, setInI] = useState(3)
  const [outI, setOutI] = useState(3)
  const [calls, setCalls] = useState(2)
  const [reqI, setReqI] = useState(3)

  const inTok = IN_STEPS[inI]
  const outTok = OUT_STEPS[outI]
  const perDay = REQ_STEPS[reqI]
  const m = MODELS.find((x) => x.id === modelId)!
  const { price, usedScope, long } = priceOf(m, scope, inTok)
  const fits = inTok <= m.ctx && outTok <= m.maxOut
  const perQ = costPerQuestion(m, scope, inTok, outTok, calls)

  const rows = useMemo(
    () =>
      MODELS.map((x) => ({
        m: x,
        month: costPerQuestion(x, scope, inTok, outTok, calls) * perDay * 30,
        fits: inTok <= x.ctx && outTok <= x.maxOut,
        long: priceOf(x, scope, inTok).long,
      })),
    [scope, inTok, outTok, calls, perDay],
  )
  const max = Math.max(...rows.map((r) => r.month))
  const role = ROLES.find((r) => r.model === modelId)

  const code = `from strands import Agent
from strands.models import BedrockModel

model = BedrockModel(
    model_id="${modelIdFor(m, usedScope)}",
    region_name="${REGION}",
)
agent = Agent(model=model, system_prompt="Eres Andi, de Andes Market.")`

  return (
    <Lab
      title="Elige un modelo y mira la factura"
      hint="Elige un rol o un modelo y mueve los controles"
      footer={
        <span className="small muted">
          Precios en USD por 1M de tokens, tier Standard, us-east-1, tomados del AWS Price List el {PRICE_DATE}. No incluye prompt caching, Runtime ni Gateway. Leer las filas
          sin sufijo <code>_global</code> como uso geográfico o in-region es una interpretación a confirmar en la documentación.
        </span>
      }
    >
      <div className="aws-mapa-roles">
        {ROLES.map((r) => (
          <button key={r.id} className={`aws-mapa-role${r.model === modelId ? ' is-active' : ''}`} onClick={() => setModelId(r.model)} aria-pressed={r.model === modelId}>
            <span className="k">{r.label}</span>
            <span className="v">{MODELS.find((x) => x.id === r.model)!.name}</span>
            <span className="d">{r.why}</span>
          </button>
        ))}
      </div>

      <div className="aws-mapa-cost">
        <div className="aws-mapa-cost-controls">
          <div className="row" style={{ gap: 8 }}>
            <Segmented
              options={[
                { value: 'global', label: 'Perfil global' },
                { value: 'other', label: 'Sin perfil global' },
              ]}
              value={scope}
              onChange={setScope}
            />
          </div>
          <Slider label="Tokens de entrada por llamada al modelo" value={inI} min={0} max={IN_STEPS.length - 1} onChange={setInI} format={(i) => tok(IN_STEPS[i])} />
          <Slider label="Tokens de salida por llamada" value={outI} min={0} max={OUT_STEPS.length - 1} onChange={setOutI} format={(i) => tok(OUT_STEPS[i])} />
          <Slider label="Llamadas al modelo por pregunta" value={calls} min={1} max={8} onChange={setCalls} format={(v) => `${v}`} />
          <Slider label="Preguntas por día" value={reqI} min={0} max={REQ_STEPS.length - 1} onChange={setReqI} format={(i) => fmtInt(REQ_STEPS[i])} />
          <p className="small muted" style={{ margin: 0 }}>
            Una pregunta con una herramienta son 2 llamadas al modelo, y la segunda reenvía todo el contexto. Por eso la entrada pesa más de lo que parece.
          </p>
        </div>

        <div className="aws-mapa-cost-out">
          <div className="aws-mapa-model-head">
            <div>
              <div className="aws-mapa-model-name">{m.name}</div>
              <div className="small muted">
                {m.vendor} · lanzado {m.released} · contexto {tok(m.ctx)} · salida máx. {tok(m.maxOut)}
              </div>
            </div>
            {role && <Pill tone="model">{role.label}</Pill>}
          </div>
          <div className="aws-mapa-price">
            <span>
              entrada <b>{perM(price[0])}</b>
            </span>
            <span>
              salida <b>{perM(price[1])}</b>
            </span>
            <span className="muted">por 1M de tokens · {usedScope === 'global' ? 'perfil global' : m.vendor === 'Amazon' ? 'in-region us-east-1' : 'fila sin _global (+10 %)'}</span>
          </div>
          {scope === 'global' && !m.global && <div className="aws-mapa-flag" data-tone="system">{m.name} no tiene perfil global: se muestra el precio in-region.</div>}
          {long && (
            <div className="aws-mapa-flag" data-tone="guard">
              El prompt pasa de 100K tokens: toda la petición se cobra a la tarifa larga de Haiku 5.5, cinco veces la normal.
            </div>
          )}
          {!fits && (
            <div className="aws-mapa-flag" data-tone="error">
              No cabe: {m.name} admite {tok(m.ctx)} de contexto y {tok(m.maxOut)} de salida. El costo de abajo es solo teórico.
            </div>
          )}
          <div className="aws-mapa-stats">
            <Stat label="Por pregunta" value={fmtUsd(perQ)} />
            <Stat label="Por día" value={fmtUsd(perQ * perDay)} />
            <Stat label="Por mes" value={fmtUsd(perQ * perDay * 30, 2)} tone={fits ? undefined : 'error'} />
          </div>
          <p className="small" style={{ margin: 0, color: 'var(--text-2)' }}>
            {m.note}
          </p>
        </div>
      </div>

      <div className="aws-mapa-bars" role="group" aria-label="Costo mensual de la misma carga con cada modelo">
        <div className="label">La misma carga con cada modelo · costo por mes</div>
        {rows.map((r) => (
          <button key={r.m.id} className={`aws-mapa-bar${r.m.id === modelId ? ' is-active' : ''}${r.fits ? '' : ' is-nofit'}`} onClick={() => setModelId(r.m.id)} aria-pressed={r.m.id === modelId}>
            <span className="n">{r.m.name}</span>
            <span className="t">
              <span className="f" style={{ transform: `scaleX(${Math.max(0.004, r.month / max)})` }} />
            </span>
            <span className="v">
              {r.fits ? fmtUsd(r.month, 2) : 'no cabe'}
              {r.long && r.fits && <em> tarifa larga</em>}
            </span>
          </button>
        ))}
        <div className="small muted">Barras en escala lineal: la diferencia entre el más caro y el más barato es real.</div>
      </div>

      <Code code={code} lang="python" title="Así se fija ese modelo en Strands" highlight={[5, 6]} />
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 4 · Línea de tiempo                                                   */
/* ------------------------------------------------------------------------ */
type TimeFilter = 'hitos' | 'todo' | TimeCat
const TIME_FILTERS: { value: TimeFilter; label: string }[] = [
  { value: 'hitos', label: 'Hitos' },
  { value: 'agentcore', label: 'AgentCore' },
  { value: 'strands', label: 'Strands' },
  { value: 'modelos', label: 'Modelos' },
  { value: 'retiros', label: 'Retiros y renombres' },
  { value: 'todo', label: 'Todo' },
]

export function TimelineLab() {
  const [f, setF] = useState<TimeFilter>('hitos')
  const items = TIMELINE.filter((t) => (f === 'todo' ? true : f === 'hitos' ? t.key : t.cat === f))
  return (
    <Lab title="2025–2026 en una línea" hint="Filtra por tipo de cambio">
      <div className="row" style={{ marginBottom: 14 }}>
        <Segmented options={TIME_FILTERS} value={f} onChange={setF} />
        <span className="small muted">{items.length} eventos</span>
      </div>
      <ol className="aws-mapa-time" key={f}>
        {items.map((t, i) => (
          <li key={`${t.date}-${i}`} data-tone={TIME_CATS[t.cat].tone} className="anim-fade">
            {(i === 0 || items[i - 1].year !== t.year) && <span className="y">{t.year}</span>}
            <span className="dot" />
            <span className="d">{t.date}</span>
            <span className="x">
              {t.text} <span className="c">{TIME_CATS[t.cat].label}</span>
            </span>
          </li>
        ))}
      </ol>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 5 · Equivalencias AWS ↔ Google Cloud                                  */
/* ------------------------------------------------------------------------ */
type EqFilter = 'todas' | Match
export function EquivLab() {
  const [f, setF] = useState<EqFilter>('todas')
  const [sel, setSel] = useState('runtime')
  const rows = EQUIV.filter((e) => f === 'todas' || e.match === f)
  const n = (k: Match) => EQUIV.filter((e) => e.match === k).length
  return (
    <Lab
      title="AWS ↔ Google Cloud, fila por fila"
      hint="Haz clic en una fila"
      footer={
        <span className="small muted">
          Los nombres de Google vienen de la investigación de esa sección (nov-2026). «Sin equivalente» significa que no se verificó uno, no que sea imposible construirlo.
        </span>
      }
    >
      <div className="row" style={{ marginBottom: 12 }}>
        <Segmented
          options={[
            { value: 'todas', label: `Todas · ${EQUIV.length}` },
            { value: 'directa', label: `Equivalentes · ${n('directa')}` },
            { value: 'aprox', label: `Aproximadas · ${n('aprox')}` },
            { value: 'sin', label: `Sin equivalente · ${n('sin')}` },
          ]}
          value={f}
          onChange={setF}
        />
      </div>
      <div className="aws-mapa-eq">
        <div className="aws-mapa-eq-head">
          <span>En AWS</span>
          <span>En Google Cloud</span>
          <span />
        </div>
        {rows.map((e) => {
          const open = e.id === sel
          return (
            <div key={e.id} className={`aws-mapa-eq-item${open ? ' is-open' : ''}`} data-tone={MATCH[e.match].tone}>
              <button className="aws-mapa-eq-row" onClick={() => setSel(e.id)} aria-expanded={open}>
                <span className={`a${e.aws === '—' ? ' is-none' : ''}`}>{e.aws === '—' ? 'no hay' : e.aws}</span>
                <span className={`g${e.google === '—' ? ' is-none' : ''}`}>{e.google === '—' ? 'no hay' : e.google}</span>
                <span className="m">
                  <i /> {MATCH[e.match].label}
                </span>
              </button>
              {open && (
                <div className="aws-mapa-eq-note anim-fade">
                  <span>{e.note}</span>
                  {e.lesson && <Link to={`/aws/${e.lesson}`}>Se trabaja en «{LESSON_TITLES[e.lesson]}» →</Link>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Lab>
  )
}
