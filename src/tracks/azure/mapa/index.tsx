import { Link } from 'react-router'
import { Callout, KeyIdeas, Section, Sources, Term } from '@/components/ui'
import { AF, L, LESSON_LABEL, type LessonSlug } from './data'
import { KindLab, PathLab, PieceMap } from './labs-piezas'
import { EquivLab, ModelLab, RenameDecoder, Timeline } from './labs-nombres'
import './lesson.css'

const ROUTE: { slug: LessonSlug; what: string }[] = [
  { slug: 'primer-agente', what: 'Agent Framework: un Agent con una function tool, corriendo en tu máquina.' },
  { slug: 'herramientas-workflows', what: 'Tools, MCP, aprobación humana y workflows en grafo.' },
  { slug: 'desplegar', what: 'Foundry Agent Service: recurso, proyecto, hosted agent y publicación.' },
  { slug: 'gobernar', what: 'Entra Agent ID, guardrails, evaluación y trazas.' },
]

export default function Lesson() {
  return (
    <>
      <Section n={1} title="Un recurso de Azure y cinco capas">
        <p>
          El ecosistema de agentes de Microsoft gira en torno a <strong>Microsoft Foundry</strong> (antes Azure AI Studio y luego Azure AI Foundry): un
          solo recurso de Azure con proyectos dentro, donde viven los modelos, los agentes y sus herramientas. Sobre ese recurso corre{' '}
          <Term tip="Plataforma gestionada de Foundry para construir, desplegar y escalar agentes. Lo que en Google es Agent Runtime más la Managed Agents API.">
            Foundry Agent Service
          </Term>
          ; el código del agente lo escribes con{' '}
          <Term tip="Framework open source de Microsoft (Python y .NET), sucesor de Semantic Kernel y AutoGen. Lo que en Google es ADK.">
            Microsoft Agent Framework
          </Term>
          , que no depende de Azure para funcionar.
        </p>
        <p>
          El mapa agrupa las piezas en cinco capas, en el orden en que las vas a necesitar: construir, plataforma, ejecutar, gobernar y publicar. El
          punto junto a cada nombre indica su estado, porque aquí conviven piezas en GA, piezas en preview y una con fecha de retiro.
        </p>
        <PieceMap />
        <Callout tone="warn" title="Contenido verificado el 15-nov-2026, una semana antes de Ignite">
          Microsoft Ignite 2026 está anunciado para el 17–20 de noviembre de 2026, justo después de esta verificación. Microsoft suele renombrar y
          mover piezas en ese evento: si algo de esta página no coincide con el portal, revisa primero la documentación oficial enlazada en cada pieza.
        </Callout>
      </Section>

      <Section n={2} title="Prompt agent, hosted agent o Responses API">
        <p>
          «Un agente en Foundry» puede ser tres cosas distintas, y casi toda la confusión con tutoriales ajenos viene de no saber cuál están usando.
          La diferencia está en <strong>dónde vive la definición</strong> y <strong>quién ejecuta el bucle</strong>. El costo sigue esa línea: en
          los tres pagas inferencia y tools, y solo el hosted agent suma el cómputo del contenedor.
        </p>
        <KindLab />
        <p>
          En esta sección escribes a Andi con Agent Framework (<Link to="/azure/primer-agente">primer agente</Link>) y lo subes como hosted agent (
          <Link to="/azure/desplegar">desplegar</Link>). El prompt agent y la Responses API quedan como alternativas que vas a reconocer cuando las
          veas.
        </p>
      </Section>

      <Section n={3} title="Por dónde pasa la pregunta de Camila">
        <p>
          Antes de instalar nada, mira el recorrido completo. Camila pregunta por su pedido 4821 en la web de Andes Market y la respuesta cruza el
          endpoint del agente, un guardrail, tu código, un modelo, una herramienta y la identidad del agente. Fíjate en qué parte es tuya (el
          backend y el código de Andi) y qué parte pone la plataforma.
        </p>
        <PathLab />
        <Callout tone="info" title="Lo que el diagrama simplifica">
          El guardrail no es una caja aparte: se evalúa dentro del servicio en cada punto de intervención. La documentación además se contradice sobre
          qué pasa cuando un agente no tiene guardrail propio (hereda el del deployment, según una página; corre sin filtro si es un hosted agent sin{' '}
          <code>rai_config</code>, según otra): se revisa en <Link to="/azure/gobernar">gobernar</Link>. Memory, Toolboxes y AI Gateway no aparecen
          para no saturar el dibujo.
        </Callout>
      </Section>

      <Section n={4} title="Se llamaba de otra forma">
        <p>
          Entre 2024 y 2026 Microsoft renombró la plataforma dos veces, fusionó sus dos frameworks y cambió la API de agentes. Los tutoriales
          anteriores siguen en los buscadores, y no todos los cambios pesan igual: algunos son solo una etiqueta nueva, otros obligan a reescribir el
          código y unos pocos tienen fecha de retiro.
        </p>
        <RenameDecoder />
        <h3>La secuencia, en fechas</h3>
        <p>
          Sirve para fechar un tutorial: si habla de «Azure AI Foundry» es de entre fines de 2024 y fines de 2025; si crea <em>threads</em> y{' '}
          <em>runs</em>, usa una API que se retiró en agosto de 2026.
        </p>
        <Timeline />
        <Callout tone="warn" title="Tres tropiezos que vienen de leer material viejo">
          <ul>
            <li>
              <strong>Creer que <code>Owner</code> alcanza.</strong> <code>Owner</code> y <code>Contributor</code> de Azure no incluyen acciones de
              plano de datos: sin <code>Foundry User</code> no puedes crear agentes.
            </li>
            <li>
              <strong>Mezclar generaciones de SDK.</strong> <code>azure-ai-projects</code> 1.x, <code>azure-ai-agents</code> y la Assistants API son
              la generación anterior; usa <code>azure-ai-projects</code> 2.x.
            </li>
            <li>
              <strong>Confundir deployment con modelo.</strong> El parámetro <code>model</code> es el nombre de tu deployment.
            </li>
          </ul>
        </Callout>
      </Section>

      <Section n={5} title="Qué modelo para qué rol">
        <p>
          En Foundry no eliges «un modelo»: creas un <strong>deployment</strong> de un modelo del catálogo y el agente apunta a ese deployment. Un
          sistema de agentes suele repartir tres papeles con necesidades muy distintas: un orquestador que razona, workers que hacen tareas acotadas
          y un router que solo clasifica. La sugerencia para cada papel es de este tutorial, no una recomendación oficial de Microsoft.
        </p>
        <ModelLab />
        <Callout tone="warn" title="Dos trampas documentadas al elegir modelo para Agent Service">
          <ul>
            <li>
              <code>gpt-5-mini</code>, el modelo del quickstart, solo soporta Code Interpreter, File Search, MCP, Web Search y Work IQ en Agent
              Service.
            </li>
            <li>
              La tabla de tools de Agent Service no tiene filas para <code>gpt-5.6-*</code>, <code>gpt-6-*</code>, <code>gpt-6.1-*</code> ni para
              Claude: su soporte de tools está por confirmar. La lista autoritativa es el filtro del catálogo{' '}
              <code>ai.azure.com/catalog/models?capabilities=agentsv2</code>.
            </li>
          </ul>
        </Callout>
        <p>
          La cuarta opción es no elegir: desplegar <code>model-router</code> y usarlo como modelo del agente. Enruta cada request por separado entre
          el subconjunto que configures (elige al menos dos, porque también es el conjunto de failover) y tiene tres modos: Balanced, Cost y Quality.
          Su medidor aparece en la API de precios a US$ 0,14 por 1M de tokens (Global,
          eastus2, 15-nov-2026, indicativo), que se suma al costo del modelo que responde. Revisa antes las tools que no soporta: A2A, Azure AI Search,
          Azure Functions, Computer Use, Image Generation y Web Search.
        </p>
      </Section>

      <Section n={6} title="En Google Cloud se llama…">
        <p>
          Si vienes de la <Link to="/google/ecosistema">sección de Google</Link>, casi todo tiene una pieza gemela. Casi: hay equivalencias que solo
          son parciales, porque una de las dos está en preview o reparte la función entre varias piezas, y dos casos donde no hay nada verificado
          del otro lado.
        </p>
        <EquivLab />
      </Section>

      <Section n={7} title="Qué viene en esta sección">
        <p>Esta lección solo ubica las piezas. Cada una se trabaja con código en las siguientes:</p>
        <ol className="az-mapa-route">
          {ROUTE.map((r, i) => (
            <li key={r.slug}>
              <span className="az-mapa-route-n">{i + 2}</span>
              <span>
                <Link to={`/azure/${r.slug}`}>{LESSON_LABEL[r.slug]}</Link>
                <span className="az-mapa-route-what">{r.what}</span>
              </span>
            </li>
          ))}
        </ol>
        <Callout tone="tip" title="Lo que puedes probar sin una suscripción de Azure">
          Agent Framework funciona con <code>OpenAIChatClient</code> (la API de OpenAI) u Ollama, y DevUI y los workflows corren en local. Foundry
          Local da inferencia en el dispositivo. Lo que sí es exclusivo de Azure es Foundry Agent Service, los guardrails, Entra Agent ID y la
          publicación en Teams.
        </Callout>
      </Section>

      <KeyIdeas
        items={[
          <>
            <strong>Microsoft Foundry</strong> es la plataforma (un recurso de Azure con proyectos); <strong>Foundry Agent Service</strong> es donde
            corre el agente; <strong>Microsoft Agent Framework</strong> es el código que escribes.
          </>,
          <>
            Hay tres formas de agente: <strong>prompt agent</strong> (declarativo, sin código), <strong>hosted agent</strong> (tu código en un sandbox
            por sesión) y <strong>Responses API</strong> (no existe agente en Foundry; el bucle vive en tu app).
          </>,
          <>
            Gobernar se reparte entre <strong>Entra Agent ID</strong> (identidad propia, que nace sin permisos), los <strong>guardrails</strong> (en
            preview para agentes) y las trazas en Application Insights.
          </>,
          <>
            Azure AI Studio, Azure AI Foundry, Semantic Kernel, AutoGen, Assistants API y los roles <code>Azure AI …</code> son nombres de la
            generación anterior. Solo algunos son un simple cambio de etiqueta.
          </>,
          <>
            Punto de partida para modelos: <code>gpt-5.4</code> de orquestador, <code>gpt-5.4-mini</code> de worker y <code>gpt-5.4-nano</code> de
            router. El nombre que escribes en el código es el de tu deployment.
          </>,
        ]}
      />
      <Sources
        items={[
          { label: 'What is Microsoft Foundry (incluye la tabla "Evolution of Foundry")', href: `${L}/what-is-foundry` },
          { label: 'Foundry Agent Service · overview y tipos de agente', href: `${L}/agents/overview` },
          { label: 'Hosted agents · conceptos', href: `${L}/agents/concepts/hosted-agents` },
          { label: 'Quickstart · prompt agent', href: `${L}/agents/quickstarts/prompt-agent` },
          { label: 'Microsoft Agent Framework · overview', href: `${AF}/overview/` },
          { label: 'Navegar desde Foundry (classic)', href: `${L}/how-to/navigate-from-classic` },
          { label: 'RBAC en Foundry (roles Foundry User, Foundry Agent Consumer…)', href: `${L}/concepts/rbac-foundry` },
          { label: 'Identidad de agentes en Foundry', href: `${L}/agents/concepts/agent-identity` },
          { label: 'Guardrails · overview', href: `${L}/guardrails/guardrails-overview` },
          { label: 'Publicar en Teams y Microsoft 365 Copilot', href: `${L}/agents/how-to/publish-copilot` },
          { label: 'Modelos vendidos directamente por Azure', href: `${L}/foundry-models/concepts/models-sold-directly-by-azure` },
          { label: 'Model router · conceptos', href: `${L}/openai/concepts/model-router` },
          { label: 'Calendario de retiro de modelos', href: `${L}/openai/concepts/model-retirement-schedule` },
          { label: 'Límites, cuotas y regiones de Agent Service (tabla de tools por modelo)', href: `${L}/agents/concepts/limits-quotas-regions` },
          { label: 'Azure Retail Prices API (origen de los precios indicativos)', href: 'https://prices.azure.com/api/retail/prices' },
        ]}
      />
    </>
  )
}
