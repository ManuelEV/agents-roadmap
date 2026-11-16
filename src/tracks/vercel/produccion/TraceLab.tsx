import { useState } from 'react'
import { Lab, Panel, Tabs, Toggle, type Tone } from '@/components/ui'
import { Code, linesOf } from '@/components/Code'
import { fmtInt, fmtUsd } from '@/sim/andes'
import { CODE_TELEMETRY, codeTelemetryCall, FUNCTION_ID, MODEL, MODEL_PRICE, ORDER_RESULT } from './data'

type Span = { id: string; name: string; kind: string; tone: Tone; depth: number; start: number; end: number; inTok?: number; outTok?: number; input?: string; output?: string }

const TOTAL = 2140
const SPANS: Span[] = [
  { id: 'root', name: `invoke_agent ${FUNCTION_ID}`, kind: 'span raíz', tone: 'system', depth: 0, start: 0, end: TOTAL, input: '¿Dónde está mi pedido 4821?', output: 'Tu pedido 4821 va en ruta con AndesExpress (AX-88213-CL). Llega el 2026-11-14.' },
  { id: 'm1', name: 'paso 1 · modelo', kind: 'modelo', tone: 'model', depth: 1, start: 0, end: 810, inTok: 1180, outTok: 42, input: 'instrucciones + mensaje del usuario + 4 herramientas', output: 'tool call: get_order_status({"order_id":"4821"})' },
  { id: 't1', name: 'get_order_status', kind: 'herramienta', tone: 'tool', depth: 2, start: 815, end: 960, input: '{"order_id":"4821"}', output: JSON.stringify(ORDER_RESULT) },
  { id: 'm2', name: 'paso 2 · modelo', kind: 'modelo', tone: 'model', depth: 1, start: 965, end: TOTAL, inTok: 1312, outTok: 86, input: 'historial + resultado de la herramienta', output: 'Tu pedido 4821 va en ruta con AndesExpress (AX-88213-CL). Llega el 2026-11-14.' },
]

const cost = (s: Span) => ((s.inTok ?? 0) * MODEL_PRICE.input + (s.outTok ?? 0) * MODEL_PRICE.output) / 1e6

export function TraceLab() {
  const [sel, setSel] = useState('m2')
  const [record, setRecord] = useState(true)
  const s = SPANS.find((x) => x.id === sel) ?? SPANS[0]
  const totalIn = SPANS.reduce((a, x) => a + (x.inTok ?? 0), 0)
  const totalOut = SPANS.reduce((a, x) => a + (x.outTok ?? 0), 0)
  const totalCost = SPANS.reduce((a, x) => a + cost(x), 0)
  const callCode = codeTelemetryCall(record)

  return (
    <Lab
      title="Una traza de Andi"
      hint="Haz clic en un span"
      footer={<span className="small muted">Traza simulada. El span raíz y el atributo gen_ai.usage.input_tokens son los de la documentación; los nombres de los spans hijos se muestran en español a modo descriptivo.</span>}
    >
      <div className="vc-prod-trace-top">
        <span className="mono small">
          {fmtInt(TOTAL)} ms · {fmtInt(totalIn)} tokens de entrada · {fmtInt(totalOut)} de salida · {fmtUsd(totalCost)} con {MODEL}
        </span>
        <Toggle label="Registrar contenido" checked={record} onChange={setRecord} />
      </div>
      <div className="vc-prod-trace">
        <div className="vc-prod-spans" role="list">
          {SPANS.map((x) => (
            <button key={x.id} role="listitem" className={`vc-prod-span${x.id === sel ? ' is-active' : ''}`} data-tone={x.tone} onClick={() => setSel(x.id)} aria-pressed={x.id === sel}>
              <span className="vc-prod-span-name" style={{ paddingLeft: x.depth * 14 }}>
                <i />
                {x.name}
              </span>
              <span className="vc-prod-span-lane">
                <span className="vc-prod-span-bar" style={{ left: `${(x.start / TOTAL) * 100}%`, width: `${Math.max(2, ((x.end - x.start) / TOTAL) * 100)}%` }} />
              </span>
              <span className="vc-prod-span-ms mono">{x.end - x.start} ms</span>
            </button>
          ))}
        </div>
        <Panel title={s.name} tone={s.tone} right={s.kind}>
          <dl className="vc-prod-attrs" key={s.id + String(record)}>
            <dt>duración</dt>
            <dd>{s.end - s.start} ms</dd>
            {s.inTok !== undefined && (
              <>
                <dt>gen_ai.usage.input_tokens</dt>
                <dd>{fmtInt(s.inTok)}</dd>
                <dt>tokens de salida</dt>
                <dd>{fmtInt(s.outTok ?? 0)}</dd>
                <dt>costo estimado</dt>
                <dd>{fmtUsd(cost(s))}</dd>
              </>
            )}
            <dt>entrada</dt>
            <dd className={record ? '' : 'is-hidden'}>{record ? s.input : 'no registrada (recordInputs: false)'}</dd>
            <dt>salida</dt>
            <dd className={record ? '' : 'is-hidden'}>{record ? s.output : 'no registrada (recordOutputs: false)'}</dd>
          </dl>
        </Panel>
      </div>
      <div className="vc-prod-trace-code">
        <Tabs
          tabs={[
            {
              id: 'reg',
              label: 'instrumentation.ts',
              content: <Code code={CODE_TELEMETRY} lang="ts" title="Se registra una vez" highlight={linesOf(CODE_TELEMETRY, 'registerTelemetry(new OpenTelemetry', 'registerOTel({')} />,
            },
            {
              id: 'call',
              label: 'Por llamada',
              content: <Code code={callCode} lang="ts" title="Opciones de telemetry" highlight={linesOf(callCode, 'recordInputs', 'recordOutputs', 'functionId')} />,
            },
          ]}
        />
      </div>
    </Lab>
  )
}
