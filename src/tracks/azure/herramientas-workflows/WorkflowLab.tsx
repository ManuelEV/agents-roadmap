import { useEffect, useMemo, useRef, useState } from 'react'
import { Banknote, Flag, History, MessageSquare, Search, ShieldAlert, Tags, ThumbsDown, ThumbsUp } from 'lucide-react'
import { Lab, Panel, Pill, Segmented } from '@/components/ui'
import { Code, linesOf } from '@/components/Code'
import { FlowDiagram, type FlowEdge, type FlowNode } from '@/components/Flow'
import { Narration, PlayerBar } from '@/components/Player'
import { usePlayer } from '@/lib/hooks'
import { REQUEST_ID, WF_SCENARIOS, WORKFLOW_CODE, workflowRun, type Decision, type WfEvent, type WfScenario } from './data'

const NODES: FlowNode[] = [
  { id: 'in', x: 66, y: 150, w: 112, label: 'Mensaje', sub: 'str', tone: 'user', icon: MessageSquare },
  { id: 'classify', x: 226, y: 150, w: 150, label: 'classify', sub: '@executor', tone: 'model', icon: Tags },
  { id: 'check_order', x: 420, y: 150, w: 166, label: 'check_order', sub: '@executor', tone: 'tool', icon: Search },
  { id: 'supervisor_gate', x: 640, y: 54, w: 196, label: 'supervisor_gate', sub: 'request_info', tone: 'guard', icon: ShieldAlert },
  { id: 'execute_refund', x: 640, y: 246, w: 196, label: 'execute_refund', sub: '@executor', tone: 'tool', icon: Banknote },
  { id: 'out', x: 846, y: 150, w: 104, label: 'output', sub: 'str', tone: 'ok', icon: Flag },
]
const EDGES: FlowEdge[] = [
  { from: 'in', to: 'classify' },
  { from: 'classify', to: 'check_order' },
  { from: 'check_order', to: 'supervisor_gate', label: '> 50.000', tone: 'guard' },
  { from: 'check_order', to: 'execute_refund', label: '≤ 50.000', tone: 'tool' },
  { from: 'supervisor_gate', to: 'execute_refund', label: 'True', tone: 'tool' },
  { from: 'supervisor_gate', to: 'out', label: 'False', dashed: true, tone: 'error' },
  { from: 'execute_refund', to: 'out', tone: 'ok' },
]

function EventRow({ e, hl, dim, tag }: { e: WfEvent; hl?: boolean; dim?: boolean; tag?: string }) {
  return (
    <div className={`ev az-hw-wfev${hl ? ' is-hl' : ''}${dim ? ' is-dim' : ''}`} data-tone={e.tone}>
      <div className="ev-head">
        {e.type}
        {e.executor_id && <span className="ev-tag">executor_id={e.executor_id}</span>}
        {e.request_id && <span className="ev-tag">request_id={e.request_id}</span>}
        {(tag ?? e.note) && <span className="ev-time">{tag ?? e.note}</span>}
      </div>
      {e.data && <code className="ev-code">data: {e.data}</code>}
    </div>
  )
}

export function WorkflowLab() {
  const [scenario, setScenario] = useState<WfScenario>('approval')
  const [decision, setDecision] = useState<Decision>(null)
  /** checkpoint (n.º de superstep) desde el que se restauró, si se restauró */
  const [resumed, setResumed] = useState<number | null>(null)
  const { steps, events } = useMemo(() => workflowRun(scenario, decision), [scenario, decision])
  const player = usePlayer(steps.length, { interval: 3600 })
  const playerRef = useRef(player)
  playerRef.current = player
  const step = Math.min(player.step, steps.length - 1)
  const s = steps[step]
  const sc = WF_SCENARIOS[scenario]
  const waiting = !!s.pending && decision === null

  const pick = (v: WfScenario) => {
    setScenario(v)
    setDecision(null)
    setResumed(null)
    player.reset()
  }
  // al decidir aparecen pasos nuevos: avanza al que procesa la respuesta
  useEffect(() => {
    if (decision) playerRef.current.goTo(4)
  }, [decision])
  // si el lector retrocede antes del punto restaurado, la marca deja de tener sentido
  useEffect(() => {
    if (resumed !== null && step < resumed) setResumed(null)
  }, [step, resumed])

  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [step, decision, resumed, scenario])

  const checkpoints = steps.slice(0, step + 1).filter((x) => x.superstep !== undefined)
  const resumeFrom = (n: number) => {
    setResumed(n)
    const target = steps.findIndex((x) => x.superstep === n)
    const next = Math.min(target + 1, steps.length - 1)
    player.goTo(steps[target].pending && decision === null ? target : next)
  }

  const shown = events.filter((e) => e.step <= step)
  const before = resumed === null ? [] : shown.filter((e) => e.step <= resumed)
  const after = resumed === null ? shown : shown.filter((e) => e.step > resumed)
  const restoredPending = resumed !== null && steps.find((x) => x.superstep === resumed)?.pending
  const pendingEvent = events.find((e) => e.type === 'request_info')

  return (
    <Lab
      title="Workflow de reembolsos: executors, aristas, eventos y checkpoints"
      hint="Elige un pedido, reproduce y restaura desde un checkpoint"
      footer={
        <span className="small muted">
          Ejecución simulada. Los valores de event.type y los campos executor_id, request_id y data son los reales; el reparto exacto en supersteps y el request_id son ilustrativos. El código está compuesto a partir de varias páginas de la documentación y no se ejecutó.
        </span>
      }
    >
      <div className="row" style={{ marginBottom: 10, justifyContent: 'space-between' }}>
        <Segmented
          options={[
            { value: 'approval', label: WF_SCENARIOS.approval.label },
            { value: 'auto', label: WF_SCENARIOS.auto.label },
          ]}
          value={scenario}
          onChange={pick}
        />
        <Pill tone="user">"{sc.message}"</Pill>
      </div>
      <PlayerBar player={player} labels={steps.map((x) => x.title)} />
      <FlowDiagram nodes={NODES} edges={EDGES} active={s.active} flows={s.flows} dimInactive width={900} height={300} ariaLabel="Grafo del workflow de reembolsos" />

      <div className="az-hw-cps">
        <span className="label">
          <History size={13} /> checkpoints
        </span>
        {checkpoints.length === 0 && <span className="small muted">aún no hay: se guarda uno al cerrar cada superstep</span>}
        {checkpoints.map((c) => {
          const isLast = c.superstep === steps[steps.length - 1].superstep && !c.pending
          return (
            <button
              key={c.superstep}
              className={`az-hw-cp${resumed === c.superstep ? ' is-on' : ''}`}
              disabled={isLast}
              onClick={() => resumeFrom(c.superstep!)}
              title={isLast ? 'El workflow ya terminó' : 'Restaurar desde aquí'}
              aria-label={`Restaurar desde checkpoints[${c.superstep! - 1}]`}
            >
              <span className="mono">checkpoints[{c.superstep! - 1}]</span>
              {c.pending && <span className="az-hw-cp-pend">+ solicitud pendiente</span>}
            </button>
          )
        })}
        {checkpoints.length > 0 && <span className="small muted">clic = restaurar desde ahí</span>}
      </div>

      <div className="az-hw-wf">
        <div className="stack">
          <Narration steps={steps} step={step} />
          {waiting && (
            <div className="az-hw-ask anim-in">
              <div className="t">
                <ShieldAlert size={16} /> request_info · workflow detenido
              </div>
              <div className="h">¿Aprobar el reembolso del pedido {sc.orderId}? El executor espera un bool.</div>
              <div className="meta">pending["{REQUEST_ID}"] = …</div>
              <div className="row">
                <button className="btn btn-primary" onClick={() => setDecision('approved')}>
                  <ThumbsUp size={14} /> Aprobar (True)
                </button>
                <button className="btn" onClick={() => setDecision('rejected')}>
                  <ThumbsDown size={14} /> Rechazar (False)
                </button>
              </div>
            </div>
          )}
          {s.final && (
            <Panel title="event.type == &quot;output&quot;" tone={decision === 'rejected' ? 'error' : 'ok'}>
              <div className="anim-in mono small">{s.final}</div>
            </Panel>
          )}
          <Code code={WORKFLOW_CODE} lang="python" title="andes_ops/refund_workflow.py" highlight={linesOf(WORKFLOW_CODE, ...s.needles)} dim maxHeight={330} />
        </div>

        <div className="stack">
          <div className="label">Stream de WorkflowEvent · event.type</div>
          <div className="evs az-hw-stream" ref={listRef}>
            {before.map((e, i) => (
              <EventRow key={`b${i}`} e={e} dim />
            ))}
            {resumed !== null && (
              <div className="az-hw-restore anim-in">
                <History size={14} />
                <div>
                  <div className="mono">workflow.run(checkpoint_id=checkpoints[{resumed - 1}].checkpoint_id, stream=True)</div>
                  <div className="small">Lo de arriba no se vuelve a ejecutar: el estado sale del checkpoint.</div>
                </div>
              </div>
            )}
            {restoredPending && pendingEvent && decision === null && <EventRow e={pendingEvent} hl tag="reemitido al restaurar" />}
            {after.map((e, i) => (
              <EventRow key={`a${i}`} e={e} hl={e.step === step} />
            ))}
          </div>
        </div>
      </div>
    </Lab>
  )
}
