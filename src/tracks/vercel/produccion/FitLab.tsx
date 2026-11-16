import { useState } from 'react'
import { Lab, Segmented, Slider, type Tone } from '@/components/ui'
import { fmtUsd } from '@/sim/andes'
import { FLUID, PLANS, WAITS, type PlanId } from './data'

/** Trabajo activo: de 5 s a 40 min, en una escala que deja afinar cerca de los límites. */
const ACTIVE = [5, 15, 30, 60, 120, 240, 300, 420, 600, 800, 1200, 1800, 2400]
const SCALE_MAX = 7 * 86400 + 2400
const pos = (s: number) => (s <= 1 ? 0 : (Math.log10(s) / Math.log10(SCALE_MAX)) * 100)

const dur = (s: number) => {
  if (s < 60) return `${s} s`
  if (s < 3600) return `${Math.round(s / 60)} min${s % 60 ? ` ${s % 60} s` : ''}`
  if (s < 86400) return `${+(s / 3600).toFixed(1)} h`
  return `${+(s / 86400).toFixed(1)} días`
}

type Verdict = { tone: Tone; where: string; title: string; body: string; code: string }

export function FitLab() {
  const [plan, setPlan] = useState<PlanId>('hobby')
  const [ai, setAi] = useState(2)
  const [wi, setWi] = useState(4)
  const active = ACTIVE[ai]
  const wait = WAITS[wi].s
  const total = active + wait
  const p = PLANS[plan]

  let v: Verdict
  if (total <= p.def)
    v = {
      tone: 'ok',
      where: 'Vercel Function',
      title: 'Cabe en una función, sin tocar nada',
      body: `${dur(total)} es menos que los ${p.def} s por defecto con Fluid compute. Un ToolLoopAgent en una ruta alcanza.`,
      code: '// sin configuración: 300 s por defecto',
    }
  else if (total <= p.max)
    v = {
      tone: 'ok',
      where: 'Vercel Function',
      title: 'Cabe, si subes maxDuration',
      body: `El plan ${p.label} permite hasta ${p.max} s. La duración incluye la respuesta en streaming, así que deja margen.`,
      code: `export const maxDuration = ${Math.min(p.max, Math.ceil((total * 1.2) / 10) * 10)};`,
    }
  else if (p.ext && total <= p.ext)
    v = {
      tone: 'guard',
      where: 'Función (máximo extendido, beta)',
      title: 'Solo con el máximo extendido',
      body: `Supera los ${p.max} s del plan ${p.label}. El máximo extendido de ${p.ext} s está en beta: para algo que debe funcionar siempre, parte el trabajo en pasos de un workflow.`,
      code: "'use workflow'; // recomendado",
    }
  else
    v = {
      tone: 'model',
      where: 'Vercel Workflows',
      title: wait > 0 ? 'No cabe: necesita un workflow' : 'No cabe: divídelo en pasos de un workflow',
      body:
        wait > 0
          ? `Ninguna función vive ${dur(total)}: al pasar el límite responde 504 FUNCTION_INVOCATION_TIMEOUT. En un workflow la espera es un hook o un sleep y no consume cómputo; solo los ${dur(active)} de trabajo corren en funciones.`
          : `${dur(active)} de trabajo continuo supera el límite de una función. En un workflow el run no tiene límite de duración, pero cada paso sí debe caber en el límite de Functions.`,
      code: wait > 0 ? "await sleep('…'); // o un hook" : "'use step'; // cada paso, bajo el límite",
    }

  const isWorkflow = v.where === 'Vercel Workflows'
  const memCost = (total / 3600) * FLUID.gbHour
  const marks = [
    { s: p.def, label: `${p.def} s`, sub: 'por defecto' },
    ...(p.max > p.def ? [{ s: p.max, label: `${p.max} s`, sub: 'máximo' }] : []),
    ...(p.ext ? [{ s: p.ext, label: `${p.ext} s`, sub: 'extendido (beta)' }] : []),
  ]

  return (
    <Lab title="¿Cabe en una función?" hint="Mueve los controles">
      <div className="vc-prod-fit-ctl">
        <Segmented
          options={(Object.keys(PLANS) as PlanId[]).map((id) => ({ value: id, label: PLANS[id].label }))}
          value={plan}
          onChange={setPlan}
        />
        <Slider label="Trabajo activo" value={ai} min={0} max={ACTIVE.length - 1} onChange={setAi} format={() => dur(active)} />
        <Slider label="Espera externa" value={wi} min={0} max={WAITS.length - 1} onChange={setWi} format={() => WAITS[wi].label} />
      </div>

      <div className="vc-prod-scale" role="img" aria-label={`El agente dura ${dur(total)}; límite del plan ${p.label}: ${p.max} segundos`}>
        <div className="vc-prod-scale-track">
          <div className="vc-prod-scale-limit" style={{ width: `${pos(p.ext ?? p.max)}%` }} />
          <div className="vc-prod-scale-bar is-active" style={{ width: `${pos(active)}%` }} />
          {wait > 0 && <div className="vc-prod-scale-bar is-wait" style={{ left: `${pos(active)}%`, width: `${pos(total) - pos(active)}%` }} />}
          {marks.map((m, i) => (
            <div key={m.s} className="vc-prod-scale-mark" data-row={i} style={{ left: `${pos(m.s)}%` }}>
              <span>
                <b>{m.label}</b> {m.sub}
              </span>
            </div>
          ))}
        </div>
        <div className="vc-prod-scale-axis">
          {[1, 60, 3600, 86400, 7 * 86400].map((t) => (
            <span key={t} style={{ left: `${pos(t)}%` }}>
              {t === 1 ? '1 s' : t === 60 ? '1 min' : t === 3600 ? '1 h' : t === 86400 ? '1 día' : '7 días'}
            </span>
          ))}
        </div>
        <div className="vc-prod-scale-key">
          <span>
            <i className="is-active" /> modelo y herramientas trabajando · {dur(active)}
          </span>
          <span>
            <i className="is-wait" /> esperando una aprobación, un webhook o a mañana · {WAITS[wi].label}
          </span>
          <span>
            <i className="is-limit" /> lo que admite una función en {p.label}
          </span>
          <span className="muted">escala logarítmica</span>
        </div>
      </div>

      <div className="vc-prod-verdict" data-tone={v.tone}>
        <div className="vc-prod-verdict-main">
          <div className="label">Dónde corre</div>
          <div className="vc-prod-verdict-where">{v.where}</div>
          <strong>{v.title}</strong>
          <p>{v.body}</p>
          <code className="vc-prod-verdict-code">{v.code}</code>
        </div>
        <div className="vc-prod-verdict-side">
          <div className="label">Mientras espera</div>
          {isWorkflow ? (
            <>
              <div className="vc-prod-big">US$ 0</div>
              <p>de cómputo: un sleep o un hook suspenden el run sin función corriendo.</p>
            </>
          ) : (
            <>
              <div className="vc-prod-big">{fmtUsd(memCost)}</div>
              <p>
                de memoria por run (ejemplo: 1 GB, <span className="mono">iad1</span>, Pro, {fmtUsd(FLUID.gbHour)} por GB-hora). La Active CPU no corre mientras el
                código espera I/O, pero la memoria se cobra toda la vida de la instancia.
              </p>
            </>
          )}
        </div>
      </div>
    </Lab>
  )
}
