import { Link } from 'react-router'
import { Callout, KeyIdeas, Section, Sources, Tabs, Term } from '@/components/ui'
import { Code, linesOf } from '@/components/Code'
import { PipelineLab } from './PipelineLab'
import { IdentityLab } from './IdentityLab'
import { PolicyLab } from './PolicyLab'
import { GuardrailLab } from './GuardrailLab'
import { TraceLab } from './TraceLab'
import { CODE_G_APPLY, CODE_G_STRANDS } from './data'
import './lesson.css'

const AC = 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/'
const BR = 'https://docs.aws.amazon.com/bedrock/latest/userguide/'

export default function Lesson() {
  return (
    <>
      <Section n={1} title="Cuatro controles que responden preguntas distintas">
        <p>
          Andi ya corre en <Link to="/aws/desplegar">AgentCore Runtime</Link> y llega a sus herramientas por el <Link to="/aws/herramientas-memoria">Gateway</Link>.
          Falta lo que separa una demo de algo que puedes dejar frente a clientes: que nadie le haga decir o hacer lo que no debe, y que puedas demostrar qué hizo.
          El system prompt no alcanza: es texto que el modelo puede desobedecer.
        </p>
        <p>
          AWS reparte ese trabajo en piezas que no se pisan. <strong>Bedrock Guardrails</strong> mira <em>contenido</em>. <strong>Policy</strong> decide{' '}
          <em>acciones</em>, una tool call a la vez. <strong>Identity</strong> define <em>en nombre de quién</em> se ejecuta cada una. <strong>Observability</strong> y{' '}
          <strong>Evaluations</strong> cuentan qué pasó y qué tan bien. Elige un caso y mira cuál lo detiene; fíjate también en las que no se enteran. La idea general
          de capas está en <Link to="/fundamentos/guardrails">Fundamentos · Guardrails</Link>.
        </p>
        <PipelineLab />
        <Callout tone="tip" title="Ninguna capa cubre los cuatro casos">
          Un filtro de contenido no sabe de montos, una regla de montos no sabe de quién es un pedido y la identidad no sabe si un texto es un ataque. Por eso se
          apilan. En Google el reparto equivalente es Model Armor, las políticas de Agent Gateway y Agent Identity: está en{' '}
          <Link to="/google/seguridad">Google · Seguridad</Link>.
        </Callout>
      </Section>

      <Section n={2} title="Identity: con qué credencial llama Andi">
        <p>
          En AgentCore cada agente es una{' '}
          <Term tip="Identidad propia del agente, registrada en el directorio workload-identity-directory/default. El runtime la usa para pedir workload access tokens (GetWorkloadAccessToken, …ForJWT, …ForUserId).">
            workload identity
          </Term>
          . Hacia dentro (<em>inbound</em>), el runtime acepta IAM con SigV4 u OAuth 2.0 con JWT. Hacia fuera (<em>outbound</em>), las credenciales de cada sistema
          externo viven en <em>credential providers</em> dentro del <strong>token vault</strong>, y la tool recibe solo un access token ya emitido.
        </p>
        <p>
          La decisión que importa es el modo. <strong>User-delegated</strong> (OAuth de tres patas, <code>USER_FEDERATION</code>): la tool actúa como Camila y solo
          puede lo que ella puede. <strong>Autonomous</strong> (dos patas, <code>M2M</code>): actúa como el agente, igual para todos los usuarios.
        </p>
        <IdentityLab />
        <Callout tone="warn" title="Lo que Identity no hace por ti">
          AgentCore no valida la relación entre un usuario y un <code>runtimeSessionId</code>: que Camila no pueda continuar la sesión de otra persona es tarea de
          tu backend. Y con credenciales del agente (M2M), para el sistema externo todo lo hizo «el agente»: la autorización fina queda en tu tool.
        </Callout>
        <p className="small muted">
          Para sistemas que solo aceptan una clave existe <code>requires_api_key</code> en el mismo módulo. Pedir tokens cuesta $0.010 por cada 1.000, y nada si
          pasa por Runtime o Gateway (visto el 15-nov-2026).
        </p>
      </Section>

      <Section n={3} title="Policy: la regla del reembolso, fuera del código">
        <p>
          La política de Andes Market dice que un reembolso sobre $50.000 necesita un supervisor. Puedes escribirlo en el prompt (el modelo quizá lo respete) o en la
          tool (cada equipo lo reimplementa). <strong>Policy in AgentCore</strong> lo saca de ambos: un <em>policy engine</em> adjunto al Gateway intercepta cada
          tool call y la evalúa contra políticas escritas en <strong>Cedar</strong> o en <strong>Dogwood</strong>, un superset de Cedar que la documentación ya
          recomienda y que añade condiciones temporales.
        </p>
        <p>
          Una política nombra un principal (<code>AgentCore::OAuthUser</code> o <code>AgentCore::IamEntity</code>), una acción (el nombre de la tool en el Gateway,{' '}
          <code>Target___tool</code>) y un recurso (el ARN del gateway). La condición lee los argumentos de la llamada en <code>context.input</code>.
        </p>
        <PolicyLab />
        <Callout tone="warn" title="Tres tropiezos documentados">
          <p>
            El orden importa: despliega primero el gateway, porque la política necesita su ARN real. El servicio rechaza políticas con recurso comodín (
            <code>permit(principal, action, resource);</code>). Y la validación por defecto es <code>FAIL_ON_ANY_FINDINGS</code>: si solo quieres validar el
            esquema, <code>--validation-mode ignore-all-findings</code>.
          </p>
        </Callout>
      </Section>

      <Section n={4} title="Bedrock Guardrails: qué filtra y qué no ve">
        <p>
          Un guardrail es un recurso de Bedrock con hasta seis tipos de política: content filters (donde vive <strong>Prompt Attack</strong>), denied topics, word
          filters, filtros de información sensible, contextual grounding y Automated Reasoning, que valida respuestas contra reglas lógicas. Lo creas una vez en la
          consola de Bedrock (panel izquierdo → <strong>Guardrails</strong> → <strong>Create guardrail</strong>) y lo referencias por id y versión.
        </p>
        <p>
          Hay dos maneras de usarlo. En línea, pegado al modelo: Converse lo aplica a la entrada y a la salida. O suelto, con <code>ApplyGuardrail</code>: le pasas
          un texto y te devuelve un veredicto sin invocar ningún modelo, así que sirve para cualquier proveedor. El lab simula esa segunda forma.
        </p>
        <GuardrailLab />
        <Tabs
          tabs={[
            {
              id: 'strands',
              label: 'Pegado al modelo en Strands',
              content: (
                <Code
                  code={CODE_G_STRANDS}
                  lang="python"
                  title="app/agent/model/load.py"
                  highlight={linesOf(CODE_G_STRANDS, 'guardrail_id=', 'guardrail_version=', 'guardrail_intervened')}
                />
              ),
            },
            {
              id: 'apply',
              label: 'Suelto: ApplyGuardrail',
              content: <Code code={CODE_G_APPLY} lang="python" title="guard.py" highlight={linesOf(CODE_G_APPLY, 'apply_guardrail(', 'source=', 'GUARDRAIL_INTERVENED')} />,
            },
          ]}
        />
        <p>
          Con <code>ApplyGuardrail</code> puedes montar un <em>modo sombra</em> antes de bloquear a nadie: un hook de Strands en <code>MessageAddedEvent</code> o{' '}
          <code>AfterInvocationEvent</code> que evalúa y solo registra lo que habría pasado.
        </p>
        <Callout tone="danger" title="Puntos ciegos documentados">
          <p>
            <strong>Resultados de tools.</strong> Prompt Attack no evalúa <code>toolResult</code> ni las definiciones de tools: no detiene la inyección indirecta.
            Para eso, Guardrails dentro de Policy en el Gateway.
          </p>
          <p>
            <strong>InvokeModel sin tags.</strong> Con esa API tienes que envolver el input del usuario en tags <code>amazon-bedrock-guardrails-guardContent</code>;
            sin tags, Prompt Attack no filtra nada.
          </p>
          <p>
            <strong>bedrock-mantle.</strong> El endpoint compatible con OpenAI y Anthropic no soporta Guardrails. Solo <code>bedrock-runtime</code>.
          </p>
          <p>
            <strong>Un payload que no es texto.</strong> Si tu entrypoint no valida que <code>prompt</code> sea un string, un bloque <code>toolUse</code> podría
            ejecutar la tool directamente, sin pasar por el modelo ni por el guardrail.
          </p>
        </Callout>
      </Section>

      <Section n={5} title="Observability y Evaluations: qué pasó y qué tan bien">
        <p>
          Los controles anteriores dejan rastro: decisiones de Policy, intervenciones del guardrail, llamadas a tools. Todo llega a Amazon CloudWatch en formato
          OpenTelemetry, y <strong>AgentCore Evaluations</strong> usa esas mismas trazas como materia prima para puntuar al agente. El porqué de medir así está en{' '}
          <Link to="/fundamentos/observabilidad">Fundamentos · Observabilidad</Link>.
        </p>
        <TraceLab />
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Pieza</th>
                <th>Cómo se obtiene</th>
                <th>Precio (visto el 15-nov-2026)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Trazas de un agente en Runtime</td>
                <td>
                  Automáticas con <code>agentcore deploy</code>
                </td>
                <td>El de Amazon CloudWatch</td>
              </tr>
              <tr>
                <td>Trazas de un agente fuera de Runtime</td>
                <td>
                  <code>aws-opentelemetry-distro</code> + <code>strands-agents[otel]</code>, <code>AGENT_OBSERVABILITY_ENABLED=true</code> y{' '}
                  <code>opentelemetry-instrument python agent.py</code>
                </td>
                <td>El de Amazon CloudWatch</td>
              </tr>
              <tr>
                <td>Evaluadores built-in</td>
                <td>
                  <code>agentcore add online-eval</code> (continuo, con muestreo); también on-demand y batch
                </td>
                <td>$2.40 / $12.00 por 1M de tokens de entrada / salida (batch: $1.80 / $9.00)</td>
              </tr>
              <tr>
                <td>Evaluadores custom</td>
                <td>Un LLM con tu rúbrica o código en Lambda</td>
                <td>$1.50 por 1.000 evaluaciones, más el uso del modelo</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Callout tone="info" title="Si las trazas no aparecen">
          Casi siempre es una de dos: falta CloudWatch Transaction Search (en la consola de CloudWatch: Application Signals (APM) → Transaction search → Enable
          Transaction Search) o no pasaron los ~10 minutos iniciales. Para seguir una conversación entera, propaga <code>session.id</code> como baggage de
          OpenTelemetry.
        </Callout>
      </Section>

      <Section n={6} title="Cierre de la sección AWS">
        <p>
          Con esto Andi está completo en AWS: construido con Strands, conectado por Gateway, con memoria, desplegado en Runtime y gobernado por cuatro piezas que
          no dependen de que el modelo se porte bien. La misma historia existe en las otras secciones con otros nombres; para ver las piezas lado a lado, sigue en{' '}
          <Link to="/comparar">Comparar ecosistemas</Link>.
        </p>
      </Section>

      <KeyIdeas
        items={[
          <>
            <strong>Identity</strong>: el agente es una workload identity; <code>USER_FEDERATION</code> actúa como la usuaria, <code>M2M</code> como el agente. Los
            secretos y refresh tokens se quedan en el token vault.
          </>,
          <>
            <strong>Policy</strong>: un engine en el Gateway, modo ENFORCE, deny por defecto y <code>forbid</code> sobre <code>permit</code>. El tope del reembolso es{' '}
            <code>when {'{ context.input.amount_clp <= 50000 }'}</code>, no una frase del prompt.
          </>,
          <>
            <strong>Guardrails</strong>: seis tipos de política, tiers Standard y Classic; pegado a <code>BedrockModel</code> con <code>guardrail_id</code> o suelto con{' '}
            <code>ApplyGuardrail</code>. Tu código lo nota en <code>stop_reason == "guardrail_intervened"</code>.
          </>,
          <>Prompt Attack no mira resultados de tools: la inyección indirecta se ataja con Guardrails dentro de Policy y, detrás, con la regla de monto.</>,
          <>
            Las trazas salen solas al desplegar en Runtime (CloudWatch, OpenTelemetry); los evaluadores <code>Builtin.*</code> las puntúan con{' '}
            <code>agentcore add online-eval</code>.
          </>,
        ]}
      />
      <Sources
        items={[
          { label: 'AgentCore Identity', href: `${AC}identity.html` },
          { label: 'Identity · autenticación y decoradores', href: `${AC}identity-authentication.html` },
          { label: 'Policy in AgentCore · primeros pasos', href: `${AC}policy-getting-started.html` },
          { label: 'Policy · conceptos', href: `${AC}policy-core-concepts.html` },
          { label: 'Bedrock Guardrails', href: `${BR}guardrails.html` },
          { label: 'Guardrails · prompt attacks', href: `${BR}guardrails-prompt-attack.html` },
          { label: 'Guardrails · tiers', href: `${BR}guardrails-tiers.html` },
          { label: 'API ApplyGuardrail', href: 'https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ApplyGuardrail.html' },
          { label: 'Strands · Guardrails', href: 'https://strandsagents.com/docs/user-guide/sdk/safety-security/guardrails/' },
          { label: 'AgentCore Observability · primeros pasos', href: `${AC}observability-get-started.html` },
          { label: 'AgentCore Evaluations', href: `${AC}evaluations.html` },
          { label: 'Precios de AgentCore', href: 'https://aws.amazon.com/bedrock/agentcore/pricing/' },
        ]}
      />
    </>
  )
}
