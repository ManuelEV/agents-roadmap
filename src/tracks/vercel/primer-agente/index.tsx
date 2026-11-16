import { Link } from 'react-router'
import { Callout, KeyIdeas, Section, Sources, Term } from '@/components/ui'
import { Code } from '@/components/Code'
import { AnatomyLab, McpLab, ModelLab, SchemaLab, TerminalLab } from './StaticLabs'
import { LoopLab, RunLab } from './LoopLabs'
import { PREPARE_STEP_CODE } from './data'
import './lesson.css'

export default function Lesson() {
  return (
    <>
      <Section n={1} title="Un agente es un archivo">
        <p>
          Con el AI SDK, Andi cabe en un archivo TypeScript: una instancia de <code>ToolLoopAgent</code> con un modelo, unas instrucciones y un objeto de tools. La
          clase vive en el paquete <code>ai</code> y corre el <Link to="/fundamentos/loop-agente">ciclo del agente</Link> por ti: llama al modelo, ejecuta las tools que
          pida y vuelve a llamar, hasta que haya respuesta.
        </p>
        <p>
          Es el equivalente en concepto de <code>LlmAgent</code> en ADK (<Link to="/google/primer-agente">la misma parada en la línea de Google</Link>), con una
          diferencia de estilo: aquí la tool no se deduce de una firma y un docstring, la declaras tú con <code>tool()</code> y un esquema.
        </p>
        <AnatomyLab />
        <Callout tone="tip" title="La description es parte del prompt">
          El modelo decide si llama a <code>getOrderStatus</code> leyendo su nombre, su <code>description</code> y su esquema; no ve el cuerpo de <code>execute</code>.
          Una descripción que dice cuándo usarla ahorra llamadas erradas.
        </Callout>
      </Section>

      <Section n={2} title="Lo que el modelo recibe">
        <p>
          <code>inputSchema</code> hace tres trabajos con una sola declaración. Se convierte en el{' '}
          <Term tip="Formato estándar para describir la forma de un objeto JSON: tipos, propiedades, cuáles son obligatorias.">JSON Schema</Term> que viaja al modelo
          junto con el nombre y la descripción, valida el input que el modelo devuelve antes de que corra tu función, y le da tipos al argumento de{' '}
          <code>execute</code>.
        </p>
        <p>
          Cada cambio en el esquema cambia lo que el modelo lee. Prueba los tres interruptores y después manda inputs mal formados para ver en qué etapa se
          detienen.
        </p>
        <SchemaLab />
        <p>
          Esta es una <em>function tool</em>, el tipo más común. El SDK tiene otros tres: tools dinámicas (<code>dynamicTool()</code>, con input{' '}
          <code>unknown</code>), tools definidas por el proveedor que ejecutas tú, y tools que ejecuta el proveedor sin pasar por tu código. Para todo lo que es
          conceptual sobre herramientas, mira <Link to="/fundamentos/herramientas">Herramientas</Link>.
        </p>
      </Section>

      <Section n={3} title="Una corrida por dentro">
        <p>
          Un <strong>paso</strong> es una llamada al modelo más la ejecución de las tools que esa llamada pidió. La pregunta de Camila toma dos: en el primero el
          modelo pide <code>getOrderStatus</code> y el SDK la ejecuta; en el segundo el modelo redacta con el resultado a la vista.
        </p>
        <p>
          Sigue la corrida y mira cómo crece <code>result.steps</code>. Es el mismo arreglo que recibirás en tu código, con los mismos campos.
        </p>
        <RunLab />
        <h3>La forma del resultado</h3>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Campo</th>
                <th>Qué trae</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>result.text</code>
                </td>
                <td>El texto del último paso. Si el loop se cortó en una tool call, llega vacío.</td>
              </tr>
              <tr>
                <td>
                  <code>result.steps[i]</code>
                </td>
                <td>
                  <code>text</code>, <code>toolCalls</code>, <code>toolResults</code>, <code>finishReason</code>, <code>usage</code> (<code>inputTokens</code>,{' '}
                  <code>outputTokens</code>, <code>totalTokens</code>) y <code>performance</code> con los tiempos del paso.
                </td>
              </tr>
              <tr>
                <td>tool call</td>
                <td>
                  <code>{'{ toolCallId, toolName, input }'}</code>. Con tools definidas con <code>tool()</code>, <code>input</code> está tipado.
                </td>
              </tr>
              <tr>
                <td>tool result</td>
                <td>
                  <code>{"{ type: 'tool-result', toolCallId, toolName, output }"}</code>. El <code>toolCallId</code> lo empareja con su llamada.
                </td>
              </tr>
              <tr>
                <td>
                  <code>result.toolCalls</code> · <code>result.toolResults</code>
                </td>
                <td>Las llamadas y resultados de todos los pasos, juntos.</td>
              </tr>
              <tr>
                <td>
                  <code>result.usage</code> · <code>result.finalStep</code>
                </td>
                <td>
                  Tokens sumados de todos los pasos, y el último paso (su uso es <code>finalStep.usage</code>).
                </td>
              </tr>
              <tr>
                <td>
                  <code>result.responseMessages</code>
                </td>
                <td>
                  Los mensajes que generó la corrida. Para seguir la conversación: <code>messages.push(...result.responseMessages)</code>.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section n={4} title="Cuándo se detiene el loop">
        <p>
          El loop termina por cuatro motivos: el modelo responde sin pedir tools, se llama una tool que no tiene <code>execute</code>, una tool call necesita
          aprobación (eso es de <Link to="/vercel/interfaz">la parada de interfaz</Link>), o se cumple una condición de <code>stopWhen</code>. Esa condición solo
          se evalúa cuando el último paso tiene resultados de tools.
        </p>
        <p>
          El valor por defecto depende de dónde estés: <code>ToolLoopAgent</code> usa <code>isStepCount(20)</code>; <code>generateText</code> y{' '}
          <code>streamText</code> usan <code>isStepCount(1)</code>. Con una pregunta que necesita tres tools se nota la diferencia.
        </p>
        <LoopLab />
        <Callout tone="warn" title="El síntoma de un límite corto: respuesta vacía">
          Si el modelo llama la tool y tu usuario no recibe texto, casi siempre es <code>generateText</code> o <code>streamText</code> sin <code>stopWhen</code>:
          corrió un solo paso. Con <code>ToolLoopAgent</code> el default es 20, pero conviene escribir tu propio tope igual.
        </Callout>
        <h3>prepareStep: decidir antes de cada paso</h3>
        <p>
          <code>prepareStep</code> recibe, entre otras cosas, los pasos ya hechos y los mensajes, y puede devolver otro <code>model</code>, un subconjunto en{' '}
          <code>activeTools</code>, un <code>toolChoice</code>, otras <code>instructions</code> o mensajes recortados. Dos detalles de v7: los ajustes de modelo
          valen solo para ese paso, pero un <code>messages</code> devuelto queda como base de los pasos siguientes.
        </p>
        <Code code={PREPARE_STEP_CODE} lang="ts" title="stopWhen con arreglo + prepareStep" highlight={[4, 6, 7, 8, 9]} />
        <p>
          Hay tres condiciones incluidas: <code>isStepCount(n)</code>, <code>hasToolCall(...nombres)</code> e <code>isLoopFinished()</code>, que nunca dispara y deja
          correr el loop hasta que el modelo termine. También puedes pasar una función propia que recibe <code>{'{ steps }'}</code>. Si le pides salida estructurada
          al agente con <code>output: Output.object({'{ schema }'})</code>, generarla cuenta como un paso más: súmalo a tu límite.
        </p>
      </Section>

      <Section n={5} title="Cambiar de modelo es cambiar un string">
        <p>
          El id tiene el formato <code>"proveedor/modelo"</code>. Como AI Gateway es el proveedor por defecto del SDK, ese string basta: no instalas un paquete
          por proveedor ni cambias el resto del agente. Qué es el gateway, cómo se autentica y cómo arma respaldos entre modelos está en{' '}
          <Link to="/vercel/mapa">el mapa de la línea</Link>.
        </p>
        <ModelLab />
        <p>
          Si prefieres hablar directo con un proveedor, instalas su paquete (<code>pnpm add @ai-sdk/openai</code>) y pasas <code>openai('gpt-6-astra')</code> en{' '}
          <code>model</code>. La lista viva de ids y precios está en <code>https://ai-gateway.vercel.sh/v1/models</code>, sin API key.
        </p>
      </Section>

      <Section n={6} title="Instalarlo y correrlo">
        <p>
          Tres paquetes de ejecución (<code>ai</code>, <code>zod</code>, <code>dotenv</code>), tres de desarrollo y una variable de entorno:{' '}
          <code>AI_GATEWAY_API_KEY</code> en <code>.env.local</code>. El script tiene que cargar ese archivo al arrancar (para eso está <code>dotenv</code>; la línea exacta
          está en la guía de Node.js enlazada abajo). No hace falta desplegar nada en Vercel para usar el gateway, solo la cuenta para crear la key.
        </p>
        <TerminalLab />
        <Callout tone="warn" title="Tres errores de la primera hora">
          <p>
            <strong>Copiar código de v5 o v6.</strong> <code>stepCountIs</code>, <code>maxSteps</code>, <code>parameters</code>, <code>system</code> y{' '}
            <code>onFinish</code> son de versiones anteriores. En v7 se escriben <code>isStepCount</code>, <code>stopWhen</code>, <code>inputSchema</code>,{' '}
            <code>instructions</code> y <code>onEnd</code>. Para migrar un proyecto: <code>npx @ai-sdk/codemod v7</code>.
          </p>
          <p>
            <strong>CommonJS o un Node antiguo.</strong> AI SDK 7 es solo ESM y pide Node.js 22 o superior: <code>require()</code> no funciona; usa{' '}
            <code>"type": "module"</code> o archivos <code>.mjs</code>.
          </p>
          <p>
            <strong>Correr sin credencial.</strong> Sin <code>AI_GATEWAY_API_KEY</code> ni token OIDC de Vercel, la primera llamada falla con{' '}
            <code>GatewayAuthenticationError</code>.
          </p>
        </Callout>
        <Callout tone="tip" title="Probar sin gastar tokens">
          El SDK trae un modelo simulado: <code>MockLanguageModelV4</code> desde <code>ai/test</code>. Su <code>doGenerate</code> acepta un arreglo de respuestas
          (primero una tool call, después texto), suficiente para probar el loop completo de Andi en un test.
        </Callout>
      </Section>

      <Section n={7} title="Tools que vienen de un servidor MCP">
        <p>
          No todas las tools tienen que estar escritas en tu archivo. Si el ERP de Andes Market expone el stock por{' '}
          <Link to="/fundamentos/mcp">MCP</Link>, el cliente de <code>@ai-sdk/mcp</code> descubre esas tools y las entrega en el formato que el agente ya
          entiende.
        </p>
        <McpLab />
        <Callout tone="info" title="Las anotaciones de un servidor MCP no son política">
          Las pistas <code>readOnlyHint</code> o <code>destructiveHint</code> llegan en <code>toolCall.toolMetadata.annotations</code>, pero vienen del servidor
          y el SDK no las convierte en reglas. Decidir qué tool necesita aprobación es tuyo: se hace con <code>toolApproval</code>, en{' '}
          <Link to="/vercel/interfaz">la parada de interfaz</Link>.
        </Callout>
        <p>
          Andi ya responde, pero corre entero en memoria: si el proceso muere a mitad del loop, el progreso se pierde. Volverlo durable, desplegarlo y ponerle
          guardrails y trazas es <Link to="/vercel/produccion">la parada de producción</Link>.
        </p>
      </Section>

      <KeyIdeas
        items={[
          <>
            <code>new ToolLoopAgent({'{ model, instructions, tools, stopWhen }'})</code> y <code>agent.generate({'{ prompt }'})</code>: eso es un agente completo en
            AI SDK 7.
          </>,
          <>
            <code>tool({'{ description, inputSchema, execute }'})</code>: el esquema se vuelve la definición que lee el modelo, valida su input y tipa tu función.
          </>,
          <>
            Un paso es una llamada al modelo más sus tools. <code>result.steps</code> guarda cada uno con <code>toolCalls</code>, <code>toolResults</code>,{' '}
            <code>finishReason</code> y <code>usage</code>; <code>result.text</code> es solo el texto del último.
          </>,
          <>
            El tope por defecto es <code>isStepCount(20)</code> en <code>ToolLoopAgent</code> y <code>isStepCount(1)</code> en <code>generateText</code> y{' '}
            <code>streamText</code>. Un corte temprano devuelve <code>text</code> vacío.
          </>,
          <>
            El modelo es un string <code>"proveedor/modelo"</code> que pasa por AI Gateway; cambiarlo no toca el resto del agente.
          </>,
          <>
            <code>createMCPClient</code> + <code>mcpClient.tools()</code> convierten un servidor MCP en tools del agente. Cierra siempre el cliente.
          </>,
        ]}
      />
      <Sources
        items={[
          { label: 'AI SDK · Agents: overview (ToolLoopAgent, ejemplo mínimo)', href: 'https://ai-sdk.dev/docs/agents/overview' },
          { label: 'AI SDK · Building agents (opciones del constructor, salida estructurada)', href: 'https://ai-sdk.dev/docs/agents/building-agents' },
          { label: 'AI SDK · Loop control (stopWhen, prepareStep, valores por defecto)', href: 'https://ai-sdk.dev/docs/agents/loop-control' },
          { label: 'AI SDK · Tools and tool calling (tool(), inputSchema, pasos)', href: 'https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling' },
          { label: 'AI SDK · MCP tools (createMCPClient, transportes)', href: 'https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools' },
          { label: 'AI SDK · Getting started con Node.js (instalación)', href: 'https://ai-sdk.dev/docs/getting-started/nodejs' },
          { label: 'AI SDK · Guía de migración a 7.0 (nombres renombrados)', href: 'https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0' },
          { label: 'AI SDK · Testing (MockLanguageModelV4)', href: 'https://ai-sdk.dev/docs/ai-sdk-core/testing' },
          { label: 'AI Gateway · API de modelos (ids y precios)', href: 'https://ai-gateway.vercel.sh/v1/models' },
        ]}
      />
    </>
  )
}
