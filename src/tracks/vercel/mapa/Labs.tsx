import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Check, Hammer, Minus } from 'lucide-react'
import { DocLink, Lab, Pill, Segmented, Slider, Stat } from '@/components/ui'
import { Code, linesOf } from '@/components/Code'
import { LAYERS, MODELS, NEEDS, NEW_CODE, OLD_CODE, OTHER_RENAMES, PIECES, PRICE_DATE, RENAMES, ROLE_NOTE, TIMELINE, type Have, type ModelRow } from './data'

const LESSON_LABEL = { 'primer-agente': 'Tu primer agente', interfaz: 'La interfaz', produccion: 'Producción' } as const

/* ------------------------------------------------------------------------ */
/* Lab 1 · Mapa por capas                                                    */
/* ------------------------------------------------------------------------ */
export function MapLab() {
  const [sel, setSel] = useState('tla')
  const p = PIECES.find((x) => x.id === sel)!
  const layer = LAYERS.find((l) => l.id === p.layer)!
  return (
    <Lab title="Las piezas, por capa" hint="Haz clic en una pieza">
      <div className="vc-mapa-layers">
        {LAYERS.map((l, i) => (
          <div key={l.id} className={`vc-mapa-layer${l.id === p.layer ? ' is-on' : ''}`} data-tone={l.tone}>
            <div className="vc-mapa-layer-head">
              <span className="vc-mapa-stop">{i + 1}</span>
              <div>
                <div className="vc-mapa-layer-title">{l.title}</div>
                <div className="vc-mapa-layer-blurb">{l.blurb}</div>
              </div>
            </div>
            <div className="vc-mapa-pieces">
              {PIECES.filter((x) => x.layer === l.id).map((x) => (
                <button key={x.id} className={`vc-mapa-piece${x.id === sel ? ' is-active' : ''}`} data-tone={x.tone} aria-pressed={x.id === sel} onClick={() => setSel(x.id)}>
                  <span className="dot" />
                  {x.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="vc-mapa-detail anim-fade" key={p.id} data-tone={p.tone}>
        <div className="vc-mapa-detail-main">
          <div className="vc-mapa-detail-layer">{layer.title}</div>
          <h4>{p.name}</h4>
          <p>
            <strong>{p.what}</strong>
          </p>
          <p>{p.detail}</p>
          <div className="row small" style={{ gap: 14 }}>
            <DocLink href={p.docs}>Documentación oficial</DocLink>
            {p.lesson && (
              <Link to={`/vercel/${p.lesson}`}>
                Se trabaja en «{LESSON_LABEL[p.lesson]}» <ArrowRight size={12} style={{ verticalAlign: '-1px' }} />
              </Link>
            )}
          </div>
        </div>
        <dl className="vc-mapa-facts">
          <div>
            <dt>Estado</dt>
            <dd>{p.status}</dd>
          </div>
          <div>
            <dt>Desde</dt>
            <dd>{p.since}</dd>
          </div>
          {p.pkg && (
            <div>
              <dt>Paquete (npm, 15-nov-2026)</dt>
              <dd className="mono">{p.pkg}</dd>
            </div>
          )}
        </dl>
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 2 · Incluido vs. lo traes tú                                          */
/* ------------------------------------------------------------------------ */
const HAVE: Record<Have, { label: string; cls: string; Icon: typeof Check }> = {
  si: { label: 'incluido', cls: 'is-si', Icon: Check },
  parcial: { label: 'a medias', cls: 'is-parcial', Icon: Minus },
  no: { label: 'lo traes tú', cls: 'is-no', Icon: Hammer },
}

function HaveCell({ have, piece, eco }: { have: Have; piece: string; eco: string }) {
  const h = HAVE[have]
  return (
    <span className={`vc-mapa-cell ${h.cls}`}>
      <span className="eco">{eco}</span>
      <span className="st">
        <h.Icon size={13} /> {h.label}
      </span>
      <span className="pc">{piece}</span>
    </span>
  )
}

export function BoardLab() {
  const [filter, setFilter] = useState<'todo' | 'tuyo'>('todo')
  const [sel, setSel] = useState('guardrails')
  const rows = filter === 'todo' ? NEEDS : NEEDS.filter((n) => n.vercel.have !== 'si')
  const cur = rows.find((n) => n.id === sel) ?? rows[0]
  const count = (k: 'vercel' | 'google') => NEEDS.filter((n) => n[k].have === 'si').length
  return (
    <Lab
      title="Lo que viene incluido y lo que traes tú"
      hint="Elige una necesidad"
      footer={<span className="small muted">Comparación con Gemini Enterprise Agent Platform según la documentación de ambos al 15-nov-2026. «Lo traes tú» significa: sin servicio administrado de primera parte.</span>}
    >
      <div className="vc-mapa-board-top">
        <Segmented
          options={[
            { value: 'todo', label: `Las ${NEEDS.length} necesidades` },
            { value: 'tuyo', label: 'Solo lo que traes tú en Vercel' },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <div className="vc-mapa-score">
          <span>
            Vercel <strong>{count('vercel')}</strong>/{NEEDS.length} incluidas
          </span>
          <span>
            Google Cloud <strong>{count('google')}</strong>/{NEEDS.length} incluidas
          </span>
        </div>
      </div>
      <div className="vc-mapa-board">
        <div className="vc-mapa-board-head" aria-hidden="true">
          <span>Necesidad en producción</span>
          <span>Vercel</span>
          <span>Google Cloud</span>
        </div>
        {rows.map((n) => (
          <button key={n.id} className={`vc-mapa-need${n.id === cur.id ? ' is-active' : ''}`} data-tone={n.tone} aria-pressed={n.id === cur.id} onClick={() => setSel(n.id)}>
            <span className="nm">
              <span className="dot" />
              {n.need}
            </span>
            <HaveCell eco="Vercel" have={n.vercel.have} piece={n.vercel.piece} />
            <HaveCell eco="Google Cloud" have={n.google.have} piece={n.google.piece} />
          </button>
        ))}
      </div>
      <div className="vc-mapa-board-note anim-fade" key={cur.id} data-tone={cur.tone}>
        <div className="row" style={{ gap: 8 }}>
          <strong>{cur.need}</strong>
          <Pill tone={cur.vercel.have === 'si' ? 'ok' : cur.vercel.have === 'no' ? 'guard' : 'system'}>{HAVE[cur.vercel.have].label} en Vercel</Pill>
        </div>
        <p>{cur.vercel.note}</p>
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 4 · Modelo y costo                                                    */
/* ------------------------------------------------------------------------ */
const usd = (n: number) => (n >= 100 ? `$${Math.round(n).toLocaleString('en-US')}` : n >= 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(4)}`)
const int = (n: number) => n.toLocaleString('es-CL')

export function CostLab() {
  const [sel, setSel] = useState('anthropic/claude-sonnet-5.5')
  const [convs, setConvs] = useState(1200)
  const [calls, setCalls] = useState(3)
  const [tin, setTin] = useState(4000)
  const [tout, setTout] = useState(300)

  const perConv = (m: ModelRow) => (calls * (tin * m.input + tout * m.output)) / 1_000_000
  const rows = useMemo(() => [...MODELS].sort((a, b) => b.input - a.input || b.output - a.output), [])
  const max = Math.max(...rows.map(perConv))
  const cur = MODELS.find((m) => m.id === sel)!
  const cheapest = Math.min(...rows.map(perConv))
  const monthly = perConv(cur) * convs * 30
  const inShare = (tin * cur.input) / (tin * cur.input + tout * cur.output)

  return (
    <Lab
      title="Elige un modelo y mira la cuenta"
      hint="Mueve los controles y elige un modelo"
      footer={
        <span className="small muted">
          Precios de lista vistos en la API <code>v1/models</code> de AI Gateway el {PRICE_DATE}, en US$ por millón de tokens. Cambian: consulta la API antes de presupuestar. El
          cálculo ignora caché de prompts y variantes <code>-batch</code>.
        </span>
      }
    >
      <div className="vc-mapa-cost">
        <div className="vc-mapa-cost-ctl">
          <Slider label="Conversaciones por día" value={convs} min={100} max={10000} step={100} onChange={setConvs} format={int} />
          <Slider label="Llamadas al modelo por conversación" value={calls} min={1} max={12} onChange={setCalls} />
          <Slider label="Tokens de entrada por llamada" value={tin} min={500} max={20000} step={500} onChange={setTin} format={int} />
          <Slider label="Tokens de salida por llamada" value={tout} min={50} max={2000} step={50} onChange={setTout} format={int} />
          <div className="vc-mapa-stats">
            <Stat label="Por conversación" value={usd(perConv(cur))} tone="model" />
            <Stat label="Al mes (30 días)" value={usd(monthly)} tone="model" sub={`${Math.round(perConv(cur) / cheapest)}× el más barato`} />
            <Stat label="Peso de la entrada" value={`${Math.round(inShare * 100)}%`} sub="del costo" />
          </div>
          <p className="vc-mapa-cost-note">
            <code>{cur.id}</code> · ${cur.input.toFixed(2)} entrada / ${cur.output.toFixed(2)} salida · contexto {cur.context}.{' '}
            {cur.role ? ROLE_NOTE[cur.role] : 'Sin rol sugerido en esta línea.'}
          </p>
        </div>
        <div className="vc-mapa-models" role="listbox" aria-label="Modelos y costo mensual">
          {rows.map((m) => {
            const c = perConv(m)
            return (
              <button key={m.id} role="option" aria-selected={m.id === sel} className={`vc-mapa-model${m.id === sel ? ' is-active' : ''}`} onClick={() => setSel(m.id)}>
                <span className="id">
                  {m.id}
                  {m.role && <span className="role">{m.role}</span>}
                </span>
                <span className="pr">
                  {m.input.toFixed(2)} / {m.output.toFixed(2)}
                </span>
                <span className="track">
                  <span className="fill" style={{ transform: `scaleX(${Math.max(0.006, c / max)})` }} />
                </span>
                <span className="mo">{usd(c * convs * 30)}</span>
              </button>
            )
          })}
        </div>
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 5 · Decodificador v5/v6 → v7                                          */
/* ------------------------------------------------------------------------ */
export function DecoderLab() {
  const [sel, setSel] = useState(RENAMES[0].id)
  const r = RENAMES.find((x) => x.id === sel)!
  return (
    <Lab title="Decodificador: de un tutorial viejo a AI SDK 7" hint="Elige un renombre">
      <div className="vc-mapa-renames">
        {RENAMES.map((x) => (
          <button key={x.id} className={`vc-mapa-rename${x.id === sel ? ' is-active' : ''}`} aria-pressed={x.id === sel} onClick={() => setSel(x.id)}>
            <span className="old">{x.before}</span>
            <ArrowRight size={12} />
            <span className="new">{x.after}</span>
          </button>
        ))}
      </div>
      <div className="vc-mapa-rename-note anim-fade" key={r.id}>
        {r.note}
      </div>
      <div className="vc-mapa-decoder">
        <Code code={OLD_CODE} lang="ts" title="v5 / v6 · lo que encontrarás" highlight={linesOf(OLD_CODE, ...r.oldNeedles)} dim maxHeight={250} />
        <Code code={NEW_CODE} lang="ts" title="v7 · lo que escribes hoy" highlight={linesOf(NEW_CODE, ...r.newNeedles)} dim maxHeight={250} />
      </div>
      <div className="table-wrap" style={{ marginTop: 14 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>También verás</th>
              <th>Hoy es</th>
              <th>Nota</th>
            </tr>
          </thead>
          <tbody>
            {OTHER_RENAMES.map((o) => (
              <tr key={o.before}>
                <td className="mono">{o.before}</td>
                <td className="mono">
                  <strong>{o.after}</strong>
                </td>
                <td>{o.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Línea de tiempo                                                           */
/* ------------------------------------------------------------------------ */
export function Timeline() {
  return (
    <ol className="vc-mapa-timeline" aria-label="Hitos del ecosistema de Vercel para agentes, 2025–2026">
      {TIMELINE.map((t) => (
        <li key={t.date} className={t.major ? 'is-major' : ''}>
          <span className="stop" />
          <span className="date">{t.date}</span>
          <span className="what">{t.what}</span>
        </li>
      ))}
    </ol>
  )
}
