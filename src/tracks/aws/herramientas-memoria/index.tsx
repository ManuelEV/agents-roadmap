import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Callout, KeyIdeas, Lab, Section, Segmented, Sources, Term, DetailDock } from '@/components/ui'
import { Code, linesOf } from '@/components/Code'
import { CloudConsole, ConsoleBanner, ConsoleButton, ConsoleCard, ConsoleCheck, ConsoleDisclaimer, ConsoleStatus } from '@/components/Console'
import { Narration, PlayerBar } from '@/components/Player'
import { Terminal, useTerminalPlayer } from '@/components/Terminal'
import { usePlayer } from '@/lib/hooks'
import { CallLab, TargetsLab, WaysLab } from './GatewayLabs'
import { MemoryLab, SurviveLab } from './MemoryLabs'
import { CODE_PARTS, CONSOLE_STEPS, FINAL_CODE, GATEWAY_ARN, GATEWAY_NAME, LAMBDA_CODE, MEMORY_ARN, MEMORY_NAME, REGION, SESSION_CODE, TERM_SETUP } from './data'
import './lesson.css'

/* ------------------------------------------------------------------------ */
/* Terminal · crear gateway, target y memoria                                */
/* ------------------------------------------------------------------------ */
function SetupLab() {
  const player = useTerminalPlayer(TERM_SETUP)
  return (
    <Lab title="Gateway, target y memoria desde el AgentCore CLI" hint="Pulsa ▶" footer={<span className="small muted">Los comandos y sus flags son reales; la salida es simulada y resumida.</span>}>
      <Terminal lines={TERM_SETUP} upTo={player.upTo} typed={player.typed} player={player} title="bash · AndesOps/" maxHeight={420} />
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Consola simulada                                                           */
/* ------------------------------------------------------------------------ */
const NAV = [{ id: 'resources', label: 'Resources', children: [{ id: 'memory', label: 'Memory' }] }]

function ConsoleLab() {
  const player = usePlayer(CONSOLE_STEPS.length, { interval: 3800 })
  const st = player.step
  const inMemory = st >= 3
  return (
    <Lab title="Dónde ver en la consola lo que creó el CLI" hint="Reproduce o haz clic en un paso" footer={<ConsoleDisclaimer />}>
      <PlayerBar player={player} labels={CONSOLE_STEPS.map((s) => s.title)} />
      <div className="aws-hm-console">
        <CloudConsole
          brand="aws"
          product="Amazon Bedrock AgentCore"
          project={REGION}
          nav={NAV}
          activeNav={inMemory ? 'memory' : undefined}
          url={inMemory ? `bedrock-agentcore/memory?region=${REGION}` : `bedrock-agentcore/toolsAndGateways?region=${REGION}`}
          title={inMemory ? 'Memory' : 'Gateways'}
          height={380}
        >
          {!inMemory && (
            <>
              <ConsoleCard focus={st === 0} title={<span className="mono">{GATEWAY_NAME}</span>}>
                <span className="aws-hm-arn">{GATEWAY_ARN}</span>
              </ConsoleCard>
              {st >= 1 && (
                <div className="aws-hm-console-panels anim-fade">
                  <ConsoleCard title="Log delivery" right={<ConsoleButton small focus={st === 1}>Add</ConsoleButton>}>
                    <span className="aws-hm-console-note">Sin destinos de logs configurados.</span>
                  </ConsoleCard>
                  <ConsoleCard title="Tracing" right={<ConsoleButton small focus={st === 2}>Edit</ConsoleButton>}>
                    <span className="aws-hm-console-note">Trazas del gateway hacia CloudWatch.</span>
                  </ConsoleCard>
                </div>
              )}
            </>
          )}
          {inMemory && (
            <>
              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <ConsoleButton primary>Create memory</ConsoleButton>
              </div>
              <ConsoleCard focus={st === 3} title={<span className="mono">{MEMORY_NAME}</span>} right={<ConsoleStatus ok>ACTIVE</ConsoleStatus>}>
                <span className="aws-hm-arn">{MEMORY_ARN}</span>
              </ConsoleCard>
              {st >= 4 && (
                <div className="aws-hm-console-panels anim-fade">
                  <ConsoleCard title="Log delivery">
                    <span className="aws-hm-console-note">Sin destinos de logs configurados.</span>
                  </ConsoleCard>
                  <ConsoleCard title="Tracing" right={<ConsoleButton small>Edit</ConsoleButton>}>
                    <ConsoleCheck label="Enable" checked focus />
                    <div>
                      <ConsoleButton primary small>
                        Save
                      </ConsoleButton>
                    </div>
                  </ConsoleCard>
                </div>
              )}
            </>
          )}
          {st === 0 && (
            <ConsoleBanner tone="system">
              En esta simulación el panel izquierdo solo muestra <strong>Resources → Memory</strong>: es la única etiqueta de menú que pudimos verificar. La URL y el
              nombre de la página Gateways sí están documentados.
            </ConsoleBanner>
          )}
        </CloudConsole>
      </div>
      <Narration steps={CONSOLE_STEPS} step={st} />
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Código final                                                               */
/* ------------------------------------------------------------------------ */
function FinalCodeLab() {
  const [sel, setSel] = useState(CODE_PARTS[0].id)
  const part = CODE_PARTS.find((p) => p.id === sel)!
  const hl = useMemo(() => linesOf(FINAL_CODE, ...part.needles), [part])
  return (
    <Lab title="Andi completo: herramientas del Gateway y memoria por cliente" hint="Elige qué resaltar">
      <div className="row" style={{ marginBottom: 12 }}>
        <Segmented options={CODE_PARTS.map((p) => ({ value: p.id, label: p.label }))} value={sel} onChange={setSel} />
      </div>
      <Code code={FINAL_CODE} lang="python" title="app/agent/main.py (recortado)" highlight={hl} dim />
      <DetailDock k={sel}>
        <div className="aws-hm-note anim-fade" key={sel} data-tone={part.tone}>
          {part.note}
        </div>
      </DetailDock>
    </Lab>
  )
}

export default function Lesson() {
  return (
    <>
      <Section n={1} title="El problema: las llaves viven dentro del agente">
        <p>
          En <Link to="/aws/primer-agente">Tu primer agente</Link> las herramientas de Andi eran funciones <code>@tool</code> en el mismo archivo. Funciona, pero
          cada función necesita una credencial: la contraseña de la base de pedidos, la API key de AndesExpress, el secreto del ERP de inventario. Todas quedan en
          el entorno del agente, justo al lado de un modelo que lee texto escrito por clientes.
        </p>
        <p>
          Hay dos pasos para sacarlas de ahí. El primero es <Link to="/fundamentos/mcp">MCP</Link>: la herramienta corre en un servidor aparte y Strands la
          consume con <code>MCPClient</code>. El segundo es <strong>AgentCore Gateway</strong>: en vez de operar un servidor MCP por sistema, registras cada
          sistema como un <Term tip="Un backend registrado en el Gateway: una Lambda, una API descrita con OpenAPI, un servidor MCP, etc. Cada target aporta una o más tools.">target</Term>{' '}
          y el Gateway los publica todos como un único servidor MCP.
        </p>
        <WaysLab />
        <Callout tone="info" title="MCPClient en dos líneas">
          <code>Agent(tools=[mcp_client])</code> deja que Strands abra y cierre la conexión. La forma manual es{' '}
          <code>with mcp_client: tools = mcp_client.list_tools_sync()</code>, y entonces el agente debe usarse dentro del <code>with</code>. Transportes: stdio,
          Streamable HTTP y SSE.
        </Callout>
      </Section>

      <Section n={2} title="Qué acepta el Gateway y qué le devuelve al agente">
        <p>
          El Gateway tiene tres categorías de targets. Las herramientas de negocio van como <strong>MCP targets</strong>: ahí está la traducción de Lambda,
          OpenAPI o Smithy a tools MCP. Los <strong>HTTP targets</strong> dejan pasar tráfico sin tocarlo (otros agentes por A2A, por ejemplo) y los{' '}
          <strong>inference targets</strong> enrutan llamadas a modelos. Para Andes Market: la base de pedidos detrás de una Lambda, la API de AndesExpress con
          su esquema OpenAPI y el ERP de inventario, que ya expone un servidor MCP.
        </p>
        <p>
          La autenticación se configura dos veces y por separado. <strong>Entrante</strong>: quién puede llamar al Gateway (JWT con <code>CUSTOM_JWT</code>, IAM
          con <code>AWS_IAM</code>, un modo <em>authenticate only</em>, o <code>NONE</code>). <strong>Saliente</strong>: con qué credencial llama el Gateway a
          cada target.
        </p>
        <TargetsLab />
        <Callout tone="tip" title="Tres guiones bajos">
          Cada tool se publica como <code>&lt;TargetName&gt;___&lt;tool&gt;</code>. Ese es el nombre que ve el modelo y el que usarás en las políticas de{' '}
          <Link to="/aws/gobernar">Gobernar</Link>, así que el nombre del target es parte de tu contrato: elígelo con cuidado.
        </Callout>
      </Section>

      <Section n={3} title="Una llamada, dos credenciales">
        <p>
          Sigue una pregunta de Camila de punta a punta. Fíjate en los dos tramos con candado: de Andi al Gateway viaja un token que identifica a quien
          conversa; del Gateway a AndesExpress viaja la API key del transportista. La segunda nunca pasa por el agente.
        </p>
        <CallLab />
        <p>
          Cuando el target es una Lambda no hay secreto que guardar: el Gateway la invoca con su rol de servicio. Dentro de la función, el nombre de la tool
          pedida llega en el contexto del cliente.
        </p>
        <Code code={LAMBDA_CODE} lang="python" title="handler de la Lambda andes-orders" />
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Gateway</th>
                <th>Valor (us-east-1, visto el 15-nov-2026)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Invocaciones de tools</td>
                <td>USD 0,005 por 1.000</td>
              </tr>
              <tr>
                <td>Búsqueda semántica (Search API)</td>
                <td>USD 0,025 por 1.000</td>
              </tr>
              <tr>
                <td>Indexado para la búsqueda</td>
                <td>USD 0,02 por 100 tools al mes</td>
              </tr>
              <tr>
                <td>Cuotas</td>
                <td>100 targets por gateway · 1.000 tools por target · timeout 15 min · payload 6 MB</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section n={4} title="Estado de sesión no es memoria">
        <p>
          Con las herramientas resueltas, queda la otra mitad: qué recuerda Andi. Strands separa dos preguntas. El <strong>conversation manager</strong> decide
          qué parte del historial entra a la ventana del modelo (<code>SlidingWindowConversationManager</code> recorta; <code>SummarizingConversationManager</code>{' '}
          también existe). El <strong>session manager</strong> decide dónde se guarda el estado para que sobreviva al proceso.
        </p>
        <Code code={SESSION_CODE} lang="python" title="sesión y ventana en Strands" highlight={linesOf(SESSION_CODE, 'session_manager=session_manager', 'conversation_manager=')} />
        <p>
          <code>SnapshotSessionManager</code> es el recomendado para sesiones nuevas de un solo agente. Guarda bien <em>una conversación</em>, pero no sabe nada
          de la clienta cuando ella abre otra. Para eso está <strong>AgentCore Memory</strong>, con dos niveles: eventos de corto plazo y registros de largo
          plazo. La idea general está en <Link to="/fundamentos/memoria">Fundamentos · Memoria</Link>.
        </p>
        <SurviveLab />
        <Callout tone="info" title="Experimental: context_manager">
          Strands tiene además una API nueva, <code>Agent(context_manager="auto")</code>, marcada como experimental. Si la pasas, <code>conversation_manager</code>{' '}
          se ignora.
        </Callout>
      </Section>

      <Section n={5} title="AgentCore Memory: eventos, estrategias y namespaces">
        <p>
          El corto plazo son eventos crudos, indexados por <code>actorId</code> y <code>sessionId</code>. El largo plazo lo producen las{' '}
          <Term tip="Configuración de extracción de una memoria. En el CLI: SEMANTIC, USER_PREFERENCE, SUMMARIZATION y EPISODIC. Máximo 6 por memoria.">estrategias</Term>
          : procesos que leen esos eventos en segundo plano y escriben registros en un <strong>namespace</strong>, una ruta con <code>/</code> al inicio y al
          final que puede incluir <code>{'{actorId}'}</code>, <code>{'{sessionId}'}</code> y <code>{'{memoryStrategyId}'}</code>. Poner <code>{'{actorId}'}</code>{' '}
          en la plantilla es lo que separa los recuerdos de Camila de los de cualquier otro cliente.
        </p>
        <MemoryLab />
        <Callout tone="warn" title="Los tres errores de memoria vacía">
          <p>
            <strong>Activar la estrategia tarde.</strong> Solo se procesan los eventos guardados después de que la estrategia está <code>ACTIVE</code>. Lo
            conversado antes no se extrae solo.
          </p>
          <p>
            <strong>Buscar justo después de escribir.</strong> La extracción es asíncrona: en una prueba rápida, el registro puede no existir todavía.
          </p>
          <p>
            <strong>Namespace mal formado.</strong> Debe empezar y terminar con <code>/</code>, y la búsqueda tiene que apuntar al mismo camino donde escribe la
            estrategia.
          </p>
        </Callout>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Memory</th>
                <th>Operaciones</th>
                <th>Precio (us-east-1, visto el 15-nov-2026)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Corto plazo</td>
                <td>
                  <code>CreateEvent</code>, <code>ListEvents</code>, <code>GetEvent</code>, <code>ListSessions</code>
                </td>
                <td>USD 1,00 por GB ingerido · 0,20 por GB leído · 0,10 por GB-mes</td>
              </tr>
              <tr>
                <td>Largo plazo</td>
                <td>
                  <code>RetrieveMemoryRecords</code>, <code>ListMemoryRecords</code>, <code>GetMemoryRecord</code>
                </td>
                <td>USD 0,75 por 1.000 registros al mes (estrategias built-in) · 0,50 por 1.000 recuperaciones</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="small muted">
          Memory no está en todas las regiones de AgentCore. En Latinoamérica, <code>sa-east-1</code> (São Paulo) sí la tiene.
        </p>
      </Section>

      <Section n={6} title="Armarlo: CLI, código y consola">
        <p>
          Todo lo anterior se declara con el AgentCore CLI y se despliega junto al proyecto. El ejemplo oficial de memoria pasa una estrategia (
          <code>--strategies SEMANTIC</code>); las demás usan los nombres <code>USER_PREFERENCE</code>, <code>SUMMARIZATION</code> y <code>EPISODIC</code>.
        </p>
        <SetupLab />
        <p>
          En el agente, el cambio respecto de la lección anterior son dos objetos: un <code>MCPClient</code> hacia el Gateway y un{' '}
          <code>AgentCoreMemorySessionManager</code>, que es un session manager de Strands respaldado por AgentCore Memory.
        </p>
        <FinalCodeLab />
        <ConsoleLab />
        <Callout tone="info" title="Lo que sigue y su equivalente en Google">
          Este agente todavía corre en tu máquina: <Link to="/aws/desplegar">Desplegar</Link> lo lleva a AgentCore Runtime, y{' '}
          <Link to="/aws/gobernar">Gobernar</Link> configura Identity, Policy y Guardrails sobre este mismo Gateway. En Google, el papel del Gateway lo cumplen
          Agent Gateway y <Link to="/google/datos">MCP Toolbox</Link>, y el de las estrategias de largo plazo, <Link to="/google/sesiones-memoria">Memory Bank</Link>.
          El resto de las piezas está en <Link to="/aws/mapa">el mapa de AWS</Link>.
        </Callout>
      </Section>

      <KeyIdeas
        items={[
          <>
            Strands consume cualquier servidor MCP con <code>MCPClient</code>; el Gateway <em>es</em> un servidor MCP en{' '}
            <code>https://&lt;gateway-id&gt;.gateway.bedrock-agentcore.&lt;region&gt;.amazonaws.com/mcp</code>.
          </>,
          <>
            Tres categorías de targets: MCP (Lambda, API Gateway REST, OpenAPI, Smithy, servidores MCP, integraciones), HTTP (passthrough) e inference. Las tools
            se llaman <code>&lt;TargetName&gt;___&lt;tool&gt;</code>.
          </>,
          <>
            Auth entrante (JWT, IAM) y auth saliente (rol de servicio, o API key y OAuth client en credential providers de Identity) son independientes. El
            agente solo maneja la entrante.
          </>,
          <>
            Con búsqueda semántica habilitada, el agente llama a <code>x_amz_bedrock_agentcore_search</code> con un <code>query</code> en vez de cargar todas las
            tools.
          </>,
          <>
            Session manager = una conversación que sobrevive al proceso. Eventos de Memory = lo dicho, por <code>actorId</code> + <code>sessionId</code>. Registros
            de largo plazo = lo extraído por estrategias, por namespace, de forma asíncrona.
          </>,
        ]}
      />
      <Sources
        items={[
          { label: 'Strands · MCP tools (MCPClient, transportes, tool_filters)', href: 'https://strandsagents.com/docs/user-guide/sdk/tools/mcp-tools/' },
          { label: 'Strands · Session management (SnapshotSessionManager)', href: 'https://strandsagents.com/docs/user-guide/sdk/agents/session-management/' },
          { label: 'Strands · Context management (conversation managers)', href: 'https://strandsagents.com/docs/user-guide/sdk/context-management/' },
          { label: 'AgentCore Gateway · Quick start', href: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-quick-start.html' },
          { label: 'AgentCore Gateway · Targets soportados', href: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-supported-targets.html' },
          { label: 'AgentCore Gateway · Búsqueda semántica de tools', href: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-using-mcp-semantic-search.html' },
          { label: 'AgentCore Gateway · Inbound auth', href: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-inbound-auth.html' },
          { label: 'AgentCore Gateway · Outbound auth', href: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-outbound-auth.html' },
          { label: 'AgentCore Memory · Get started', href: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory-get-started.html' },
          { label: 'AgentCore Memory · Organización de la memoria de largo plazo (namespaces)', href: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/specify-long-term-memory-organization.html' },
          { label: 'AgentCore · Precios', href: 'https://aws.amazon.com/bedrock/agentcore/pricing/' },
        ]}
      />
    </>
  )
}
