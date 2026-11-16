import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Code, linesOf } from '@/components/Code'
import { Callout, KeyIdeas, Lab, Section, Sources, Term } from '@/components/ui'
import { ApprovalLab } from './ApprovalLab'
import { APPROVAL_CLIENT_CODE, APPROVAL_SERVER_CODE, PAGE_CODE, PERSIST_CLIENT_CODE, PERSIST_ROUTE_CODE, ROUTE_CODE, WIRE_STEPS } from './data'
import { PersistLab } from './PersistLab'
import { PartsLab } from './ToolCard'
import { PipelineLab, WireLab } from './WireLab'
import './lesson.css'

/* ------------------------------------------------------------------------ */
/* Lab 6 · El código mínimo, atado a los pasos del cable                      */
/* ------------------------------------------------------------------------ */
function CodeLab() {
  const [step, setStep] = useState(1)
  const s = WIRE_STEPS[step]
  const hlRoute = useMemo(() => linesOf(ROUTE_CODE, ...s.route), [s])
  const hlPage = useMemo(() => linesOf(PAGE_CODE, ...s.page), [s])
  return (
    <Lab title="Las dos piezas completas: route handler y componente cliente" hint="Elige un paso del cable">
      <div className="vc-ui-steps-pick" role="tablist" aria-label="Pasos del cable">
        {WIRE_STEPS.map((w, i) => (
          <button key={w.title} role="tab" aria-selected={i === step} className={i === step ? 'is-active' : ''} onClick={() => setStep(i)}>
            <span className="n">{i + 1}</span>
            <span className="t">{w.title}</span>
          </button>
        ))}
      </div>
      <div className="vc-ui-codes">
        <Code code={ROUTE_CODE} lang="ts" title="servidor · app/api/chat/route.ts" highlight={hlRoute} dim />
        <Code code={PAGE_CODE} lang="ts" title="cliente · app/page.tsx" highlight={hlPage} dim />
      </div>
    </Lab>
  )
}

export default function Lesson() {
  return (
    <>
      <Section n={1} title="El stream es un protocolo, no un chorro de texto">
        <p>
          En <Link to="/vercel/primer-agente">la parada anterior</Link> Andi quedó como un <code>ToolLoopAgent</code> que corre en el servidor. Falta que Camila lo
          vea. Lo que distingue a este ecosistema está justo ahí: el stream del agente no es texto que la interfaz tenga que adivinar, sino una secuencia de{' '}
          <Term tip="Eventos SSE con un campo type: start, text-delta, tool-input-available, tool-output-available, finish… Es el protocolo de AI SDK UI.">partes tipadas</Term>{' '}
          que el hook <code>useChat</code> entiende. Texto, llamada a una tool, resultado y solicitud de aprobación llegan por separado y con forma conocida.
        </p>
        <p>
          El camino tiene cinco estaciones. Las dos primeras viven en tu servidor, la tercera es la red y las dos últimas están en el navegador.
        </p>
        <PipelineLab />
        <Callout tone="info" title="En otras nubes">
          En Google Cloud el trabajo equivalente es conectar tu aplicación al stream del agente desplegado, y el formato de la interfaz lo defines tú: mira{' '}
          <Link to="/google/integrar">Integrar el agente</Link>. Aquí el protocolo y el hook vienen en el mismo SDK que el agente.
        </Callout>
      </Section>

      <Section n={2} title="El cable, parte por parte">
        <p>
          Camila pregunta por el pedido 4821. Para responder, Andi necesita dos pasos: en el primero el modelo llama <code>get_order_status</code>; en el segundo
          redacta con el resultado. Por el cable eso son quince o veinte eventos pequeños, y cada uno cambia algo concreto en el mensaje que la interfaz está
          armando. Sigue las tres columnas a la vez.
        </p>
        <WireLab />
        <Callout tone="tip" title="Un mensaje, varias partes">
          Todo lo que el asistente hizo en este turno vive en <strong>un solo mensaje</strong> con sus <code>parts</code> en orden: <code>step-start</code>,{' '}
          <code>tool-get_order_status</code>, <code>step-start</code>, <code>text</code>. No hay un mensaje aparte para la tool. Si tus tools son dinámicas, la
          parte se llama <code>dynamic-tool</code> y el nombre viene en <code>part.toolName</code>.
        </Callout>
      </Section>

      <Section n={3} title="Una tool call se dibuja, no se imprime">
        <p>
          La guía de inicio del AI SDK renderiza la parte de la tool con <code>JSON.stringify</code>, y sirve para ver qué llega. El camino recomendado para
          interfaz generativa es el mismo mecanismo con un componente tuyo: la parte <code>tool-{'{nombre}'}</code> trae <code>state</code>, <code>input</code> y{' '}
          <code>output</code>, y tú eliges qué mostrar en cada estado. Con <code>InferAgentUIMessage&lt;typeof andi&gt;</code> esos campos quedan tipados según el
          esquema de cada tool.
        </p>
        <PartsLab />
        <p>
          No necesitas partir de cero con los componentes: AI Elements trae piezas de chat para React. Ojo con la fecha: el paquete <code>ai-elements</code> queda
          deprecado a fines de noviembre de 2026 y la propia documentación pide instalarlo desde shadcn/ui en proyectos nuevos.
        </p>
      </Section>

      <Section n={4} title="Aprobación humana: el run se detiene y espera">
        <p>
          <code>request_refund</code> mueve dinero. La política de Andes Market dice que sobre $50.000 CLP decide un supervisor. En AI SDK 7 esa regla no va en
          la tool sino en el agente, con <code>toolApproval</code>: un mapa por tool cuya función recibe el input y devuelve <code>'user-approval'</code> cuando
          hace falta una persona. (<code>needsApproval</code> en <code>tool()</code> es el mecanismo anterior y quedó deprecado para{' '}
          <code>ToolLoopAgent</code>, <code>generateText</code> y <code>streamText</code>.)
        </p>
        <Code code={APPROVAL_SERVER_CODE} lang="ts" title="servidor · la regla" highlight={linesOf(APPROVAL_SERVER_CODE, 'toolApproval', 'request_refund: async', "'user-approval'")} />
        <p>
          Cuando la función devuelve <code>'user-approval'</code>, el loop termina sin ejecutar la tool y por el stream sale una parte{' '}
          <code>tool-approval-request</code>. En el mensaje, la parte de la tool queda en <code>approval-requested</code>. Prueba los dos montos y, en el de
          $65.970, las dos decisiones.
        </p>
        <ApprovalLab />
        <Code code={APPROVAL_CLIENT_CODE} lang="ts" title="cliente · los botones" highlight={linesOf(APPROVAL_CLIENT_CODE, "part.state === 'approval-requested'", 'addToolApprovalResponse')} />
        <Callout tone="danger" title="La aprobación viaja desde el cliente: fírmala">
          En el patrón estándar de <code>useChat</code> el historial lo manda el navegador, así que una respuesta de aprobación se podría falsificar. Para tools
          sensibles la documentación indica <code>experimental_toolApprovalSecret: process.env.TOOL_APPROVAL_SECRET</code>: una firma HMAC del nombre de la tool,
          el id y los argumentos. El secreto se genera con <code>openssl rand -base64 32</code> y tiene que ser el mismo en todas las instancias. Es una API{' '}
          <code>experimental_</code>: fija la versión exacta del paquete.
        </Callout>
        <p>
          Tres límites que conviene saber: la respuesta también puede ser automática (<code>'approved'</code>, <code>'denied'</code> o{' '}
          <code>{"{ type: 'denied', reason }"}</code>, sin preguntar a nadie); <code>toolApproval</code> no aplica a tools que ejecuta el proveedor; y las tools de
          un sub-agente no pueden usarlo. Si la aprobación puede tardar horas y el proceso no puede quedarse esperando, eso ya es ejecución durable y se ve en{' '}
          <Link to="/vercel/produccion">Producción</Link>.
        </p>
      </Section>

      <Section n={5} title="La persistencia es tuya">
        <p>
          El AI SDK no guarda conversaciones. En el patrón estándar el servidor reconstruye la conversación con los mensajes que le manda el cliente en cada turno
          y no conserva estado entre requests; <code>ToolLoopAgent</code> corre entero en memoria. Si Camila recarga la página, <code>messages</code> desaparece
          con la pestaña.
        </p>
        <p>
          El patrón recomendado: guardar el arreglo de <code>UIMessage</code> en tu base cuando el stream termina, en el <code>onEnd</code> de{' '}
          <code>toUIMessageStream</code>. Y una vez que el servidor tiene la historia, el cliente puede mandar solo el último mensaje. Activa cada interruptor por
          separado y mira qué se rompe.
        </p>
        <PersistLab />
        <Code
            code={PERSIST_ROUTE_CODE}
            lang="ts"
            title="servidor · cargar, responder, guardar"
            highlight={linesOf(PERSIST_ROUTE_CODE, 'await loadChat(id)', 'originalMessages: messages', 'onEnd: ({ messages })')}
          />
        <div className="vc-ui-codes">
            <Code code={PERSIST_CLIENT_CODE} lang="ts" title="cliente · solo el último mensaje" highlight={linesOf(PERSIST_CLIENT_CODE, 'prepareSendMessagesRequest', 'messages[messages.length - 1]')} />
            <div className="table-wrap" style={{ margin: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Qué</th>
                    <th>Cómo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Qué guardar</td>
                    <td>
                      <code>UIMessage[]</code>, no <code>ModelMessage[]</code>: trae las partes de tool con su output, así la tarjeta se vuelve a dibujar sin
                      llamar a la tool.
                    </td>
                  </tr>
                  <tr>
                    <td>Al cargar</td>
                    <td>
                      <code>validateUIMessages({'{ messages, tools }'})</code> si hay tools, metadata o data parts.
                    </td>
                  </tr>
                  <tr>
                    <td>Si el cliente se va</td>
                    <td>
                      <code>consumeStream</code> quita la contrapresión para que la respuesta se guarde igual.
                    </td>
                  </tr>
                  <tr>
                    <td>Retomar un stream a medias</td>
                    <td>
                      Opción <code>resume</code> de <code>useChat</code> + paquete <code>resumable-stream</code> con Redis. El almacenamiento y los endpoints los
                      construyes tú.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
        </div>
        <Callout tone="info" title="¿Y recordar a Camila entre conversaciones?">
          Eso es memoria de largo plazo y tampoco hay un servicio administrado de primera parte para el AI SDK. La documentación describe tres caminos: una tool
          definida por el proveedor (<code>anthropic.tools.memory_20250818</code>, donde tú implementas el almacenamiento), un proveedor de memoria externo
          (Letta, Mem0, Supermemory y otros) o una tool propia. El concepto general está en <Link to="/fundamentos/memoria">Fundamentos · Memoria</Link>.
        </Callout>
      </Section>

      <Section n={6} title="El código mínimo y sus variantes">
        <p>
          Con el agente ya definido, la interfaz completa son dos archivos. Elige un paso del lab del cable y mira qué líneas trabajan en ese momento: casi todo
          lo que viste ocurre dentro de <code>createAgentUIStreamResponse</code> y de <code>useChat</code>.
        </p>
        <CodeLab />
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Decisión</th>
                <th>Opción</th>
                <th>Cuándo</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td rowSpan={2}>Respuesta del servidor</td>
                <td>
                  <code>createAgentUIStreamResponse({'{ agent, uiMessages }'})</code>
                </td>
                <td>Tienes una instancia de <code>ToolLoopAgent</code> y quieres la ruta más corta.</td>
              </tr>
              <tr>
                <td>
                  <code>createUIMessageStreamResponse</code> + <code>toUIMessageStream</code>
                </td>
                <td>
                  Usas <code>streamText</code> directo o necesitas las opciones de la conversión, como <code>originalMessages</code> y <code>onEnd</code> para
                  guardar.
                </td>
              </tr>
              <tr>
                <td rowSpan={2}>Transporte de useChat</td>
                <td>
                  <code>DefaultChatTransport</code>
                </td>
                <td>
                  El de fábrica: <code>POST /api/chat</code>. Acepta <code>api</code>, <code>headers</code>, <code>credentials</code> y{' '}
                  <code>prepareSendMessagesRequest</code>.
                </td>
              </tr>
              <tr>
                <td>
                  <code>TextStreamChatTransport</code>, <code>WorkflowChatTransport</code>
                </td>
                <td>
                  Las otras dos que trae el SDK. La segunda acompaña a <code>WorkflowAgent</code> y reconecta el stream si se corta; se ve en{' '}
                  <Link to="/vercel/produccion">Producción</Link>.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Callout tone="warn" title="Errores de la primera hora">
          <p>
            <strong>Copiar código de v5 o v6.</strong> <code>result.toUIMessageStreamResponse()</code>, <code>onFinish</code>, <code>fullStream</code>,{' '}
            <code>system</code> y <code>needsApproval</code> son nombres anteriores. En v7 son <code>createUIMessageStreamResponse</code> +{' '}
            <code>toUIMessageStream</code>, <code>onEnd</code>, <code>stream</code>, <code>instructions</code> y <code>toolApproval</code>. Partes de la propia
            documentación todavía muestran los viejos; ante la duda manda la guía de migración a 7.0.
          </p>
          <p>
            <strong>Olvidar el <code>await</code> en <code>convertToModelMessages(messages)</code>.</strong> Es asíncrona.
          </p>
          <p>
            <strong>Usar <code>streamText</code> sin <code>stopWhen</code>.</strong> El valor por defecto es un solo paso: el modelo llama la tool, la tarjeta
            aparece y el texto nunca llega. <code>ToolLoopAgent</code> trae 20 pasos por defecto.
          </p>
          <p>
            <strong>Esperar que <code>useChat</code> maneje el input.</strong> No lo hace: es un <code>useState</code> tuyo y <code>sendMessage({'{ text }'})</code>.
          </p>
        </Callout>
        <p>
          Con esto Andi ya tiene cara. Lo que falta para ponerlo frente a clientes reales (que el run sobreviva a un reinicio, límites de duración, protección
          del endpoint y telemetría) es la parada siguiente: <Link to="/vercel/produccion">Producción</Link>. Si quieres volver a ubicar cada pieza, está el{' '}
          <Link to="/vercel/mapa">mapa de la línea</Link>.
        </p>
      </Section>

      <KeyIdeas
        items={[
          <>
            El servidor convierte el stream del agente en un stream de mensajes de UI (<code>createAgentUIStreamResponse</code>, o{' '}
            <code>createUIMessageStreamResponse</code> + <code>toUIMessageStream</code>) y <code>useChat</code> lo consume: eventos SSE <code>data: {'{json}'}</code>{' '}
            con un <code>type</code>, cerrados por <code>data: [DONE]</code>.
          </>,
          <>
            Orden de un turno con tool: <code>start</code> → <code>start-step</code> → <code>tool-input-start/delta/available</code> →{' '}
            <code>tool-output-available</code> → <code>finish-step</code> → <code>start-step</code> → <code>text-start/delta/end</code> → <code>finish-step</code> →{' '}
            <code>finish</code>.
          </>,
          <>
            Una tool call es una parte <code>tool-{'{nombre}'}</code> del mensaje, con <code>state</code>, <code>input</code>, <code>output</code> y{' '}
            <code>errorText</code>. Dibújala con un componente según el estado.
          </>,
          <>
            <code>toolApproval</code> devuelve <code>'user-approval'</code> y el run se detiene en <code>approval-requested</code>. La decisión vuelve con{' '}
            <code>addToolApprovalResponse({'{ id, approved }'})</code> y la parte termina en <code>output-available</code> o <code>output-denied</code>. Fírmala con{' '}
            <code>experimental_toolApprovalSecret</code>.
          </>,
          <>
            Nada se guarda solo: persiste <code>UIMessage[]</code> en el <code>onEnd</code> de <code>toUIMessageStream</code>, valida al cargar y, si quieres, envía
            solo el último mensaje con <code>prepareSendMessagesRequest</code>.
          </>,
        ]}
      />
      <Sources
        items={[
          { label: 'AI SDK · Getting started con Next.js App Router (route handler + useChat)', href: 'https://ai-sdk.dev/docs/getting-started/nextjs-app-router' },
          { label: 'AI SDK UI · Chatbot (useChat, status, parts)', href: 'https://ai-sdk.dev/docs/ai-sdk-ui/chatbot' },
          { label: 'AI SDK UI · Stream protocol (partes del stream SSE)', href: 'https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol' },
          { label: 'AI SDK UI · Transport', href: 'https://ai-sdk.dev/docs/ai-sdk-ui/transport' },
          { label: 'AI SDK UI · Chatbot tool usage (estados de las partes de tool)', href: 'https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage' },
          { label: 'AI SDK UI · Generative user interfaces', href: 'https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces' },
          { label: 'AI SDK · Tool approvals (toolApproval, addToolApprovalResponse, secreto de firma)', href: 'https://ai-sdk.dev/docs/agents/tool-approvals' },
          { label: 'AI SDK · Building agents (createAgentUIStreamResponse)', href: 'https://ai-sdk.dev/docs/agents/building-agents' },
          { label: 'AI SDK UI · Chatbot message persistence', href: 'https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence' },
          { label: 'AI SDK UI · Resume streams', href: 'https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-resume-streams' },
          { label: 'AI SDK · Memory', href: 'https://ai-sdk.dev/docs/agents/memory' },
          { label: 'AI SDK · Guía de migración a 7.0', href: 'https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0' },
        ]}
      />
    </>
  )
}
