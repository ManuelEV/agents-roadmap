import { useState } from 'react'
import { Lab, Segmented, Toggle } from '@/components/ui'
import { G_POLICIES, G_SAMPLES, type GPolicyId } from './data'

type Tier = 'standard' | 'classic'

export function GuardrailLab() {
  const [sel, setSel] = useState('inj')
  const [tier, setTier] = useState<Tier>('standard')
  const [on, setOn] = useState<Record<GPolicyId, boolean>>({ content: true, topic: true, word: true, pii: true, ground: true })
  const s = G_SAMPLES.find((x) => x.id === sel)!
  const isTool = s.source === 'TOOL'
  const tierOk = !s.standardOnly || tier === 'standard'
  const hit = !isTool && s.hit && on[s.hit] && tierOk ? s.hit : undefined
  const masked = hit === 'pii'
  const units = Math.max(1, Math.ceil(s.text.length / 1000))
  const active = G_POLICIES.filter((p) => on[p.id])
  const per1k = active.reduce((a, p) => a + (p.price ?? 0), 0) * units

  return (
    <Lab
      title="ApplyGuardrail: un texto, cinco políticas"
      hint="Elige un texto y apaga políticas"
      footer={
        <span className="small muted">
          Respuesta <strong>simulada</strong>. Los campos de primer nivel (<code>action</code>, <code>actionReason</code>, <code>assessments[]</code> con sus claves por
          política, <code>usage</code>) son los de la API; el detalle dentro de cada política está resumido en palabras, no en su estructura real.
        </span>
      }
    >
      <div className="aws-gob-g">
        <div className="aws-gob-g-left">
          <div className="label">Texto a evaluar</div>
          <div className="aws-gob-samples">
            {G_SAMPLES.map((x) => (
              <button key={x.id} className={`aws-gob-sample${x.id === sel ? ' is-active' : ''}`} onClick={() => setSel(x.id)} aria-pressed={x.id === sel}>
                <span className="aws-gob-src" data-src={x.source}>
                  {x.source === 'TOOL' ? 'toolResult' : x.source}
                </span>
                {x.label}
              </button>
            ))}
          </div>
          <div className="label" style={{ marginTop: 14 }}>
            Tier del guardrail
          </div>
          <Segmented
            options={[
              { value: 'standard', label: 'Standard' },
              { value: 'classic', label: 'Classic' },
            ]}
            value={tier}
            onChange={setTier}
          />
          <p className="small muted aws-gob-tier">
            {tier === 'standard'
              ? 'Más robusto y con más idiomas; detecta contenido dañino dentro de código y usa cross-Region inference.'
              : 'Inglés, francés y español. No detecta prompt leakage.'}
          </p>
          <div className="label" style={{ marginTop: 10 }}>
            Políticas configuradas
          </div>
          <div className="aws-gob-gpols">
            {G_POLICIES.map((p) => (
              <div key={p.id} className="aws-gob-gpol" data-on={on[p.id]}>
                <Toggle label={<strong>{p.label}</strong>} checked={on[p.id]} onChange={(v) => setOn((prev) => ({ ...prev, [p.id]: v }))} />
                <span className="small muted">{p.cfg}</span>
                <span className="mono aws-gob-price">{p.price === null ? 'precio no anotado' : `$${p.price.toFixed(2)} / 1.000 text units`}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="aws-gob-g-right">
          <div className="aws-gob-req">
            <div className="aws-gob-req-head">
              <span className="mono">POST /guardrail/{'{guardrailIdentifier}'}/version/1/apply</span>
            </div>
            <div className="aws-gob-kv">
              <span className="k">source</span>
              <span className="v mono">{isTool ? '—' : `"${s.source}"`}</span>
              <span className="k">content[0].text.text</span>
              <span className="v aws-gob-text">{s.text}</span>
            </div>
          </div>

          <div className="aws-gob-res anim-fade" key={`${sel}-${tier}-${JSON.stringify(on)}`} data-state={isTool ? 'blind' : hit ? 'hit' : 'none'}>
            <div className="aws-gob-res-head">
              <span>respuesta</span>
              <span className="aws-gob-action">{isTool ? 'no se evalúa' : hit ? 'GUARDRAIL_INTERVENED' : 'NONE'}</span>
            </div>
            {isTool ? (
              <p className="aws-gob-blind">
                Dentro de una conversación de Converse este texto viaja como <code>toolResult</code>, y el filtro Prompt Attack no lo mira. No hay respuesta que mostrar
                porque no hay evaluación.
              </p>
            ) : (
              <div className="aws-gob-kv">
                <span className="k">action</span>
                <span className="v mono">"{hit ? 'GUARDRAIL_INTERVENED' : 'NONE'}"</span>
                <span className="k">actionReason</span>
                <span className="v muted">{hit ? 'texto con el motivo de la intervención' : 'sin intervención'}</span>
                <span className="k">salidas</span>
                <span className="v aws-gob-text">{hit ? s.output : <span className="muted">(ninguna: usa tu texto original)</span>}</span>
                <span className="k">assessments[0]</span>
                <span className="v">
                  <span className="aws-gob-assess">
                    {active.map((p) => (
                      <span key={p.id} className="aws-gob-assess-row" data-hit={p.id === hit}>
                        <span className="mono">{p.key}</span>
                        <span>{p.id === hit ? s.finding : 'sin hallazgos'}</span>
                      </span>
                    ))}
                    <span className="aws-gob-assess-row">
                      <span className="mono">invocationMetrics</span>
                      <span className="muted">métricas de esta evaluación</span>
                    </span>
                  </span>
                </span>
                <span className="k">usage</span>
                <span className="v muted">
                  {units} text unit por política activa ({s.text.length} caracteres; 1 text unit = hasta 1.000)
                </span>
              </div>
            )}
          </div>

          <div className="aws-gob-g-notes">
            {s.note && <p className="small">{s.note}</p>}
            {!isTool && s.hit && !hit && (
              <p className="small">
                <strong>Pasó.</strong>{' '}
                {!on[s.hit] ? `Con ${G_POLICIES.find((p) => p.id === s.hit)!.label} apagada, ninguna otra política reconoce este texto.` : 'El tier Classic no tiene este detector.'}
              </p>
            )}
            {masked && <p className="small">La acción es GUARDRAIL_INTERVENED aunque nada se bloqueó: intervenir incluye enmascarar.</p>}
            <p className="small muted">
              1.000 evaluaciones como esta ≈ <span className="mono">${per1k.toFixed(2)}</span> si cada política activa factura sus text units (precios vistos el
              15-nov-2026; los regex custom son gratis).
            </p>
          </div>
        </div>
      </div>
    </Lab>
  )
}
