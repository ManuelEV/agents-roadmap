import { useState } from 'react'
import { Link } from 'react-router'
import { Check, Minus } from 'lucide-react'
import { Code } from '@/components/Code'
import { CloudConsole, ConsoleBanner, ConsoleButton, ConsoleCard, ConsoleCheck, ConsoleDisclaimer, ConsoleField, ConsoleStatus, ConsoleTable } from '@/components/Console'
import { Narration, PlayerBar } from '@/components/Player'
import { Callout, KeyIdeas, Lab, Section, Segmented, Sources, Term } from '@/components/ui'
import { usePlayer } from '@/lib/hooks'
import { AGENT_DISPLAY, COMPANY } from '@/sim/andes'
import { CODE_TRACE_CLIENT, FOUNDRY_AGENT, FOUNDRY_PROJECT, PUB_STEPS, RISKS, type PubFocus, type PubScope } from './data'
import { EvalCodeLab, EvalLab, TraceLab } from './evaluate'
import { GuardrailLab } from './guardrails'
import { IdentityLab, RolesLab } from './identity'
import './lesson.css'

/* ------------------------------------------------------------------------ */
/* Lab 6 · Publicar en Teams y Microsoft 365 Copilot (consola simulada)      */
/* ------------------------------------------------------------------------ */
const NAV = ['Agents', 'Models', 'Tools', 'Knowledge', 'Memory', 'Guardrails', 'Evaluations'].map((label) => ({ id: label.toLowerCase(), label }))

function PublishScreen({ focus, scope }: { focus: PubFocus; scope: PubScope }) {
  const wizard = focus !== 'menu'
  return (
    <CloudConsole
      brand="azure"
      product="Build"
      nav={NAV}
      activeNav="agents"
      project={FOUNDRY_PROJECT}
      crumbs={wizard ? ['Agents', FOUNDRY_AGENT, 'Publish', 'Teams and Microsoft Copilot'] : ['Agents', FOUNDRY_AGENT]}
      title={wizard ? 'Teams and Microsoft Copilot' : FOUNDRY_AGENT}
      tabs={focus === 'scope' ? ['Direct publish', 'Download & customize'] : undefined}
      activeTab="Direct publish"
      height={330}
    >
      {focus === 'menu' && (
        <>
          <div className="row" style={{ marginBottom: 10 }}>
            <ConsoleStatus ok>Versión activa: 3</ConsoleStatus>
            <ConsoleButton primary>Publish</ConsoleButton>
          </div>
          <ConsoleCard title="Publish">
            <ConsoleButton focus>Teams and Microsoft Copilot</ConsoleButton>
          </ConsoleCard>
        </>
      )}
      {(focus === 'form' || focus === 'next') && (
        <>
          <div className="az-gob-form">
            <ConsoleField label="Name" value={AGENT_DISPLAY} required focus={focus === 'form'} />
            <ConsoleField label="Publish version" value="3" kind="select" required />
            <ConsoleField label="Short description" value="Pedidos, envíos y devoluciones de Andes Market" />
            <ConsoleField label="Developer" value={COMPANY} />
          </div>
          <ConsoleField label="Description" value="Consulta el estado de un pedido, sigue su envío y solicita reembolsos según la política vigente." kind="textarea" />
          <ConsoleButton primary focus={focus === 'next'}>
            Next: Publish options
          </ConsoleButton>
        </>
      )}
      {focus === 'scope' && (
        <>
          <ConsoleCard title="Choose who can use this agent" focus>
            <div className="stack" style={{ gap: 6 }}>
              <ConsoleCheck radio label="Just you" checked={scope === 'me'} />
              <ConsoleCheck radio label="People in your organization" checked={scope === 'org'} />
            </div>
          </ConsoleCard>
          <ConsoleButton primary>Publish</ConsoleButton>
        </>
      )}
      {focus === 'done' && (
        <>
          <ConsoleBanner tone={scope === 'me' ? 'ok' : 'guard'}>
            {scope === 'me' ? 'Publicado. Disponible solo para ti.' : 'Enviado. Pendiente de aprobación en el Microsoft 365 admin center.'}
          </ConsoleBanner>
          <ConsoleTable
            cols={['Dónde', 'Sección', 'Quién lo ve']}
            rows={[
              ['Teams', scope === 'me' ? 'Your agents' : 'Built by your org', scope === 'me' ? 'Solo tú' : 'La organización, tras aprobar'],
              ['Microsoft 365 Copilot', scope === 'me' ? 'Your agents' : 'Built by your org', scope === 'me' ? 'Solo tú' : 'La organización, tras aprobar'],
            ]}
          />
        </>
      )}
    </CloudConsole>
  )
}

function PublishLab() {
  const [scope, setScope] = useState<PubScope>('org')
  const player = usePlayer(PUB_STEPS.length, { interval: 4600 })
  const s = PUB_STEPS[player.step]
  const steps = PUB_STEPS.map((x) => ({ title: x.title, body: x.body(scope) }))
  return (
    <Lab title="De Foundry a Teams en cinco pantallas" hint="Reproduce y cambia el alcance" footer={<ConsoleDisclaimer />}>
      <div className="row" style={{ marginBottom: 10 }}>
        <Segmented
          options={[
            { value: 'me', label: 'Just you' },
            { value: 'org', label: 'People in your organization' },
          ]}
          value={scope}
          onChange={setScope}
        />
      </div>
      <PlayerBar player={player} labels={PUB_STEPS.map((x) => x.title)} />
      <div className="az-gob-pub">
        <div className="anim-fade" key={`${player.step}-${scope}`}>
          <PublishScreen focus={s.focus} scope={scope} />
        </div>
        <Narration steps={steps} step={player.step} />
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */

export default function Lesson() {
  return (
    <>
      <Section n={1} title="Cada agente es una identidad en tu directorio">
        <p>
          En <Link to="/azure/desplegar">la lección anterior</Link> dejaste a Andi corriendo en Foundry Agent Service. Antes de abrirla a la empresa faltan cuatro
          respuestas: quién es Andi para tus sistemas, quién puede tocarla, qué revisa la plataforma en cada turno y cómo te enteras si un cambio la empeoró.
        </p>
        <p>
          La primera la da <strong>Microsoft Entra Agent ID</strong>, el marco de identidad de Entra para agentes. Cada agente nuevo de Foundry recibe al crearse su
          propio{' '}
          <Term tip="Plantilla que guarda las credenciales y obtiene tokens para sus agent identities. Las políticas, como Conditional Access, se heredan desde aquí.">
            agent identity blueprint
          </Term>{' '}
          y su <Term tip="La identidad con la que el agente se autentica. No tiene credenciales propias: los tokens los obtiene el blueprint.">agent identity</Term>. Ya
          no comparte la identidad del proyecto, y arranca sin un solo permiso sobre tus recursos.
        </p>
        <IdentityLab />
        <Callout tone="warn" title="Tres cosas que sorprenden">
          <p>
            <strong>Migrar un agente legacy cambia su identidad.</strong> Los agentes anteriores compartían la identidad del proyecto; al pasar al modelo nuevo, las
            asignaciones de rol no se transfieren: hay que volver a darlas.
          </p>
          <p>
            <strong>En un hosted agent, la managed identity del proyecto no está disponible para tu código.</strong> El agente usa su propia identidad, así que el rol
            va ahí.
          </p>
          <p>
            <strong>La licencia.</strong> Agent ID está disponible para todos los clientes de Entra; extender funciones de seguridad a los agentes requiere Microsoft
            Agent 365.
          </p>
        </Callout>
      </Section>

      <Section n={2} title="Roles: construir no es lo mismo que consumir">
        <p>
          La identidad del agente responde qué puede hacer Andi. Los roles de Foundry responden qué pueden hacer las personas y las aplicaciones <em>con</em> Andi. En
          septiembre de 2026 cambiaron de nombre (de <code>Azure AI …</code> a <code>Foundry …</code>) y apareció uno nuevo, pensado para quien solo invoca.
        </p>
        <RolesLab />
        <Callout tone="tip" title="En scripts, el GUID">
          Los IDs de rol no cambiaron con el renombre y los nombres viejos todavía aparecen en algunos sitios: la documentación recomienda asignar por GUID mientras dure
          la transición. En el portal, los roles de un proyecto se asignan en <strong>Manage &gt; Project details &gt; Users &gt; Add user</strong>.
        </Callout>
        <Callout tone="danger" title="Una API key se salta todo esto">
          La autenticación por API key da acceso completo, sin restricciones de rol. Por eso agentes y evaluaciones exigen Entra ID (<code>az login</code> +{' '}
          <code>DefaultAzureCredential</code>). Tampoco uses roles que empiecen con "Cognitive Services" ni "Azure AI Developer".
        </Callout>
      </Section>

      <Section n={3} title="Guardrails: cuatro puntos de intervención y lo que queda fuera">
        <p>
          Un guardrail de Foundry es una colección con nombre de controles; cada control define un riesgo, los puntos donde interviene y una acción. Hay cuatro puntos:{' '}
          <strong>User input</strong>, <strong>Tool call</strong>, <strong>Tool response</strong> y <strong>Output</strong>. Para modelos es GA; para agentes está en{' '}
          <strong>preview</strong>, y los dos puntos de herramientas solo existen en agentes. La idea general está en{' '}
          <Link to="/fundamentos/guardrails">Fundamentos · Guardrails</Link>; aquí importa el alcance exacto.
        </p>
        <p>
          Porque el alcance tiene agujeros documentados. Recorre los cuatro escenarios y fíjate menos en lo que se bloquea que en las etapas marcadas{' '}
          <em>no lo ve</em>.
        </p>
        <GuardrailLab />
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Riesgo que un control puede cubrir</th>
                <th>Modelos</th>
                <th>Agentes (preview)</th>
              </tr>
            </thead>
            <tbody>
              {RISKS.map((r) => (
                <tr key={r.risk} className={r.agents ? '' : 'is-hl'}>
                  <td>{r.risk}</td>
                  <td>{r.models ? <Check size={15} aria-label="sí" /> : <Minus size={15} aria-label="no" />}</td>
                  <td>{r.agents ? <Check size={15} aria-label="sí" /> : <Minus size={15} aria-label="no" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Callout tone="danger" title="Lo que tienes que seguir haciendo en código">
          <ul className="az-gob-list">
            <li>
              <strong>Tool calls de MCP y de function tools.</strong> No están en la lista moderada. La regla de negocio va en la herramienta (el tope de $50.000 de{' '}
              <code>request_refund</code>) y en la aprobación: <code>require_approval="always"</code> en MCP, <code>approval_mode="always_require"</code> en las function
              tools de Agent Framework.
            </li>
            <li>
              <strong>Modelos sin filtro integrado.</strong> Los modelos Claude en Foundry no traen filtrado de contenido al desplegarse: hay que configurar content
              safety en la inferencia. Si los guardrails aplican o no a Claude y a modelos de partners está por confirmar en la documentación.
            </li>
            <li>
              <strong>Los casos que fallan en abierto.</strong> Un hosted agent sin <code>rai_config</code> corre sin guardrail, y un ID de política inexistente no da
              error: deja pasar todo.
            </li>
            <li>
              <strong>Agentes externos.</strong> Los guardrails aplican solo a agentes de Foundry Agent Service, no a los que registras en el Control Plane.
            </li>
          </ul>
        </Callout>
        <Callout tone="info" title="Dónde se configura y qué trae por defecto">
          <p>
            Los modelos llevan el guardrail <code>Microsoft.DefaultV2</code>: categorías de daño en umbral Medium, jailbreak en prompts y material protegido en
            respuestas. El guardrail de un agente <strong>reemplaza por completo</strong> al del modelo, no se suma.
          </p>
          <p>
            Crear: <strong>Build &gt; Guardrails &gt; Create Guardrail</strong> (pide <code>Foundry Account Owner</code> o superior). Asignar: en el agente, sección{' '}
            <strong>Guardrails &gt; Manage &gt; Assign a new guardrail</strong>. Dentro de Foundry, la moderación de los primeros 1.000 caracteres de texto no se cobra
            (dato de nov-2026).
          </p>
        </Callout>
        <p className="small muted">
          En Google Cloud el papel equivalente lo cumplen Model Armor y Agent Identity: <Link to="/google/seguridad">Google · Seguridad</Link>.
        </p>
      </Section>

      <Section n={4} title="Evaluar: que un cambio pequeño no pase en silencio">
        <p>
          Los guardrails detienen ataques; no detectan que Andi dejó de llamar a <code>track_shipment</code> porque alguien acortó un docstring. Para eso están los
          evaluadores de agentes de Foundry, en dos familias: de <strong>sistema</strong> (Task Completion, Task Adherence, Intent Resolution…) y de{' '}
          <strong>proceso</strong> (Tool Call Accuracy, Tool Selection, Tool Input Accuracy…), que miran las llamadas a herramientas y no solo el texto final.
        </p>
        <EvalLab />
        <p>
          El camino actual es la <strong>evaluación en la nube</strong>: <code>azure-ai-projects</code> más la API de evals de OpenAI. Tú subes las consultas; Foundry
          invoca al agente y aplica los evaluadores. El paquete <code>azure-ai-evaluation</code> sigue existiendo para evaluación local.
        </p>
        <EvalCodeLab />
        <Callout tone="info" title="Sobre este ejemplo">
          El código combina el flujo de la guía oficial de evaluación de agentes con el criterio <code>builtin.task_adherence</code> de la página de evaluadores; no es
          una copia de una sola página. Para sumar Intent Resolution o Tool Call Accuracy, agrega otro <code>TestingCriterionAzureAIEvaluator</code> con el ID que
          indique la documentación.
        </Callout>
        <Callout tone="warn" title="Dos descuidos frecuentes">
          <p>
            Evaluación y red teaming leen <code>AZURE_AI_PROJECT_ENDPOINT</code> y <code>AZURE_AI_MODEL_DEPLOYMENT_NAME</code>; Agent Framework y tracing usan{' '}
            <code>FOUNDRY_PROJECT_ENDPOINT</code>. No hay un nombre único: revisa cuál espera cada script.
          </p>
          <p>
            Las evaluaciones del playground vienen activadas y se facturan. Se apagan desde "metrics", arriba a la derecha.
          </p>
        </Callout>
      </Section>

      <Section n={5} title="Trazas: de la invocación a Application Insights">
        <p>
          Cuando un caso falla, la pregunta siguiente es qué hizo exactamente el agente. El tracing de Foundry es GA para prompt agents y hosted agents y se enciende sin
          tocar código: conectas un recurso de Application Insights al proyecto (<strong>Build &gt; Agents &gt; Traces &gt; Connect</strong>) y el servicio emite las
          trazas, con 90 días de historial. El concepto general está en <Link to="/fundamentos/observabilidad">Fundamentos · Observabilidad</Link>.
        </p>
        <TraceLab />
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th></th>
                <th>Server-side</th>
                <th>Client-side</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Cómo se activa</strong>
                </td>
                <td>Conectar Application Insights al proyecto. Sin cambios de código.</td>
                <td>
                  <code>configure_azure_monitor(...)</code> en tu proceso, con la variable <code>AZURE_EXPERIMENTAL_ENABLE_GENAI_TRACING</code>.
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Qué cubre</strong>
                </td>
                <td>Lo que ocurre dentro de Foundry Agent Service.</td>
                <td>Lo que hace tu aplicación alrededor del agente.</td>
              </tr>
              <tr>
                <td>
                  <strong>Estado</strong>
                </td>
                <td>GA</td>
                <td>Experimental</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Code code={CODE_TRACE_CLIENT} lang="python" title="Tracing client-side (experimental)" />
        <Callout tone="info" title="Antes de pensar que no funciona">
          Las trazas tardan entre 2 y 5 minutos en aparecer. Agent Framework las emite solo cuando el tracing está habilitado en el proyecto. Dónde se ven en el portal
          está por confirmar: la documentación nombra tres rutas distintas (Build &gt; Agents &gt; Traces, Observability &gt; Traces y Operate &gt; Tracing). Y ojo con
          el costo: Application Insights y Log Analytics cobran por ingesta.
        </Callout>
      </Section>

      <Section n={6} title="Publicar: Andi en Teams y Microsoft 365 Copilot">
        <p>
          Con identidad, roles, guardrail, una evaluación en verde y trazas, Andi puede salir del portal. La publicación en Teams y Microsoft 365 Copilot es GA y se hace
          desde el propio agente; lo que cambia según el alcance es quién tiene que aprobar.
        </p>
        <PublishLab />
        <Callout tone="tip" title="Otras rutas">
          <p>
            Por CLI: <code>azd ai agent pack</code> y <code>azd ai agent publish</code>. Si prefieres subir el paquete a mano, la pestaña{' '}
            <strong>Download &amp; customize &gt; Download ZIP</strong> entrega <code>manifest.json</code> y los iconos.
          </p>
          <p>
            Si el proyecto tiene deshabilitado el acceso de red pública, la publicación desde el portal no funciona: hay que usar REST. Copilot Studio también puede
            llamar a un agente de Foundry (preview), siempre que el agente tenga habilitado el endpoint Activity; si no, falla con 400.
          </p>
        </Callout>
        <p className="small muted">
          El equivalente en Google es registrar el agente en Gemini Enterprise: <Link to="/google/gemini-enterprise">Google · Gemini Enterprise</Link>.
        </p>
        <p>
          Esta es la última lección de la sección Azure. Ya viste el mismo agente construido, desplegado y gobernado en esta nube; en{' '}
          <Link to="/comparar">Comparar</Link> puedes ponerlo al lado de las otras secciones, pieza por pieza.
        </p>
      </Section>

      <KeyIdeas
        items={[
          <>
            Crear un agente en Foundry crea un <strong>agent identity blueprint</strong> y una <strong>agent identity</strong> en Entra. Nace sin permisos: cada acceso a
            un recurso es una asignación de RBAC explícita, al alcance más chico posible.
          </>,
          <>
            <code>Foundry User</code> construye, <code>Foundry Agent Consumer</code> solo invoca, <code>Foundry Project Manager</code> publica,{' '}
            <code>Foundry Account Owner</code> administra sin poder construir. <code>Owner</code> de Azure no alcanza para crear agentes.
          </>,
          <>
            Los guardrails cubren cuatro puntos, pero en agentes están en preview y <strong>no moderan tool calls de MCP ni de function tools</strong>. Un hosted agent
            sin <code>rai_config</code> o con una política inexistente corre sin filtro.
          </>,
          <>
            La evaluación corre en la nube con <code>client.evals</code> apuntando al agente por nombre. Los evaluadores de proceso necesitan{' '}
            <code>{'{{sample.output_items}}'}</code> para ver las tool calls.
          </>,
          <>
            Las trazas llegan a Application Insights con solo conectarlo al proyecto: <code>invoke_agent</code> → <code>chat</code> → <code>execute_tool</code>. El
            contenido de los mensajes no se captura salvo que lo pidas.
          </>,
          <>
            <strong>Publish &gt; Teams and Microsoft Copilot</strong>: "Just you" no pide aprobación; "People in your organization" pasa por el Microsoft 365 admin
            center.
          </>,
        ]}
      />
      <Sources
        items={[
          { label: 'Microsoft Entra Agent ID · conceptos clave', href: 'https://learn.microsoft.com/en-us/entra/agent-id/key-concepts' },
          { label: 'Foundry · identidad de agentes', href: 'https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/agent-identity' },
          { label: 'Foundry · roles RBAC', href: 'https://learn.microsoft.com/en-us/azure/foundry/concepts/rbac-foundry' },
          { label: 'Foundry · guardrails (overview)', href: 'https://learn.microsoft.com/en-us/azure/foundry/guardrails/guardrails-overview' },
          { label: 'Foundry · crear guardrails', href: 'https://learn.microsoft.com/en-us/azure/foundry/guardrails/how-to-create-guardrails' },
          { label: 'Foundry · guardrails en hosted agents', href: 'https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/add-hosted-agent-guardrails' },
          { label: 'Azure AI Content Safety · Prompt Shields (quickstart)', href: 'https://learn.microsoft.com/en-us/azure/ai-services/content-safety/quickstart-jailbreak' },
          { label: 'Foundry · MCP en agentes (aprobación de tools)', href: 'https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/model-context-protocol' },
          { label: 'Foundry · evaluadores de agentes', href: 'https://learn.microsoft.com/en-us/azure/foundry/concepts/evaluation-evaluators/agent-evaluators' },
          { label: 'Foundry · evaluar un agente', href: 'https://learn.microsoft.com/en-us/azure/foundry/observability/how-to/evaluate-agent' },
          { label: 'Foundry · configurar trazas', href: 'https://learn.microsoft.com/en-us/azure/foundry/observability/how-to/trace-agent-setup' },
          { label: 'Foundry · trazas client-side', href: 'https://learn.microsoft.com/en-us/azure/foundry/observability/how-to/trace-agent-client-side' },
          { label: 'Agent Framework · observabilidad', href: 'https://learn.microsoft.com/en-us/agent-framework/agents/observability' },
          { label: 'Foundry · publicar en Teams y Microsoft 365 Copilot', href: 'https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/publish-copilot' },
        ]}
      />
    </>
  )
}
