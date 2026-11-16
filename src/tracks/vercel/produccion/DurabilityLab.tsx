import { useEffect, useRef, useState } from 'react'
import { Power, RotateCw } from 'lucide-react'
import { Lab, Panel, Pill, Tabs, type Tone } from '@/components/ui'
import { Code, linesOf } from '@/components/Code'
import { Narration, PlayerBar, type StepInfo } from '@/components/Player'
import { usePlayer } from '@/lib/hooks'
import { fmtClp, fmtUsd } from '@/sim/andes'
import { CODE_PLAIN, CODE_WORKFLOW, HOOK_TOKEN, ORDER_RESULT, REFUND_AMOUNT, REFUND_DONE, REFUND_PENDING, RUN_ID, WORKFLOW_PRICE } from './data'

type Kind = 'run' | 'step' | 'hook' | 'sleep' | 'resume' | 'done'
type Entry = { at: number; kind: Kind; tone: Tone; head: string; time: string; text: string; code?: string }

const j = (v: unknown) => JSON.stringify(v)

const LOG: Entry[] = [
  { at: 0, kind: 'run', tone: 'system', head: 'run creado', time: '13 nov 10:02:11', text: "start(refundWorkflow, ['4821', 'Pedido atrasado'])", code: RUN_ID },
  { at: 1, kind: 'step', tone: 'tool', head: 'getOrderStatus', time: '10:02:11', text: 'Resultado grabado', code: j(ORDER_RESULT) },
  { at: 2, kind: 'step', tone: 'tool', head: 'requestRefund', time: '10:02:12', text: `${fmtClp(REFUND_AMOUNT)} supera el tope automático`, code: j(REFUND_PENDING) },
  { at: 3, kind: 'hook', tone: 'guard', head: 'hook creado', time: '10:02:12', text: 'El run queda suspendido. Ninguna función corriendo.', code: `token: "${HOOK_TOKEN}"` },
  { at: 4, kind: 'resume', tone: 'user', head: 'hook reanudado', time: '13:07:40', text: 'La supervisora aprobó 3 h 5 min después', code: j({ approved: true, supervisor: 'sup_204' }) },
  { at: 5, kind: 'step', tone: 'tool', head: 'issueRefund', time: '13:07:41', text: 'El dinero sale una sola vez', code: j(REFUND_DONE) },
  { at: 6, kind: 'sleep', tone: 'system', head: "sleep('1 day')", time: '13:07:41', text: 'Suspendido hasta el 14 nov 13:07. Ninguna función corriendo.' },
  { at: 7, kind: 'step', tone: 'tool', head: 'notifyCustomer', time: '14 nov 13:07:42', text: 'Aviso enviado a Camila', code: j({ status: 'sent', refund_id: 'rf_20931' }) },
  { at: 7, kind: 'done', tone: 'ok', head: 'run completado', time: '14 nov 13:07:42', text: 'Duración total: 1 día 3 h. Cómputo activo: segundos.' },
]

type DStep = StepInfo & { hl: string[]; plainHl: string[]; plain: { state: 'ok' | 'dead'; text: string }; crash: string }

const STEPS: DStep[] = [
  {
    title: 'Camila pide el reembolso del pedido 4821',
    body: (
      <>
        La ruta llama <code>start(refundWorkflow, [...])</code> y responde de inmediato. El run existe como un log de eventos administrado, no como una request abierta.
      </>
    ),
    hl: ["'use workflow'", 'export async function refundWorkflow'],
    plainHl: ['export async function POST'],
    plain: { state: 'ok', text: 'Request abierta. Memoria: { }' },
    crash: 'Todavía no hay pasos grabados: otra instancia toma el run y empieza la función desde arriba.',
  },
  {
    title: 'Primer paso: consultar el pedido',
    body: (
      <>
        <code>getOrderStatus</code> lleva <code>'use step'</code>: corre, y su resultado queda grabado. Un paso normal genera tres eventos:{' '}
        <code>step_created</code>, <code>step_started</code> y <code>step_completed</code>.
      </>
    ),
    hl: ['getOrderStatus(orderId)'],
    plainHl: ['getOrderStatus(orderId)'],
    plain: { state: 'ok', text: 'Request abierta. Memoria: { order }' },
    crash: 'La instancia nueva reproduce el log: getOrderStatus devuelve su resultado grabado sin volver a llamar a la API de pedidos.',
  },
  {
    title: 'Segundo paso: solicitar el reembolso',
    body: (
      <>
        {fmtClp(REFUND_AMOUNT)} supera el tope de $50.000: la herramienta responde <code>pending</code>. Hace falta una persona.
      </>
    ),
    hl: ['requestRefund(orderId'],
    plainHl: ['requestRefund(orderId'],
    plain: { state: 'ok', text: 'Request abierta. Memoria: { order, request }' },
    crash: 'Dos pasos devuelven su resultado grabado. La solicitud de reembolso no se crea por segunda vez.',
  },
  {
    title: 'Un hook: esperar a la supervisora sin consumir cómputo',
    body: (
      <>
        <code>refundApproval.create({'{ token }'})</code> registra la espera y el workflow se suspende. No hay función corriendo ni memoria reservada: solo una
        entrada en el log.
      </>
    ),
    hl: ['refundApproval.create', 'for await'],
    plainHl: ['waitForSupervisor'],
    plain: { state: 'dead', text: 'La request sigue abierta esperando. A los 300 s: 504 FUNCTION_INVOCATION_TIMEOUT. Memoria perdida.' },
    crash: 'No había instancia que tumbar: el run estaba suspendido. El hook sigue en el log y cualquier instancia lo retoma cuando llegue la respuesta.',
  },
  {
    title: 'La supervisora aprueba, tres horas después',
    body: (
      <>
        Su ruta llama <code>refundApproval.resume('{HOOK_TOKEN}', {'{...}'})</code>. Una instancia nueva ejecuta la función <strong>desde la primera línea</strong>:
        los dos pasos anteriores no corren, devuelven lo grabado, y el código llega al <code>for await</code> con el evento.
      </>
    ),
    hl: ['for await', 'event.approved', 'break;'],
    plainHl: ['waitForSupervisor'],
    plain: { state: 'dead', text: 'La aprobación llega, pero la función murió hace horas. Nadie la recibe.' },
    crash: 'Lo mismo otra vez: replay de los dos pasos grabados y del evento del hook. El resultado es idéntico porque el workflow es determinista.',
  },
  {
    title: 'Ejecutar el reembolso',
    body: (
      <>
        <code>issueRefund</code> es el paso que no puede repetirse. Una vez grabado su <code>step_completed</code>, ningún replay vuelve a mover dinero.
      </>
    ),
    hl: ['issueRefund(orderId, order.total_clp)'],
    plainHl: ['issueRefund(orderId'],
    plain: { state: 'dead', text: 'Sin función. Para llegar aquí, alguien tendría que repetir todo a mano.' },
    crash: 'Tres pasos devuelven lo grabado. issueRefund no se ejecuta de nuevo: Camila recibe un reembolso, no dos.',
  },
  {
    title: "sleep('1 day'): otra espera que no cuesta",
    body: (
      <>
        El banco tarda en abonar. <code>sleep</code> suspende el run igual que el hook; la duración del run y del <code>sleep</code> no tienen límite.
      </>
    ),
    hl: ["sleep('1 day')"],
    plainHl: ['notifyCustomer'],
    plain: { state: 'dead', text: 'Sin función. Un setTimeout de un día no sobrevive a la instancia.' },
    crash: 'Nada que tumbar: el run duerme. Un redeploy tampoco lo pierde; por defecto el run sigue en el despliegue donde nació.',
  },
  {
    title: 'Despierta, avisa y termina',
    body: (
      <>
        Al día siguiente la función se reproduce por última vez: tres pasos devuelven lo grabado, <code>notifyCustomer</code> se ejecuta y el run se completa.
      </>
    ),
    hl: ['notifyCustomer(orderId', 'return refund;'],
    plainHl: ['notifyCustomer'],
    plain: { state: 'dead', text: 'Camila nunca recibió el aviso.' },
    crash: 'El run ya terminó: su resultado está grabado y no hay nada que reanudar.',
  },
]

const REPLAY_STEPS = new Set([4, 7])

export function DurabilityLab() {
  const player = usePlayer(STEPS.length, { interval: 4200 })
  const [crashAt, setCrashAt] = useState<number | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const step = player.step
  const s = STEPS[step]
  const crashed = crashAt === step
  const suspended = step === 3 || step === 6

  const visible = LOG.filter((e) => e.at <= step)
  const stepsDone = visible.filter((e) => e.kind === 'step').length
  const replayPass = crashed || REPLAY_STEPS.has(step)
  const status = (e: Entry): 'run' | 'replay' | 'saved' | null => {
    if (e.kind !== 'step') return null
    if (e.at === step && !crashed) return 'run'
    return replayPass ? 'replay' : 'saved'
  }
  const replayed = visible.filter((e) => status(e) === 'replay').length
  const plainCrashed = crashed && s.plain.state === 'ok'
  const refundCalls = plainCrashed && step >= 2 ? 2 : step >= 2 ? 1 : 0

  // el log sigue al evento más reciente (solo mueve su propio scroll, no el de la página)
  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTo({ top: crashed ? 0 : el.scrollHeight, behavior: 'smooth' })
  }, [step, crashed])

  const toggleCrash = () => {
    player.pause()
    setCrashAt(crashed ? null : step)
  }

  return (
    <Lab title="El reembolso de Camila, como workflow" hint="Reproduce y tumba el servidor en cualquier paso">
      <PlayerBar player={player} labels={STEPS.map((x) => x.title)} />
      <div className="vc-prod-crashbar">
        <button className={`btn btn-sm vc-prod-crashbtn${crashed ? ' is-on' : ''}`} onClick={toggleCrash}>
          {crashed ? <RotateCw size={14} /> : <Power size={14} />}
          {crashed ? 'Quitar la caída' : 'Tumbar el servidor'}
        </button>
        <span className="vc-prod-legend">
          <span className="vc-prod-badge" data-s="run">
            ejecutado ahora
          </span>
          <span className="vc-prod-badge" data-s="replay">
            replay · no se ejecuta
          </span>
          <span className="vc-prod-badge" data-s="saved">
            grabado
          </span>
        </span>
      </div>

      <div className="vc-prod-dur">
        <Tabs
          tabs={[
            {
              id: 'wf',
              label: 'workflows/refund.ts',
              content: <Code code={CODE_WORKFLOW} lang="ts" title="Workflow SDK" highlight={linesOf(CODE_WORKFLOW, ...s.hl)} dim maxHeight={470} />,
            },
            {
              id: 'plain',
              label: 'Sin workflow',
              content: <Code code={CODE_PLAIN} lang="ts" title="Una función normal" highlight={linesOf(CODE_PLAIN, ...s.plainHl)} dim maxHeight={470} />,
            },
          ]}
        />
        <Panel
          title="Log de eventos del run"
          tone="system"
          right={<span className="mono small">{RUN_ID}</span>}
          bodyStyle={{ padding: 0 }}
        >
          <div className="evs vc-prod-log" ref={logRef}>
            {visible.map((e, i) => {
              const st = status(e)
              return (
                <div key={i} className={`ev vc-prod-ev${e.at === step && !crashed ? ' is-hl is-new' : ''}${st === 'replay' ? ' is-replay' : ''}`} data-tone={e.tone}>
                  <div className="ev-head">
                    <span>{e.head}</span>
                    {e.kind === 'step' && <span className="ev-tag">'use step'</span>}
                    {st && (
                      <span className="vc-prod-badge" data-s={st}>
                        {st === 'run' ? 'ejecutado ahora' : st === 'replay' ? 'replay' : 'grabado'}
                      </span>
                    )}
                    <span className="ev-time">{e.time}</span>
                  </div>
                  <div className="ev-text">{e.text}</div>
                  {e.code && <code className="ev-code">{e.code}</code>}
                </div>
              )
            })}
          </div>
        </Panel>
      </div>

      <div className="vc-prod-vs">
        <div className="vc-prod-vscard" data-tone={crashed ? 'ok' : suspended ? 'guard' : 'model'}>
          <div className="vc-prod-vshead">
            <strong>Con workflow</strong>
            <Pill tone={suspended ? 'guard' : 'ok'}>{step === 7 && !crashed ? 'completado' : suspended ? 'suspendido · 0 cómputo' : crashed ? 'reanudado en otra instancia' : 'corriendo'}</Pill>
          </div>
          {crashed ? (
            <p className="anim-fade">{s.crash}</p>
          ) : (
            <p>
              {stepsDone} {stepsDone === 1 ? 'paso grabado' : 'pasos grabados'}
              {replayPass && replayed > 0 ? `; en esta pasada ${replayed} devolvieron su resultado sin ejecutarse` : ''}.
            </p>
          )}
          <div className="vc-prod-meter">
            <span>
              Eventos de pasos: <b className="mono">{stepsDone} × {WORKFLOW_PRICE.eventsPerStep} = {stepsDone * WORKFLOW_PRICE.eventsPerStep}</b>
            </span>
            <span>
              Costo bajo demanda: <b className="mono">{fmtUsd((stepsDone * WORKFLOW_PRICE.eventsPerStep * WORKFLOW_PRICE.perKEvents) / 1000)}</b>
            </span>
            <span>
              Veces que corrió <code>requestRefund</code>: <b className="mono">{step >= 2 ? 1 : 0}</b>
            </span>
          </div>
        </div>
        <div className="vc-prod-vscard" data-tone={s.plain.state === 'dead' || plainCrashed ? 'error' : 'system'}>
          <div className="vc-prod-vshead">
            <strong>La misma lógica en una función</strong>
            <Pill tone={s.plain.state === 'dead' || plainCrashed ? 'error' : 'system'}>{plainCrashed ? 'caída' : s.plain.state === 'dead' ? 'muerta' : 'request abierta'}</Pill>
          </div>
          {plainCrashed ? (
            <p className="anim-fade">
              La instancia se llevó la memoria. Camila reintenta y todo corre desde cero
              {step >= 2 ? ': se crea una segunda solicitud de reembolso, salvo que hayas escrito tu propia idempotencia.' : '.'}
            </p>
          ) : (
            <p>{s.plain.text}</p>
          )}
          <div className="vc-prod-meter">
            <span>
              Veces que corrió <code>requestRefund</code>: <b className="mono">{refundCalls}</b>
            </span>
          </div>
        </div>
      </div>

      <Narration steps={STEPS} step={step} />
    </Lab>
  )
}
