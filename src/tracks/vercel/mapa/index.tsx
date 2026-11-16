import { Link } from 'react-router'
import { Callout, KeyIdeas, Section, Sources, Term } from '@/components/ui'
import { Code } from '@/components/Code'
import { MODEL_ID_CODE, PRICE_DATE } from './data'
import { BoardLab, CostLab, DecoderLab, MapLab, Timeline } from './Labs'
import { GatewayLab } from './GatewayLab'
import './lesson.css'

const NEXT = [
  {
    to: '/vercel/primer-agente',
    n: 2,
    title: 'Tu primer agente',
    body: 'ToolLoopAgent con las tools de Andes Market: cómo se define una tool, cómo decide el loop cuándo parar y qué devuelve cada paso.',
  },
  {
    to: '/vercel/interfaz',
    n: 3,
    title: 'La interfaz',
    body: 'El stream hasta useChat, las partes de un mensaje, la aprobación de un reembolso desde la UI y dónde se guarda la conversación.',
  },
  {
    to: '/vercel/produccion',
    n: 4,
    title: 'Producción',
    body: 'Workflows durables, despliegue, Sandbox, guardrails hechos a mano, telemetría y modelos con respaldo.',
  },
]

export default function Lesson() {
  return (
    <>
      <Section n={1} title="El agente vive dentro de tu app web">
        <p>
          En un hyperscaler el agente es un recurso de la nube: lo despliegas en un runtime de agentes y lo rodeas de servicios administrados. Vercel
          propone otro camino, pensado para un equipo de producto que ya escribe TypeScript: <strong>el agente es código de tu aplicación</strong>. Andi,
          el agente de operaciones de Andes Market, sería una ruta <code>/api/chat</code> de la misma app Next.js que muestra el catálogo.
        </p>
        <p>
          Las piezas se ordenan en cuatro capas. Arriba, la interfaz que ve Camila. Debajo, tu código con el{' '}
          <Term tip="Toolkit TypeScript para llamar modelos, definir tools y construir agentes. Paquete npm: ai (v7).">AI SDK</Term>. Después,{' '}
          <Term tip="API alojada que enruta a cientos de modelos con una sola credencial. Es un proxy de modelos.">AI Gateway</Term> entre tu código y
          los proveedores de modelos. Abajo, la plataforma donde todo corre. Solo la última capa es exclusiva de Vercel: el AI SDK es un
          paquete de npm que corre en cualquier Node.js 22 o superior, el Workflow SDK es open source y el gateway se puede usar sin desplegar nada ahí.
        </p>
        <MapLab />
        <Callout tone="info" title="Tres clases de agente, tres momentos">
          <code>ToolLoopAgent</code> para un loop dentro de una app, en memoria. <code>WorkflowAgent</code> cuando el agente tiene que sobrevivir a un
          reinicio o esperar días una aprobación. <code>HarnessAgent</code> (experimental) cuando quieres manejar un harness completo como Claude Code
          desde la misma API. Esta línea trabaja las dos primeras.
        </Callout>
      </Section>

      <Section n={2} title="Lo que un hyperscaler te da y aquí traes tú">
        <p>
          La contracara de un camino liviano: menos piezas administradas. Vercel es fuerte en experiencia de desarrollo, streaming hacia la interfaz,
          acceso a muchos modelos y ejecución durable simple. Tiene menos gobierno empresarial que Google Cloud: no hay memoria administrada, ni un
          servicio de guardrails, ni identidad por agente, ni registro, ni A2A, ni un framework de evaluación de primera parte.
        </p>
        <p>
          Eso no las vuelve opcionales. Significa que las eliges, las integras y las operas tú: una base de datos para las conversaciones, un
          middleware para filtrar contenido, un servicio externo para evaluar. El tablero muestra necesidad por necesidad quién pone la pieza.
        </p>
        <BoardLab />
        <Callout tone="warn" title="AI Gateway no es un Agent Gateway">
          Los nombres se parecen y la función no. Agent Gateway de Google gobierna el tráfico de agentes y tools (MCP, A2A, todo denegado por defecto).
          AI Gateway de Vercel es un <strong>proxy de modelos</strong>: ruteo, fallbacks, presupuestos y costos. No ve ni autoriza las llamadas a tus
          tools. Lo más cercano a ese control aquí es <code>toolApproval</code> en tu código, más BotID y el Firewall delante de la ruta.
        </Callout>
      </Section>

      <Section n={3} title="Un string elige el modelo">
        <p>
          Un modelo se escribe <code>"proveedor/modelo"</code>, por ejemplo <code>"anthropic/claude-sonnet-5.5"</code>. En el AI SDK, AI Gateway es
          el proveedor global por defecto: ese string ya pasa por el gateway, sin instalar el SDK de Anthropic ni manejar su API key. La lista viva de
          ids y precios es pública, sin key: <code>https://ai-gateway.vercel.sh/v1/models</code> (507 modelos el {PRICE_DATE}).
        </p>
        <Code code={MODEL_ID_CODE} lang="ts" title="cuatro formas de nombrar un modelo" />
        <p>
          La credencial se resuelve en este orden: la <code>apiKey</code> que pases a <code>createGateway()</code>, la variable{' '}
          <code>AI_GATEWAY_API_KEY</code> y, por último, el token OIDC del proyecto, que en un despliegue de Vercel es automático. En local,{' '}
          <code>vercel link</code> y <code>vercel env pull</code> bajan un token que dura 12 horas.
        </p>
        <p>
          Lo interesante pasa cuando un proveedor falla. Un mismo modelo puede estar servido por varios proveedores, y el gateway decide a cuál ir con
          lo que le digas en <code>providerOptions.gateway</code>: <code>order</code> fija el orden, <code>only</code> restringe la lista y{' '}
          <code>models</code> agrega modelos de respaldo. Tumba proveedores y mira por dónde sale la pregunta de Camila.
        </p>
        <GatewayLab />
        <Callout tone="warn" title="Tres sorpresas con la credencial y el ruteo">
          <p>
            <strong>Una API key definida le gana a OIDC aunque sea inválida.</strong> Si dejaste <code>AI_GATEWAY_API_KEY</code> en el proyecto y
            quieres usar OIDC, quítala.
          </p>
          <p>
            <strong>
              <code>only</code> elimina el fallback.
            </strong>{' '}
            Lo viste en el lab: con la lista caída, la request falla aunque otro proveedor sirva el mismo modelo.
          </p>
          <p>
            <strong>BYOK no evita todo cargo.</strong> Puedes traer tus propias keys de proveedor sin cambiar código, pero si la llamada con tu key
            falla, el gateway reintenta con las de Vercel y eso sí descuenta de tus créditos.
          </p>
        </Callout>
        <p>
          Hay más filtros en el mismo objeto (<code>sort</code> por costo, tiempo al primer token o tokens por segundo; <code>user</code> y{' '}
          <code>tags</code> para atribuir gasto). Se usan en <Link to="/vercel/produccion">Producción</Link>.
        </p>
      </Section>

      <Section n={4} title="Lo que cuesta un modelo">
        <p>
          AI Gateway no cobra margen ni tarifa de plataforma sobre los tokens: pagas el precio de lista del proveedor con créditos prepagados. Hay un
          nivel gratuito con un crédito mensual y un subconjunto de modelos (el monto exacto está a confirmar en la documentación). Para no llevarte
          sorpresas puedes fijar presupuestos por equipo, proyecto, API key o miembro: al superarlos, el gateway responde <code>402</code>.
        </p>
        <p>
          La diferencia entre modelos es de dos órdenes de magnitud, y en un agente la entrada pesa más de lo que parece: cada llamada del loop reenvía
          las instrucciones, el historial y los resultados de las tools. Ajusta el tráfico de Andi y compara.
        </p>
        <CostLab />
        <Callout tone="tip" title="La combinación que usa esta línea">
          Es una recomendación nuestra, no de Vercel: <code>anthropic/claude-sonnet-5.5</code> como orquestador (es también el modelo de casi todos los
          ejemplos de la documentación del AI SDK), <code>openai/gpt-6.1-terra</code> o <code>google/gemini-3.8-flash</code> para sub-agentes y{' '}
          <code>anthropic/claude-haiku-5.5</code> u <code>openai/gpt-6-luna</code> para clasificar. Para trabajo no interactivo, muchas variantes{' '}
          <code>-batch</code> cuestan la mitad: <code>anthropic/claude-sonnet-5.5-batch</code> va a 1.00 / 5.00.
        </Callout>
      </Section>

      <Section n={5} title="Cómo leer un tutorial de v5 o v6">
        <p>
          El AI SDK sacó tres versiones mayores en once meses, y la 7 renombró buena parte de la API. Casi todo lo que encuentres en blogs y videos,
          y algunos restos en la propia documentación, usa nombres anteriores. Varios siguen funcionando como alias deprecados con un warning, pero
          conviene reconocerlos y escribir los actuales.
        </p>
        <Timeline />
        <p>
          La misma ruta de chat de Andi, antes y ahora. Elige un renombre para ver qué línea cambia en cada versión.
        </p>
        <DecoderLab />
        <Callout tone="tip" title="No migres a mano">
          Para un proyecto en v6 existe un codemod: <code>npx @ai-sdk/codemod v7</code>. Y lo que <strong>no</strong> cambió también ayuda a leer:{' '}
          <code>ToolLoopAgent</code>, <code>stopWhen</code>, <code>prepareStep</code>, <code>tool()</code> con <code>inputSchema</code> y los ids{' '}
          <code>"proveedor/modelo"</code> siguen igual.
        </Callout>
      </Section>

      <Section n={6} title="Las próximas paradas">
        <p>
          Esta parada es el mapa. Las tres siguientes construyen a Andi en el mismo orden en que lo harías en un proyecto real: primero el loop,
          después la interfaz, al final lo que hace falta para dejarlo corriendo.
        </p>
        <div className="vc-mapa-next">
          {NEXT.map((x) => (
            <Link key={x.to} to={x.to} className="vc-mapa-next-item">
              <span className="n">{x.n}</span>
              <span className="t">{x.title}</span>
              <span className="b">{x.body}</span>
            </Link>
          ))}
        </div>
        <p>
          Si vienes de otra línea, el concepto del loop está en <Link to="/fundamentos/loop-agente">Fundamentos</Link> y el mismo recorrido sobre
          Google Cloud en <Link to="/google/ecosistema">El ecosistema de Google</Link>.
        </p>
      </Section>

      <KeyIdeas
        items={[
          <>
            En Vercel el agente es <strong>código TypeScript de tu app</strong>: una ruta con <code>ToolLoopAgent</code> (AI SDK 7), una interfaz con{' '}
            <code>useChat</code> y, cuando hace falta durabilidad, <code>WorkflowAgent</code> sobre el Workflow SDK.
          </>,
          <>
            Corre sobre Vercel Functions con Fluid compute, Vercel Workflows y Sandbox. El AI SDK, el Workflow SDK y AI Gateway se pueden usar fuera
            de Vercel.
          </>,
          <>
            <strong>Lo traes tú</strong>: sesiones y memoria, guardrails de contenido, identidad por agente, registro, A2A y evaluación. AI Gateway es
            un proxy de modelos, no un gateway de agentes ni de tools.
          </>,
          <>
            Un modelo es un string <code>"proveedor/modelo"</code>. En <code>providerOptions.gateway</code>, <code>order</code> ordena proveedores,{' '}
            <code>only</code> los restringe (y quita el fallback) y <code>models</code> agrega modelos de respaldo. Sin margen sobre el precio de lista.
          </>,
          <>
            Tutorial viejo: <code>system</code> → <code>instructions</code>, <code>stepCountIs</code> → <code>isStepCount</code>,{' '}
            <code>needsApproval</code> → <code>toolApproval</code>, <code>onFinish</code> → <code>onEnd</code>, <code>DurableAgent</code> →{' '}
            <code>WorkflowAgent</code>. v7 exige Node 22+ y ESM.
          </>,
        ]}
      />
      <Sources
        items={[
          { label: 'AI SDK · introducción', href: 'https://ai-sdk.dev/docs/introduction' },
          { label: 'AI SDK · agentes (ToolLoopAgent)', href: 'https://ai-sdk.dev/docs/agents/overview' },
          { label: 'AI SDK · guía de migración a 7.0', href: 'https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0' },
          { label: 'AI SDK · proveedor AI Gateway', href: 'https://ai-sdk.dev/providers/ai-sdk-providers/ai-gateway' },
          { label: 'AI Gateway · documentación', href: 'https://vercel.com/docs/ai-gateway' },
          { label: 'AI Gateway · model fallbacks', href: 'https://vercel.com/docs/ai-gateway/models-and-providers/model-fallbacks' },
          { label: 'AI Gateway · filtrar y ordenar proveedores', href: 'https://vercel.com/docs/ai-gateway/models-and-providers/provider-filtering-and-ordering' },
          { label: 'AI Gateway · precios', href: 'https://vercel.com/docs/ai-gateway/pricing' },
          { label: 'AI Gateway · autenticación con OIDC', href: 'https://vercel.com/docs/ai-gateway/authentication-and-byok/oidc' },
          { label: 'AI Gateway · API de modelos (ids y precios)', href: 'https://ai-gateway.vercel.sh/v1/models' },
          { label: 'Vercel Workflows', href: 'https://vercel.com/docs/workflows' },
          { label: 'Workflow SDK', href: 'https://workflow-sdk.dev' },
          { label: 'Vercel Sandbox', href: 'https://vercel.com/docs/vercel-sandbox' },
          { label: 'Fluid compute', href: 'https://vercel.com/docs/fluid-compute' },
          { label: 'Changelog · AI SDK 7', href: 'https://vercel.com/changelog/ai-sdk-7' },
          { label: 'Blog · Agent Stack', href: 'https://vercel.com/blog/agent-stack' },
        ]}
      />
    </>
  )
}
