import { useMemo } from 'react'
import { Activity, Bot, Boxes, Cpu, Database, FileCode, KeyRound, MessagesSquare, Package, ScrollText, Server, Terminal as TerminalIcon } from 'lucide-react'
import { Checklist, Lab, Panel, Tabs } from '@/components/ui'
import { Code, linesOf } from '@/components/Code'
import { FlowDiagram, type FlowEdge, type FlowNode } from '@/components/Flow'
import { Narration, PlayerBar, type StepInfo } from '@/components/Player'
import { Terminal, useTerminalPlayer } from '@/components/Terminal'
import { usePlayer } from '@/lib/hooks'
import { CODE_INVOKE, CODE_INVOKE_REST, HOSTED_AGENT, HOSTED_MODEL, TERM_DEPLOY } from './data'

/* ------------------------------------------------------------------------ */
/* Lab · azd, comando a comando, con los recursos que aparecen               */
/* ------------------------------------------------------------------------ */
const PHASES = [
  { starts: 'az login', label: 'Login (az + azd)' },
  { starts: 'azd ext install', label: 'Extensión de Foundry' },
  { starts: 'azd ai agent init', label: 'azure.yaml desde la plantilla' },
  { starts: 'azd provision', label: 'Infraestructura' },
  { starts: 'azd ai agent run', label: 'Prueba local (8088)' },
  { starts: 'azd deploy', label: 'Despliegue' },
  { starts: 'azd ai agent invoke', label: 'Invocar y monitorear' },
  { starts: 'azd down', label: 'Limpieza' },
]

/* Cada nodo aparece cuando el terminal ya imprimió su marcador. */
const RES: (FlowNode & { marker: string })[] = [
  { id: 'code', x: 95, y: 70, w: 160, label: 'andes-ops/', sub: 'main.py · azure.yaml', tone: 'model', icon: FileCode, marker: 'Creado azure.yaml' },
  { id: 'azd', x: 300, y: 70, w: 170, label: 'azd', sub: 'microsoft.foundry', tone: 'system', icon: TerminalIcon, marker: 'Extension installed' },
  { id: 'acr', x: 520, y: 70, w: 190, label: 'Container Registry', sub: 'imagen del agente', tone: 'tool', icon: Package, marker: 'Azure Container Registry' },
  { id: 'agent', x: 790, y: 70, w: 200, h: 64, label: HOSTED_AGENT, sub: 'versión + endpoint', tone: 'model', icon: Bot, marker: 'nueva versión inmutable' },
  { id: 'proj', x: 115, y: 215, w: 200, label: 'Foundry account', sub: 'proyecto + identidad', tone: 'system', icon: Boxes, marker: 'Foundry account + proyecto' },
  { id: 'model', x: 350, y: 215, w: 190, label: 'Deployment', sub: HOSTED_MODEL, tone: 'model', icon: Cpu, marker: 'Deployment del modelo' },
  { id: 'appi', x: 580, y: 215, w: 190, label: 'Application Insights', sub: 'trazas y métricas', tone: 'data', icon: Activity, marker: 'Application Insights' },
  { id: 'law', x: 800, y: 215, w: 180, label: 'Log Analytics', sub: 'workspace', tone: 'data', icon: ScrollText, marker: 'Log Analytics workspace' },
]
const RES_EDGES: FlowEdge[] = [
  { from: 'code', to: 'azd' },
  { from: 'azd', to: 'acr', label: 'ZIP' },
  { from: 'acr', to: 'agent' },
  { from: 'agent', to: 'model', dashed: true },
  { from: 'agent', to: 'appi', dashed: true },
  { from: 'appi', to: 'law', dashed: true },
  { from: 'azd', to: 'proj', dashed: true },
]
const PHASE_FLOWS: string[][] = [[], [], [], ['code>azd'], ['azd>proj'], [], ['azd>acr', 'acr>agent'], ['agent>model', 'agent>appi'], []]

export function DeployLab() {
  const player = useTerminalPlayer(TERM_DEPLOY)
  const { phase, seen } = useMemo(() => {
    let p = 0
    const visible = TERM_DEPLOY.slice(0, player.upTo)
    visible.forEach((l) => {
      if (l.kind !== 'cmd') return
      const idx = PHASES.findIndex((ph) => l.text.startsWith(ph.starts))
      if (idx >= 0) p = Math.max(p, idx + 1)
    })
    return { phase: p, seen: visible.map((l) => l.text).join('\n') }
  }, [player.upTo])
  const active = RES.filter((r) => seen.includes(r.marker)).map((r) => r.id)
  const gone = seen.includes('azd down')
  const nodes: FlowNode[] = RES.map((r) => ({ ...r, cls: active.includes(r.id) && !gone ? undefined : 'is-outside' }))
  return (
    <Lab
      title="azd, comando a comando"
      hint="Pulsa ▶ y mira qué recurso aparece con cada paso"
      footer={<span className="small muted">Salida simulada y resumida: los comandos y los recursos son los del quickstart de hosted agents; los textos de consola reales son distintos y el build tarda varios minutos.</span>}
    >
      <div className="az-dep-grid">
        <Terminal lines={TERM_DEPLOY} upTo={player.upTo} typed={player.typed} player={player} title="bash · andes-ops/" maxHeight={430} />
        <Panel title="Dónde vas" tone="system">
          <Checklist items={PHASES.map((p) => p.label)} current={player.done ? PHASES.length : Math.max(0, phase - 1)} />
        </Panel>
      </div>
      <div className="az-dep-res">
        <div className="label">Recursos en tu suscripción {gone ? '· borrados por azd down' : `· ${active.filter((a) => a !== 'code' && a !== 'azd').length} de 6`}</div>
        <FlowDiagram
          nodes={nodes}
          edges={RES_EDGES}
          width={960}
          height={285}
          active={gone ? [] : active}
          flows={player.done ? [] : (PHASE_FLOWS[phase] ?? [])}
          dimInactive
          ariaLabel="Recursos de Azure que crea el despliegue de un hosted agent"
        />
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab · Una invocación, paso a paso                                         */
/* ------------------------------------------------------------------------ */
const INV_NODES: FlowNode[] = [
  { id: 'app', x: 95, y: 150, w: 160, label: 'Tu backend', sub: 'azure-ai-projects', tone: 'user', icon: Server },
  { id: 'entra', x: 95, y: 45, w: 160, label: 'Microsoft Entra ID', sub: 'token · ai.azure.com', tone: 'guard', icon: KeyRound },
  { id: 'ep', x: 350, y: 150, w: 200, h: 64, label: 'Agent endpoint', sub: '…/protocols/openai/responses', tone: 'system', icon: Bot },
  { id: 'sbx', x: 630, y: 150, w: 210, h: 64, label: 'Sandbox de la sesión', sub: 'VM aislada · tu código', tone: 'tool', icon: Boxes },
  { id: 'llm', x: 860, y: 150, w: 160, label: 'Deployment', sub: HOSTED_MODEL, tone: 'model', icon: Cpu },
  { id: 'conv', x: 350, y: 265, w: 200, label: 'Conversations', sub: 'historial en Foundry', tone: 'memory', icon: MessagesSquare },
  { id: 'files', x: 630, y: 265, w: 210, label: '$HOME · /files', sub: 'y state store clave-valor', tone: 'data', icon: Database },
]
const INV_EDGES: FlowEdge[] = [
  { from: 'app', to: 'entra', dashed: true },
  { from: 'app', to: 'ep' },
  { from: 'ep', to: 'sbx' },
  { from: 'sbx', to: 'llm' },
  { from: 'ep', to: 'conv', dashed: true },
  { from: 'sbx', to: 'files', dashed: true },
]

const T1 = linesOf(CODE_INVOKE, 'input="¿Dónde está')[0]
const T2 = linesOf(CODE_INVOKE, 'input="¿Y el 5102')[0]
type InvStep = StepInfo & { flows: string[]; hl: number[]; chat: number }
const INV_STEPS: InvStep[] = [
  {
    title: 'Credencial de Entra, no API key',
    body: 'DefaultAzureCredential usa tu sesión de az login en desarrollo y una identidad administrada en producción. Agentes y evaluaciones exigen Entra ID: una API key del recurso no sirve aquí.',
    flows: ['app>entra'],
    hl: linesOf(CODE_INVOKE, 'credential=DefaultAzureCredential()'),
    chat: 0,
  },
  {
    title: 'Un cliente OpenAI enlazado al agente',
    body: 'get_openai_client(agent_name=…) devuelve el cliente OpenAI estándar apuntando al endpoint del agente. Sin agent_name hablas directo con un modelo: esa es la tercera forma, la Responses API sin recurso de agente.',
    flows: [],
    hl: linesOf(CODE_INVOKE, 'get_openai_client(agent_name'),
    chat: 0,
  },
  {
    title: 'conversations.create(): el historial lo guarda Foundry',
    body: 'La conversación es el reemplazo del thread. Crea una por cliente o por caso y guarda su id junto a tu usuario: el servicio no sabe que pertenece a Camila.',
    flows: ['app>ep', 'ep>conv'],
    hl: linesOf(CODE_INVOKE, 'conversation = openai.conversations.create()'),
    chat: 0,
  },
  {
    title: 'responses.create(): llega el turno al sandbox',
    body: 'El endpoint enruta el turno a una sesión: una VM aislada con tu contenedor, creada para esta conversación. Si la sesión estaba inactiva (15 minutos por defecto, configurable de 2 a 240), arranca de nuevo con su $HOME y /files intactos.',
    flows: ['app>ep', 'ep>sbx'],
    hl: [T1 - 2, T1 - 1, T1, T1 + 1],
    chat: 1,
  },
  {
    title: 'El ciclo del agente corre en TU código',
    body: 'Dentro del contenedor, Agent Framework llama al deployment, el modelo pide get_order_status("4821") y tu función Python se ejecuta ahí mismo. Es lo que un prompt agent no puede hacer por ti.',
    flows: ['sbx>llm', 'sbx>files'],
    hl: [T1],
    chat: 1,
  },
  {
    title: 'output_text vuelve y el turno queda en la conversación',
    body: 'response.output_text trae el texto final; response.output trae todos los ítems (mensajes, llamadas a tools). No hay run que consultar por polling.',
    flows: ['sbx>ep', 'ep>conv', 'ep>app'],
    hl: [T1 + 2],
    chat: 2,
  },
  {
    title: 'Segundo turno: la misma conversation.id',
    body: '"¿Y el 5102?" solo se entiende con el turno anterior. Como pasas la misma conversación, el agente lo resuelve como otro pedido de Camila. Verifica en tu backend que el id pertenece a quien llama antes de reenviarlo.',
    flows: ['app>ep', 'ep>conv', 'ep>sbx'],
    hl: [T2 - 2, T2 - 1, T2, T2 + 1, T2 + 2],
    chat: 4,
  },
]
const CHAT = [
  { user: true, text: '¿Dónde está mi pedido 4821?' },
  { user: false, text: 'Tu pedido 4821 (Zapatillas trekking Cordillera 41) va en ruta con AndesExpress, seguimiento AX-88213-CL. Entrega estimada: 14 de noviembre.' },
  { user: true, text: '¿Y el 5102?' },
  { user: false, text: 'El 5102 (Mochila 30L azul y 2 botellas térmicas) está en preparación; todavía no tiene transportista asignado.' },
]

export function InvokeLab() {
  const player = usePlayer(INV_STEPS.length, { interval: 4200 })
  const s = INV_STEPS[player.step]
  const hl = s.hl
  return (
    <Lab title="Una invocación desde tu aplicación" hint="Reproduce o salta de paso" footer={<span className="small muted">Respuestas simuladas con los datos de Andes Market. El código y las rutas son reales.</span>}>
      <PlayerBar player={player} labels={INV_STEPS.map((x) => x.title)} />
      <FlowDiagram nodes={INV_NODES} edges={INV_EDGES} width={960} height={320} flows={s.flows} dimInactive ariaLabel="Recorrido de una invocación a un hosted agent" />
      <Narration steps={INV_STEPS} step={player.step} />
      <div className="az-dep-query">
        <Tabs
          tabs={[
            { id: 'py', label: 'Python · SDK', content: <Code code={CODE_INVOKE} lang="python" title="backend/ask_andi.py" highlight={hl} dim maxHeight={420} /> },
            { id: 'rest', label: 'REST', content: <Code code={CODE_INVOKE_REST} lang="bash" title="curl · endpoint del agente" highlight={linesOf(CODE_INVOKE_REST, '/endpoint/protocols/openai/responses', 'get-access-token')} /> },
          ]}
        />
        <Panel title="Lo que ve Camila" tone="user">
          <div className="chat" style={{ minHeight: 120 }}>
            {CHAT.slice(0, s.chat).map((m, i) => (
              <div key={i} className={`chat-msg${m.user ? ' is-user' : ''}`}>
                {!m.user && <span className="chat-name">Andi</span>}
                <div className="chat-bubble">{m.text}</div>
              </div>
            ))}
            {s.chat === 0 && <span className="small muted">Todavía no se envía ningún mensaje.</span>}
            {s.chat === 1 && <span className="small muted">Andi está trabajando…</span>}
          </div>
        </Panel>
      </div>
    </Lab>
  )
}
