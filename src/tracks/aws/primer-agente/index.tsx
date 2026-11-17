import { useMemo, useState, type ReactNode } from 'react'
import { Check, X } from 'lucide-react'
import { Link } from 'react-router'
import { Callout, KeyIdeas, Lab, Panel, Pill, Section, Segmented, Sources, Tabs, Term, Toggle } from '@/components/ui'
import { Code, linesOf } from '@/components/Code'
import { Terminal, useTerminalPlayer } from '@/components/Terminal'
import { AGENT_CODE, ANATOMY, GROUP_LABEL, HOOK_CODE, LIMITS_CODE, STOP_REASONS, STREAM_CODE, STREAM_KEYS, TERM_RUN, buildFunction, buildSpec, toolInput, type SpecOpts, type StreamKey } from './data'
import { RunLab } from './RunLab'
import { ModelLab } from './ModelLab'
import './lesson.css'

/* ------------------------------------------------------------------------ */
/* Lab 1 · Anatomía de agent.py                                              */
/* ------------------------------------------------------------------------ */
function AnatomyLab() {
  const [sel, setSel] = useState('tool')
  const part = ANATOMY.find((p) => p.id === sel)!
  const hl = useMemo(() => linesOf(AGENT_CODE, ...part.needles), [part])
  return (
    <Lab title="El agente completo: agent.py" hint="Haz clic en cada parte">
      <div className="aws-pa-anatomy">
        <Code code={AGENT_CODE} lang="python" title="agent.py" highlight={hl} dim maxHeight={560} />
        <div className="aws-pa-parts">
          {ANATOMY.map((p) => (
            <button key={p.id} className={`aws-pa-part${p.id === sel ? ' is-active' : ''}`} data-tone={p.tone} onClick={() => setSel(p.id)} aria-pressed={p.id === sel}>
              <span className="k">{p.label}</span>
              {p.id === sel && <span className="d anim-fade">{p.desc}</span>}
            </button>
          ))}
        </div>
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 2 · De la función al tool spec                                        */
/* ------------------------------------------------------------------------ */
function Clue({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className={ok ? 'is-ok' : 'is-bad'}>
      {ok ? <Check size={15} aria-label="sí" /> : <X size={15} aria-label="no" />}
      <span>{children}</span>
    </li>
  )
}

function SpecLab() {
  const [o, setO] = useState<SpecOpts>({ doc: 'full', args: true, hint: 'str' })
  const py = useMemo(() => buildFunction(o), [o])
  const json = useMemo(() => JSON.stringify(buildSpec(o), null, 2), [o])
  return (
    <Lab
      title="Lo que el modelo recibe de tu función"
      hint="Cambia el docstring y el type hint"
      footer={
        <span className="small muted">
          El tool spec se muestra en forma simplificada (nombre, descripción y parámetros como JSON Schema). Que el modelo lee el docstring y los type hints está en la
          documentación de Strands; los nombres exactos de los campos del spec, a confirmar en la documentación.
        </span>
      }
    >
      <div className="aws-pa-ctl">
        <div>
          <span className="label">docstring</span>
          <Segmented
            options={[
              { value: 'full', label: 'dice qué hace y cuándo usarla' },
              { value: 'vague', label: '"Obtiene un pedido."' },
            ]}
            value={o.doc}
            onChange={(doc) => setO({ ...o, doc })}
          />
        </div>
        <div>
          <span className="label">type hint</span>
          <Segmented
            options={[
              { value: 'str', label: 'order_id: str' },
              { value: 'int', label: 'order_id: int' },
            ]}
            value={o.hint}
            onChange={(hint) => setO({ ...o, hint })}
          />
        </div>
        <Toggle label="Sección Args en el docstring" checked={o.args} onChange={(args) => setO({ ...o, args })} />
      </div>
      <div className="grid-2">
        <Code code={py} lang="python" title="lo que tú escribes" highlight={linesOf(py, 'def get_order_status', '"""', 'Úsala', 'order_id (')} />
        <Code code={json} lang="json" title="lo que viaja al modelo en cada llamada" highlight={linesOf(json, '"description"', '"type": "string"', '"type": "integer"')} />
      </div>
      <div className="aws-pa-clues">
        <Panel title="Con ese spec, el modelo…" tone="model">
          <ul className="aws-pa-cluelist">
            <Clue ok={o.doc === 'full'}>
              {o.doc === 'full' ? 'sabe cuándo llamarla: "cuando el usuario pregunte por un pedido concreto".' : 'no sabe cuándo llamarla ni qué devuelve: "Obtiene un pedido" no distingue esta herramienta de otra.'}
            </Clue>
            <Clue ok={o.args}>
              {o.args ? 'sabe qué poner en order_id: tiene una descripción y un ejemplo.' : 've un parámetro order_id sin descripción: tiene que adivinar el formato por el nombre.'}
            </Clue>
            <Clue ok={o.hint === 'str'}>
              {o.hint === 'str' ? 'envía un string, que es lo que tu código espera.' : 'envía un entero, y tu función hace order_id.strip().'}
            </Clue>
          </ul>
        </Panel>
        <Panel title='Para "¿Dónde está mi pedido 4821?" pide' tone="tool" right={<Pill tone={o.hint === 'str' ? 'ok' : 'error'}>{o.hint === 'str' ? 'la función corre' : 'la función falla'}</Pill>}>
          <code className="aws-pa-input">toolUse.input = {toolInput(o)}</code>
          {o.hint === 'int' && <code className="aws-pa-input is-err">AttributeError: 'int' object has no attribute 'strip'</code>}
          <p className="small muted" style={{ margin: '8px 0 0' }}>
            {o.hint === 'int'
              ? 'El type hint es un contrato con el modelo. Si lo cambias, cambia también el cuerpo de la función.'
              : 'El id de pedido es un string aunque parezca número: así no se pierde un cero inicial ni un prefijo.'}
          </p>
        </Panel>
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 5 · Terminal                                                          */
/* ------------------------------------------------------------------------ */
function TerminalLab() {
  const player = useTerminalPlayer(TERM_RUN)
  return (
    <Lab
      title="Instalar, dar credenciales y correr"
      hint="Pulsa ▶"
      footer={<span className="small muted">Terminal simulado: la salida de pip y la respuesta del modelo son de ejemplo. Los comandos y las variables de entorno son reales.</span>}
    >
      <Terminal lines={TERM_RUN} upTo={player.upTo} typed={player.typed} player={player} title="bash · andes-agent/" maxHeight={400} />
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 6 · Claves del stream                                                 */
/* ------------------------------------------------------------------------ */
function StreamLab() {
  const [sel, setSel] = useState('data')
  const k = STREAM_KEYS.find((x) => x.key === sel)!
  const hl = useMemo(() => linesOf(STREAM_CODE, ...(k.needles.length ? k.needles : ['async for event in agent.stream_async'])), [k])
  const groups = Object.keys(GROUP_LABEL) as StreamKey['group'][]
  return (
    <Lab title="stream_async: cada evento es un diccionario plano" hint="Haz clic en una clave">
      <div className="aws-pa-stream">
        <Code code={STREAM_CODE} lang="python" title="stream.py" highlight={hl} dim maxHeight={520} />
        <div className="stack">
          {groups.map((g) => (
            <div key={g} data-tone={GROUP_LABEL[g].tone}>
              <span className="label">{GROUP_LABEL[g].label}</span>
              <div className="aws-pa-keys">
                {STREAM_KEYS.filter((x) => x.group === g).map((x) => (
                  <button key={x.key} className={`aws-pa-key${x.key === sel ? ' is-active' : ''}${x.needles.length ? ' is-used' : ''}`} onClick={() => setSel(x.key)} aria-pressed={x.key === sel}>
                    {x.key}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="aws-pa-keydesc anim-fade" key={sel} data-tone={GROUP_LABEL[k.group].tone}>
            <code>{`if "${k.key}" in event:`}</code>
            <p>{k.desc}</p>
            <span className="small muted">{k.needles.length ? 'stream.py la usa: mira las líneas resaltadas.' : 'stream.py la ignora: el bucle la recibe igual y la deja pasar.'}</span>
          </div>
        </div>
      </div>
    </Lab>
  )
}

export default function Lesson() {
  return (
    <>
      <Section n={1} title="Un archivo, una función, un agente">
        <p>
          <strong>Strands Agents</strong> es el SDK open source de AWS para escribir agentes en Python o TypeScript (la documentación lo llama ahora Strands Harness SDK; el
          paquete sigue siendo <code>strands-agents</code>). Su idea es que el modelo conduce: tú le das un prompt y herramientas, y el SDK corre el{' '}
          <Link to="/fundamentos/loop-agente">ciclo del agente</Link> por ti.
        </p>
        <p>
          Este es Andi completo, con una sola herramienta para consultar pedidos de Andes Market. Son tres piezas: una función decorada con <code>@tool</code>, un{' '}
          <code>BedrockModel</code> y un <code>Agent</code> que las une.
        </p>
        <AnatomyLab />
        <Callout tone="info" title="Si vienes de la sección de Google">
          Strands ocupa el lugar de ADK. Allá la herramienta es una función sin decorador y el agente necesita un Runner; aquí la función lleva <code>@tool</code> y el agente
          se llama directamente. Compara con <Link to="/google/primer-agente">Tu primer agente con ADK</Link>.
        </Callout>
      </Section>

      <Section n={2} title="Lo que el modelo recibe de tu función">
        <p>
          El modelo nunca ve tu código Python. Ve un <Term tip="Descripción de una herramienta que se envía al modelo: su nombre, para qué sirve y qué parámetros acepta.">tool spec</Term>{' '}
          que Strands arma a partir de dos cosas: los type hints de la firma y el docstring. Con eso decide si llama a la herramienta y con qué argumentos.
        </p>
        <p>Cambia la función y mira qué pierde el modelo en cada caso.</p>
        <SpecLab />
      </Section>

      <Section n={3} title="Una invocación por dentro">
        <p>
          Entre que escribes <code>agent("…")</code> y recibes la respuesta, el modelo se llama dos veces y tu función una. La primera llamada termina con{' '}
          <code>stop_reason</code> <code>tool_use</code>: el modelo pide la herramienta. La segunda termina con <code>end_turn</code>: ya tiene el dato y responde.
        </p>
        <p>
          Mientras el modelo siga pidiendo herramientas, el loop sigue. Abajo ves las dos cosas que puedes inspeccionar: el historial que se acumula en{' '}
          <code>agent.messages</code> y los eventos que salen por el stream.
        </p>
        <RunLab />
      </Section>

      <Section n={4} title="Elegir el modelo (y no heredar el default)">
        <p>
          <code>BedrockModel</code> habla con Amazon Bedrock por la API Converse. Necesita dos datos: el <code>model_id</code> y la región. Los Claude 5.x se invocan con un{' '}
          <Term tip="Id con prefijo de alcance (global., us., eu.…) que enruta la petición entre varias regiones.">perfil de inferencia</Term>: el id base con un prefijo delante,
          como <code>global.anthropic.claude-sonnet-5-5</code>.
        </p>
        <p>
          Si no defines alguno de los dos, Strands decide por ti. El catálogo completo de modelos y precios está en <Link to="/aws/mapa">el mapa de AWS</Link>.
        </p>
        <ModelLab />
        <Callout tone="warn" title="No copies el id de modelo de un ejemplo">
          Varios ejemplos de la documentación de AWS todavía usan ids antiguos (Claude 3.5, 3.7 o Sonnet 4.6). Copia la estructura del código y fija tú el{' '}
          <code>model_id</code> y el <code>region_name</code>. También puedes pasar el id como string: <code>Agent(model="global.anthropic.claude-sonnet-5", …)</code>.
        </Callout>
      </Section>

      <Section n={5} title="Correrlo en tu máquina y recibir el stream">
        <p>
          No hace falta desplegar nada: el agente corre en tu proceso de Python y lo único remoto es el modelo. Necesitas Python 3.10 o superior, el paquete{' '}
          <code>strands-agents</code> (versión 1.65.0 al 13-nov-2026) y credenciales de Bedrock. Solo pagas los tokens del modelo.
        </p>
        <TerminalLab />
        <p>
          <code>agent("…")</code> imprime el texto en consola porque trae un callback handler por defecto. Para una API o una interfaz propia quieres los eventos:{' '}
          <code>agent.stream_async(…)</code> te los entrega uno a uno, y <code>callback_handler=None</code> apaga la impresión automática.
        </p>
        <StreamLab />
      </Section>

      <Section n={6} title="Dos perillas que vas a necesitar pronto">
        <p>
          El loop es del SDK, pero no es una caja cerrada. Un <strong>hook</strong> te deja ejecutar código en cada momento que viste en la sección 3, y{' '}
          <code>limits</code> le pone un presupuesto a una invocación para que un agente confundido no gire sin fin.
        </p>
        <Tabs
          tabs={[
            { id: 'hook', label: 'Hook antes de cada herramienta', content: <Code code={HOOK_CODE} lang="python" title="hooks" highlight={linesOf(HOOK_CODE, 'agent.add_hook')} /> },
            {
              id: 'limits',
              label: 'Límites por invocación',
              content: (
                <>
                  <Code code={LIMITS_CODE} lang="python" title="limits" highlight={linesOf(LIMITS_CODE, 'limits=')} />
                  <p className="small muted" style={{ marginTop: 8 }}>
                    Los límites se revisan al inicio de cada vuelta (una vuelta en curso puede pasarse) y valen solo para esa invocación.
                  </p>
                </>
              ),
            },
            {
              id: 'stop',
              label: 'Todos los stop_reason',
              content: (
                <div className="aws-pa-stops">
                  {STOP_REASONS.map((r) => (
                    <Pill key={r} mono tone={r === 'end_turn' ? 'ok' : r === 'tool_use' ? 'tool' : r.startsWith('limit') ? 'guard' : 'system'}>
                      {r}
                    </Pill>
                  ))}
                </div>
              ),
            },
          ]}
        />
        <Callout tone="warn" title="Errores de la primera hora">
          <p>
            <strong>Usar el id base de un Claude 5.x.</strong> En <code>bedrock-runtime</code> no tienen endpoint in-region: usa el perfil, por ejemplo{' '}
            <code>global.anthropic.claude-sonnet-5-5</code>.
          </p>
          <p>
            <strong>Dejar <code>Agent()</code> sin modelo.</strong> Corre con Claude Sonnet 4.6 en <code>us-west-2</code>, no con lo que tenías en mente.
          </p>
          <p>
            <strong>Confiar en que el historial persiste.</strong> <code>agent.messages</code> vive en la memoria del proceso. Para que Andi recuerde entre sesiones necesitas
            lo que viene en <Link to="/aws/herramientas-memoria">Herramientas y memoria</Link>.
          </p>
        </Callout>
        <p>
          Andi ya responde por un pedido desde tu máquina. Lo que sigue en esta sección: conectarle herramientas por MCP y memoria en{' '}
          <Link to="/aws/herramientas-memoria">Herramientas y memoria</Link>, ponerlo en producción en <Link to="/aws/desplegar">Desplegar en AgentCore Runtime</Link> y
          controlar lo que puede hacer en <Link to="/aws/gobernar">Gobernar</Link>.
        </p>
      </Section>

      <KeyIdeas
        items={[
          <>
            Un agente de Strands es <code>Agent(model, system_prompt, tools)</code>; una herramienta es una función Python con <code>@tool</code>, y el modelo solo lee de ella
            los type hints y el docstring.
          </>,
          <>
            Una invocación con herramienta son dos llamadas al modelo: la primera devuelve un bloque <code>toolUse</code> (<code>stop_reason: tool_use</code>), Strands ejecuta
            tu función y guarda el <code>toolResult</code>, y la segunda responde (<code>end_turn</code>).
          </>,
          <>
            Fija siempre <code>BedrockModel(model_id="global.anthropic.claude-sonnet-5-5", region_name="us-east-1")</code>: el default es Claude Sonnet 4.6 en{' '}
            <code>us-west-2</code> y los Claude 5.x necesitan el prefijo del perfil.
          </>,
          <>
            <code>pip install strands-agents</code>, una credencial de Bedrock y <code>python -u agent.py</code> bastan para correrlo; <code>stream_async</code> entrega
            diccionarios con claves como <code>data</code>, <code>current_tool_use</code> y <code>result</code>.
          </>,
        ]}
      />
      <Sources
        items={[
          { label: 'Strands · Quickstart Python (instalación, @tool, credenciales)', href: 'https://strandsagents.com/docs/user-guide/sdk/quickstart/python/' },
          { label: 'Strands · Model providers (BedrockModel, región, default)', href: 'https://strandsagents.com/docs/user-guide/sdk/model-providers/' },
          { label: 'Strands · Agent loop (stop reasons, limits)', href: 'https://strandsagents.com/docs/user-guide/sdk/agents/agent-loop/' },
          { label: 'Strands · Streaming events (claves de los eventos)', href: 'https://strandsagents.com/docs/user-guide/sdk/streaming/events/' },
          { label: 'Strands · Hooks', href: 'https://strandsagents.com/docs/user-guide/sdk/agents/hooks/' },
          { label: 'PyPI · strands-agents 1.65.0', href: 'https://pypi.org/pypi/strands-agents/json' },
          { label: 'Amazon Bedrock · Model cards (ids y perfiles)', href: 'https://docs.aws.amazon.com/bedrock/latest/userguide/model-cards.html' },
          { label: 'Amazon Bedrock · Inference profiles', href: 'https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html' },
          { label: 'AWS Price List · Bedrock foundation models (us-east-1)', href: 'https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonBedrockFoundationModels/current/us-east-1/index.json' },
        ]}
      />
    </>
  )
}
