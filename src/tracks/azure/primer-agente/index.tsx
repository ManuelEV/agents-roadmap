import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Callout, KeyIdeas, Lab, Pill, Section, Segmented, Sources, Tabs, Term, Toggle } from '@/components/ui'
import { Code, linesOf } from '@/components/Code'
import { Terminal, useTerminalPlayer } from '@/components/Terminal'
import {
  AGENT_CODE,
  ANATOMY,
  CLIENT_ENV,
  CLIENT_EXPLICIT,
  CLIENT_SHORT,
  PACKAGES,
  SCHEMA_DEFAULT,
  SCHEMA_NOTES,
  SESSION_PERSIST_CODE,
  TERM_SETUP,
  buildSchema,
  type SchemaKey,
  type SchemaOpts,
} from './data'
import { RunLab } from './RunLab'
import { SessionLab } from './SessionLab'
import './lesson.css'

/* ------------------------------------------------------------------------ */
/* Lab 1 · Anatomía del archivo                                              */
/* ------------------------------------------------------------------------ */
function AnatomyLab() {
  const [sel, setSel] = useState('client')
  const part = ANATOMY.find((p) => p.id === sel)!
  const hl = useMemo(() => linesOf(AGENT_CODE, ...part.needles), [part])
  return (
    <Lab title="Anatomía de andi.py" hint="Haz clic en cada parte">
      <div className="az-pa-anatomy">
        <Code code={AGENT_CODE} lang="python" title="andi.py" highlight={hl} dim maxHeight={560} />
        <div className="az-pa-parts">
          {ANATOMY.map((p) => (
            <button key={p.id} className={`az-pa-part${p.id === sel ? ' is-active' : ''}`} data-tone={p.tone} onClick={() => setSel(p.id)} aria-pressed={p.id === sel}>
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
/* Lab 2 · Función → definición de la tool                                   */
/* ------------------------------------------------------------------------ */
function SchemaLab() {
  const [o, setO] = useState<SchemaOpts>(SCHEMA_DEFAULT)
  const [last, setLast] = useState<SchemaKey>('doc')
  const { py, json } = useMemo(() => buildSchema(o), [o])
  const note = SCHEMA_NOTES[last]
  const isOn = last === 'hint' ? o.hint === 'int' : o[last]
  const set = <K extends SchemaKey>(k: K, v: SchemaOpts[K]) => {
    setO((p) => ({ ...p, [k]: v }))
    setLast(k)
  }
  const pyHl = linesOf(py, ...note.pyNeedles)
  const jsonHl = note.jsonNeedles.length ? linesOf(json, ...note.jsonNeedles) : []
  return (
    <Lab
      title="Lo que el modelo recibe: de tu función a la definición de la tool"
      hint="Mueve los interruptores"
      footer={
        <span className="small muted">
          Representación esquemática. De dónde sale cada campo (nombre, docstring, type hints, <code>Field</code>) está documentado; el envoltorio exacto que viaja
          al modelo depende del chat client y queda a confirmar en la documentación.
        </span>
      }
    >
      <div className="az-pa-toggles">
        <Toggle label="docstring" checked={o.doc} onChange={(v) => set('doc', v)} />
        <Toggle label="Field(description=…)" checked={o.field} onChange={(v) => set('field', v)} />
        <Toggle label="@tool" checked={o.deco} onChange={(v) => set('deco', v)} />
        <Toggle label="ctx: FunctionInvocationContext" checked={o.ctx} onChange={(v) => set('ctx', v)} />
        <span className="row az-pa-hint">
          <span className="label">type hint</span>
          <Segmented
            options={[
              { value: 'str', label: 'str' },
              { value: 'int', label: 'int' },
            ]}
            value={o.hint}
            onChange={(v) => set('hint', v)}
          />
        </span>
      </div>
      <div className="az-pa-schema">
        <Code code={py} lang="python" title="tu función Python" highlight={pyHl} dim={pyHl.length > 0} />
        <Code code={json} lang="json" title="definición que acompaña cada llamada al modelo" highlight={jsonHl} dim={jsonHl.length > 0} />
      </div>
      <div className="row az-pa-knows">
        <span className="label">el modelo sabe</span>
        <Pill tone={o.doc ? 'ok' : 'error'}>{o.doc ? 'cuándo llamarla' : 'solo el nombre'}</Pill>
        <Pill tone={o.field ? 'ok' : 'error'}>{o.field ? 'qué es order_id' : 'order_id sin explicar'}</Pill>
        <Pill tone="ok" mono>
          tipo: {o.hint === 'str' ? 'string' : 'integer'}
        </Pill>
        <Pill tone="system">{o.ctx ? 'ctx oculto' : 'sin datos ocultos'}</Pill>
      </div>
      <div className="az-pa-verdict anim-fade" data-tone={jsonHl.length || !['doc', 'field'].includes(last) ? 'tool' : 'error'} key={`${last}-${String(isOn)}`}>
        {isOn ? note.on : note.off}
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 5 · Terminal                                                          */
/* ------------------------------------------------------------------------ */
function TerminalLab() {
  const player = useTerminalPlayer(TERM_SETUP)
  return (
    <Lab
      title="De cero a la primera respuesta"
      hint="Pulsa ▶"
      footer={<span className="small muted">Terminal simulado: los comandos son reales; las salidas, la suscripción y el nombre del recurso son de ejemplo.</span>}
    >
      <Terminal lines={TERM_SETUP} upTo={player.upTo} typed={player.typed} player={player} title="bash · andes-agent/" maxHeight={400} />
    </Lab>
  )
}

export default function Lesson() {
  return (
    <>
      <Section n={1} title="Un Agent, un chat client y una función">
        <p>
          Microsoft Agent Framework es el framework open source de Microsoft para agentes (Python y .NET), sucesor de Semantic Kernel y AutoGen. Un agente es
          un objeto <code>Agent</code> con cuatro cosas: un <strong>chat client</strong> que habla con el modelo, un nombre, unas instrucciones y una lista de
          herramientas. Las herramientas son funciones Python normales.
        </p>
        <p>
          Este archivo es Andi completo: responde por un pedido de Andes Market usando un modelo desplegado en tu proyecto de Microsoft Foundry. Qué es Foundry
          y qué modelos hay lo cuenta <Link to="/azure/mapa">el mapa de la línea</Link>; aquí solo necesitas un proyecto con un deployment. Si vienes de
          Google, es el equivalente directo de ADK (<Link to="/google/primer-agente">el mismo agente en ADK</Link>).
        </p>
        <AnatomyLab />
        <Callout tone="warn" title="model es el nombre de tu deployment">
          El error más repetido de la primera hora: escribir en <code>model</code> el id del modelo del catálogo. El parámetro es el nombre que <strong>tú</strong> le
          pusiste al deployment. En los ejemplos oficiales coinciden (<code>gpt-5.4-mini</code>), y por eso se confunden.
        </Callout>
      </Section>

      <Section n={2} title="Lo que el modelo recibe">
        <p>
          El modelo no ve tu Python. Ve una{' '}
          <Term tip="Nombre, descripción y parámetros de una herramienta. Con eso el modelo decide si la llama y con qué argumentos.">definición de tool</Term> que
          Agent Framework arma con tres cosas de tu función: el nombre, el docstring y los type hints. Lo que no esté ahí, para el modelo no existe.
        </p>
        <SchemaLab />
        <p>
          El ciclo general de llamada a herramientas es el mismo en todos los frameworks; si quieres verlo sin SDK, está en{' '}
          <Link to="/fundamentos/herramientas">fundamentos</Link>.
        </p>
      </Section>

      <Section n={3} title="Un run por dentro">
        <p>
          <code>agent.run()</code> parece una sola llamada, pero adentro hay un bucle: modelo, función, modelo otra vez. Con <code>stream=True</code> lo ves
          pasar pieza por pieza: cada iteración del <code>async for</code> entrega un <code>AgentResponseUpdate</code>, y lo que trae se distingue por{' '}
          <code>content.type</code>.
        </p>
        <RunLab />
        <Callout tone="info" title="Más tipos de Content">
          Además de <code>"text"</code>, <code>"function_call"</code> y <code>"function_result"</code> existen, entre otros, <code>"text_reasoning"</code>,{' '}
          <code>"usage"</code>, <code>"error"</code> y <code>"function_approval_request"</code>. Este último aparece cuando una tool exige aprobación: lo
          trabaja la parada <Link to="/azure/herramientas-workflows">herramientas y workflows</Link>, junto con MCP. Si puedes cortar el stream antes de
          tiempo, envuélvelo en <code>async with stream:</code> para cerrar también el stream del proveedor.
        </Callout>
      </Section>

      <Section n={4} title="Sesiones: la conversación entre runs">
        <p>
          Cada <code>agent.run()</code> empieza de cero salvo que le pases una sesión. <code>agent.create_session()</code> devuelve un{' '}
          <code>AgentSession</code>; si lo entregas en cada run, el agente continúa la misma conversación. La diferencia se nota en la primera pregunta de
          seguimiento.
        </p>
        <SessionLab />
        <p>
          Un <code>AgentSession</code> tiene <code>session_id</code>, <code>service_session_id</code> y <code>state</code>, un diccionario compartido con los
          context providers. Se serializa para guardarlo entre procesos:
        </p>
        <Code code={SESSION_PERSIST_CODE} lang="python" title="persistir y retomar una sesión" />
        <Callout tone="danger" title="No aceptes IDs del servicio desde el cliente">
          En una app con varios usuarios, un <code>service_session_id</code> (o un <code>previous_response_id</code> / <code>conversation_id</code>) que llega del
          navegador es una entrada sin verificar. Comprueba que el usuario autenticado es dueño de esa conversación antes de retomarla; si no, Camila podría
          leer el pedido de otra persona.
        </Callout>
      </Section>

      <Section n={5} title="Instalar, iniciar sesión y correr">
        <p>
          En local no hay API key: <code>az login</code> abre tu sesión y <code>AzureCliCredential()</code> la usa. Lo único que el código necesita saber es a
          qué proyecto ir (el endpoint) y qué deployment usar.
        </p>
        <TerminalLab />
        <p>
          El endpoint y el deployment pueden ir escritos en el código o salir del entorno. Agent Framework usa los nombres{' '}
          <code>FOUNDRY_PROJECT_ENDPOINT</code> y <code>FOUNDRY_MODEL</code>; otras herramientas de Foundry usan nombres distintos, así que decláralos tú.
        </p>
        <Lab title="Tres formas de crear el mismo agente" hint="Cambia de pestaña" badge="Código">
          <Tabs
            tabs={[
              { id: 'explicit', label: 'Explícito', content: <Code code={CLIENT_EXPLICIT} lang="python" title="todo en el código" highlight={linesOf(CLIENT_EXPLICIT, 'project_endpoint=', 'model=')} /> },
              { id: 'env', label: 'Desde el entorno', content: <Code code={CLIENT_ENV} lang="python" title="FOUNDRY_PROJECT_ENDPOINT + FOUNDRY_MODEL" highlight={linesOf(CLIENT_ENV, 'load_dotenv()', 'client=FoundryChatClient')} /> },
              { id: 'short', label: 'Atajo y límites', content: <Code code={CLIENT_SHORT} lang="python" title="client.as_agent() y límites del bucle" highlight={linesOf(CLIENT_SHORT, 'client.as_agent', 'max_iterations')} /> },
            ]}
          />
        </Lab>
        <Callout tone="warn" title="Tres tropiezos de la primera hora">
          <p>
            <strong>Olvidar <code>load_dotenv()</code>.</strong> Agent Framework no carga archivos <code>.env</code> por su cuenta: sin esa línea, las variables no
            existen y el cliente no sabe a qué proyecto ir.
          </p>
          <p>
            <strong>Python 3.10.</strong> Desde la versión python-1.25.0 el paquete exige Python 3.11 o superior.
          </p>
          <p>
            <strong>Dejar <code>approval_mode="never_require"</code> al pasar a producción.</strong> Sirve para una consulta de solo lectura como esta. Una tool que
            mueve dinero, como <code>request_refund</code>, pide otra cosa.
          </p>
        </Callout>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Si quieres…</th>
                <th>Usa</th>
              </tr>
            </thead>
            <tbody>
              <tr className="is-hl">
                <td>Un modelo desplegado en tu proyecto de Foundry</td>
                <td>
                  <code>FoundryChatClient</code> (<code>agent_framework.foundry</code>)
                </td>
              </tr>
              <tr>
                <td>Probar sin Azure, contra la API de OpenAI</td>
                <td>
                  <code>OpenAIChatClient</code> u <code>OpenAIChatCompletionClient</code> (<code>agent_framework.openai</code>)
                </td>
              </tr>
              <tr>
                <td>Cambiar temperatura o tokens en un run</td>
                <td>
                  <code>{'agent.run(..., options={"temperature": 0.3, "max_tokens": 150})'}</code>
                </td>
              </tr>
              <tr>
                <td>Cambiar tools o instrucciones en un run</td>
                <td>
                  argumentos directos <code>tools=</code> e <code>instructions=</code>, no dentro de <code>options</code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section n={6} title="Fija la versión">
        <p>
          Agent Framework llegó a 1.0 (GA) el 3 de abril de 2026 y desde entonces publica una versión por semana, aproximadamente, con cambios que rompen
          código con frecuencia: en 1.23 desapareció <code>MCPWebsocketTool</code> y en 1.25 se dejó de soportar Python 3.10. El paquete{' '}
          <code>agent-framework</code> agrupa varios paquetes con numeración propia, y no todos son estables.
        </p>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Paquete Python</th>
                <th>Versión</th>
                <th>Estado</th>
                <th>Para qué</th>
              </tr>
            </thead>
            <tbody>
              {PACKAGES.map((p) => (
                <tr key={p.name} className={p.name === 'agent-framework-core' || p.name === 'agent-framework-foundry' ? 'is-hl' : ''}>
                  <td>
                    <code>{p.name}</code>
                  </td>
                  <td className="mono">{p.version}</td>
                  <td>
                    <Pill tone={p.stable ? 'ok' : 'guard'}>{p.stable ? 'Estable' : 'Beta'}</Pill>
                  </td>
                  <td>{p.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted">Versiones publicadas en PyPI al 15 de noviembre de 2026 (agent-framework 1.26.0 es del 12 de noviembre). Resaltados: los dos paquetes que usa esta lección.</p>
        <Callout tone="tip" title="Una línea en requirements.txt">
          Escribe <code>agent-framework==1.26.0</code>, no <code>agent-framework</code> a secas. Sube de versión a propósito, leyendo las notas del release, y no
          porque un <code>pip install</code> de la semana siguiente trajo otra cosa.
        </Callout>
        <p>
          Andi ya responde desde tu máquina. Lo siguiente es darle más herramientas, MCP y aprobaciones en{' '}
          <Link to="/azure/herramientas-workflows">herramientas y workflows</Link>, llevarlo a Foundry Agent Service en <Link to="/azure/desplegar">desplegar</Link>{' '}
          y ponerle identidad y guardrails en <Link to="/azure/gobernar">gobernar</Link>.
        </p>
      </Section>

      <KeyIdeas
        items={[
          <>
            <code>Agent(client, name, instructions, tools)</code>: el chat client (<code>FoundryChatClient</code>) es el puente con el modelo, y <code>model</code> es
            el nombre de tu deployment.
          </>,
          <>
            Una function tool es una función Python: el nombre, el docstring y los type hints (más <code>Field(description=…)</code>) forman la definición que el
            modelo lee. <code>@tool</code> es opcional y agrega <code>approval_mode</code>.
          </>,
          <>
            Un run con herramienta son dos llamadas al modelo. Con <code>stream=True</code> recibes <code>AgentResponseUpdate</code> cuyo contenido se distingue por{' '}
            <code>content.type</code>: <code>function_call</code>, <code>function_result</code>, <code>text</code>.
          </>,
          <>
            Sin <code>session=</code> cada run empieza de cero. <code>agent.create_session()</code> mantiene la conversación y <code>to_dict()</code> la persiste.
          </>,
          <>
            En local la autenticación es <code>az login</code> + <code>AzureCliCredential()</code> y el endpoint del proyecto; no hay API key ni carga automática de{' '}
            <code>.env</code>.
          </>,
          <>
            Hay release semanal con cambios que rompen: fija <code>agent-framework==1.26.0</code> y usa Python 3.11 o superior.
          </>,
        ]}
      />
      <Sources
        items={[
          { label: 'Agent Framework · Overview (instalación y agente mínimo)', href: 'https://learn.microsoft.com/en-us/agent-framework/overview/' },
          { label: 'Agent Framework · Function tools (@tool, approval_mode, FunctionInvocationContext)', href: 'https://learn.microsoft.com/en-us/agent-framework/agents/tools/function-tools' },
          { label: 'Agent Framework · Running agents (streaming, AgentResponseUpdate, Content)', href: 'https://learn.microsoft.com/en-us/agent-framework/concepts/agents/running-agents' },
          { label: 'Agent Framework · Sessions (AgentSession)', href: 'https://learn.microsoft.com/en-us/agent-framework/concepts/agents/conversations/session' },
          { label: 'Microsoft Foundry · Crear recursos con la CLI (endpoint del proyecto)', href: 'https://learn.microsoft.com/en-us/azure/foundry/tutorials/quickstart-create-foundry-resources' },
          { label: 'PyPI · agent-framework (versiones)', href: 'https://pypi.org/project/agent-framework/' },
          { label: 'GitHub · microsoft/agent-framework releases', href: 'https://github.com/microsoft/agent-framework/releases' },
        ]}
      />
    </>
  )
}
