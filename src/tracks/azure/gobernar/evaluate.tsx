import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { Code, linesOf } from '@/components/Code'
import { BarRow, Lab, Panel, Segmented, Toggle } from '@/components/ui'
import { EVALUATORS, EVAL_CODE, EVAL_DATASET, EVAL_PARTS, EVAL_ROWS, REGRESSIONS, SPANS, TRACE_TOTAL, okReason, type EvaluatorId, type Regression } from './data'

/* ------------------------------------------------------------------------ */
/* Lab 4 · Evaluación: una regresión vista por evaluador                     */
/* ------------------------------------------------------------------------ */
export function EvalLab() {
  const [reg, setReg] = useState<Regression>('none')
  const [sel, setSel] = useState<{ row: string; ev: EvaluatorId }>({ row: 'q1', ev: 'toolcall' })
  const diff = REGRESSIONS.find((r) => r.id === reg)!.diff
  const row = EVAL_ROWS.find((r) => r.id === sel.row)!
  const cur = row.runs[reg]
  const fail = cur.fails[sel.ev]
  const ev = EVALUATORS.find((e) => e.id === sel.ev)!
  const passCount = (e: EvaluatorId, r: Regression) => EVAL_ROWS.filter((x) => !x.runs[r].fails[e]).length

  return (
    <Lab
      title="Cinco consultas, cuatro evaluadores, un cambio"
      hint="Introduce una regresión y haz clic en una celda"
      footer={
        <span className="small muted">
          Resultados <strong>simulados</strong>: pasa/falla es una simplificación para ver el patrón; el formato real de puntajes está en el informe de{' '}
          <code>run.report_url</code>. Los nombres de los evaluadores son los de la documentación; solo <code>builtin.task_adherence</code> tiene su ID impreso (los otros
          IDs <code>builtin.*</code> están por confirmar).
        </span>
      }
    >
      <div className="row" style={{ marginBottom: 10 }}>
        <Segmented options={REGRESSIONS.map((r) => ({ value: r.id, label: r.label }))} value={reg} onChange={setReg} />
      </div>
      {diff ? (
        <div className="az-gob-diff anim-fade" key={reg}>
          <span className="label">{diff.where}</span>
          <code className="del">- {diff.del}</code>
          <code className="add">+ {diff.add}</code>
        </div>
      ) : (
        <div className="az-gob-diff is-empty">
          <span className="label">Sin cambios</span>
          <span className="small muted">La versión que pasó a producción. Elige una regresión para ver qué evaluador la detecta.</span>
        </div>
      )}
      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table className="tbl az-gob-evals">
          <thead>
            <tr>
              <th>Consulta (test-queries.jsonl)</th>
              {EVALUATORS.map((e) => (
                <th key={e.id} title={e.note}>
                  {e.name}
                  <span className="grp">{e.group}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EVAL_ROWS.map((r) => (
              <tr key={r.id}>
                <td>{r.query}</td>
                {EVALUATORS.map((e) => {
                  const bad = !!r.runs[reg].fails[e.id]
                  const changed = bad !== !!r.runs.none.fails[e.id]
                  const active = sel.row === r.id && sel.ev === e.id
                  return (
                    <td key={e.id} className="az-gob-evcell">
                      <button
                        className={`az-gob-ev ${bad ? 'is-fail' : 'is-pass'}${active ? ' is-active' : ''}${changed ? ' is-changed' : ''}`}
                        onClick={() => setSel({ row: r.id, ev: e.id })}
                        aria-label={`${r.query} · ${e.name}: ${bad ? 'falla' : 'pasa'}`}
                      >
                        {bad ? <X size={13} /> : <Check size={13} />} {bad ? 'falla' : 'pasa'}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="az-gob-eval-grid">
        <Panel title={`${ev.name} · "${row.query}"`} tone={fail ? 'error' : 'ok'}>
          <p className="small" style={{ margin: '0 0 8px' }}>
            {fail ?? okReason(sel.ev)}
          </p>
          <div className="label" style={{ marginBottom: 4 }}>
            tool calls en sample.output_items
          </div>
          <ol className="az-gob-tools">
            {cur.tools.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
        </Panel>
        <Panel title="Casos que pasan, por evaluador" tone="data">
          {EVALUATORS.map((e) => {
            const n = passCount(e.id, reg)
            return <BarRow key={e.id} label={e.name} value={n} max={EVAL_ROWS.length} display={`${n}/${EVAL_ROWS.length}`} tone={n === EVAL_ROWS.length ? 'ok' : 'error'} />
          })}
        </Panel>
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 4b · El código que lanza la corrida                                   */
/* ------------------------------------------------------------------------ */
export function EvalCodeLab() {
  const [part, setPart] = useState(EVAL_PARTS[3].id)
  const p = EVAL_PARTS.find((x) => x.id === part)!
  return (
    <Lab title="La corrida de evaluación en la nube" hint="Recorre las cinco partes" badge="Código">
      <div className="row" style={{ marginBottom: 10 }}>
        <Segmented options={EVAL_PARTS.map((x) => ({ value: x.id, label: x.label }))} value={part} onChange={setPart} />
      </div>
      <p className="small anim-fade" key={part} style={{ margin: '0 0 10px', color: 'var(--text-2)' }}>
        {p.body}
      </p>
      <div className="az-gob-code-grid">
        <Code code={EVAL_CODE} lang="python" title="evaluate_andi.py · pip install &quot;azure-ai-projects>=2.8.0&quot;" highlight={linesOf(EVAL_CODE, ...p.needles)} dim maxHeight={420} />
        <Code code={EVAL_DATASET} lang="json" title="test-queries.jsonl" lineNumbers={false} />
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 5 · Una invocación vista como traza                                   */
/* ------------------------------------------------------------------------ */
const ROW_H = 30
const LABEL_W = 236
const W = 700

export function TraceLab() {
  const [sel, setSel] = useState('s4')
  const [content, setContent] = useState(false)
  const span = SPANS.find((s) => s.id === sel)!
  const scale = (ms: number) => LABEL_W + (ms / TRACE_TOTAL) * (W - LABEL_W - 56)
  const h = SPANS.length * ROW_H + 26
  return (
    <Lab
      title="«¿Dónde está mi pedido 4821?» como traza"
      hint="Haz clic en un span"
      footer={
        <span className="small muted">
          Tiempos <strong>simulados</strong>. Los nombres de span siguen las convenciones GenAI de OpenTelemetry que emite Agent Framework (<code>invoke_agent</code>,{' '}
          <code>chat</code>, <code>execute_tool</code>), todavía en estado "Development": pueden cambiar.
        </span>
      }
    >
      <div className="az-gob-trace">
        <svg className="az-gob-wf" viewBox={`0 0 ${W} ${h}`} role="img" aria-label="Cascada de spans de una invocación de Andi">
          {[0, 1000, 2000, 3000].map((t) => (
            <g key={t}>
              <line className="grid" x1={scale(t)} x2={scale(t)} y1={18} y2={h} />
              <text className="ms" x={scale(t)} y={11} textAnchor="middle">
                {t / 1000}s
              </text>
            </g>
          ))}
          {SPANS.map((s, i) => {
            const y = 22 + i * ROW_H
            return (
              <g key={s.id} className={s.id === sel ? 'is-active' : 'is-dim'} data-tone={s.tone} onClick={() => setSel(s.id)} style={{ cursor: 'pointer' }}>
                <rect className="hit" x={0} y={y} width={W} height={ROW_H - 4} rx={6} />
                <text className="lbl" x={8 + s.depth * 14} y={y + 17}>
                  {s.name}
                </text>
                <rect className="bar" x={scale(s.start)} y={y + 5} width={Math.max(4, scale(s.end) - scale(s.start))} height={ROW_H - 14} rx={5} />
                <text className="ms" x={scale(s.end) + 6} y={y + 17}>
                  {s.end - s.start} ms
                </text>
              </g>
            )
          })}
        </svg>
        <div className="az-gob-trace-detail">
          <Panel title={span.name} tone={span.tone} right={<span className="mono small">{span.end - span.start} ms</span>}>
            <p className="small" style={{ margin: '0 0 8px' }}>
              {span.what}
            </p>
            <div className="label" style={{ marginBottom: 4 }}>
              {span.contentLabel}
            </div>
            <code className={`az-gob-content${content ? '' : ' is-hidden'}`}>{content ? span.content : 'no capturado'}</code>
          </Panel>
          <div className="stack" style={{ gap: 8 }}>
          <Toggle label={<span className="small">Capturar contenido de mensajes</span>} checked={content} onChange={setContent} />
          <p className="small muted az-gob-wrap" style={{ margin: 0 }}>
            Por defecto la traza guarda estructura y tiempos, no texto. Se activa con <code>OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=true</code> (en Agent
            Framework, <code>ENABLE_SENSITIVE_DATA</code>). Con datos de clientes, piénsalo dos veces: lo que capturas queda en Application Insights.
          </p>
          </div>
        </div>
      </div>
    </Lab>
  )
}
