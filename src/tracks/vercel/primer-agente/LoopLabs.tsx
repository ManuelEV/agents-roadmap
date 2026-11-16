import { useMemo, useState } from 'react'
import { Bot, Brain, OctagonX, Route, User, Wrench } from 'lucide-react'
import { Lab, Pill, Slider, Toggle } from '@/components/ui'
import { Code } from '@/components/Code'
import { FlowDiagram, type FlowEdge, type FlowNode } from '@/components/Flow'
import { Narration, PlayerBar } from '@/components/Player'
import { usePlayer } from '@/lib/hooks'
import { CALL_ID, FINAL_TEXT, MULTI_QUESTION, ORDER_OUTPUT, PLAN, QUESTION, RUN_STEPS, STEP_USAGE, simulateLoop } from './data'

/* -------------------------------------------------------------------------- */
/* Lab 3 · una corrida paso a paso                                             */
/* -------------------------------------------------------------------------- */
const NODES: FlowNode[] = [
  { id: 'user', x: 80, y: 150, w: 120, label: 'Camila', sub: 'tu script', tone: 'user', icon: User },
  { id: 'agent', x: 300, y: 150, w: 180, h: 64, label: 'andi', sub: 'ToolLoopAgent', tone: 'model', icon: Bot },
  { id: 'gateway', x: 540, y: 62, w: 170, label: 'AI Gateway', sub: 'ai-gateway.vercel.sh', tone: 'system', icon: Route },
  { id: 'model', x: 780, y: 62, w: 200, label: 'claude-sonnet-5.5', sub: 'anthropic', tone: 'model', icon: Brain },
  { id: 'tool', x: 600, y: 236, w: 200, h: 62, label: 'getOrderStatus', sub: 'execute()', tone: 'tool', icon: Wrench },
]
const EDGES: FlowEdge[] = [
  { from: 'user', to: 'agent' },
  { from: 'agent', to: 'gateway' },
  { from: 'gateway', to: 'model' },
  { from: 'agent', to: 'tool', label: 'inputSchema' },
]

const CALL = { toolCallId: CALL_ID, toolName: 'getOrderStatus', input: { orderId: '4821' } }
const RESULT = { type: 'tool-result', toolCallId: CALL_ID, toolName: 'getOrderStatus', output: ORDER_OUTPUT }

export function RunLab() {
  const player = usePlayer(RUN_STEPS.length, { interval: 3800 })
  const s = RUN_STEPS[player.step]
  const prev = player.step > 0 ? RUN_STEPS[player.step - 1] : undefined
  const new0 = !prev || prev.s0 !== s.s0
  const new1 = !prev || prev.s1 !== s.s1

  return (
    <Lab
      title={`Una corrida por dentro: "${QUESTION}"`}
      hint="Reproduce o haz clic en un paso"
      footer={
        <span className="small muted">
          La respuesta del modelo, el toolCallId y los tokens son simulados. Los campos de cada paso (text, toolCalls, toolResults, finishReason, usage) son los del AI SDK 7.
        </span>
      }
    >
      <PlayerBar player={player} labels={RUN_STEPS.map((x) => x.title)} />
      <div className="vc-pa-flow">
        <FlowDiagram nodes={NODES} edges={EDGES} width={900} height={300} flows={s.flows} dimInactive ariaLabel="Camila, el agente andi, AI Gateway, el modelo y la herramienta getOrderStatus durante una corrida" />
        <span className="vc-pa-loopnote" data-tone={s.loopTone} key={player.step}>
          {s.loop}
        </span>
      </div>
      <Narration steps={RUN_STEPS} step={player.step} />

      <div className="vc-pa-run">
        <div className="vc-pa-col">
          <div className="vc-pa-col-head">
            <code>result.steps</code>
            <Pill mono tone={s.s1 === 2 ? 'ok' : 'system'}>
              length {(s.s0 === 3 ? 1 : 0) + (s.s1 === 2 ? 1 : 0)}
            </Pill>
          </div>
          {s.s0 === 0 ? (
            <div className="vc-pa-empty">[ ] · todavía no hay pasos</div>
          ) : (
            <div className="evs">
              <div className={`ev${new0 ? ' is-hl' : ''}`} data-tone="tool">
                <div className="ev-head">
                  steps[0]
                  {s.s0 >= 2 && <span className="ev-tag">finishReason: 'tool-calls'</span>}
                  <span className="ev-time">{s.s0 >= 2 ? `${STEP_USAGE[0].inputTokens} → ${STEP_USAGE[0].outputTokens} tokens` : 'esperando al modelo…'}</span>
                </div>
                {s.s0 >= 2 && (
                  <>
                    <div className="ev-text vc-pa-kv">
                      <code>text: ''</code>
                    </div>
                    <div className="ev-block anim-fade">
                      <div className="ev-block-label">toolCalls[0]</div>
                      <code className="ev-code">{JSON.stringify(CALL, null, 2)}</code>
                    </div>
                  </>
                )}
                {s.s0 === 3 && (
                  <div className="ev-block anim-fade" data-tone="data">
                    <div className="ev-block-label">toolResults[0]</div>
                    <code className="ev-code">{JSON.stringify(RESULT, null, 2)}</code>
                  </div>
                )}
              </div>
              {s.s1 > 0 && (
                <div className={`ev${new1 ? ' is-hl' : ''} anim-fade`} data-tone="model">
                  <div className="ev-head">
                    steps[1]
                    {s.s1 === 2 && <span className="ev-tag">finishReason: 'stop'</span>}
                    <span className="ev-time">{s.s1 === 2 ? `${STEP_USAGE[1].inputTokens} → ${STEP_USAGE[1].outputTokens} tokens` : 'esperando al modelo…'}</span>
                  </div>
                  {s.s1 === 2 && (
                    <>
                      <div className="ev-text">{FINAL_TEXT}</div>
                      <div className="ev-text vc-pa-kv">
                        <code>toolCalls: [] · toolResults: []</code>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="vc-pa-col">
          <div className="vc-pa-col-head">
            <span>Lo que ve Camila</span>
            {s.answer && (
              <Pill mono tone="ok">
                result.text
              </Pill>
            )}
          </div>
          <div className="chat">
            <div className="chat-msg is-user">
              <div className="chat-bubble">{QUESTION}</div>
            </div>
            <div className="chat-msg">
              <div className="chat-name">Andi</div>
              {s.answer ? (
                <div className="chat-bubble">{FINAL_TEXT}</div>
              ) : (
                <div className="chat-bubble">
                  <span className="chat-typing" aria-label="Andi está trabajando">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
              )}
            </div>
          </div>
          {s.answer && (
            <div className="vc-pa-usage anim-fade">
              <code>result.usage</code>
              <span className="mono tabular">
                {STEP_USAGE[0].inputTokens + STEP_USAGE[1].inputTokens} entrada · {STEP_USAGE[0].outputTokens + STEP_USAGE[1].outputTokens} salida
              </span>
            </div>
          )}
          <p className="small muted" style={{ margin: 0 }}>
            <code>generate()</code> entrega todo al final: mientras el loop corre, Camila solo ve la espera. Mostrarle cada paso en vivo es el tema de la parada siguiente.
          </p>
        </div>
      </div>
    </Lab>
  )
}

/* -------------------------------------------------------------------------- */
/* Lab 4 · dónde se detiene el loop                                            */
/* -------------------------------------------------------------------------- */
const SONNET = { id: 'claude-sonnet-5.5', input: 2, output: 10 }
const HAIKU = { id: 'claude-haiku-5.5', input: 0.1, output: 0.5 }

export function LoopLab() {
  const [limit, setLimit] = useState(2)
  const [stopOnStock, setStopOnStock] = useState(false)
  const [prep, setPrep] = useState(false)
  const r = useMemo(() => simulateLoop(limit, stopOnStock), [limit, stopOnStock])
  const modelOf = (i: number) => (prep && i > 0 ? HAIKU : SONNET)
  const cost = PLAN.slice(0, r.ran).reduce((a, p, i) => a + (p.inTok * modelOf(i).input + p.outTok * modelOf(i).output) / 1_000_000, 0)

  const stopExpr = stopOnStock ? `[isStepCount(${limit}), hasToolCall('getStock')]` : `isStepCount(${limit})`
  const code = [
    'const andi = new ToolLoopAgent({',
    "  model: 'anthropic/claude-sonnet-5.5',",
    '  tools: { getOrderStatus, trackShipment, getStock },',
    `  stopWhen: ${stopExpr},`,
    ...(prep
      ? ['  prepareStep: ({ steps }) =>', '    steps.length === 0', "      ? { activeTools: ['getOrderStatus'] }", "      : { model: 'anthropic/claude-haiku-5.5' },"]
      : []),
    '});',
  ].join('\n')
  const hl = prep ? [4, 5, 6, 7, 8] : [4]

  return (
    <Lab
      title="Dónde se detiene el loop"
      hint="Mueve el límite y prueba las condiciones"
      footer={<span className="small muted">Plan de pasos y tokens simulados; las reglas de stopWhen, sus valores por defecto y prepareStep son las del AI SDK 7. Costos con precios de lista del 15-nov-2026.</span>}
    >
      <div className="vc-pa-q">
        <span className="label">pregunta</span>
        <span>{MULTI_QUESTION}</span>
      </div>
      <div className="vc-pa-loopctl">
        <div className="stack" style={{ gap: 10 }}>
          <Slider label={<code>isStepCount(n)</code>} value={limit} min={1} max={20} onChange={setLimit} format={(v) => `${v} ${v === 1 ? 'paso' : 'pasos'}`} />
          <div className="row" style={{ gap: 6 }}>
            <button className={`btn btn-sm${limit === 1 ? ' btn-primary' : ''}`} onClick={() => setLimit(1)}>
              default de generateText: 1
            </button>
            <button className={`btn btn-sm${limit === 20 ? ' btn-primary' : ''}`} onClick={() => setLimit(20)}>
              default de ToolLoopAgent: 20
            </button>
          </div>
          <Toggle label={<>sumar <code>hasToolCall('getStock')</code></>} checked={stopOnStock} onChange={setStopOnStock} />
          <Toggle label={<>usar <code>prepareStep</code></>} checked={prep} onChange={setPrep} />
        </div>
        <Code code={code} lang="ts" title="andi.ts" highlight={hl} />
      </div>

      <div className="vc-pa-track" role="list" aria-label="Pasos del loop">
        {PLAN.map((p, i) => {
          const ran = i < r.ran
          const isStop = ran && i === r.ran - 1 && r.reason !== 'finished'
          return (
            <div key={i} role="listitem" className={`vc-pa-tstep${ran ? '' : ' is-skipped'}${isStop ? ' is-stop' : ''}`} data-tone={p.tool ? 'tool' : 'model'}>
              <div className="vc-pa-tstep-head">
                <span className="n">paso {i + 1}</span>
                <span className="m">{ran ? modelOf(i).id : 'no corre'}</span>
              </div>
              <div className="vc-pa-tstep-name">{p.tool ? `${p.tool}()` : 'texto final'}</div>
              <code className="vc-pa-tstep-io">{p.tool ? JSON.stringify(p.input) : "finishReason: 'stop'"}</code>
              {prep && i === 0 && <span className="vc-pa-tstep-tag">activeTools: solo getOrderStatus</span>}
              {isStop && (
                <span className="vc-pa-stopmark">
                  <OctagonX size={13} /> {r.reason === 'stepCount' ? `isStepCount(${limit})` : "hasToolCall('getStock')"}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="vc-pa-result">
        <div className="vc-pa-col">
          <div className="vc-pa-col-head">
            <span>Lo que recibes</span>
            <Pill mono tone={r.reason === 'finished' ? 'ok' : 'guard'}>
              {r.reason === 'finished' ? 'el modelo terminó' : 'cortó stopWhen'}
            </Pill>
          </div>
          <div className="cmp">
            <div className="cmp-row">
              <span className="k">result.text</span>
              <span className={r.text ? '' : 'vc-pa-blank'}>{r.text || "'' (string vacío)"}</span>
            </div>
            <div className="cmp-row">
              <span className="k">result.steps.length</span>
              <span className="mono">{r.ran}</span>
            </div>
            <div className="cmp-row">
              <span className="k">finalStep.finishReason</span>
              <span className="mono">'{r.finishReason}'</span>
            </div>
            <div className="cmp-row">
              <span className="k">result.toolResults</span>
              <span className="mono">{r.toolResults} {r.toolResults === 1 ? 'resultado' : 'resultados'}</span>
            </div>
            <div className="cmp-row">
              <span className="k">result.usage</span>
              <span className="mono tabular">
                {r.inTok} entrada · {r.outTok} salida · US$ {cost.toFixed(5)}
              </span>
            </div>
          </div>
        </div>
        <div className="vc-pa-why" data-tone={r.reason === 'finished' ? 'ok' : 'guard'} key={`${r.reason}-${r.ran}-${limit === 20}`}>
          {r.reason === 'finished' ? (
            <>
              <strong>El loop terminó solo.</strong> El paso 4 no tiene tool calls, así que <code>stopWhen</code> no llegó a evaluarse: el límite de {limit} quedó como
              red de seguridad sin usar.
              {limit === 20 && (
                <>
                  {' '}
                  Este es el valor por defecto de <code>ToolLoopAgent</code>; si alguna vez es ese valor por defecto el que corta el loop, el SDK registra un warning.
                </>
              )}
            </>
          ) : r.reason === 'stepCount' ? (
            <>
              <strong>Cortó en el paso {r.ran}, justo después de ejecutar la tool.</strong> El último paso es una tool call, no una respuesta: <code>result.text</code>{' '}
              llega vacío y Camila no recibe nada. Los datos no se pierden (están en <code>result.toolResults</code> y en <code>result.responseMessages</code>), pero
              nadie los redactó.
              {limit === 1 && (
                <>
                  {' '}
                  Esto es exactamente lo que pasa con <code>generateText</code> o <code>streamText</code> si olvidas <code>stopWhen</code>: su valor por defecto es un solo paso.
                </>
              )}
            </>
          ) : (
            <>
              <strong>Cortó al ver la llamada a getStock.</strong> <code>hasToolCall</code> detiene el loop apenas esa tool se ejecuta: sirve cuando el resultado de una
              tool es lo que buscabas y quieres seguir tú en código. Con un arreglo, el loop se detiene con la primera condición que se cumpla.
            </>
          )}
          {prep && (
            <>
              {' '}
              Con <code>prepareStep</code>, el primer paso solo ve <code>getOrderStatus</code> y los siguientes corren en un modelo más barato.
            </>
          )}
        </div>
      </div>
    </Lab>
  )
}
