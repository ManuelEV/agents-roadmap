import { useMemo, useState } from 'react'
import { ArrowRight, Check, X } from 'lucide-react'
import { Lab, Pill, Segmented, Toggle } from '@/components/ui'
import { Code, linesOf } from '@/components/Code'
import { Terminal, useTerminalPlayer } from '@/components/Terminal'
import {
  AGENT_CODE,
  ANATOMY,
  MCP_CODE,
  MCP_PARTS,
  MODELS,
  MODEL_INPUTS,
  PRICE_DATE,
  STEP_USAGE,
  TERM_SETUP,
  toolDefinition,
  toolSource,
  validateInput,
  type SchemaOpts,
} from './data'

/* Lab 1 · anatomía del archivo del agente */
export function AnatomyLab() {
  const [sel, setSel] = useState(ANATOMY[0].id)
  const part = ANATOMY.find((p) => p.id === sel)!
  const hl = useMemo(() => linesOf(AGENT_CODE, ...part.needles), [part])
  return (
    <Lab title="Anatomía de andi.ts" hint="Haz clic en cada parte">
      <div className="vc-pa-anatomy">
        <Code code={AGENT_CODE} lang="ts" title="andi.ts" highlight={hl} dim maxHeight={560} />
        <div className="vc-pa-parts">
          {ANATOMY.map((p) => (
            <button key={p.id} className={`vc-pa-part${p.id === sel ? ' is-active' : ''}`} data-tone={p.tone} onClick={() => setSel(p.id)} aria-pressed={p.id === sel}>
              <span className="k">{p.label}</span>
              {p.id === sel && <span className="d anim-fade">{p.desc}</span>}
            </button>
          ))}
        </div>
      </div>
    </Lab>
  )
}

/* Lab 2 · del esquema Zod a la definición que recibe el modelo */
export function SchemaLab() {
  const [opts, setOpts] = useState<SchemaOpts>({ describe: true, optional: false, strict: false })
  const [inputId, setInputId] = useState(MODEL_INPUTS[0].id)
  const input = MODEL_INPUTS.find((m) => m.id === inputId)!
  const src = useMemo(() => toolSource(opts), [opts])
  const def = useMemo(() => JSON.stringify(toolDefinition(opts), null, 2), [opts])
  const res = useMemo(() => validateInput(opts, input.value), [opts, input])

  const srcHl = linesOf(src, 'orderId: z.', '.describe(')
  const defHl = linesOf(def, '"orderId"', '"type": "string"', '"pattern"', '"description": "Número', '"required"')
  const set = (k: keyof SchemaOpts) => (v: boolean) => setOpts((o) => ({ ...o, [k]: v }))

  return (
    <Lab
      title="Lo que el modelo recibe: de inputSchema a JSON Schema"
      hint="Cambia el esquema y el input"
      footer={
        <span className="small muted">
          La definición está simplificada: cada proveedor la recibe en su propio formato y el SDK hace la traducción. Los mensajes de validación son ilustrativos.
        </span>
      }
    >
      <div className="vc-pa-toggles">
        <Toggle label={<code>.describe('…')</code>} checked={opts.describe} onChange={set('describe')} />
        <Toggle label={<code>.optional()</code>} checked={opts.optional} onChange={set('optional')} />
        <Toggle label={<code>.regex(/^\d{'{4}'}$/)</code>} checked={opts.strict} onChange={set('strict')} />
      </div>
      <div className="grid-2">
        <Code code={src} lang="ts" title="lo que escribes" highlight={srcHl} />
        <Code code={def} lang="json" title="definición de la tool que viaja con cada llamada" highlight={defHl} />
      </div>

      <div className="vc-pa-val">
        <div className="row" style={{ gap: 8 }}>
          <span className="label">input que manda el modelo</span>
          <Segmented options={MODEL_INPUTS.map((m) => ({ value: m.id, label: m.label }))} value={inputId} onChange={setInputId} />
        </div>
        <div className="vc-pa-pipe" key={`${inputId}-${opts.optional}-${opts.strict}`}>
          <div className="vc-pa-stage" data-tone="model">
            <span className="vc-pa-stage-k">tool call</span>
            <code className="vc-pa-stage-v">{input.raw}</code>
          </div>
          <ArrowRight size={16} className="vc-pa-arrow" aria-hidden />
          <div className="vc-pa-stage" data-tone={res.ok ? 'ok' : 'error'}>
            <span className="vc-pa-stage-k">
              {res.ok ? <Check size={13} /> : <X size={13} />} inputSchema
            </span>
            <code className="vc-pa-stage-v">{res.ok ? 'cumple el esquema' : res.issue}</code>
          </div>
          <ArrowRight size={16} className="vc-pa-arrow" aria-hidden />
          <div className={`vc-pa-stage${res.ok ? '' : ' is-off'}`} data-tone="tool">
            <span className="vc-pa-stage-k">execute</span>
            <code className="vc-pa-stage-v">{res.ok ? JSON.stringify(res.output) : 'no se ejecuta'}</code>
          </div>
        </div>
        <p className="vc-pa-val-note">
          {!res.ok ? (
            <>
              El input no cumple el esquema, así que tu función <strong>nunca corre</strong> con un dato mal formado. Qué error exacto produce el SDK y si el modelo
              recibe la oportunidad de corregirse queda a confirmar en la documentación.
            </>
          ) : res.output?.status === 'error' && opts.optional && input.id === 'empty' ? (
            <>
              Con <code>.optional()</code> un input vacío es válido: <code>execute</code> corre con <code>orderId</code> en <code>undefined</code> y el problema pasa a tu
              código. Deja opcional solo lo que de verdad lo es.
            </>
          ) : res.output?.status === 'error' ? (
            <>
              El esquema solo pide un string, así que <code>"pedido 4821"</code> pasa y la búsqueda falla dentro de <code>execute</code>. Activa <code>.regex()</code> para
              cortarlo antes: el patrón también viaja al modelo como pista.
            </>
          ) : (
            <>
              El input cumple el esquema y <code>execute</code> recibe <code>orderId</code> como <code>string</code>, con tipos inferidos del mismo esquema que vio el modelo.
            </>
          )}
        </p>
      </div>
    </Lab>
  )
}

/* Lab 5 · cambiar de modelo es cambiar un string */
const RUN_IN = STEP_USAGE.reduce((a, u) => a + u.inputTokens, 0)
const RUN_OUT = STEP_USAGE.reduce((a, u) => a + u.outputTokens, 0)
const runCost = (m: { input: number; output: number }) => (RUN_IN * m.input + RUN_OUT * m.output) / 1_000_000

export function ModelLab() {
  const [id, setId] = useState(MODELS[0].id)
  const m = MODELS.find((x) => x.id === id)!
  const code = `export const andi = new ToolLoopAgent({\n  model: '${id}',\n  instructions: INSTRUCTIONS,\n  tools: { getOrderStatus },\n});\n`
  const max = Math.max(...MODELS.map(runCost))
  return (
    <Lab title="Cambiar de modelo: una línea" hint="Elige un id" footer={<span className="small muted">Precios de lista en US$ por 1M de tokens según la API de modelos de AI Gateway al {PRICE_DATE}; cambian seguido. Los tokens de la corrida son simulados.</span>}>
      <div className="vc-pa-model">
        <div className="stack" style={{ gap: 6 }}>
          {MODELS.map((x) => (
            <button key={x.id} className={`vc-pa-model-row${x.id === id ? ' is-active' : ''}`} onClick={() => setId(x.id)} aria-pressed={x.id === id}>
              <span className="id">{x.id}</span>
              <span className="price tabular">
                {x.input.toFixed(2)} / {x.output.toFixed(2)}
              </span>
              <span className="bar" aria-hidden>
                <i style={{ transform: `scaleX(${Math.max(0.02, runCost(x) / max)})` }} />
              </span>
            </button>
          ))}
          <div className="small muted">entrada / salida · la barra compara el costo de la misma corrida</div>
        </div>
        <div className="stack">
          <Code code={code} lang="ts" title="andi.ts" highlight={[2]} />
          <div className="vc-pa-model-out" key={id}>
            <div>
              <span className="label">esta corrida ({RUN_IN} tokens de entrada, {RUN_OUT} de salida)</span>
              <div className="mono tabular vc-pa-cost">US$ {runCost(m).toFixed(6)}</div>
            </div>
            <Pill tone="model">{m.role}</Pill>
          </div>
        </div>
      </div>
    </Lab>
  )
}

/* Lab 6 · terminal */
export function TerminalLab() {
  const player = useTerminalPlayer(TERM_SETUP)
  return (
    <Lab title="Del directorio vacío a la primera respuesta" hint="Pulsa ▶" footer={<span className="small muted">Terminal simulado: los comandos y las versiones de ai y zod son reales (npm, 15-nov-2026); la salida está resumida.</span>}>
      <Terminal lines={TERM_SETUP} upTo={player.upTo} typed={player.typed} player={player} title="bash · andi-agent" maxHeight={400} />
    </Lab>
  )
}

/* Lab 7 · servidor MCP como fuente de tools */
export function McpLab() {
  const [sel, setSel] = useState(MCP_PARTS[0].id)
  const part = MCP_PARTS.find((p) => p.id === sel)!
  return (
    <Lab title="Un servidor MCP como fuente de tools" hint="Haz clic en cada parte" footer={<span className="small muted">La URL del servidor es ficticia. El cliente, el transporte y los métodos son los de @ai-sdk/mcp.</span>}>
      <div className="vc-pa-anatomy">
        <Code code={MCP_CODE} lang="ts" title="andi-mcp.ts" highlight={linesOf(MCP_CODE, ...part.needles)} dim maxHeight={520} />
        <div className="vc-pa-parts">
          {MCP_PARTS.map((p) => (
            <button key={p.id} className={`vc-pa-part${p.id === sel ? ' is-active' : ''}`} data-tone="tool" onClick={() => setSel(p.id)} aria-pressed={p.id === sel}>
              <span className="k">{p.label}</span>
              {p.id === sel && <span className="d anim-fade">{p.desc}</span>}
            </button>
          ))}
        </div>
      </div>
    </Lab>
  )
}
