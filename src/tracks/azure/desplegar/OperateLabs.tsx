import { useState } from 'react'
import { Lab, Panel, Segmented, Slider, Stat } from '@/components/ui'
import { CloudConsole, ConsoleBanner, ConsoleButton, ConsoleCard, ConsoleDisclaimer, ConsoleField, ConsoleStatus, ConsoleTable, Focus } from '@/components/Console'
import { Narration, PlayerBar, type StepInfo } from '@/components/Player'
import { usePlayer } from '@/lib/hooks'
import { fmtInt } from '@/sim/andes'
import { FOUNDRY_PROJECT, HOSTED_AGENT, HOSTED_MODEL, PRICE_GIB_H, PRICE_VCPU_H, PROMPT_AGENT, PROMPT_MODEL, SIZES, STATE_ROWS } from './data'

/* ------------------------------------------------------------------------ */
/* Lab · Dónde vive el estado y cuánto cuesta el cómputo                     */
/* ------------------------------------------------------------------------ */
const HOSTED_STATE = [
  { name: 'Sessions', tone: 'tool', what: 'Cómputo + archivos: la VM de la sesión con $HOME y /files (hasta 20 GiB de disco).', ttl: 'Idle timeout de 2 a 240 min (15 por defecto). Se borra tras 30 días de inactividad.' },
  { name: 'Conversations', tone: 'memory', what: 'El historial de la conversación, guardado en Foundry.', ttl: 'Hasta 100.000 mensajes por conversación.' },
  { name: 'State store', tone: 'data', what: 'Clave-valor durable para lo que tu código quiera recordar entre turnos.', ttl: '30 días por defecto.' },
] as const

export function StateLab() {
  const [setup, setSetup] = useState<'basic' | 'standard'>('basic')
  const [sessions, setSessions] = useState(20)
  const [size, setSize] = useState<(typeof SIZES)[number]['id']>('s')
  const sz = SIZES.find((x) => x.id === size)!
  const perHour = sessions * (sz.vcpu * PRICE_VCPU_H + sz.gib * PRICE_GIB_H)
  const usd = (v: number) => `US$ ${v.toFixed(2).replace('.', ',')}`
  return (
    <Lab title="Dónde queda el estado y qué pagas por sesión" hint="Cambia el setup y mueve la concurrencia">
      <div className="row" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <Segmented
          options={[
            { value: 'basic', label: 'Basic setup' },
            { value: 'standard', label: 'Standard setup' },
          ]}
          value={setup}
          onChange={setSetup}
        />
        <span className="small muted">{setup === 'basic' ? 'Microsoft guarda todo: nada que aprovisionar.' : 'Los datos quedan en recursos de tu suscripción; con BYO VNet, además en red privada.'}</span>
      </div>
      <div className="az-dep-state" key={setup}>
        {STATE_ROWS.map((r) => (
          <div key={r.what} className={`az-dep-state-row anim-fade${setup === 'standard' ? ' is-own' : ''}`}>
            <span className="az-dep-state-what">{r.what}</span>
            <span className="az-dep-state-where">{setup === 'basic' ? r.basic : r.standard}</span>
          </div>
        ))}
        {setup === 'standard' && (
          <p className="az-dep-note anim-fade">
            Cosmos DB parte en 3.000 RU/s: cada proyecto usa de 3 a 5 contenedores a 1.000 RU/s. El ejemplo de la documentación: dos proyectos con agentes Responses necesitan 10.000 RU/s. Para aprender,
            quédate en basic.
          </p>
        )}
      </div>

      <div className="az-dep-state3">
        {HOSTED_STATE.map((h) => (
          <div key={h.name} className="az-dep-state-kind" data-tone={h.tone}>
            <div className="az-dep-kind-head">
              <span className="az-dep-dot" />
              <strong>{h.name}</strong>
            </div>
            <p>{h.what}</p>
            <p className="small muted">{h.ttl}</p>
          </div>
        ))}
      </div>

      <Panel title="Cómputo de un hosted agent: se cobra por sesión" tone="tool" right={<span className="small">referencia sin confirmar</span>}>
        <div className="az-dep-cost">
          <div className="stack">
            <Slider label="Sesiones activas a la vez" value={sessions} min={1} max={400} onChange={setSessions} format={(v) => fmtInt(v)} />
            <Segmented options={SIZES.map((x) => ({ value: x.id, label: x.label }))} value={size} onChange={setSize} />
          </div>
          <div className="az-dep-stats">
            <Stat label="Por hora" value={usd(perHour)} tone="tool" sub={`${fmtInt(sessions)} × (${String(sz.vcpu).replace('.', ',')} vCPU + ${sz.gib} GiB)`} />
            <Stat label="8 h de atención" value={usd(perHour * 8)} sub="si las sesiones no caen a cero" />
          </div>
        </div>
        <p className="small muted" style={{ margin: '10px 0 0' }}>
          Cálculo con US$ 0,0994 por vCPU-hora y US$ 0,0118 por GiB-hora (Azure Retail Prices API, <code>eastus</code>, leída el 15-nov-2026). La página oficial de precios no mostraba cifras: confírmalas ahí
          antes de presupuestar. Un prompt agent no paga este cómputo: solo tokens y tools.
        </p>
      </Panel>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab · El portal de Foundry                                                */
/* ------------------------------------------------------------------------ */
const NAV = [
  {
    id: 'create',
    label: 'Create',
    children: [
      { id: 'agents', label: 'Agents' },
      { id: 'models', label: 'Models' },
      { id: 'services', label: 'Services' },
      { id: 'tools', label: 'Tools' },
      { id: 'knowledge', label: 'Knowledge' },
      { id: 'memory', label: 'Memory' },
      { id: 'guardrails', label: 'Guardrails' },
      { id: 'data', label: 'Data' },
    ],
  },
  {
    id: 'optimize',
    label: 'Optimize',
    children: [
      { id: 'evals', label: 'Evaluations' },
      { id: 'ft', label: 'Fine-tune' },
    ],
  },
]

type PStep = StepInfo & { screen: 'list' | 'play' | 'traces' | 'monitor'; focus: string }
const P_STEPS: PStep[] = [
  {
    title: 'Build > Agents: los dos agentes de Andi',
    body: 'Con el toggle New Foundry activado, el portal tiene cuatro secciones: Build (el proyecto actual), Operate (todos los proyectos), Manage y Docs. En Build > Agents aparecen tanto el prompt agent que creaste con el SDK como el hosted agent que subió azd.',
    screen: 'list',
    focus: 'row',
  },
  {
    title: 'El playground: probar sin escribir un cliente',
    body: 'Al abrir el agente chateas con él en el playground. Create agent hace lo mismo que create_version: nombre, instrucciones y a conversar. Desde aquí se adjuntan tools (code interpreter, file search, web search) y fuentes de conocimiento.',
    screen: 'play',
    focus: 'chat',
  },
  {
    title: 'Ojo: las evaluaciones del playground se facturan',
    body: 'Vienen activadas y cada respuesta que pruebas se evalúa, con costo. Se apagan desde "metrics", arriba a la derecha. Hazlo antes de una sesión larga de pruebas.',
    screen: 'play',
    focus: 'metrics',
  },
  {
    title: 'Traces > Connect: enchufar Application Insights',
    body: 'El quickstart del prompt agent pide Application Insights conectado al proyecto. Arriba en Agents, Traces > Connect te deja elegir o crear uno. Con azd ya quedó creado en el provision.',
    screen: 'traces',
    focus: 'connect',
  },
  {
    title: 'Monitor y Publish: lo que sigue',
    body: 'La pestaña Monitor (preview) muestra las métricas del agente. Publish > Teams and Microsoft Copilot lo saca del proyecto hacia los usuarios: eso, junto con identidad, guardrails y evaluación, es la próxima parada.',
    screen: 'monitor',
    focus: 'publish',
  },
]

function TopNav({ section = 'Build' }: { section?: string }) {
  return (
    <div className="az-dep-topnav">
      {['Build', 'Operate', 'Manage', 'Docs'].map((s) => (
        <span key={s} className={s === section ? 'is-active' : ''}>
          {s}
        </span>
      ))}
      <span className="az-dep-newfoundry">
        <i /> New Foundry
      </span>
    </div>
  )
}

function Screen({ s }: { s: PStep }) {
  const f = (id: string) => s.focus === id
  const base = { brand: 'azure' as const, product: 'Build', nav: NAV, activeNav: 'agents', project: FOUNDRY_PROJECT, url: '' }
  if (s.screen === 'list' || s.screen === 'traces')
    return (
      <CloudConsole {...base} title="Agents" crumbs={['Build', 'Agents']}>
        <TopNav />
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          <ConsoleButton primary small>
            Create agent
          </ConsoleButton>
          <ConsoleButton small>
            Traces
          </ConsoleButton>
        </div>
        {s.screen === 'list' ? (
          <Focus on={f('row')} style={{ display: 'block' }}>
            <ConsoleTable
              cols={['Nombre', 'Tipo', 'Modelo', 'Estado']}
              rows={[
                [<span className="gc-link">{PROMPT_AGENT}</span>, 'Prompt', PROMPT_MODEL, <ConsoleStatus ok>2 versiones</ConsoleStatus>],
                [<span className="gc-link">{HOSTED_AGENT}</span>, 'Hosted', HOSTED_MODEL, <ConsoleStatus ok>endpoint activo</ConsoleStatus>],
              ]}
            />
          </Focus>
        ) : (
          <ConsoleCard title="Traces">
            <p style={{ margin: '0 0 10px' }}>Conecta un recurso de Application Insights para ver las trazas de tus agentes.</p>
            <ConsoleField label="Application Insights" kind="select" value="el que creó azd provision" />
            <div style={{ marginTop: 10 }}>
              <ConsoleButton primary small focus={f('connect')}>
                Connect
              </ConsoleButton>
            </div>
          </ConsoleCard>
        )}
      </CloudConsole>
    )
  if (s.screen === 'play')
    return (
      <CloudConsole {...base} title={PROMPT_AGENT} crumbs={['Build', 'Agents', PROMPT_AGENT]}>
        <TopNav />
        <div className="az-dep-play">
          <div className="stack">
            <ConsoleField label="Instrucciones" kind="textarea" value="Eres Andi, agente de operaciones de Andes Market. Responde breve y en español." />
            <ConsoleField label="Modelo" kind="select" value={PROMPT_MODEL} />
            <ConsoleField label="Tools" value="code interpreter · file search · web search" hint="También puedes adjuntar fuentes de conocimiento." />
          </div>
          <ConsoleCard
            title="Playground"
            right={
              <Focus on={f('metrics')}>
                <span className="az-dep-metrics">metrics</span>
              </Focus>
            }
          >
            <Focus on={f('chat')} style={{ display: 'block' }}>
              <div className="chat">
                <div className="chat-msg is-user">
                  <div className="chat-bubble">Hola, ¿quién eres?</div>
                </div>
                <div className="chat-msg">
                  <div className="chat-bubble">Soy Andi, el agente de operaciones de Andes Market. ¿Con qué pedido te ayudo?</div>
                </div>
              </div>
            </Focus>
            {f('metrics') && <ConsoleBanner tone="guard">Evaluaciones del playground: activadas (se facturan). Desactívalas aquí.</ConsoleBanner>}
          </ConsoleCard>
        </div>
      </CloudConsole>
    )
  return (
    <CloudConsole {...base} title={HOSTED_AGENT} crumbs={['Build', 'Agents', HOSTED_AGENT]} tabs={['Details', 'Monitor']} activeTab="Monitor">
      <TopNav />
      <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
        <ConsoleButton primary small focus={f('publish')}>
          Publish
        </ConsoleButton>
        <span className="small">Teams and Microsoft Copilot</span>
      </div>
      <ConsoleBanner tone="user">Monitor (preview): métricas del agente. Las trazas detalladas llegan a Application Insights.</ConsoleBanner>
    </CloudConsole>
  )
}

export function PortalLab() {
  const player = usePlayer(P_STEPS.length, { interval: 5200 })
  const s = P_STEPS[player.step]
  return (
    <Lab title="El portal después de desplegar" hint="Reproduce o haz clic en un paso" footer={<ConsoleDisclaimer />}>
      <PlayerBar player={player} labels={P_STEPS.map((x) => x.title)} />
      <Narration steps={P_STEPS} step={player.step} />
      <div className="az-dep-portal anim-fade" key={player.step}>
        <Screen s={s} />
      </div>
    </Lab>
  )
}
