import { Link } from 'react-router'
import { Callout, KeyIdeas, Section, Sources, Term } from '@/components/ui'
import { PRICE_DATE, RENAMES } from './data'
import { LayersCodeLab, PathLab, PieceMap } from './MapLabs'
import { EquivLab, ModelCostLab, TimelineLab } from './DataLabs'
import './lesson.css'

const NEXT: { slug: string; title: string; what: string }[] = [
  { slug: 'primer-agente', title: 'Tu primer agente', what: 'Strands en tu máquina: Agent, @tool y BedrockModel respondiendo por el pedido 4821.' },
  { slug: 'herramientas-memoria', title: 'Herramientas y memoria', what: 'MCP, AgentCore Gateway y AgentCore Memory.' },
  { slug: 'desplegar', title: 'Desplegar', what: 'AgentCore Runtime y el AgentCore CLI.' },
  { slug: 'gobernar', title: 'Gobernar', what: 'Identity, Policy, Guardrails y observabilidad.' },
]

export default function Lesson() {
  return (
    <>
      <Section n={1} title="Tres nombres, tres capas">
        <p>
          En AWS un agente se arma con tres cosas que tienen marca propia. <strong>Strands Agents</strong> es el framework open source con el que escribes el
          agente. <strong>Amazon Bedrock</strong> es la inferencia: los modelos y lo que los rodea. <strong>Amazon Bedrock AgentCore</strong> es la operación:
          dónde corre el agente, cómo llega a sus herramientas, qué recuerda y quién lo controla.
        </p>
        <p>
          Las tres capas son independientes. AgentCore hospeda agentes de otros frameworks (LangGraph, CrewAI, Google ADK…) y Strands puede hablar con modelos
          que no están en Bedrock. AgentCore, además, no es un producto sino más de una docena de servicios que se usan juntos o por separado. El mapa los ordena y te
          dice cuáles ya son <Term tip="Generally Available: disponible de forma general, con soporte de producción.">GA</Term> y cuáles no.
        </p>
        <PieceMap />
        <Callout tone="warn" title="Si un tutorial habla de action groups, es de la generación anterior">
          El servicio de 2023, Amazon Bedrock Agents, ahora se llama <strong>Amazon Bedrock Agents Classic</strong>: está en modo mantenimiento y no acepta
          clientes nuevos desde el 30-jul-2026. Comparte la palabra «Bedrock» con AgentCore, pero no es lo mismo ni se programa igual.
        </Callout>
      </Section>

      <Section n={2} title="Por dónde pasa una pregunta">
        <p>
          Una lista de servicios no explica cómo encajan. Sigue una sola pregunta de Camila, «¿Dónde está mi pedido 4821?», desde la app de Andes Market hasta
          la respuesta. En cada paso el panel de código muestra lo que realmente viaja: la llamada, la cabecera, el evento o la política.
        </p>
        <PathLab />
        <Callout tone="info" title="Lo que este recorrido simplifica">
          Es el despliegue completo, con todo encendido. No necesitas todas las piezas para empezar: en{' '}
          <Link to="/aws/primer-agente">la siguiente lección</Link> la herramienta es una función Python local y no hay Gateway, Memory ni Policy. Tampoco aparece
          la autenticación saliente de Identity ni el <Link to="/fundamentos/mcp">detalle del protocolo MCP</Link>.
        </Callout>
      </Section>

      <Section n={3} title="Qué modelo y cuánto cuesta">
        <p>
          Bedrock tiene decenas de modelos; para un agente importan tres roles. El <strong>orquestador</strong> decide y redacta, los{' '}
          <strong>workers</strong> ejecutan tareas acotadas y un <strong>router</strong> barato clasifica antes de gastar. En la práctica el modelo principal
          para agentes en AWS es Claude, y Amazon Nova cubre el extremo barato. La recomendación por rol es de esta guía, no una cita de AWS.
        </p>
        <p>
          Dos cosas cambian la factura más que el precio de lista: cuántas veces se llama al modelo por pregunta y cuántos tokens de entrada se reenvían cada
          vez. Mueve la entrada por encima de 100K con Haiku 5.5 seleccionado, o por encima de 128K con Nova Micro, y mira qué pasa.
        </p>
        <ModelCostLab />
        <Callout tone="warn" title="Dos errores con el id del modelo">
          <p>
            <strong>Usar el id base de un Claude 5.x.</strong> En <code>bedrock-runtime</code> no tienen endpoint in-region (salvo Opus 5.5 en Londres): se
            invocan con perfil de inferencia, por ejemplo <code>global.anthropic.claude-sonnet-5-5</code>. Un perfil <code>global.</code> falla si un SCP
            bloquea cualquiera de sus regiones destino.
          </p>
          <p>
            <strong>Confiar en el default de Strands.</strong> <code>Agent()</code> sin modelo usa Claude Sonnet 4.6 en <code>us-west-2</code>, no los de esta
            tabla. Fija siempre <code>model_id</code> y <code>region_name</code>. Y no copies el id de los ejemplos de la doc: varios quickstarts oficiales
            todavía usan modelos antiguos.
          </p>
        </Callout>
      </Section>

      <Section n={4} title="Lo que cambió de nombre o se retiró">
        <p>
          Casi todo lo de este mapa tiene menos de dos años, y en ese tiempo varios nombres cambiaron. Los nombres viejos siguen vivos en blogs, respuestas de
          foros y paquetes instalados, así que conviene reconocerlos. Estos son los cinco que más confunden.
        </p>
        <div className="table-wrap aws-mapa-renames">
          <table className="tbl">
            <thead>
              <tr>
                <th>Antes</th>
                <th>Ahora</th>
                <th>Cuándo</th>
                <th>Qué implica</th>
              </tr>
            </thead>
            <tbody>
              {RENAMES.map((r) => (
                <tr key={r.before}>
                  <td className="mono">{r.before}</td>
                  <td>
                    <strong>{r.after}</strong>
                  </td>
                  <td>{r.since}</td>
                  <td>{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          La línea de tiempo muestra el ritmo: AgentCore pasó de preview a GA en tres meses y desde entonces suma servicios casi cada mes. Úsala para ubicar la
          fecha de un tutorial antes de seguirlo.
        </p>
        <TimelineLab />
      </Section>

      <Section n={5} title="Cómo se llama en Google Cloud">
        <p>
          Si vienes de <Link to="/google/ecosistema">la sección de Google</Link>, casi cada pieza tiene su par. La diferencia de forma es que Google reúne todo
          en una plataforma y AWS lo reparte entre Bedrock y AgentCore. La diferencia de fondo está en las filas marcadas como aproximadas o sin equivalente:
          ahí es donde un diseño no se traslada tal cual.
        </p>
        <EquivLab />
      </Section>

      <Section n={6} title="Las tres capas, en un archivo">
        <p>
          El mapa completo cabe en un archivo de unas treinta líneas: el agente de Andi listo para AgentCore Runtime. Cada capa ocupa unas pocas líneas y se puede
          cambiar sin tocar las otras. Las lecciones siguientes de esta sección toman cada una por separado.
        </p>
        <LayersCodeLab />
        <ul className="aws-mapa-next">
          {NEXT.map((n, i) => (
            <li key={n.slug}>
              <span className="i">{i + 2}</span>
              <span>
                <Link to={`/aws/${n.slug}`}>{n.title}</Link>
                <span className="w">{n.what}</span>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <KeyIdeas
        items={[
          <>
            Tres capas con marca propia: <strong>Strands Agents</strong> (el código), <strong>Amazon Bedrock</strong> (los modelos) y{' '}
            <strong>AgentCore</strong> (la operación). Son independientes entre sí.
          </>,
          <>
            AgentCore es un conjunto de servicios. El núcleo, Runtime, Memory, Gateway, Identity y Observability, es GA desde oct-2025; Policy y Evaluations
            desde mar-2026. Payments sigue en preview y Strands harness es pre-1.0.
          </>,
          <>
            <strong>Bedrock Agents Classic</strong> está en mantenimiento desde el 30-jul-2026. Lo nuevo se construye con código sobre AgentCore o con
            AgentCore harness.
          </>,
          <>
            Orquestador: <code>global.anthropic.claude-sonnet-5-5</code> (US$ 2 / 10 por 1M). Worker: Claude Haiku 5.5 (0,10 / 0,50). Router: Nova Micro
            (0,035 / 0,14). Precios vistos el {PRICE_DATE}.
          </>,
          <>
            Los Claude 5.x se invocan con perfil de inferencia, y el default de Strands es otro modelo: fija siempre <code>model_id</code> y región.
          </>,
          <>
            Casi todo tiene par en Google Cloud. No lo tienen MCP Toolbox for Databases (del lado de AWS) ni Marketplace «AI Agents and Tools» y AgentCore
            Payments (del lado de Google).
          </>,
        ]}
      />
      <Sources
        items={[
          { label: 'AgentCore · qué es y servicios', href: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html' },
          { label: 'AgentCore · release notes (estados y fechas)', href: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/release-notes.html' },
          { label: 'AgentCore Runtime · contrato de servicio', href: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-service-contract.html' },
          { label: 'Bedrock · model cards (ids, contexto, perfiles)', href: 'https://docs.aws.amazon.com/bedrock/latest/userguide/model-cards.html' },
          { label: 'Bedrock · endpoints bedrock-runtime y bedrock-mantle', href: 'https://docs.aws.amazon.com/bedrock/latest/userguide/endpoints.html' },
          { label: 'Bedrock · inference profiles', href: 'https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html' },
          { label: 'Bedrock Agents Classic · modo mantenimiento', href: 'https://docs.aws.amazon.com/bedrock/latest/userguide/agents-classic-maintenance-mode.html' },
          { label: 'AWS Price List · modelos de Bedrock (publicado 9-nov-2026)', href: 'https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonBedrockFoundationModels/current/us-east-1/index.json' },
          { label: 'Strands Agents · documentación', href: 'https://strandsagents.com/' },
          { label: 'Strands · proveedores de modelos', href: 'https://strandsagents.com/docs/user-guide/sdk/model-providers/' },
          { label: 'AWS Summit New York 2026 · anuncios', href: 'https://aws.amazon.com/blogs/aws/top-announcements-of-the-aws-summit-in-new-york-2026/' },
        ]}
      />
    </>
  )
}
