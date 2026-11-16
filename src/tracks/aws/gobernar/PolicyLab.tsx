import { useMemo, useState } from 'react'
import { Callout, Lab, Slider, Stat, Toggle } from '@/components/ui'
import { Code, linesOf } from '@/components/Code'
import { Terminal, useTerminalPlayer } from '@/components/Terminal'
import { fmtClp } from '@/sim/andes'
import { CALLS, TERM_POLICY, cedarOf, decide, type PolicyState } from './data'

const short = (action: string) => action.split('___')[1]

export function PolicyLab() {
  const [p, setP] = useState<PolicyState>({ read: true, refund: true, limit: 50000, freeze: false })
  const set = (patch: Partial<PolicyState>) => setP((prev) => ({ ...prev, ...patch }))
  const cedar = useMemo(() => cedarOf(p), [p])
  const rows = CALLS.map((c) => ({ c, d: decide(c, p) }))
  const allowed = rows.filter((r) => r.d.allow).length
  const empty = !p.read && !p.refund && !p.freeze
  const term = useTerminalPlayer(TERM_POLICY)
  return (
    <Lab
      title="El policy engine de AndesGateway"
      hint="Enciende políticas y mueve el tope"
      footer={
        <span className="small muted">
          Evaluación <strong>simulada</strong> con las reglas documentadas: en ENFORCE lo que ningún <code>permit</code> cubre queda denegado y un <code>forbid</code> gana
          sobre cualquier <code>permit</code>. Cada autorización cuesta $0.000025 (visto el 15-nov-2026).
        </span>
      }
    >
      <div className="aws-gob-pol">
        <div className="aws-gob-pol-rules">
          <div className="aws-gob-rule" data-on={p.read}>
            <Toggle label={<strong>ReadTools</strong>} checked={p.read} onChange={(v) => set({ read: v })} />
            <span className="small muted">permit para get_order_status, track_shipment y get_stock</span>
          </div>
          <div className="aws-gob-rule" data-on={p.refund}>
            <Toggle label={<strong>RefundLimit</strong>} checked={p.refund} onChange={(v) => set({ refund: v })} />
            <span className="small muted">permit para request_refund, con condición sobre el monto</span>
            {p.refund && <Slider label="amount_clp <=" value={p.limit} min={10000} max={100000} step={10000} onChange={(v) => set({ limit: v })} format={fmtClp} />}
          </div>
          <div className="aws-gob-rule" data-on={p.freeze} data-kind="forbid">
            <Toggle label={<strong>RefundFreeze</strong>} checked={p.freeze} onChange={(v) => set({ freeze: v })} />
            <span className="small muted">forbid para request_refund: congelar reembolsos durante un incidente</span>
          </div>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <Stat label="Permitidas" value={`${allowed}/${CALLS.length}`} tone={allowed ? 'ok' : 'error'} />
            <Stat label="Denegadas" value={CALLS.length - allowed} tone="guard" sub="quedan en CloudWatch" />
          </div>
        </div>
        <div className="aws-gob-pol-out">
          <div className="table-wrap">
            <table className="tbl aws-gob-calls">
              <thead>
                <tr>
                  <th>Tool call que llega al Gateway</th>
                  <th>Decisión</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ c, d }) => (
                  <tr key={c.id}>
                    <td>
                      <span className="mono aws-gob-call">
                        {short(c.action)}({Object.values(c.args).join(', ')})
                      </span>
                      <span className="small muted aws-gob-call-who">{c.who}</span>
                    </td>
                    <td>
                      <span className="aws-gob-dec" data-allow={d.allow} key={`${d.allow}`}>
                        {d.allow ? 'ALLOW' : 'DENY'}
                      </span>
                      <span className="small muted aws-gob-call-who">{d.why}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {empty && (
        <Callout tone="warn" title="ENFORCE sin políticas: todo denegado">
          Es el error más común al estrenar Policy: adjuntas el engine en modo enforce antes de escribir el primer <code>permit</code> y Andi deja de poder
          consultar hasta un pedido.
        </Callout>
      )}
      <div className="aws-gob-pol-code">
        <Code code={cedar.code} lang="text" title="políticas del engine · Cedar" highlight={linesOf(cedar.code, ...cedar.marks)} maxHeight={300} />
        <Terminal lines={TERM_POLICY} upTo={term.upTo} typed={term.typed} player={term} title="bash · crear el engine y la política" maxHeight={300} />
      </div>
    </Lab>
  )
}
