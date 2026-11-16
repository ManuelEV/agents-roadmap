import { Lab } from '@/components/ui'
import { CloudConsole, ConsoleBanner, ConsoleButton, ConsoleCard, ConsoleDisclaimer, ConsoleField, ConsoleStatus, ConsoleTable, Focus } from '@/components/Console'
import { Narration, PlayerBar, type StepInfo } from '@/components/Player'
import { usePlayer } from '@/lib/hooks'
import { LOG_GROUP, REGION, RUNTIME_ARN, RUNTIME_ID, UUIDS } from './data'

/* Nombres de página verificados en la investigación §7. */
const NAV = [
  { id: 'agents', label: 'Agents' },
  { id: 'memory', label: 'Memory' },
  { id: 'gateways', label: 'Gateways' },
  { id: 'tools', label: 'Built-in tools' },
  { id: 'identity', label: 'Identity' },
  { id: 'obs', label: 'Observability' },
]
const CW_NAV = [
  { id: 'logs', label: 'Logs', children: [{ id: 'groups', label: 'Log groups' }] },
  { id: 'apm', label: 'Application Signals (APM)', children: [{ id: 'ts', label: 'Transaction search' }] },
]

type CStep = StepInfo & { screen: 'list' | 'detail' | 'create' | 'obs' | 'logs' }
const STEPS: CStep[] = [
  {
    title: 'La página Agents lista tus runtimes',
    body: 'console.aws.amazon.com/bedrock-agentcore/agents, con la región correcta en el selector. Lo que desplegaste con el CLI aparece aquí como un Agent Runtime; el estado READY es el mismo que devuelve agentcore status.',
    screen: 'list',
  },
  {
    title: 'El ARN es lo que copia tu aplicación',
    body: 'Es el valor de agentRuntimeArn en invoke_agent_runtime. El endpoint DEFAULT se creó solo y apunta siempre a la última versión; cada cambio de configuración crea una versión nueva e inmutable.',
    screen: 'detail',
  },
  {
    title: 'El mismo recurso, creado a mano',
    body: 'Create Host agent (runtime) pide lo que el CLI resolvió por ti: nombre, compute type (microVMs), origen del agente, platform version y, opcionales, inbound auth, configuración avanzada y permisos.',
    screen: 'create',
  },
  {
    title: 'Observability: sesiones, trazas y spans',
    body: 'Cuatro pestañas: Overview, Sessions, Traces y Spans. Son los mismos datos que CloudWatch. Tras activar Transaction Search los spans tardan hasta 10 minutos en aparecer.',
    screen: 'obs',
  },
  {
    title: 'Los logs de tu código están en CloudWatch',
    body: 'CloudWatch → Logs → Log groups. El grupo se llama /aws/bedrock-agentcore/runtimes/<agent_id>-<endpoint_name>. Es donde miras cuando una invocación devuelve RuntimeClientError (424).',
    screen: 'logs',
  },
]

function Screen({ s }: { s: CStep }) {
  if (s.screen === 'list')
    return (
      <CloudConsole brand="aws" product="Amazon Bedrock AgentCore" title="Agents" url="bedrock-agentcore/agents" project={REGION} nav={NAV} activeNav="agents" crumbs={['Amazon Bedrock AgentCore', 'Agents']}>
        <div className="row">
          <ConsoleButton primary small>
            Create Host agent (runtime)
          </ConsoleButton>
        </div>
        <Focus on style={{ display: 'block' }}>
          <ConsoleTable cols={['Name', 'Status', 'Compute type', 'Platform version']} rows={[[<span className="gc-link">{RUNTIME_ID}</span>, <ConsoleStatus ok>READY</ConsoleStatus>, 'microVMs', 'V1']]} hl={0} />
        </Focus>
      </CloudConsole>
    )
  if (s.screen === 'detail')
    return (
      <CloudConsole brand="aws" product="Amazon Bedrock AgentCore" title={RUNTIME_ID} url="bedrock-agentcore/agents" project={REGION} nav={NAV} activeNav="agents" crumbs={['Amazon Bedrock AgentCore', 'Agents', RUNTIME_ID]}>
        <ConsoleCard title="Agent Runtime" right={<ConsoleStatus ok>READY</ConsoleStatus>}>
          <ConsoleField label="ARN" focus value={<span className="aws-dep-arn">{RUNTIME_ARN}</span>} hint="Formato: arn:aws:bedrock-agentcore:<región>:<cuenta>:runtime/<id>" />
        </ConsoleCard>
        <ConsoleTable
          cols={['Endpoint', 'Versión', 'Estado']}
          rows={[['DEFAULT', '1 (la última)', <ConsoleStatus ok>READY</ConsoleStatus>]]}
        />
      </CloudConsole>
    )
  if (s.screen === 'create')
    return (
      <CloudConsole brand="aws" product="Amazon Bedrock AgentCore" title="Create Host agent (runtime)" url="bedrock-agentcore/agents" project={REGION} nav={NAV} activeNav="agents" crumbs={['Amazon Bedrock AgentCore', 'Agents', 'Create']}>
        <div className="aws-dep-form">
          <ConsoleField label="Name" value="andi_ops" required />
          <ConsoleField label="Compute type" value="microVMs" kind="select" focus />
          <ConsoleField label="Agent/tool source" placeholder="De dónde sale el código o la imagen" kind="select" />
          <ConsoleField label="Platform version" value="V1" kind="select" hint="V2 arranca desde un snapshot y permite resource configurations" />
        </div>
        <ConsoleCard title="Opcional">
          <span className="small">Inbound auth · Advanced configurations · Permissions</span>
        </ConsoleCard>
        <div className="row">
          <ConsoleButton primary>Create runtime</ConsoleButton>
        </div>
      </CloudConsole>
    )
  if (s.screen === 'obs')
    return (
      <CloudConsole brand="aws" product="Amazon Bedrock AgentCore" title="Observability" url="bedrock-agentcore/observability" project={REGION} nav={NAV} activeNav="obs" crumbs={['Amazon Bedrock AgentCore', 'Observability']} tabs={['Overview', 'Sessions', 'Traces', 'Spans']} activeTab="Sessions">
        <Focus on style={{ display: 'block' }}>
          <ConsoleTable
            cols={['Session ID', 'Agente', 'Trazas']}
            rows={[
              [<span className="mono small">{UUIDS[0]}</span>, RUNTIME_ID, '1'],
              [<span className="mono small">{UUIDS[1]}</span>, RUNTIME_ID, '3'],
            ]}
            hl={0}
          />
        </Focus>
        <ConsoleBanner tone="user">Los mismos datos están en CloudWatch, en la vista de generative AI observability.</ConsoleBanner>
      </CloudConsole>
    )
  return (
    <CloudConsole brand="aws" product="CloudWatch" title="Log groups" url="cloudwatch/home" project={REGION} nav={CW_NAV} activeNav="groups" crumbs={['CloudWatch', 'Logs', 'Log groups']}>
      <ConsoleField label="Filtro" value="/aws/bedrock-agentcore/runtimes/" />
      <Focus on style={{ display: 'block' }}>
        <ConsoleTable cols={['Log group']} rows={[[<span className="aws-dep-arn">{LOG_GROUP}</span>]]} hl={0} />
      </Focus>
      <span className="small">Los spans van al stream <code>spans</code> de este grupo o a <code>aws/spans</code>.</span>
    </CloudConsole>
  )
}

export function ConsoleLab() {
  const player = usePlayer(STEPS.length, { interval: 5200 })
  return (
    <Lab title="El runtime desplegado, en la consola" hint="Reproduce o haz clic en un paso" footer={<ConsoleDisclaimer />}>
      <PlayerBar player={player} labels={STEPS.map((x) => x.title)} />
      <div className="aws-dep-console">
        <div className="anim-fade" key={player.step}>
          <Screen s={STEPS[player.step]} />
        </div>
        <Narration steps={STEPS} step={player.step} />
      </div>
    </Lab>
  )
}
