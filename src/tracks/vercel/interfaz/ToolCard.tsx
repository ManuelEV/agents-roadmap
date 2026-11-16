import { useMemo, useState } from 'react'
import { AlertTriangle, Loader2, Package, Truck } from 'lucide-react'
import { Code, linesOf } from '@/components/Code'
import { Lab, Pill, Segmented } from '@/components/ui'
import { AGENT_DISPLAY } from '@/sim/andes'
import { ANSWER, ERROR_TEXT, ORDER_OUTPUT, ORDER_PART_CODE, PART_STATES, QUESTION, toolPart, type ToolState } from './data'

const TRACK = [
  { id: 'preparando', label: 'Preparando' },
  { id: 'en_ruta', label: 'En ruta' },
  { id: 'entregado', label: 'Entregado' },
]
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const fmtDate = (iso: unknown) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''))
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : '—'
}

/** La tarjeta de seguimiento: lo que tu componente dibuja para una parte tool-get_order_status. */
export function OrderCard({ state, compact }: { state: ToolState; compact?: boolean }) {
  const o = ORDER_OUTPUT as { order_id: string; state: string; items: string[]; total_clp: number; carrier: string; tracking: string; eta: string }
  const at = TRACK.findIndex((t) => t.id === o.state)
  return (
    <div className={`vc-ui-card${compact ? ' is-compact' : ''}`} data-state={state}>
      <div className="vc-ui-card-head">
        <span className="vc-ui-card-ico">{state === 'output-error' ? <AlertTriangle size={15} /> : <Package size={15} />}</span>
        <span className="vc-ui-card-title">{state === 'input-streaming' ? 'Pedido ····' : `Pedido ${o.order_id}`}</span>
        {state === 'output-available' && <span className="vc-ui-card-status">En ruta</span>}
        {(state === 'input-streaming' || state === 'input-available') && <Loader2 size={14} className="vc-ui-spin" />}
      </div>
      {state === 'input-streaming' && (
        <div className="vc-ui-card-body">
          <span className="vc-ui-skel" style={{ width: '70%' }} />
          <span className="vc-ui-skel" style={{ width: '45%' }} />
          <span className="vc-ui-card-note">Andi está preparando la consulta…</span>
        </div>
      )}
      {state === 'input-available' && (
        <div className="vc-ui-card-body">
          <span className="vc-ui-skel" style={{ width: '82%' }} />
          <span className="vc-ui-skel" style={{ width: '58%' }} />
          <span className="vc-ui-card-note">Consultando el pedido {o.order_id}…</span>
        </div>
      )}
      {state === 'output-available' && (
        <div className="vc-ui-card-body anim-fade">
          <div className="vc-ui-card-item">{o.items[0]}</div>
          <div className="vc-ui-track" aria-label={`Estado del pedido: ${TRACK[at]?.label}`}>
            {TRACK.map((t, i) => (
              <span key={t.id} className={`vc-ui-track-stop${i < at ? ' is-done' : ''}${i === at ? ' is-now' : ''}`}>
                <i />
                {t.label}
              </span>
            ))}
          </div>
          <div className="vc-ui-card-meta">
            <span>
              <Truck size={13} /> {o.carrier}
            </span>
            <span className="mono">{o.tracking}</span>
            <span>Llega el {fmtDate(o.eta)}</span>
          </div>
        </div>
      )}
      {state === 'output-error' && (
        <div className="vc-ui-card-body anim-fade">
          <div className="vc-ui-card-err">{ERROR_TEXT}</div>
          <span className="vc-ui-card-note">No pudimos consultar el pedido. Intenta de nuevo en un momento.</span>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab · la misma parte, dos formas de dibujarla                              */
/* ------------------------------------------------------------------------ */
export function PartsLab() {
  const [state, setState] = useState<ToolState>('output-available')
  const [view, setView] = useState<'json' | 'card'>('card')
  const info = PART_STATES.find((p) => p.id === state)!
  const json = useMemo(() => JSON.stringify(toolPart(state), null, 2), [state])
  const hl = useMemo(() => linesOf(ORDER_PART_CODE, ...info.needles), [info])
  return (
    <Lab title="Una parte tool-get_order_status, estado por estado" hint="Cambia el estado y la forma de dibujarla">
      <div className="vc-ui-ctl">
        <span className="label">part.state</span>
        <Segmented options={PART_STATES.map((p) => ({ value: p.id, label: <span className="mono">{p.id}</span> }))} value={state} onChange={setState} />
      </div>
      <div className="vc-ui-parts">
        <div className="stack">
          <Code code={json} lang="json" title="la parte dentro de message.parts" maxHeight={300} />
          <Code code={ORDER_PART_CODE} lang="ts" title="lo que decide tu componente" highlight={hl} dim />
        </div>
        <div className="vc-ui-win">
          <div className="vc-ui-win-top">
            <span className="vc-ui-win-title">{AGENT_DISPLAY}</span>
            <Segmented
              options={[
                { value: 'json', label: 'JSON.stringify(part)' },
                { value: 'card', label: '<OrderCard />' },
              ]}
              value={view}
              onChange={setView}
            />
          </div>
          <div className="vc-ui-win-body">
            <div className="chat">
              <div className="chat-msg is-user">
                <div className="chat-bubble">{QUESTION}</div>
              </div>
              <div className="chat-msg vc-ui-wide">
                {view === 'json' ? <pre className="vc-ui-rawpart">{json}</pre> : <OrderCard state={state} />}
                {state === 'output-available' && <div className="chat-bubble">{ANSWER}</div>}
                {state === 'output-error' && <div className="chat-bubble">No pude consultar tu pedido en este momento. ¿Probamos de nuevo en unos minutos?</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="vc-ui-note anim-fade" key={state} data-tone={state === 'output-error' ? 'error' : 'tool'}>
        <Pill tone={state === 'output-error' ? 'error' : 'tool'} mono>
          {state}
        </Pill>
        <span>{info.note}</span>
      </div>
    </Lab>
  )
}
