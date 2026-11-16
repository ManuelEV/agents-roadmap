import { Link } from 'react-router'
import { Callout, KeyIdeas, Section, Sources, Term } from '@/components/ui'
import { Code } from '@/components/Code'
import { fmtClp } from '@/sim/andes'
import { ApprovalLab } from './ApprovalLab'
import { MiddlewareLab } from './MiddlewareLab'
import { OrchestrationLab } from './OrchestrationLab'
import { ToolSourceLab } from './ToolSourceLab'
import { WorkflowLab } from './WorkflowLab'
import { LIMIT, PATTERNS, WORKFLOW_CALLER_CODE, type PatternId } from './data'
import './lesson.css'

const AF = 'https://learn.microsoft.com/en-us/agent-framework'

export default function Lesson() {
  return (
    <>
      <Section n={1} title="Más herramientas para Andi: una función o un servidor MCP">
        <p>
          En <Link to="/azure/primer-agente">tu primer agente</Link> Andi tenía una función Python como herramienta. En Microsoft Agent Framework hay dos maneras más de darle la misma capacidad, y las dos pasan por{' '}
          <Link to="/fundamentos/mcp">MCP</Link>: que <strong>tu proceso</strong> sea el cliente del servidor (<code>MCPStreamableHTTPTool</code> o <code>MCPStdioTool</code>) o que la llamada la haga <strong>el servicio del modelo</strong> (
          <code>client.get_mcp_tool(...)</code>, MCP hospedado).
        </p>
        <p>
          Para el modelo las tres son iguales: un nombre, una descripción y un esquema de argumentos. Lo que cambia es dónde corre el código, quién guarda las credenciales y desde qué red hay que alcanzar el servidor. Las herramientas integradas de Foundry Agent
          Service (búsqueda web, File search, Toolbox) son otra historia y están en <Link to="/azure/desplegar">desplegar</Link>.
        </p>
        <ToolSourceLab />
        <Callout tone="warn" title='Sin "default", lo que no listaste se ejecuta sin preguntar'>
          En una herramienta MCP, <code>approval_mode</code> acepta un diccionario con <code>always_require_approval</code>, <code>never_require_approval</code> y <code>default</code>. Si omites <code>default</code>, las herramientas que el servidor agregue
          mañana no piden aprobación. Combínalo con <code>allowed_tools</code> para que el modelo solo vea lo que necesita.
        </Callout>
      </Section>

      <Section n={2} title="Aprobación humana: el run termina, no se queda esperando">
        <p>
          Una <Term tip="Función Python expuesta al modelo. El esquema sale del nombre, el docstring y los type hints.">function tool</Term> se marca con <code>@tool(approval_mode="always_require")</code>. Cuando el modelo la pide, Agent Framework no la ejecuta: el
          run devuelve un contenido de tipo <code>function_approval_request</code>. Tu aplicación se lo muestra a una persona y la decisión vuelve en un run nuevo, sobre la misma sesión, como <code>function_approval_response</code>.
        </p>
        <p>
          <code>approval_mode</code> se declara por herramienta, no por valor de los argumentos. Por eso la regla de Andes Market (sobre {fmtClp(LIMIT)} decide un supervisor) se reparte en dos piezas: <code>request_refund</code> corre sola y hace cumplir el tope
          en su código; <code>refund_with_approval</code> es la única que mueve montos altos y siempre pasa por una persona.
        </p>
        <ApprovalLab />
        <Callout tone="tip" title="La documentación recomienda always_require en producción">
          <code>approval_mode="never_require"</code> es el valor de los ejemplos. Parte al revés: todo pide aprobación y vas liberando las herramientas de solo lectura.
        </Callout>
      </Section>

      <Section n={3} title="Middleware: dónde enganchar lo que no es del modelo">
        <p>
          Auditoría, bloqueos y métricas no van en las instrucciones ni dentro de cada herramienta. Agent Framework tiene tres tipos de middleware, según qué envuelven: el run completo, cada llamada al modelo o cada ejecución de una herramienta. Todos reciben
          un contexto y <code>call_next()</code>, que no lleva argumentos: lo que quieras cambiar lo cambias en el contexto.
        </p>
        <MiddlewareLab />
        <p>
          Se registran en el agente (<code>Agent(middleware=[...])</code>) o en una sola llamada (<code>agent.run(..., middleware=[...])</code>); primero corren los del agente y dentro los del run. Para cortar, asigna <code>context.result</code> y no llames a{' '}
          <code>call_next()</code>, o lanza <code>MiddlewareTermination</code>.
        </p>
        <p>
          Lo que el agente debe <em>saber</em> antes de cada run va por otra vía: un <code>ContextProvider</code> con <code>before_run</code> y <code>after_run</code>, que puede sumar instrucciones o herramientas (<code>extend_instructions</code>,{' '}
          <code>extend_tools</code>) según el estado de la sesión. Los guardrails de plataforma no cubren las llamadas a function tools ni a MCP: están en <Link to="/azure/gobernar">gobernar</Link>.
        </p>
      </Section>

      <Section n={4} title="Cuándo dejar de sumar herramientas: un workflow en grafo">
        <p>
          En la sección 2 el orden del reembolso lo decidió el modelo: llamó a una herramienta, leyó "pending" y eligió la otra. Funciona, pero la regla de negocio depende de que el modelo la siga. Cuando el orden de los pasos es parte del requisito, se
          saca del prompt y se escribe como grafo: <strong>executors</strong> (nodos con un handler tipado) unidos por <strong>aristas</strong>, algunas con condición.
        </p>
        <p>
          El motor ejecuta por <Term tip="Ronda de ejecución: todos los executors que tienen mensajes pendientes corren en paralelo y luego se entregan sus mensajes.">supersteps</Term>. Al cerrar cada uno puede guardar un <strong>checkpoint</strong>, y todo lo
          que ocurre sale por un único stream de <code>WorkflowEvent</code> que se distingue por <code>event.type</code>. Un executor pide ayuda a una persona con <code>ctx.request_info</code>; la respuesta entra con{' '}
          <code>workflow.run(responses=...)</code>.
        </p>
        <WorkflowLab />
        <h3>El lado del que llama</h3>
        <p>
          Tu aplicación consume el stream, junta las solicitudes pendientes por <code>request_id</code> y vuelve a llamar con las respuestas. Como las solicitudes pendientes viajan dentro del checkpoint, puedes pasar <code>checkpoint_id</code> y{' '}
          <code>responses</code> juntos: el supervisor puede contestar horas después, en otro proceso.
        </p>
        <Code code={WORKFLOW_CALLER_CODE} lang="python" title="andes_ops/run_refund.py" />
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Pieza</th>
                <th>API</th>
                <th>Para qué</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Arista simple</td>
                <td className="mono">add_edge(a, b)</td>
                <td>Lo que envía a llega a b.</td>
              </tr>
              <tr>
                <td>Arista condicional</td>
                <td className="mono">add_edge(a, b, condition=fn)</td>
                <td>Solo pasa si fn(mensaje) es verdadero: el tope de {fmtClp(LIMIT)}.</td>
              </tr>
              <tr>
                <td>Switch</td>
                <td className="mono">add_switch_case_edge_group(origen, [Case(...), Default(...)])</td>
                <td>Varios destinos excluyentes con un caso por defecto.</td>
              </tr>
              <tr>
                <td>Fan-in</td>
                <td className="mono">add_fan_in_edges([w1, w2], agregador)</td>
                <td>Juntar resultados de ramas paralelas.</td>
              </tr>
              <tr>
                <td>Checkpoints</td>
                <td className="mono">InMemoryCheckpointStorage · FileCheckpointStorage(storage_path=...) · CosmosCheckpointStorage</td>
                <td>Memoria para pruebas, archivo o Cosmos DB (paquete en prerelease) para sobrevivir a un reinicio.</td>
              </tr>
              <tr>
                <td>Workflow como agente</td>
                <td className="mono">workflow.as_agent()</td>
                <td>Exponer el grafo completo donde se espera un agente.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Callout tone="info" title="Aprobación de herramientas dentro de un workflow">
          Si un agente del workflow llama a una herramienta <code>always_require</code>, la solicitud no llega como contenido del run sino como evento <code>request_info</code> con <code>event.data.type == "function_approval_request"</code>. Se responde igual
          que cualquier otra solicitud. En Google, la pieza equivalente son los <Link to="/google/workflows">workflows de ADK</Link>.
        </Callout>
      </Section>

      <Section n={5} title="Orquestaciones listas: cinco formas de repartir trabajo entre agentes">
        <p>
          No siempre hay que dibujar el grafo a mano. El paquete <code>agent-framework-orchestrations</code> trae cinco builders que arman un workflow a partir de una lista de agentes; todos se configuran por argumentos y terminan en <code>.build()</code>. La
          teoría de cada patrón está en <Link to="/fundamentos/multiagente">multiagente</Link>; aquí importa cómo se mueven los mensajes y cuál elegir.
        </p>
        <OrchestrationLab />
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Builder</th>
                <th>Quién decide el siguiente turno</th>
                <th>Encaja cuando</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ['sequential', 'El orden de la lista participants.'],
                  ['concurrent', 'Nadie: todos reciben la tarea a la vez.'],
                  ['handoff', 'El agente que tiene el control decide a quién cederlo.'],
                  ['groupchat', 'selection_func u orchestrator_agent.'],
                  ['magentic', 'manager_agent, siguiendo su plan.'],
                ] as [PatternId, string][]
              ).map(([id, who]) => (
                <tr key={id}>
                  <td className="mono">{PATTERNS[id].builder}</td>
                  <td>{who}</td>
                  <td>{PATTERNS[id].when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Callout tone="warn" title="Errores comunes">
          <ul className="az-hw-list">
            <li>
              Usar <code>MCPWebsocketTool</code>: se eliminó en Python 1.23. El reemplazo es <code>MCPStreamableHTTPTool</code>.
            </li>
            <li>
              Construir sobre los workflows visuales del portal de Foundry: se retiran el 1 de diciembre de 2026 y el reemplazo recomendado es Agent Framework.
            </li>
            <li>
              Dar por hecho que todo checkpointea: en las orquestaciones listas solo <code>HandoffBuilder(checkpoint_storage=)</code> está documentado; para el resto, a confirmar en la documentación.
            </li>
            <li>
              No fijar la versión: Agent Framework publica casi cada semana y con cambios que rompen. La API funcional (<code>@workflow</code>, <code>@step</code>) sigue experimental.
            </li>
          </ul>
        </Callout>
      </Section>

      <KeyIdeas
        items={[
          'Una herramienta puede ser una función en tu proceso, un servidor MCP que tu proceso llama o un servidor MCP que llama el servicio del modelo. Para el modelo son lo mismo; cambian la red y las credenciales.',
          'approval_mode se declara por herramienta. Con always_require el run termina con un function_approval_request y se reanuda en otro run, sobre la misma sesión, con un function_approval_response.',
          'En MCP, approval_mode es un diccionario: sin la clave "default", lo no listado se ejecuta sin preguntar.',
          'Middleware de agent, chat y function: una vez por run, una vez por llamada al modelo, una vez por herramienta.',
          'Si el orden de los pasos es un requisito, escríbelo como workflow: executors, aristas con condición, un stream de WorkflowEvent, checkpoints por superstep y request_info para las personas.',
          'Secuencial, concurrente, handoff, group chat y Magentic son workflows ya armados: elige por quién decide el siguiente turno.',
        ]}
      />
      <Sources
        items={[
          { label: 'Agent Framework · Function tools', href: `${AF}/agents/tools/function-tools` },
          { label: 'Agent Framework · Local MCP tools', href: `${AF}/agents/tools/local-mcp-tools` },
          { label: 'Agent Framework · Hosted MCP tools', href: `${AF}/agents/tools/hosted-mcp-tools` },
          { label: 'Agent Framework · Running agents (tipos de Content)', href: `${AF}/concepts/agents/running-agents` },
          { label: 'Agent Framework · Middleware', href: `${AF}/concepts/agents/middleware/` },
          { label: 'Agent Framework · Context providers', href: `${AF}/concepts/agents/conversations/context-providers` },
          { label: 'Agent Framework · Workflows: builder and execution', href: `${AF}/concepts/workflows/builder-and-execution` },
          { label: 'Agent Framework · Workflows: edges', href: `${AF}/concepts/workflows/edges` },
          { label: 'Agent Framework · Workflows: events', href: `${AF}/concepts/workflows/events` },
          { label: 'Agent Framework · Checkpoints', href: `${AF}/workflows/checkpoints` },
          { label: 'Agent Framework · Human-in-the-loop', href: `${AF}/workflows/human-in-the-loop` },
          { label: 'Agent Framework · Orchestrations', href: `${AF}/workflows/orchestrations/` },
        ]}
      />
    </>
  )
}
