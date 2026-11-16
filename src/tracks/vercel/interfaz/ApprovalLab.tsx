import { useState } from 'react'
import { Check, RotateCcw, Send, ShieldCheck, X } from 'lucide-react'
import { Lab, Segmented, type Tone } from '@/components/ui'
import { CUSTOMER, fmtClp } from '@/sim/andes'
import { LIMIT, REFUND_CASES, refundOutput, type RefundCase } from './data'

type Phase = 'idle' | 'waiting' | 'approved' | 'denied' | 'auto'
type Ev = { where: string; tone: Tone; title: string; text?: string; code?: string; after?: boolean }

function partState(phase: Phase): string {
  if (phase === 'waiting') return 'approval-requested'
  if (phase === 'approved' || phase === 'auto') return 'output-available'
  if (phase === 'denied') return 'output-denied'
  return '—'
}

function buildEvents(c: RefundCase, phase: Phase): Ev[] {
  if (phase === 'idle') return []
  const over = c.id === 'over'
  const out = JSON.stringify(refundOutput(c))
  const evs: Ev[] = [
    {
      where: 'stream',
      tone: 'tool',
      title: 'El modelo pide la tool',
      code: `data: {"type":"tool-input-available","toolCallId":"${c.callId}","toolName":"request_refund","input":${JSON.stringify(c.input)}}`,
    },
    {
      where: 'servidor',
      tone: 'guard',
      title: 'toolApproval.request_refund evalúa el input',
      text: over
        ? 'La función devuelve user-approval: esta llamada necesita a una persona.'
        : 'La función devuelve undefined, que equivale a not-applicable: la llamada corre sin preguntar.',
      code: `${c.input.amount_clp} > ${LIMIT}  →  ${over ? "'user-approval'" : 'undefined'}`,
    },
  ]
  if (!over) {
    evs.push(
      { where: 'servidor → stream', tone: 'data', title: 'execute corre de inmediato', code: `data: {"type":"tool-output-available","toolCallId":"${c.callId}","output":${out}}` },
      { where: 'stream', tone: 'model', title: 'El modelo redacta la respuesta', text: 'Llegan text-start, los text-delta y text-end, como en cualquier turno.' },
    )
    return evs
  }
  evs.push({
    where: 'stream',
    tone: 'guard',
    title: 'El run se detiene en la solicitud',
    text: 'La parte queda en approval-requested con part.approval.id. execute no corrió; el loop termina aquí y el stream se cierra.',
    code: `data: {"type":"tool-approval-request","toolCallId":"${c.callId}","approvalId":"${c.approvalId}"}`,
  })
  if (phase === 'waiting') return evs
  const approved = phase === 'approved'
  evs.push(
    {
      where: 'cliente',
      tone: 'user',
      title: `El supervisor pulsa ${approved ? 'Aprobar' : 'Rechazar'}`,
      text: 'La parte pasa a approval-responded dentro del mismo mensaje del asistente.',
      code: `addToolApprovalResponse({ id: '${c.approvalId}', approved: ${approved} })`,
      after: true,
    },
    {
      where: 'cliente → servidor',
      tone: 'user',
      title: 'Lo que viaja de vuelta',
      text: 'Con sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses, useChat vuelve a hacer POST /api/chat con la conversación. Para el agente la decisión es un mensaje de rol tool (esta es la forma del flujo manual, sin useChat):',
      code: `{ role: 'tool', content: [{ type: 'tool-approval-response', approvalId: '${c.approvalId}', approved: ${approved} }] }`,
      after: true,
    },
    approved
      ? { where: 'servidor → stream', tone: 'data', title: 'Ahora sí: execute corre', text: 'La parte pasa a output-available.', code: `data: {"type":"tool-output-available","toolCallId":"${c.callId}","output":${out}}`, after: true }
      : { where: 'servidor → stream', tone: 'error', title: 'execute nunca corre', text: 'La parte pasa a output-denied. No hay output.', code: `data: {"type":"tool-output-denied","toolCallId":"${c.callId}"}`, after: true },
    { where: 'stream', tone: 'model', title: 'El agente continúa', text: approved ? 'El modelo recibe el resultado y redacta la confirmación.' : 'El modelo se entera del rechazo y se lo explica a Camila.', after: true },
  )
  return evs
}

function answer(c: RefundCase, phase: Phase): string | null {
  const amount = fmtClp(c.input.amount_clp)
  const id = String(refundOutput(c).refund_id)
  if (phase === 'auto') return `Listo: el reembolso de ${amount} por el pedido ${c.input.order_id} quedó registrado como ${id}.`
  if (phase === 'approved') return `Listo, Camila: un supervisor aprobó el reembolso de ${amount} del pedido ${c.input.order_id}. Quedó registrado como ${id}.`
  if (phase === 'denied') return `Un supervisor revisó la solicitud y no aprobó el reembolso de ${amount} del pedido ${c.input.order_id}. Si quieres, te derivo con una persona del equipo.`
  return null
}

export function ApprovalLab() {
  const [caseId, setCaseId] = useState<RefundCase['id']>('over')
  const [phase, setPhase] = useState<Phase>('idle')
  const c = REFUND_CASES.find((x) => x.id === caseId)!
  const evs = buildEvents(c, phase)
  const reply = answer(c, phase)
  const state = partState(phase)
  const pick = (id: RefundCase['id']) => {
    setCaseId(id)
    setPhase('idle')
  }
  return (
    <Lab
      title="Un reembolso sobre el tope: tú eres el supervisor"
      hint="Envía el mensaje y decide"
      footer={
        <span className="small muted">
          Simulación. toolApproval, los estados de la parte, addToolApprovalResponse y los tipos tool-approval-request, tool-output-available y tool-output-denied son
          reales; el orden exacto de los eventos al reanudar puede variar.
        </span>
      }
    >
      <div className="vc-ui-ctl">
        <span className="label">Camila pide</span>
        <Segmented options={REFUND_CASES.map((x) => ({ value: x.id, label: x.label }))} value={caseId} onChange={pick} />
        <span className="small muted">tope automático: {fmtClp(LIMIT)}</span>
      </div>
      <div className="vc-ui-appr">
        <div className="vc-ui-win">
          <div className="vc-ui-win-top">
            <span className="vc-ui-win-title">Consola de soporte · vista del supervisor</span>
            <span className="vc-ui-state mono" data-on={phase !== 'idle'}>
              {state}
            </span>
          </div>
          <div className="vc-ui-win-body">
            <div className="chat">
              {phase === 'idle' ? (
                <div className="vc-ui-empty">
                  <p>
                    {CUSTOMER.name} ({CUSTOMER.id}) está escribiendo:
                  </p>
                  <blockquote>{c.ask}</blockquote>
                  <button className="btn btn-primary btn-sm" onClick={() => setPhase(c.id === 'over' ? 'waiting' : 'auto')}>
                    <Send size={14} /> Enviar el mensaje de Camila
                  </button>
                </div>
              ) : (
                <>
                  <div className="chat-msg is-user">
                    <div className="chat-bubble">{c.ask}</div>
                  </div>
                  <div className="chat-msg vc-ui-wide">
                    <div className="vc-ui-refund anim-in" data-phase={phase}>
                      <div className="vc-ui-refund-head">
                        <ShieldCheck size={15} />
                        <span>request_refund</span>
                        <span className="mono st">{state}</span>
                      </div>
                      <dl className="vc-ui-refund-args">
                        <div>
                          <dt>order_id</dt>
                          <dd>{c.input.order_id}</dd>
                        </div>
                        <div>
                          <dt>amount_clp</dt>
                          <dd>{fmtClp(c.input.amount_clp)}</dd>
                        </div>
                        <div>
                          <dt>reason</dt>
                          <dd>{c.input.reason}</dd>
                        </div>
                      </dl>
                      {phase === 'waiting' && (
                        <div className="vc-ui-refund-actions">
                          <span className="small">Supera el tope de {fmtClp(LIMIT)}. ¿Autorizas?</span>
                          <div className="row" style={{ gap: 8 }}>
                            <button className="btn btn-primary btn-sm" onClick={() => setPhase('approved')}>
                              <Check size={14} /> Aprobar
                            </button>
                            <button className="btn btn-sm" onClick={() => setPhase('denied')}>
                              <X size={14} /> Rechazar
                            </button>
                          </div>
                        </div>
                      )}
                      {phase === 'approved' && <div className="vc-ui-refund-res is-ok">Aprobado por el supervisor · {String(refundOutput(c).refund_id)}</div>}
                      {phase === 'auto' && <div className="vc-ui-refund-res is-ok">Bajo el tope: se ejecutó sin aprobación · {String(refundOutput(c).refund_id)}</div>}
                      {phase === 'denied' && <div className="vc-ui-refund-res is-no">Rechazado por el supervisor · la tool no se ejecutó</div>}
                    </div>
                    {reply && <div className="chat-bubble">{reply}</div>}
                  </div>
                </>
              )}
            </div>
          </div>
          {phase !== 'idle' && (
            <div className="vc-ui-win-foot">
              <button className="btn btn-ghost btn-sm" onClick={() => setPhase('idle')}>
                <RotateCcw size={13} /> Reiniciar
              </button>
            </div>
          )}
        </div>

        <div className="vc-ui-evcol">
          <div className="vc-ui-col-head">
            <span className="label">Lo que pasa por debajo</span>
          </div>
          {evs.length === 0 && <p className="small muted vc-ui-evempty">Envía el mensaje para ver qué decide toolApproval y qué viaja por el stream.</p>}
          <div className="evs">
            {evs.map((e, i) => (
              <div key={`${phase}-${i}`} className={`ev${e.after || phase === 'waiting' || phase === 'auto' ? ' is-new' : ''}`} data-tone={e.tone}>
                <div className="ev-head">
                  {e.title}
                  <span className="ev-tag">{e.where}</span>
                </div>
                {e.text && <div className="ev-text">{e.text}</div>}
                {e.code && (
                  <div className="ev-block">
                    <code className="ev-code">{e.code}</code>
                  </div>
                )}
              </div>
            ))}
          </div>
          {phase === 'waiting' && <p className="small vc-ui-evwait">El agente está detenido. Nada más ocurre hasta que alguien responda la solicitud.</p>}
        </div>
      </div>
    </Lab>
  )
}
