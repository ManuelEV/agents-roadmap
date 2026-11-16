import { useState } from 'react'
import { BarRow, Lab, Segmented, Slider, Stat } from '@/components/ui'
import { fmtInt } from '@/sim/andes'
import { MODEL_ID, MODEL_PRICE, PRICE_DATE, PRICING, REGION, TOKENS_PER_SESSION, type PlanId } from './data'

const usd = (v: number) => (v >= 100 ? `$${fmtInt(Math.round(v))}` : v >= 1 ? `$${v.toFixed(2)}` : v >= 0.01 ? `$${v.toFixed(3)}` : `$${v.toFixed(6)}`)

export function CostLab() {
  const [plan, setPlan] = useState<PlanId>('v1')
  const [sessions, setSessions] = useState(2000)
  const [secs, setSecs] = useState(45)
  const [vcpu, setVcpu] = useState(1)
  const [gb, setGb] = useState(2)
  const p = PRICING[plan]
  const hours = (sessions * secs * 30) / 3600
  const cpuCost = hours * vcpu * p.vcpu
  const memCost = hours * gb * p.gb
  const runtime = cpuCost + memCost
  const perSession = runtime / (sessions * 30)
  const tokens = sessions * 30 * ((TOKENS_PER_SESSION.input * MODEL_PRICE.input + TOKENS_PER_SESSION.output * MODEL_PRICE.output) / 1e6)
  const max = Math.max(runtime, tokens, 0.01)
  return (
    <Lab
      title="Cuánto cuesta Runtime para tu carga"
      hint="Mueve los controles"
      footer={
        <span className="small muted">
          Precios de AgentCore Runtime en <strong>{REGION}</strong>, vistos el <strong>{PRICE_DATE}</strong> (AWS Price List publicado el 13-nov-2026).
          Estimación propia: se factura por segundo sobre lo que el agente usa activamente, así que el uso real de CPU puede ser menor. No incluye
          Memory, Gateway ni CloudWatch.
        </span>
      }
    >
      <div className="row" style={{ marginBottom: 12 }}>
        <Segmented options={(Object.keys(PRICING) as PlanId[]).map((k) => ({ value: k, label: PRICING[k].label }))} value={plan} onChange={setPlan} />
        <span className="small mono muted">
          ${p.vcpu} / vCPU-h · ${p.gb} / GB-h
        </span>
      </div>
      <div className="aws-dep-cost">
        <div className="stack">
          <Slider label="Sesiones por día" value={sessions} min={100} max={20000} step={100} onChange={setSessions} format={fmtInt} />
          <Slider label="Segundos activos por sesión" value={secs} min={5} max={600} step={5} onChange={setSecs} format={(v) => `${v} s`} />
          <Slider label="vCPU usadas en promedio" value={vcpu} min={0.25} max={8} step={0.25} onChange={setVcpu} format={(v) => `${v} vCPU`} />
          <Slider label="Memoria usada en promedio" value={gb} min={0.5} max={32} step={0.5} onChange={setGb} format={(v) => `${v} GB`} />
          {(vcpu > 2 || gb > 8) && (
            <div className="aws-dep-note">
              Más de 2 vCPU / 8 GB por sesión requiere <em>resource configurations</em>, que solo existen en platform version V2.
            </div>
          )}
        </div>
        <div className="stack">
          <div className="aws-dep-stats">
            <Stat label="Runtime al mes" value={usd(runtime)} tone="system" sub={`${fmtInt(Math.round(hours))} horas activas`} />
            <Stat label="Por sesión" value={usd(perSession)} sub={`${secs} s activos`} />
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <BarRow label="vCPU    " value={cpuCost} max={max} display={usd(cpuCost)} tone="system" />
            <BarRow label="memoria " value={memCost} max={max} display={usd(memCost)} tone="data" />
            <BarRow label="tokens  " value={tokens} max={max} display={usd(tokens)} tone="model" />
          </div>
          <p className="aws-dep-note">
            La barra de <strong>tokens</strong> es la referencia: el modelo se cobra aparte. Supone {fmtInt(TOKENS_PER_SESSION.input)} tokens de entrada
            y {fmtInt(TOKENS_PER_SESSION.output)} de salida por sesión con <code>{MODEL_ID}</code> (${MODEL_PRICE.input.toFixed(2)} / $
            {MODEL_PRICE.output.toFixed(2)} por 1M, {PRICE_DATE}).
          </p>
        </div>
      </div>
    </Lab>
  )
}
