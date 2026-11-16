import { Link } from 'react-router'
import { Callout, KeyIdeas, Section, Sources, Term } from '@/components/ui'
import { Code, linesOf } from '@/components/Code'
import { CODE_HOSTED, OLD_NEW, PROJECT_ENDPOINT, PROMPT_MODEL } from './data'
import { DecisionLab, ToolsLab, VersionLab } from './PromptLabs'
import { DeployLab, InvokeLab } from './HostedLabs'
import { PortalLab, StateLab } from './OperateLabs'
import './lesson.css'

const L = 'https://learn.microsoft.com/en-us/azure/foundry'

export default function Lesson() {
  return (
    <>
      <Section n={1} title="Tres formas de correr a Andi en Foundry">
        <p>
          Hasta ahora Andi corría en tu máquina: un <code>Agent</code> de Agent Framework con sus tools y sus workflows (
          <Link to="/azure/primer-agente">primer agente</Link>, <Link to="/azure/herramientas-workflows">herramientas y workflows</Link>).{' '}
          <Term tip="Plataforma gestionada de Microsoft Foundry para construir, desplegar y escalar agentes. GA, con sub-funciones en preview.">Foundry Agent Service</Term> ofrece tres maneras de
          llevarlo a producción, y la diferencia entre ellas es una sola pregunta: <strong>¿dónde vive la definición del agente y quién ejecuta su ciclo?</strong>
        </p>
        <p>
          En un <strong>prompt agent</strong> la definición (instrucciones, modelo, tools) vive en el servicio y no hay código tuyo. En un <strong>hosted agent</strong> subes tu código y Foundry lo
          corre en un sandbox por sesión; es lo que en Google se llama Agent Runtime (<Link to="/google/desplegar">ver esa parada</Link>). Con la <strong>Responses API</strong> directa no existe
          recurso de agente: tu aplicación arma cada llamada.
        </p>
        <DecisionLab />
        <Callout tone="info" title="Los protocolos del endpoint">
          Un agente del servicio se expone por <strong>Responses</strong> (compatible con OpenAI, historial gestionado), que es el que usa esta parada. Existen también Invocations (JSON libre),
          Activity (se activa al publicar en Teams) y A2A.
        </Callout>
      </Section>

      <Section n={2} title="Prompt agent: una versión inmutable por cada cambio">
        <p>
          Con <code>azure-ai-projects</code> 2.x un prompt agent se crea con <code>project.agents.create_version(agent_name, definition)</code>. No hay "update": cada llamada produce una{' '}
          <strong>versión inmutable</strong> bajo el mismo nombre (hasta 1.000 por agente). Para invocarlo pides un cliente OpenAI enlazado al agente y usas dos objetos:{' '}
          <code>conversations</code> (el historial) y <code>responses</code> (cada turno).
        </p>
        <p>
          El lab crea a Andi dos veces. La v2 suma el servidor MCP del transportista con <code>require_approval="always"</code>, así que el servicio se detiene y devuelve un ítem{' '}
          <code>mcp_approval_request</code> antes de llamar a la tool.
        </p>
        <VersionLab />
        <Callout tone="warn" title="Qué versión responde: revísalo en la documentación">
          Lo documentado: las versiones son inmutables, el endpoint de un agente sirve el 100 % del tráfico a una sola versión (no hay reparto de tráfico) y para publicar debes tener una versión
          activa seleccionada. Cómo se cambia la versión activa por SDK, y si un request puede fijar una versión concreta dentro de <code>agent_reference</code>, no aparece en las páginas que
          revisamos: a confirmar en la documentación antes de armar un rollback.
        </Callout>

        <h3>Las tools que el servicio ejecuta por ti</h3>
        <p>
          Un prompt agent solo puede usar tools que el servicio sabe ejecutar. Se adjuntan directo en la definición o agrupadas en un <em>toolbox</em>. El límite es de 128 tools por agente, y no
          todos los modelos soportan todas: filtra por <code>{PROMPT_MODEL}</code> para ver el caso del quickstart.
        </p>
        <ToolsLab />
        <Callout tone="warn" title="Dos trampas con el modelo">
          <p>
            <strong>El parámetro <code>model</code> es el nombre de tu deployment</strong>, no el id del modelo en el catálogo. Si tu deployment se llama <code>andi-mini</code>, eso es lo que va.
          </p>
          <p>
            <strong>La tabla de tools por modelo está incompleta</strong>: no tiene filas para los modelos más nuevos y en function calling contradice a la página de modelos. La lista autoritativa
            es el filtro del catálogo: <code>ai.azure.com/catalog/models?capabilities=agentsv2</code>.
          </p>
        </Callout>

        <h3>Si vienes de un tutorial anterior</h3>
        <p>
          Threads, runs y assistants son la generación anterior (Assistants API, retirada el 26-ago-2026). Los paquetes <code>azure-ai-agents</code> y <code>azure-ai-projects</code> 1.x pertenecen
          a esa etapa: no los mezcles con el código de esta parada.
        </p>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Antes</th>
                <th>Ahora (Agents v2 sobre Responses API)</th>
                <th>Qué significa</th>
              </tr>
            </thead>
            <tbody>
              {OLD_NEW.map((r) => (
                <tr key={r.old}>
                  <td className="az-dep-old">{r.old}</td>
                  <td>
                    <strong>{r.now}</strong>
                  </td>
                  <td>{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section n={3} title="Hosted agent: tu código de Agent Framework, desplegado con azd">
        <p>
          Las tools de Andi son funciones Python y el reembolso sobre $50.000 pasa por un workflow con aprobación: eso es código, así que Andi va como hosted agent. El cambio respecto de lo que ya
          tenías son tres líneas: en vez de llamar <code>agent.run()</code>, envuelves el agente en un <code>ResponsesHostServer</code>, que habla el protocolo Responses en el puerto 8088.
        </p>
        <Code
          code={CODE_HOSTED}
          lang="python"
          title="main.py · pip install -U agent-framework agent-framework-foundry-hosting azure-identity"
          highlight={linesOf(CODE_HOSTED, 'import ResponsesHostServer', 'FOUNDRY_PROJECT_ENDPOINT', 'server = ResponsesHostServer(agent)', 'server.run()')}
        />
        <p>
          El despliegue lo hace <code>azd</code> con la extensión de Foundry. Todo se declara en un solo <code>azure.yaml</code>: un servicio <code>host: azure.ai.project</code> con los deployments
          de modelo y un servicio <code>host: azure.ai.agent</code> con <code>kind: hosted</code>, el protocolo, el comando de arranque, las variables de entorno y los recursos del contenedor.
        </p>
        <DeployLab />
        <Callout tone="warn" title="La documentación no se pone de acuerdo en tres cosas">
          <p>
            <strong>Extensión y versión de azd</strong>: el quickstart instala <code>microsoft.foundry</code>, pero otras páginas la llaman <code>azure.ai.agents</code>, y la versión mínima de{' '}
            <code>azd</code> cambia según la página (1.27.1 o 1.36.0). Sigue el quickstart vigente el día que lo hagas.
          </p>
          <p>
            <strong>Tamaño del contenedor</strong>: la página de conceptos lista de 0,5 vCPU / 1 GiB a 2 vCPU / 4 GiB; la guía de <code>azure.yaml</code> admite un rango más amplio de{' '}
            <code>cpu</code>.
          </p>
          <p>
            <strong>Python</strong>: el paquete <code>agent-framework-foundry-hosting</code> está en beta y Agent Framework exige Python 3.11 o superior aunque la guía de hosting diga 3.10.
          </p>
        </Callout>
        <Callout tone="tip" title="Lo que conviene saber antes del primer azd deploy">
          <p>
            <code>--deploy-mode code</code> sube un ZIP y Foundry construye la imagen (no necesitas Docker); <code>container</code> usa tu Dockerfile. Los agentes Python necesitan{' '}
            <code>PYTHONNOUSERSITE: "1"</code> en <code>env</code>, y <code>FOUNDRY_PROJECT_ENDPOINT</code> no se declara: lo inyecta la plataforma.
          </p>
          <p>
            Permisos: <code>Foundry Project Manager</code> sobre un proyecto existente, u <code>Owner</code> del resource group para crear uno nuevo. Ojo: <code>Owner</code> por sí solo no da
            acceso al plano de datos; para crear agentes hace falta <code>Foundry User</code> (antes <code>Azure AI User</code>).
          </p>
        </Callout>
      </Section>

      <Section n={4} title="Llamarlo desde tu aplicación">
        <p>
          Un hosted agent y un prompt agent se consumen igual: los dos tienen un endpoint con la misma forma, <code>{'{project_endpoint}'}/agents/{'{name}'}/endpoint/protocols/openai/responses</code>.
          Para este proyecto, <code className="az-dep-break">{PROJECT_ENDPOINT}</code> es el <em>project endpoint</em>. Lo que cambia es lo que pasa detrás.
        </p>
        <InvokeLab />
        <Callout tone="warn" title="Errores típicos al invocar">
          <p>
            <strong>Usar una API key</strong>: los agentes exigen Entra ID (<code>az login</code> + <code>DefaultAzureCredential</code>).
          </p>
          <p>
            <strong>Reenviar ids que manda el navegador</strong>: <code>conversation</code> y <code>previous_response_id</code> son ids del servicio. Si tu backend los acepta del cliente sin
            comprobar a quién pertenecen, un usuario puede leer la conversación de otro.
          </p>
          <p>
            <strong>Perder el historial</strong>: crear una conversación nueva en cada request. Guarda <code>conversation.id</code> junto a tu usuario o caso.
          </p>
        </Callout>
      </Section>

      <Section n={5} title="Dónde queda el estado y cuánto cuesta">
        <p>
          Las conversaciones no viven en tu contenedor. En el <strong>basic setup</strong> las guarda Microsoft; en el <strong>standard setup</strong> quedan en recursos de tu suscripción, que es lo
          que suele pedir un equipo de seguridad. Un hosted agent agrega dos estados propios: la sesión (cómputo y archivos) y un state store clave-valor.
        </p>
        <StateLab />
        <Callout tone="info" title="Qué se cobra">
          Crear y ejecutar agentes no tiene cargo propio: pagas los tokens del modelo y las tools; los hosted agents suman cómputo por sesión. Límite a tener presente: 1.000 sesiones concurrentes
          de hosted agents por suscripción y región (2.000 en East US 2, Sweden Central y otras cinco). Para probar barato: tamaño mínimo, idle timeout de 2 minutos y <code>azd down</code> al
          terminar.
        </Callout>
      </Section>

      <Section n={6} title="Qué mirar en el portal">
        <p>
          Todo lo anterior se hizo sin abrir el portal, pero <code>ai.azure.com</code> es donde pruebas el agente a mano, conectas las trazas y, más adelante, publicas. Las guías repiten una
          condición: el toggle <strong>New Foundry</strong> del banner superior tiene que estar activado.
        </p>
        <PortalLab />
        <Callout tone="info" title="Lo que esta simulación aproxima">
          Los nombres de menú (Build, Agents, Create agent, Traces, Connect, Monitor, Publish) salen de la documentación. Las columnas de la lista y la distribución de cada pantalla son una
          aproximación. La ubicación de las trazas varía según la página que leas (Build &gt; Agents &gt; Traces, Observability &gt; Traces u Operate &gt; Tracing): busca la que muestre tu portal.
        </Callout>
        <p>
          Andi ya tiene endpoint. Falta decidir quién puede llamarlo y con qué identidad actúa, ponerle guardrails, evaluarlo y publicarlo en Teams: eso es{' '}
          <Link to="/azure/gobernar">la próxima parada, gobernar</Link>.
        </p>
      </Section>

      <KeyIdeas
        items={[
          <>
            Tres formas: <strong>prompt agent</strong> (definición en el servicio, sin código ni cómputo propio), <strong>hosted agent</strong> (tu código en un sandbox por sesión) y{' '}
            <strong>Responses API</strong> directa (sin recurso de agente).
          </>,
          <>
            <code>project.agents.create_version(agent_name, definition=PromptAgentDefinition(...))</code> crea una versión inmutable; se invoca con{' '}
            <code>project.get_openai_client(agent_name)</code> → <code>conversations.create()</code> → <code>responses.create(conversation, input)</code>.
          </>,
          <>Threads, runs y assistants son la generación anterior. Hoy: conversations, items, responses y agent versions, con <code>azure-ai-projects</code> 2.x.</>,
          <>
            Hosted agent con Agent Framework: <code>ResponsesHostServer(agent).run()</code> y luego <code>azd ai agent init</code> → <code>azd provision</code> → <code>azd deploy</code>. Aparecen
            la cuenta y el proyecto de Foundry, el deployment, Container Registry, Application Insights y Log Analytics.
          </>,
          <>El historial vive en Conversations (gestionado en basic; en tu Cosmos DB en standard). El cómputo de un hosted agent se paga por sesión: se multiplica por la concurrencia.</>,
          <>En el portal: Build &gt; Agents para probar en el playground (apaga sus evaluaciones), Traces &gt; Connect para Application Insights.</>,
        ]}
      />
      <Sources
        items={[
          { label: 'Foundry Agent Service · overview (tipos de agente y protocolos)', href: `${L}/agents/overview` },
          { label: 'Quickstart · prompt agent (create_version, conversations, responses, REST)', href: `${L}/agents/quickstarts/prompt-agent` },
          { label: 'Quickstart · Responses API sin agente', href: `${L}/agents/quickstarts/responses-api` },
          { label: 'Componentes de runtime (agent_reference, conversation, previous_response_id)', href: `${L}/agents/concepts/runtime-components` },
          { label: 'Tools y toolboxes (tabla de tools integradas)', href: `${L}/agents/concepts/toolbox-overview` },
          { label: 'MCP en un prompt agent (MCPTool, mcp_approval_request)', href: `${L}/agents/how-to/tools/model-context-protocol` },
          { label: 'Hosted agents · conceptos (sandbox por sesión, estado, endpoints)', href: `${L}/agents/concepts/hosted-agents` },
          { label: 'Hosted agents con Agent Framework (ResponsesHostServer)', href: `${L}/how-to/develop/framework-hosted-agents` },
          { label: 'Quickstart · desplegar un hosted agent con azd', href: `${L}/agents/quickstarts/quickstart-hosted-agent` },
          { label: 'Cómo escribir azure.yaml', href: `${L}/agents/how-to/author-azure-yaml` },
          { label: 'Environment setup (basic vs. standard, Cosmos DB)', href: `${L}/agents/environment-setup` },
          { label: 'Límites, cuotas y regiones', href: `${L}/agents/concepts/limits-quotas-regions` },
          { label: 'Qué es Microsoft Foundry (de threads/runs a conversations/responses)', href: `${L}/what-is-foundry` },
          { label: 'Navegar el portal nuevo (Build, Operate, Manage)', href: `${L}/how-to/navigate-from-classic` },
          { label: 'Precios de Foundry Agent Service', href: 'https://azure.microsoft.com/pricing/details/foundry-agent-service/' },
        ]}
      />
    </>
  )
}
