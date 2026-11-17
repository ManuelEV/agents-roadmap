import { Link } from 'react-router'
import { Callout, KeyIdeas, Section, Sources, Term } from '@/components/ui'
import { Code, linesOf } from '@/components/Code'
import { CODE_CURL, CODE_TREE, INVOKE_ERRORS, RUNTIME_ARN, RUNTIME_ID, STACK } from './data'
import { ContractLab, WrapLab } from './WrapLab'
import { CliLab } from './CliLab'
import { SessionsLab } from './SessionsLab'
import { InvokeLab } from './InvokeLab'
import { ConsoleLab } from './ConsoleLab'
import { CostLab } from './CostLab'
import './lesson.css'

function Arn() {
  return (
    <span className="aws-dep-arnseg" title={RUNTIME_ARN}>
      <span>arn:aws:bedrock-agentcore</span>
      <span>us-east-1</span>
      <span>123456789012</span>
      <span className="is-id">runtime/{RUNTIME_ID}</span>
    </span>
  )
}

export default function Lesson() {
  return (
    <>
      <Section n={1} title="De un script a un servicio">
        <p>
          El Andi que armaste en <Link to="/aws/primer-agente">tu primer agente</Link> y ampliaste en{' '}
          <Link to="/aws/herramientas-memoria">herramientas y memoria</Link> es un script: lo ejecutas, responde y termina.{' '}
          <Term tip="Hosting serverless de agentes y tools de Amazon Bedrock AgentCore, con aislamiento por sesión en microVM. Soporta HTTP, MCP, A2A y AG-UI.">
            AgentCore Runtime
          </Term>{' '}
          lo hospeda como servicio: escala solo, aísla cada conversación en su propia microVM y lo expone detrás de una API con IAM. Es la pieza
          que en Google se llama Agent Runtime (<Link to="/google/desplegar">ver esa lección</Link>).
        </p>
        <p>
          Runtime no te pide reescribir el agente ni usar Strands: pide que tu proceso cumpla un contrato HTTP. El paquete{' '}
          <code>bedrock-agentcore</code> lo cumple por ti con una clase y un decorador.
        </p>
        <WrapLab />
        <p>
          Antes de desplegar puedes comprobar el contrato en tu máquina. El wrapper escucha en el puerto 8080 y recibe el mismo JSON que recibirá en
          la nube:
        </p>
        <Code code={CODE_CURL} lang="bash" title="Prueba local del contrato" highlight={linesOf(CODE_CURL, '/invocations')} />
        <ContractLab />
        <Callout tone="warn" title="Tres cosas que el contrato exige y no se ven en el código">
          El proceso debe escuchar en <code>0.0.0.0</code>, el contenedor debe ser <strong>ARM64</strong> (una imagen x86 no arranca) y{' '}
          <code>GET /ping</code> debe responder <code>{'{"status": "Healthy"}'}</code>. <code>"HealthyBusy"</code> mantiene viva la sesión mientras
          hay trabajo en segundo plano.
        </Callout>
      </Section>

      <Section n={2} title="El CLI: create, dev, build, deploy, invoke">
        <p>
          El despliegue se hace con el <strong>AgentCore CLI</strong>, el paquete de npm <code>@aws/agentcore</code> (versión 1.0.3 al 13 de noviembre
          de 2026). Reemplazó al <em>starter toolkit</em> de Python (<code>bedrock-agentcore-starter-toolkit</code>): los tutoriales que usan ese
          toolkit ya no aplican al CLI v1.
        </p>
        <p>
          El CLI genera un proyecto, lo corre en local, lo empaqueta y lo despliega con AWS CDK y CloudFormation. Reproduce la sesión y mira, abajo,
          qué pieza aparece con cada comando.
        </p>
        <CliLab />
        <div className="aws-dep-two">
          <Code code={CODE_TREE} lang="text" title="Lo que genera agentcore create" highlight={linesOf(CODE_TREE, 'agentcore.json', 'main.py')} />
          <div className="stack">
            <Callout tone="warn" title="Dos tropiezos del primer día">
              <p>
                <strong>agentcore --version da error</strong>: el comando viejo de Python tapa al de npm (frecuente en Windows). Solución:{' '}
                <code>pip uninstall bedrock-agentcore-starter-toolkit</code>.
              </p>
              <p>
                <strong>Creaste un harness sin querer</strong>: <code>agentcore create --name X</code> sin <code>--template</code> crea un harness
                gestionado (configuración, no código). Para tu agente Strands pasa <code>--template agent-python-strands</code>.
              </p>
            </Callout>
            <Callout tone="tip" title="Para no dejar nada encendido">
              <code>agentcore remove all --yes && agentcore deploy --yes</code> borra el stack. Revisa además los log groups de CloudWatch.
            </Callout>
          </div>
        </div>

        <h3>Qué queda en tu cuenta</h3>
        <p>
          El stack se llama <code>{STACK}</code> (<code>AgentCore-&lt;proyecto&gt;-&lt;target&gt;</code>). Lo que tu aplicación necesita de todo eso
          es un solo valor, el ARN del runtime:
        </p>
        <p>
          <Arn />
        </p>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Tema</th>
                <th>Lo esencial</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Quién despliega</strong>
                </td>
                <td>
                  Necesita <code>sts:GetCallerIdentity</code>, leer los stacks <code>CDKToolkit</code> y <code>{STACK}</code>, y crear IAM, S3, ECR,
                  CodeBuild, CloudWatch Logs y AgentCore. La managed policy <code>BedrockAgentCoreFullAccess</code> es amplia: solo para desarrollo.
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Rol de ejecución</strong>
                </td>
                <td>
                  Lo asume el principal <code>bedrock-agentcore.amazonaws.com</code>. Permite escribir logs y métricas, X-Ray,{' '}
                  <code>bedrock:InvokeModel</code> y <code>bedrock:InvokeModelWithResponseStream</code>.
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Quién invoca</strong>
                </td>
                <td>
                  <code>bedrock-agentcore:InvokeAgentRuntime</code> sobre el ARN.
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Versiones y endpoints</strong>
                </td>
                <td>
                  Versiones inmutables: cada cambio de configuración crea otra. <code>DEFAULT</code> apunta a la última; puedes crear hasta 10
                  endpoints por agente. Estados: <code>CREATING</code>, <code>READY</code>, <code>UPDATING</code>, <code>CREATE_FAILED</code>,{' '}
                  <code>UPDATE_FAILED</code>.
                </td>
              </tr>
              <tr>
                <td>
                  <strong>CodeZip o contenedor</strong>
                </td>
                <td>
                  CodeZip (plantilla por defecto) sube un zip. Con la plantilla de contenedor, AWS CodeBuild construye la imagen y la sube a Amazon
                  ECR.
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Regiones</strong>
                </td>
                <td>
                  Runtime está en todas las regiones listadas para AgentCore, incluida São Paulo (<code>sa-east-1</code>), que también tiene Memory.
                  Los modelos Claude se invocan con perfiles <code>global.</code>.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section n={3} title="Sesiones: una microVM por conversación">
        <p>
          Cada invocación lleva un <code>runtimeSessionId</code>. Runtime le asigna a ese id una{' '}
          <Term tip="Máquina virtual ligera con CPU, memoria y sistema de archivos propios. Al terminar la sesión se destruye y su memoria se sanea.">
            microVM
          </Term>{' '}
          propia, con CPU, memoria y filesystem aislados. Dos clientes nunca comparten proceso, y el mismo cliente vuelve a su microVM mientras siga
          viva.
        </p>
        <p>
          Sigue viva hasta que pasa 15 minutos sin actividad (<code>idleRuntimeSessionTimeout</code>, configurable entre 60 y 28.800 s) o cumple 8
          horas (<code>maxLifetime</code>). Después se destruye, y con ella todo lo que el agente tenía en memoria.
        </p>
        <SessionsLab />
        <Callout tone="warn" title="Lo que este aislamiento no hace por ti">
          <p>
            <strong>No valida de quién es la sesión.</strong> AgentCore no comprueba la relación usuario ↔ <code>runtimeSessionId</code>: tu backend
            decide qué id le corresponde a cada usuario y no debe aceptar uno que venga del navegador.
          </p>
          <p>
            <strong>No guarda el historial.</strong> <code>agent.messages</code> vive en la microVM. Para que Andi recuerde después de un timeout,
            persiste en AgentCore Memory (lo viste en <Link to="/aws/herramientas-memoria">la lección anterior</Link>) o en <em>session storage</em>.
          </p>
          <p>
            <strong>Un Agent a nivel de módulo se reutiliza dentro de la sesión.</strong> Si varios usuarios pueden caer en la misma sesión, crea el
            agente o su session manager por <code>session_id</code> / <code>actor_id</code> dentro del entrypoint.
          </p>
        </Callout>
      </Section>

      <Section n={4} title="Invocar desde tu aplicación">
        <p>
          <code>agentcore invoke</code> sirve para probar. Tu backend llama a la misma operación, <code>InvokeAgentRuntime</code>, con boto3. La
          respuesta tiene dos campos, y cuál rama de código la lee depende de si tu entrypoint devuelve un valor o hace streaming.
        </p>
        <InvokeLab />
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>HTTP</th>
                <th>Error</th>
                <th>Qué revisar</th>
              </tr>
            </thead>
            <tbody>
              {INVOKE_ERRORS.map((e) => (
                <tr key={e.name} className={e.code === '424' ? 'is-hl' : ''}>
                  <td className="num">{e.code}</td>
                  <td>
                    <code>{e.name}</code>
                  </td>
                  <td>{e.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Callout tone="warn" title="Si el runtime usa OAuth, boto3 no sirve">
          Con inbound auth por JWT no puedes usar <code>invoke_agent_runtime</code> del SDK. Haces HTTPS directo a{' '}
          <code>https://bedrock-agentcore.{'{region}'}.amazonaws.com/runtimes/{'{ARN_ESCAPADO}'}/invocations?qualifier=…</code> con el bearer token. La
          identidad entrante y saliente del agente es tema de <Link to="/aws/gobernar">gobernar</Link>.
        </Callout>
      </Section>

      <Section n={5} title="Dónde mirar en la consola">
        <p>
          No necesitas la consola para desplegar, pero ahí confirmas el estado, copias el ARN y llegas a los logs cuando una invocación falla. La
          consola de AgentCore vive en <code>console.aws.amazon.com/bedrock-agentcore/</code>.
        </p>
        <ConsoleLab />
        <Callout tone="info" title="Qué está verificado y qué no">
          Las URL, los nombres de página (Agents, Memory, Gateways, Built-in tools, Identity, Observability), los pasos de{' '}
          <em>Create Host agent (runtime)</em> y las pestañas de Observability salen de la documentación. Las etiquetas exactas del menú lateral y
          las columnas de cada tabla están a confirmar en la documentación.
        </Callout>
      </Section>

      <Section n={6} title="Cuánto cuesta">
        <p>
          Runtime cobra por consumo: vCPU-hora y GB-hora, facturados por segundo sobre lo que el agente usa activamente. Hay dos <em>platform
          versions</em> con precio distinto: V1 es la que se usa por defecto; V2 arranca desde un snapshot y permite subir hasta 8 vCPU / 32 GB por
          sesión.
        </p>
        <CostLab />
        <Callout tone="tip" title="Probar gastando poco">
          El desarrollo local (<code>agentcore dev</code>) solo consume tokens del modelo. En Runtime, una sesión de prueba de pocos minutos cuesta
          fracciones de centavo; baja <code>idleRuntimeSessionTimeout</code> o cierra la sesión con <code>StopRuntimeSession</code>.
        </Callout>
        <p>
          Con el agente desplegado falta decidir quién puede invocarlo, qué puede hacer cada herramienta y cómo ver lo que hizo: Identity, Policy,
          Guardrails y observabilidad, en <Link to="/aws/gobernar">la siguiente lección</Link>. Si quieres volver a ubicar cada pieza, está{' '}
          <Link to="/aws/mapa">el mapa</Link>.
        </p>
      </Section>

      <KeyIdeas
        items={[
          <>
            El agente no cambia: <code>BedrockAgentCoreApp()</code> + <code>@app.entrypoint</code> + <code>app.run()</code> lo convierten en un
            servicio que atiende <code>POST /invocations</code> en el puerto 8080 (MCP 8000, A2A 9000), en <code>0.0.0.0</code> y ARM64.
          </>,
          <>
            El flujo actual es el AgentCore CLI de npm: <code>agentcore create --template agent-python-strands</code> → <code>dev</code> →{' '}
            <code>build</code> → <code>deploy</code> → <code>status --json</code> → <code>invoke</code>. El starter toolkit de Python quedó
            reemplazado.
          </>,
          <>
            El deploy crea un stack de CloudFormation con rol de ejecución, runtime versionado, endpoint <code>DEFAULT</code>, memoria y log group.
            Tu aplicación solo necesita el ARN.
          </>,
          <>
            Una microVM por <code>runtimeSessionId</code> (33 caracteres o más). Muere a los 15 minutos sin actividad o a las 8 horas, y con ella
            el estado en memoria.
          </>,
          <>
            <code>invoke_agent_runtime(agentRuntimeArn, runtimeSessionId, payload, qualifier)</code> devuelve <code>contentType</code> y un stream{' '}
            <code>response</code>: JSON o SSE. Payload máximo 100 MB; petición síncrona, 15 minutos.
          </>,
          <>V1 por consumo en us-east-1: $0.0895 por vCPU-hora + $0.00945 por GB-hora (15-nov-2026). El modelo se cobra aparte.</>,
        ]}
      />
      <Sources
        items={[
          { label: 'AgentCore · empezar con el CLI (create, dev, deploy, invoke)', href: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agentcore-get-started-cli.html' },
          { label: 'AgentCore Runtime · contrato de servicio (puertos, rutas, /ping)', href: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-service-contract.html' },
          { label: 'AgentCore Runtime · cómo funciona (versiones, endpoints, API)', href: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-how-it-works.html' },
          { label: 'AgentCore Runtime · sesiones', href: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-sessions.html' },
          { label: 'AgentCore · límites y cuotas', href: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/bedrock-agentcore-limits.html' },
          { label: 'AgentCore Runtime · invocar un agente (boto3, errores)', href: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-invoke-agent.html' },
          { label: 'AgentCore · observabilidad (ejemplo de BedrockAgentCoreApp)', href: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-get-started.html' },
          { label: 'AgentCore · regiones', href: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agentcore-regions.html' },
          { label: 'AgentCore · precios', href: 'https://aws.amazon.com/bedrock/agentcore/pricing/' },
        ]}
      />
    </>
  )
}
