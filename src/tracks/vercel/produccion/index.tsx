import { useMemo } from 'react'
import { Link } from 'react-router'
import { Callout, Checklist, KeyIdeas, Lab, Panel, Section, Sources, Term } from '@/components/ui'
import { Code, linesOf } from '@/components/Code'
import { Terminal, useTerminalPlayer } from '@/components/Terminal'
import { CODE_BOTID, CODE_SANDBOX, CODE_START, CODE_WORKFLOW_AGENT, DEPLOY_PHASES, TERM_DEPLOY } from './data'
import { DurabilityLab } from './DurabilityLab'
import { FitLab } from './FitLab'
import { GuardLab } from './GuardLab'
import { TraceLab } from './TraceLab'
import './lesson.css'

function DeployLab() {
  const player = useTerminalPlayer(TERM_DEPLOY)
  const phase = useMemo(() => {
    let p = 0
    TERM_DEPLOY.slice(0, player.upTo).forEach((l) => {
      if (l.kind !== 'cmd') return
      const idx = DEPLOY_PHASES.findIndex((ph) => l.text === ph.until)
      if (idx >= 0) p = Math.max(p, idx + 1)
    })
    return p
  }, [player.upTo])
  return (
    <Lab
      title="Del repo a producción, comando a comando"
      hint="Pulsa ▶"
      footer={<span className="small muted">Los comandos son los de la CLI de Vercel (vercel@65.16.0); la salida está simulada y abreviada.</span>}
    >
      <div className="vc-prod-deploy">
        <Terminal lines={TERM_DEPLOY} upTo={player.upTo} typed={player.typed} player={player} title="bash · andes-ops/" maxHeight={460} />
        <div className="stack">
          <Panel title="Dónde vas" tone="system">
            <Checklist items={[...DEPLOY_PHASES.map((p) => p.label), 'Runs verificados']} current={player.done ? DEPLOY_PHASES.length + 1 : phase} />
          </Panel>
          <Panel title="Antes del primer deploy" tone="guard" bodyStyle={{ fontSize: 13.5 }}>
            <ul className="vc-prod-list">
              <li>
                Activa <strong>Enable access to System Environment Variables</strong> en el proyecto. Sin eso el workflow cae al Local World y los runs fallan.
              </li>
              <li>
                Si tienes <code>proxy.ts</code> (antes <code>middleware.ts</code>), excluye <code>.well-known/workflow/</code> del matcher.
              </li>
              <li>
                No definas <code>AI_GATEWAY_API_KEY</code> en el proyecto si quieres OIDC: una key no vacía gana siempre, aunque sea inválida.
              </li>
              <li>
                Node.js 22 o superior y proyecto ESM: lo exige AI SDK 7.
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </Lab>
  )
}

export default function Lesson() {
  return (
    <>
      <Section n={1} title="Un agente que espera no cabe en una request">
        <p>
          El agente de <Link to="/vercel/primer-agente">tu primer agente</Link> y el chat de <Link to="/vercel/interfaz">la interfaz</Link> viven dentro de
          una request: un <code>ToolLoopAgent</code> corre entero en memoria y, si el proceso muere, se pierde el progreso. Alcanza mientras Andi responde en
          segundos. Deja de alcanzar cuando Camila pide un reembolso de $69.990: la política exige que una supervisora lo apruebe, y ella puede tardar tres
          horas.
        </p>
        <p>
          Una Vercel Function con <Term tip="Modelo de cómputo de Vercel Functions: concurrencia dentro de la instancia y cobro de CPU solo cuando el código ejecuta.">Fluid compute</Term>{' '}
          dura 300 segundos por defecto y, según el plan, hasta 800 (1800 en beta). Al pasarse responde <code>504 FUNCTION_INVOCATION_TIMEOUT</code>, y esa
          duración incluye la respuesta en streaming. Prueba cuánto trabajo y cuánta espera aguanta cada plan.
        </p>
        <FitLab />
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Por defecto</th>
                <th>Máximo</th>
                <th>Máximo extendido</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Hobby</td>
                <td className="num">300 s</td>
                <td className="num">300 s</td>
                <td className="num">—</td>
              </tr>
              <tr>
                <td>Pro</td>
                <td className="num">300 s</td>
                <td className="num">800 s</td>
                <td className="num">1800 s (beta)</td>
              </tr>
              <tr>
                <td>Enterprise</td>
                <td className="num">300 s</td>
                <td className="num">800 s</td>
                <td className="num">1800 s (beta)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Callout tone="warn" title="Verás 10 s y 60 s en algunas páginas">
          La guía de despliegue del AI SDK todavía menciona 10 s y 60 s para Hobby. La página de límites de Vercel Functions, que es la que manda, dice 300 s
          con Fluid compute (runtimes Node.js, Bun y Python). Límites consultados el 15-nov-2026.
        </Callout>
      </Section>

      <Section n={2} title="Workflow: pasos grabados, esperas suspendidas">
        <p>
          <Term tip="Infraestructura administrada de ejecución durable de Vercel (GA desde abril de 2026). El SDK open source se llama Workflow SDK; antes, Workflow DevKit.">
            Vercel Workflows
          </Term>{' '}
          con el Workflow SDK (antes Workflow DevKit) cambia dónde vive el estado. Una función con <code>'use workflow'</code> orquesta; cada función con{' '}
          <code>'use step'</code> es una unidad de trabajo cuyo resultado se graba en un log de eventos y que se reintenta sola si falla (3 intentos por
          defecto). <code>sleep</code> y los hooks suspenden el run sin consumir cómputo.
        </p>
        <p>
          La pieza que cuesta creer es el <strong>replay</strong>: cada vez que el run se reanuda, la función del workflow corre otra vez desde la primera
          línea, pero los pasos ya completados no se ejecutan, devuelven lo que quedó grabado. Por eso una caída o un redeploy no pierden nada. Míralo con el
          reembolso de Camila, y tumba el servidor donde quieras.
        </p>
        <DurabilityLab />
        <Callout tone="info" title="Qué pasa si la caída llega a mitad de un paso">
          Un paso que no alcanzó a grabar <code>step_completed</code> se vuelve a ejecutar: son los reintentos automáticos. Por eso cada paso debe poder
          repetirse sin daño (o lanzar <code>FatalError</code>, de <code>workflow</code>, cuando reintentar no tiene sentido). El lab es una simulación del
          mecanismo; las directivas, <code>defineHook</code>, <code>sleep</code> y <code>start</code> son la API real.
        </Callout>

        <h3>Iniciar el run y responder al hook</h3>
        <p>
          El run se inicia desde una ruta con <code>start</code> y la supervisora lo reanuda desde otra con <code>hook.resume(token, data)</code>. Esa segunda
          ruta es tuya: autentica a quien aprueba, porque conocer el token no es un permiso.
        </p>
        <Code code={CODE_START} lang="ts" title="Dos rutas" highlight={linesOf(CODE_START, 'await start(', 'refundApproval.resume(')} />

        <h3>El agente completo como workflow: WorkflowAgent</h3>
        <p>
          Cuando lo durable es el propio loop del agente, se usa <code>WorkflowAgent</code> de <code>@ai-sdk/workflow</code> (reemplaza a{' '}
          <code>DurableAgent</code>). Las herramientas con <code>'use step'</code> pasan a ser pasos durables y una herramienta con aprobación suspende el
          workflow hasta que llega la respuesta.
        </p>
        <Code
          code={CODE_WORKFLOW_AGENT}
          lang="ts"
          title="npm install @ai-sdk/workflow workflow@5"
          highlight={linesOf(CODE_WORKFLOW_AGENT, "'use workflow'", 'stopWhen: isStepCount(8)', 'needsApproval: true', "'use step'", 'new WorkflowAgent')}
          maxHeight={440}
        />
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th></th>
                <th>ToolLoopAgent</th>
                <th>WorkflowAgent</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Paquete</td>
                <td>
                  <code>ai</code>
                </td>
                <td>
                  <code>@ai-sdk/workflow</code> + <code>workflow@5</code>
                </td>
              </tr>
              <tr>
                <td>Dónde vive el estado</td>
                <td>En memoria, dentro de la request</td>
                <td>En el log de eventos del run</td>
              </tr>
              <tr>
                <td>Tope de pasos por defecto</td>
                <td>
                  <code>isStepCount(20)</code>
                </td>
                <td>
                  <code>stream()</code>: ninguno · <code>generate()</code>: 20
                </td>
              </tr>
              <tr>
                <td>Hacia la UI</td>
                <td>
                  <code>createAgentUIStreamResponse</code>
                </td>
                <td>
                  <code>run.readable</code> + <code>createModelCallToUIChunkTransform()</code>
                </td>
              </tr>
              <tr>
                <td>Contexto</td>
                <td>Cualquier valor</td>
                <td>
                  <code>runtimeContext</code> y <code>toolsContext</code> serializables
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Callout tone="warn" title="stream() no tiene tope de pasos">
          Un modelo que sigue llamando herramientas dentro de <code>WorkflowAgent.stream()</code> corre, y cobra, sin límite. Define siempre{' '}
          <code>stopWhen: isStepCount(n)</code>. Y como <code>WorkflowAgent</code> no implementa la interfaz <code>Agent</code>, no sirve con{' '}
          <code>createAgentUIStreamResponse</code>.
        </Callout>

        <h3>Lo que cuesta y sus límites</h3>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Vercel Workflows</th>
                <th>Incluido en Hobby</th>
                <th>Bajo demanda</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Workflow Events</td>
                <td className="num">50.000 / mes</td>
                <td className="num">US$ 0,02 por 1.000 eventos</td>
              </tr>
              <tr>
                <td>Workflow Data Written</td>
                <td className="num">1 GB</td>
                <td className="num">US$ 0,50 por GB</td>
              </tr>
              <tr>
                <td>Workflow Data Retained</td>
                <td className="num">—</td>
                <td className="num">US$ 0,50 por GB-mes</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="small muted">
          Precios al 15-nov-2026; las Functions y Queues que ejecutan los pasos se cobran aparte. Límites por run: 25.000 eventos, 10.000 pasos, payload de 50
          MB, 2 GB en total y replay de hasta 240 s. La duración del run y de <code>sleep</code> no tiene límite; cada paso sí sigue el límite de Vercel
          Functions.
        </p>
      </Section>

      <Section n={3} title="Desplegar: la CLI, las variables y la identidad del gateway">
        <p>
          En Vercel el agente no se despliega como un recurso aparte: es parte de la app. <code>vercel deploy</code> publica una preview y{' '}
          <code>vercel deploy --prod</code> la versión de producción; el mismo código de workflow corre en local (Local World, datos en{' '}
          <code>.workflow-data/</code>) y en Vercel sin configuración adicional. Lo que en Google es Agent Runtime (
          <Link to="/google/desplegar">ver esa lección</Link>) aquí son dos piezas: Functions para el loop corto y Workflows para lo durable.
        </p>
        <DeployLab />
        <h3>Cómo se autentica AI Gateway en producción</h3>
        <p>
          El AI SDK busca la credencial del gateway en este orden: la <code>apiKey</code> pasada a <code>createGateway()</code>, la variable{' '}
          <code>AI_GATEWAY_API_KEY</code> y, por último, el token <Term tip="OpenID Connect: Vercel emite un token firmado que identifica al proyecto y al despliegue, y lo refresca solo.">OIDC</Term>{' '}
          de Vercel. En un despliegue el token es automático y se renueva solo, así que producción no necesita guardar ninguna key. En local lo trae{' '}
          <code>vercel env pull</code> como <code>VERCEL_OIDC_TOKEN</code> y vence a las 12 horas (<code>vercel dev</code> lo renueva solo). Sin key ni OIDC
          el error es <code>GatewayAuthenticationError</code>.
        </p>
        <div className="cmp vc-prod-auth">
          <div className="cmp-row">
            <span className="k">1 · apiKey en createGateway()</span>
            <span>Gana siempre. Útil fuera de Vercel.</span>
          </div>
          <div className="cmp-row">
            <span className="k">2 · AI_GATEWAY_API_KEY</span>
            <span>Si existe y no está vacía, anula OIDC aunque sea inválida. Para ponerle tope: <code>vercel ai-gateway api-keys create --name my-key --amount 500 --refresh-period monthly</code>.</span>
          </div>
          <div className="cmp-row">
            <span className="k">3 · Token OIDC</span>
            <span>Automático en despliegues. Identifica al proyecto, no a cada agente: no hay IAM por agente.</span>
          </div>
        </div>

        <h3>El código que escribe el agente va a un Sandbox</h3>
        <p>
          Si Andi genera un script para analizar pedidos, ese código no es de confianza y no debe correr en la misma función que tiene tus credenciales.{' '}
          <Term tip="microVMs aisladas para ejecutar código no confiable o generado por agentes. GA desde enero de 2026.">Vercel Sandbox</Term> lo ejecuta en
          una microVM aislada, con <code>networkPolicy</code> para cortarle la red.
        </p>
        <div className="vc-prod-sbx">
          <Code code={CODE_SANDBOX} lang="ts" title="pnpm i @vercel/sandbox" highlight={linesOf(CODE_SANDBOX, 'Sandbox.create', "networkPolicy: 'deny-all'", 'sandbox.stop()')} />
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Sandbox · iad1</th>
                  <th>Hobby (incluido)</th>
                  <th>Pro / Enterprise</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Active CPU</td>
                  <td className="num">5 h / mes</td>
                  <td className="num">US$ 0,128 / h</td>
                </tr>
                <tr>
                  <td>Memoria provisionada</td>
                  <td className="num">420 GB-h / mes</td>
                  <td className="num">US$ 0,0212 / GB-h</td>
                </tr>
                <tr>
                  <td>Creaciones</td>
                  <td className="num">5.000 / mes</td>
                  <td className="num">US$ 0,60 / 1M</td>
                </tr>
                <tr>
                  <td>Sandboxes concurrentes</td>
                  <td className="num">10</td>
                  <td className="num">10.000</td>
                </tr>
                <tr>
                  <td>Sesión máxima</td>
                  <td className="num">45 min</td>
                  <td className="num">24 h</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <Callout tone="warn" title="Detén el sandbox al terminar">
          La memoria se cobra aunque la CPU esté inactiva. El ejemplo de la documentación: 1 vCPU y 2 GB encendidos todo el día en <code>iad1</code> cuestan
          US$ 1,05 inactivos y US$ 4,09 ocupados; detenido, US$ 0. Por defecto un sandbox trae 2 vCPU (2048 MB por vCPU) y un timeout de 5 minutos. Precios
          al 15-nov-2026.
        </Callout>
      </Section>

      <Section n={4} title="Guardrails: lo que hay y lo que escribes tú">
        <p>
          Aquí está la diferencia más grande con un hyperscaler: Vercel no tiene un servicio de guardrails de primera parte. Lo que en Google hace Model Armor
          (<Link to="/google/seguridad">ver esa lección</Link>) acá es código tuyo. La plataforma sí pone protecciones de borde y de presupuesto; el contenido
          lo revisas con middleware del AI SDK. La idea general está en <Link to="/fundamentos/guardrails">fundamentos</Link>.
        </p>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Capa</th>
                <th>Qué ofrece</th>
                <th>Quién la mantiene</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>BotID</td>
                <td>
                  CAPTCHA invisible para la ruta del agente: <code>checkBotId()</code> de <code>botid/server</code>. Nivel Basic gratis; Deep Analysis en
                  Pro/Enterprise a US$ 1 por 1.000 llamadas.
                </td>
                <td>Vercel</td>
              </tr>
              <tr>
                <td>Firewall / WAF</td>
                <td>Rate limiting por regla (por defecto 60 s y 100 requests; acciones 429, Log, Deny, Challenge). Los contadores son por región.</td>
                <td>Vercel</td>
              </tr>
              <tr>
                <td>AI Gateway</td>
                <td>
                  Presupuestos (rechaza con <code>402</code>), allowlist de proveedores y modelos, Zero Data Retention, keys con monto y periodo.
                </td>
                <td>Vercel</td>
              </tr>
              <tr>
                <td>Aprobación de herramientas</td>
                <td>
                  <code>toolApproval</code> en el agente, firmada con <code>experimental_toolApprovalSecret</code>.
                </td>
                <td>AI SDK + tu política</td>
              </tr>
              <tr className="is-hl">
                <td>Contenido: inyección, PII, fugas</td>
                <td>
                  Middleware con <code>wrapLanguageModel</code>, un modelo juez barato o un modelo de moderación servido por el gateway.
                </td>
                <td>Tú</td>
              </tr>
              <tr className="is-hl">
                <td>Autenticación y rate limit por usuario</td>
                <td>En la ruta del agente y en las rutas que reanudan hooks. La guía del AI SDK usa un servicio externo para el límite por usuario.</td>
                <td>Tú</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Un middleware envuelve al modelo: <code>transformParams</code> ve lo que entra, <code>wrapGenerate</code> y <code>wrapStream</code> ven lo que
          sale. Enciende las capas y prueba tres mensajes; fíjate en cuál detiene qué, y en lo que pasa de largo.
        </p>
        <GuardLab />
        <Callout tone="warn" title="Es un boceto, y es tuyo">
          La investigación verificó <code>wrapLanguageModel</code>, el tipo <code>LanguageModelV4Middleware</code> de <code>@ai-sdk/provider</code> y sus
          tres ganchos; la forma exacta de sus argumentos (<code>{'{ params }'}</code>, <code>{'{ doGenerate }'}</code>) queda a confirmar en la
          documentación de middleware. Las funciones <code>looksLikeInjection</code> y <code>redactOtherCustomers</code> no existen en ningún paquete: las
          escribes, las pruebas y las mantienes tú. En streaming, acumula cada bloque hasta <code>text-end</code> antes de redactar, no delta por delta.
        </Callout>
        <Code code={CODE_BOTID} lang="ts" title="BotID en la ruta del agente" highlight={linesOf(CODE_BOTID, 'checkBotId()', 'verification.isBot')} />
        <p className="small muted">
          En local <code>checkBotId()</code> siempre devuelve <code>isBot: false</code>. Las rutas protegidas se declaran con{' '}
          <code>initBotId({'{ protect: [{ path, method }] }'})</code> en <code>instrumentation-client.ts</code> (Next.js 15.3+).
        </p>
      </Section>

      <Section n={5} title="Trazas y evals">
        <p>
          La telemetría del AI SDK es OpenTelemetry y vive en <code>@ai-sdk/otel</code>. Registras una integración una vez y queda activa por defecto en
          todas las llamadas; el span raíz de cada ejecución es <code>invoke_agent</code> y los atributos siguen las convenciones GenAI (
          <code>gen_ai.usage.input_tokens</code>…). El porqué de las trazas está en <Link to="/fundamentos/observabilidad">fundamentos</Link>.
        </p>
        <TraceLab />
        <div className="cmp">
          <div className="cmp-row">
            <span className="k">Vercel Observability</span>
            <span>Logs, trazas y métricas de la plataforma, con pestaña propia para AI Gateway (modelo, intentos por proveedor, latencia, TTFT, tokens, costo) y para Workflows (cada paso, input, output, sleep y error).</span>
          </div>
          <div className="cmp-row">
            <span className="k">Terceros</span>
            <span>La lista oficial incluye Langfuse, Braintrust, Datadog, LangSmith, Sentry, Arize AX y más. Trace Drains del gateway exporta trazas OTLP.</span>
          </div>
          <div className="cmp-row">
            <span className="k">Local</span>
            <span>
              DevTools del AI SDK (<code>npx @ai-sdk/devtools@latest</code>) y <code>npx workflow web</code>. DevTools guarda prompts en texto plano: solo
              desarrollo.
            </span>
          </div>
        </div>
        <Callout tone="info" title="Los evals los traes tú">
          El AI SDK no trae un framework de evaluación. Ofrece mocks deterministas (<code>MockLanguageModelV4</code> de <code>ai/test</code>) para pruebas
          unitarias que no gastan tokens, y deja la evaluación de calidad a las integraciones de observabilidad. Si usas eve, ese framework sí incluye{' '}
          <code>eve eval</code>.
        </Callout>
        <p>
          Con esto termina la sección de Vercel: un SDK de TypeScript muy cómodo, una interfaz con streaming, acceso a muchos modelos y ejecución durable
          simple; y menos piezas administradas de gobierno, que te toca escribir. Para ver cómo resuelven lo mismo Google, AWS y Azure, sigue en{' '}
          <Link to="/comparar">comparar ecosistemas</Link>.
        </p>
      </Section>

      <KeyIdeas
        items={[
          <>
            Una función dura 300 s por defecto y hasta 800 s en Pro/Enterprise (1800 s en beta). Un agente que espera a una persona necesita un workflow, no
            un <code>maxDuration</code> más alto.
          </>,
          <>
            <code>'use workflow'</code> orquesta y <code>'use step'</code> graba. Al reanudar, la función corre desde arriba y los pasos completados
            devuelven su resultado grabado: una caída o un redeploy no repiten el reembolso.
          </>,
          <>
            <code>sleep</code> y los hooks (<code>defineHook</code> → <code>create({'{ token }'})</code> / <code>resume(token, data)</code>) suspenden sin
            consumir cómputo. Autentica la ruta que reanuda.
          </>,
          <>
            <code>WorkflowAgent</code> (<code>@ai-sdk/workflow</code>) es el agente durable; <code>stream()</code> no tiene tope de pasos: pon{' '}
            <code>stopWhen</code>.
          </>,
          <>
            En producción el gateway se autentica con OIDC del proyecto. Una <code>AI_GATEWAY_API_KEY</code> definida lo anula.
          </>,
          <>El código generado corre en Vercel Sandbox, con la red cortada y detenido al terminar.</>,
          <>
            No hay guardrails administrados: BotID, WAF y presupuestos los pone la plataforma; el filtro de contenido es middleware que escribes y mantienes.
          </>,
          <>
            <code>registerTelemetry(new OpenTelemetry())</code> enciende las trazas; los evals son por tu cuenta.
          </>,
        ]}
      />
      <Sources
        items={[
          { label: 'Vercel Workflows · conceptos (workflow, step, sleep, hook)', href: 'https://vercel.com/docs/workflows/concepts' },
          { label: 'Workflow SDK · inicio con Next.js', href: 'https://workflow-sdk.dev/docs/getting-started/next' },
          { label: 'AI SDK · WorkflowAgent', href: 'https://ai-sdk.dev/docs/agents/workflow-agent' },
          { label: 'Vercel Workflows · precios y límites', href: 'https://vercel.com/docs/workflow/pricing' },
          { label: 'Vercel Functions · límites de duración', href: 'https://vercel.com/docs/functions/limitations' },
          { label: 'Vercel Functions · uso y precios (Fluid compute)', href: 'https://vercel.com/docs/functions/usage-and-pricing' },
          { label: 'AI Gateway · autenticación con OIDC', href: 'https://vercel.com/docs/ai-gateway/authentication-and-byok/oidc' },
          { label: 'Vercel CLI', href: 'https://vercel.com/docs/cli' },
          { label: 'Vercel Sandbox · referencia del SDK', href: 'https://vercel.com/docs/sandbox/sdk-reference' },
          { label: 'Vercel Sandbox · precios', href: 'https://vercel.com/docs/vercel-sandbox/pricing' },
          { label: 'AI SDK · middleware de modelos', href: 'https://ai-sdk.dev/docs/ai-sdk-core/middleware' },
          { label: 'BotID · primeros pasos', href: 'https://vercel.com/docs/botid/get-started' },
          { label: 'Vercel WAF · rate limiting', href: 'https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting' },
          { label: 'AI Gateway · seguridad y cumplimiento', href: 'https://vercel.com/docs/ai-gateway/security-and-compliance' },
          { label: 'AI SDK · telemetría', href: 'https://ai-sdk.dev/docs/ai-sdk-core/telemetry' },
          { label: 'AI SDK · proveedores de observabilidad', href: 'https://ai-sdk.dev/providers/observability' },
          { label: 'AI SDK · pruebas con modelos simulados', href: 'https://ai-sdk.dev/docs/ai-sdk-core/testing' },
        ]}
      />
    </>
  )
}
