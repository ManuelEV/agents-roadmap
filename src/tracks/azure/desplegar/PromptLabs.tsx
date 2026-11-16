import { useState } from 'react'
import { Check, Minus } from 'lucide-react'
import { Lab, Panel, Pill, Segmented, Toggle } from '@/components/ui'
import { Code, linesOf } from '@/components/Code'
import { BUILTIN_TOOLS, CODE_VERSIONS, MINI_TOOLS, PROMPT_AGENT, PROMPT_MODEL, REQ_BY_PROJECT } from './data'

/* ------------------------------------------------------------------------ */
/* Lab 1 · ¿Prompt agent, hosted agent o Responses API?                      */
/* ------------------------------------------------------------------------ */
type Kind = 'prompt' | 'hosted' | 'responses'
type Need = { id: string; label: string; pushes?: Kind; why: string }

const NEEDS: Need[] = [
  {
    id: 'builtin',
    label: 'Me bastan instrucciones, un modelo y tools integradas (MCP, web search, file search…)',
    pushes: 'prompt',
    why: 'Es la definición de un prompt agent: declarativo, sin código de runtime ni infraestructura.',
  },
  {
    id: 'code',
    label: 'Las tools de Andi son funciones Python propias (@tool) con middleware',
    pushes: 'hosted',
    why: 'En un prompt agent, function calling se ejecuta en tu cliente: el servicio no corre tu Python. Un hosted agent lleva tu código de Agent Framework dentro del contenedor.',
  },
  {
    id: 'hitl',
    label: 'El reembolso sobre $50.000 pasa por un workflow propio con aprobación de un supervisor',
    pushes: 'hosted',
    why: 'El prompt agent solo trae la aprobación de llamadas MCP (require_approval). La lógica de negocio del workflow es código tuyo: hosted agent.',
  },
  {
    id: 'framework',
    label: 'Quiero usar otro framework (LangGraph, OpenAI Agents SDK…) o archivos persistentes por sesión',
    pushes: 'hosted',
    why: 'Los hosted agents aceptan Agent Framework, LangGraph, OpenAI Agents SDK, Anthropic Agent SDK, Copilot SDK o código propio, y cada sesión conserva $HOME y /files.',
  },
  {
    id: 'ephemeral',
    label: 'No quiero ningún recurso de agente en Foundry: la definición vive en mi app',
    pushes: 'responses',
    why: 'Con la Responses API llamas /openai/v1/responses desde tu aplicación ("agente efímero"): no existe recurso de agente; el cómputo y el loop son tuyos.',
  },
  {
    id: 'teams',
    label: 'Después lo voy a publicar en Teams y Microsoft 365 Copilot',
    why: 'Se publica desde un agente del servicio (Publish), así que necesitas un recurso de agente: prompt u hosted, no el efímero.',
  },
  {
    id: 'vnet',
    label: 'Los datos de pedidos están en una red privada',
    why: 'No decide el tipo de agente: decide el setup del proyecto. El standard setup con BYO VNet añade aislamiento de red privada (sección 5).',
  },
]

const KINDS: { id: Kind; name: string; tone: 'model' | 'tool' | 'user'; rows: [string, string][] }[] = [
  {
    id: 'prompt',
    name: 'Prompt agent',
    tone: 'model',
    rows: [
      ['Qué defines', 'Instrucciones, modelo, tools (portal, SDK, REST o azd)'],
      ['Código de runtime', 'Ninguno'],
      ['Cómputo', 'Totalmente gestionado'],
      ['Pagas', 'Inferencia + tools'],
    ],
  },
  {
    id: 'hosted',
    name: 'Hosted agent',
    tone: 'tool',
    rows: [
      ['Qué defines', 'Tu código, como contenedor o .zip'],
      ['Código de runtime', 'Tu lógica de agente'],
      ['Cómputo', 'Sandbox gestionado por sesión'],
      ['Pagas', 'Inferencia + tools + cómputo del contenedor'],
    ],
  },
  {
    id: 'responses',
    name: 'Responses API (efímero)',
    tone: 'user',
    rows: [
      ['Qué defines', 'La definición vive en tu app'],
      ['Código de runtime', 'Tu app'],
      ['Cómputo', 'El tuyo'],
      ['Pagas', 'Inferencia + tools'],
    ],
  },
]

function decide(on: Record<string, boolean>): { pick: Kind; conflict?: string } {
  const hosted = on.code || on.hitl || on.framework
  if (hosted) return { pick: 'hosted', conflict: on.ephemeral ? 'Pediste "sin recurso de agente", pero tu código necesita dónde correr: o lo hospeda Foundry (hosted) o lo hospedas tú y llamas la Responses API.' : undefined }
  if (on.ephemeral && on.teams) return { pick: 'prompt', conflict: 'Un agente efímero no tiene qué publicar. Para llegar a Teams necesitas un recurso de agente: el más simple es un prompt agent.' }
  if (on.ephemeral) return { pick: 'responses' }
  return { pick: 'prompt' }
}

export function DecisionLab() {
  const [on, setOn] = useState<Record<string, boolean>>({ builtin: true })
  const { pick, conflict } = decide(on)
  const active = NEEDS.filter((n) => on[n.id])
  return (
    <Lab title="¿Prompt agent, hosted agent o Responses API?" hint="Activa lo que necesita Andi">
      <div className="az-dep-decide">
        <div className="az-dep-needs">
          {NEEDS.map((n) => (
            <Toggle key={n.id} label={n.label} checked={!!on[n.id]} onChange={(v) => setOn((s) => ({ ...s, [n.id]: v }))} />
          ))}
        </div>
        <div className="stack">
          <div className="az-dep-kinds">
            {KINDS.map((k) => (
              <div key={k.id} className={`az-dep-kind${k.id === pick ? ' is-pick' : ''}`} data-tone={k.tone}>
                <div className="az-dep-kind-head">
                  <span className="az-dep-dot" />
                  <strong>{k.name}</strong>
                  {k.id === pick && <span className="az-dep-reco">recomendado</span>}
                </div>
                <dl>
                  {k.rows.map(([a, b]) => (
                    <div key={a}>
                      <dt>{a}</dt>
                      <dd>{b}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
          <Panel title="Por qué" tone={KINDS.find((k) => k.id === pick)!.tone}>
            {active.length === 0 ? (
              <p className="small muted" style={{ margin: 0 }}>
                Sin requisitos especiales, parte por un prompt agent: no pagas cómputo y lo creas en minutos.
              </p>
            ) : (
              <ul className="az-dep-why">
                {active.map((n) => (
                  <li key={n.id} data-kind={n.pushes ?? 'none'}>
                    <span className="az-dep-why-tag">{n.pushes ? KINDS.find((k) => k.id === n.pushes)!.name : 'no cambia el tipo'}</span>
                    {n.why}
                  </li>
                ))}
              </ul>
            )}
            {conflict && <p className="az-dep-conflict">{conflict}</p>}
          </Panel>
        </div>
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 2 · Versiones de un prompt agent                                      */
/* ------------------------------------------------------------------------ */
type Phase = 'idle' | 'waiting' | 'done'

export function VersionLab() {
  const [count, setCount] = useState(1)
  const [active, setActive] = useState<'1' | '2'>('1')
  const [phase, setPhase] = useState<Phase>('idle')
  const [served, setServed] = useState<'1' | '2'>('1')
  const [last, setLast] = useState<'create1' | 'create2' | 'invoke' | 'approve'>('create1')

  const createV2 = () => {
    setCount(2)
    setLast('create2')
  }
  const invoke = () => {
    setServed(active)
    setPhase(active === '2' ? 'waiting' : 'done')
    setLast('invoke')
  }
  const approve = () => {
    setPhase('done')
    setLast('approve')
  }
  const reset = () => {
    setCount(1)
    setActive('1')
    setPhase('idle')
    setLast('create1')
  }

  const hl =
    last === 'create1'
      ? linesOf(CODE_VERSIONS, 'v1 = project.agents.create_version', `model="${PROMPT_MODEL}",  `, '    instructions=INSTRUCTIONS,')
      : last === 'create2'
        ? linesOf(CODE_VERSIONS, 'carrier = MCPTool(', 'require_approval="always"', 'v2 = project.agents.create_version', 'tools=[carrier]')
        : last === 'invoke'
          ? [...linesOf(CODE_VERSIONS, 'get_openai_client(agent_name', 'conversation = openai.conversations.create()'), ...linesOf(CODE_VERSIONS, 'input="¿Dónde va').flatMap((l) => [l - 2, l - 1, l, l + 1])]
          : linesOf(CODE_VERSIONS, 'mcp_approval_request', 'McpApprovalResponse(type=', 'input=approvals)', 'print(response.output_text)')

  return (
    <Lab
      title="create_version dos veces: qué cambia y qué no"
      hint="Crea v2, elige la versión activa e invoca"
      footer={<span className="small muted">Respuestas del modelo simuladas. Las llamadas del SDK, los tipos de ítem y el cuerpo del request son los de la documentación.</span>}
    >
      <div className="az-dep-ver-bar">
        <button className="btn btn-sm" onClick={createV2} disabled={count === 2}>
          create_version → v2 (+ MCPTool)
        </button>
        <span className="az-dep-ver-active">
          <span className="label">Versión activa del endpoint</span>
          <Segmented
            options={[
              { value: '1', label: 'v1' },
              { value: '2', label: 'v2' },
            ]}
            value={count === 2 ? active : '1'}
            onChange={(v) => {
              if (count === 2) {
                setActive(v)
                setPhase('idle')
              }
            }}
          />
        </span>
        <button className="btn btn-sm btn-primary" onClick={invoke}>
          Invocar por nombre
        </button>
        <button className="btn btn-sm btn-ghost" onClick={reset}>
          Reiniciar
        </button>
      </div>

      <div className="az-dep-ver">
        <div className="stack">
          <div className="az-dep-versions" aria-label="Versiones del agente">
            <VersionCard n="1" live={active === '1' || count === 1} exists tools={[]} />
            <VersionCard n="2" live={count === 2 && active === '2'} exists={count === 2} tools={['MCPTool · andesexpress', 'approval: "always"']} fresh={last === 'create2'} />
          </div>
          <Panel title="Lo que viaja en la invocación" tone="user">
            <Code code={REQ_BY_PROJECT} lang="http" highlight={linesOf(REQ_BY_PROJECT, 'agent_reference', '"name"')} lineNumbers={false} />
            <p className="small muted" style={{ margin: '8px 0 0' }}>
              El request nombra al agente (<code>{PROMPT_AGENT}</code>), no una versión. Tu aplicación no cambia cuando publicas v2.
            </p>
          </Panel>
          <Panel title="response.output" tone="model" right={phase !== 'idle' ? <span className="mono small">respondió v{served}</span> : undefined}>
            {phase === 'idle' && <p className="small muted" style={{ margin: 0 }}>Pulsa "Invocar por nombre": la pregunta es "¿Dónde va el envío AX-88213-CL?".</p>}
            {phase !== 'idle' && served === '1' && (
              <div className="evs">
                <div className="ev is-new" data-tone="model">
                  <div className="ev-head">
                    message <span className="ev-tag">output_text</span>
                  </div>
                  <div className="ev-text">No tengo una herramienta para consultar al transportista. Puedo orientarte con la política de envíos de Andes Market.</div>
                </div>
              </div>
            )}
            {phase !== 'idle' && served === '2' && (
              <div className="evs">
                <div className={`ev${phase === 'waiting' ? ' is-new is-hl' : ''}`} data-tone="guard">
                  <div className="ev-head">
                    mcp_approval_request <span className="ev-tag">item.id</span>
                  </div>
                  <div className="ev-text">El agente quiere llamar a una tool del servidor MCP "andesexpress". Con require_approval="always" el servicio se detiene y te pregunta.</div>
                  {phase === 'waiting' && (
                    <div style={{ marginTop: 8 }}>
                      <button className="btn btn-sm btn-primary" onClick={approve}>
                        Enviar mcp_approval_response (approve=True)
                      </button>
                    </div>
                  )}
                </div>
                {phase === 'done' && (
                  <>
                    <div className="ev is-new" data-tone="user">
                      <div className="ev-head">
                        mcp_approval_response <span className="ev-tag">approval_request_id</span>
                      </div>
                      <div className="ev-text">approve: true · enviado como input de un segundo responses.create en la misma conversación.</div>
                    </div>
                    <div className="ev is-new" data-tone="model">
                      <div className="ev-head">
                        message <span className="ev-tag">output_text</span>
                      </div>
                      <div className="ev-text">El envío AX-88213-CL va en ruta con AndesExpress. Entrega estimada: 14 de noviembre.</div>
                    </div>
                  </>
                )}
              </div>
            )}
          </Panel>
        </div>
        <Code code={CODE_VERSIONS} lang="python" title="prompt_agent.py · azure-ai-projects 2.x" highlight={hl} dim maxHeight={640} />
      </div>
    </Lab>
  )
}

function VersionCard({ n, exists, live, tools, fresh }: { n: string; exists: boolean; live: boolean; tools: string[]; fresh?: boolean }) {
  return (
    <div className={`az-dep-vcard${exists ? '' : ' is-ghost'}${live && exists ? ' is-live' : ''}${fresh ? ' anim-in' : ''}`}>
      <div className="az-dep-vcard-head">
        <span className="mono">
          {PROMPT_AGENT} · v{n}
        </span>
        {exists ? live ? <Pill tone="ok">activa</Pill> : <Pill>inmutable</Pill> : <Pill>aún no existe</Pill>}
      </div>
      <div className="az-dep-vcard-body mono">
        <div>model: {PROMPT_MODEL}</div>
        <div>instructions: "Eres Andi…"</div>
        <div>tools: {tools.length ? '' : '[]'}</div>
        {tools.map((t) => (
          <div key={t} className="az-dep-vtool">
            {t}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 3 · Tools integradas                                                  */
/* ------------------------------------------------------------------------ */
type Filter = 'all' | 'direct' | 'toolbox' | 'mini'

export function ToolsLab() {
  const [f, setF] = useState<Filter>('all')
  const match = (name: string, t: (typeof BUILTIN_TOOLS)[number]) =>
    f === 'all' ? true : f === 'direct' ? t.direct === true : f === 'toolbox' ? t.toolbox : MINI_TOOLS.includes(name)
  const n = BUILTIN_TOOLS.filter((t) => match(t.name, t)).length
  return (
    <Lab title="Las tools integradas del servicio" hint="Filtra" badge="Explora">
      <div className="row" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <Segmented
          options={[
            { value: 'all', label: 'Todas' },
            { value: 'direct', label: 'Directas en el agente' },
            { value: 'toolbox', label: 'En un toolbox' },
            { value: 'mini', label: `Con ${PROMPT_MODEL}` },
          ]}
          value={f}
          onChange={setF}
        />
        <span className="small muted">
          {n} de {BUILTIN_TOOLS.length}
        </span>
      </div>
      <div className="az-dep-tools">
        {BUILTIN_TOOLS.map((t) => (
          <div key={t.name} className={`az-dep-tool${match(t.name, t) ? '' : ' is-off'}`}>
            <div className="az-dep-tool-name">
              {t.name}
              {t.preview && <span className="az-dep-prev">preview</span>}
            </div>
            <div className="az-dep-tool-flags">
              <span className={t.direct ? 'is-yes' : ''}>
                {t.direct ? <Check size={12} /> : <Minus size={12} />} agente
              </span>
              <span className={t.toolbox ? 'is-yes' : ''}>
                {t.toolbox ? <Check size={12} /> : <Minus size={12} />} toolbox
              </span>
            </div>
            {t.note && <div className="az-dep-tool-note">{t.note}</div>}
          </div>
        ))}
      </div>
      <p className="small muted" style={{ margin: '12px 0 0' }}>
        {f === 'mini'
          ? `La tabla de límites del servicio solo lista estas cinco para ${PROMPT_MODEL}, el modelo del quickstart. Function calling no está entre ellas.`
          : 'La documentación solo marca cuáles están en preview; no declara "GA" tool por tool. Un toolbox agrupa tools tras un único endpoint MCP gestionado.'}
      </p>
    </Lab>
  )
}
