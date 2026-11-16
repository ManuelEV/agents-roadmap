import { useMemo } from 'react'
import { Archive, Brain, Cloud, FolderGit2, KeyRound, Layers, Plug, ScrollText, Terminal as TerminalIcon } from 'lucide-react'
import { Checklist, Lab, Panel } from '@/components/ui'
import { Terminal, useTerminalPlayer } from '@/components/Terminal'
import { FlowDiagram, type FlowEdge, type FlowNode } from '@/components/Flow'
import { CLI_PHASES, CLI_PHASE_NOTES, STACK, TERM_CLI } from './data'

/* Cada recurso aparece cuando se completa la etapa `at` (1..6). */
const RES: (FlowNode & { at: number })[] = [
  { id: 'proj', at: 2, x: 120, y: 56, w: 210, label: 'AndesOps/', sub: 'agentcore/ · app/agent/', tone: 'model', icon: FolderGit2 },
  { id: 'zip', at: 4, x: 370, y: 56, w: 190, label: 'CodeZip', sub: 'zip, sin Docker ni ECR', tone: 'data', icon: Archive },
  { id: 'cfn', at: 5, x: 620, y: 56, w: 220, label: 'CloudFormation', sub: STACK, tone: 'system', icon: Layers },
  { id: 'role', at: 5, x: 870, y: 56, w: 190, label: 'Rol de ejecución', sub: 'IAM · lo asume Runtime', tone: 'guard', icon: KeyRound },
  { id: 'cli', at: 6, x: 120, y: 176, w: 210, label: 'agentcore invoke', sub: '--runtime agent', tone: 'user', icon: TerminalIcon },
  { id: 'ep', at: 5, x: 370, y: 176, w: 190, label: 'Endpoint DEFAULT', sub: '→ última versión', tone: 'system', icon: Plug },
  { id: 'rt', at: 5, x: 620, y: 176, w: 220, h: 64, label: 'Runtime "agent"', sub: 'versión 1 · READY', tone: 'system', icon: Cloud },
  { id: 'mem', at: 5, x: 870, y: 176, w: 190, label: 'Memory', sub: 'MEMORY_<NAME>_ID', tone: 'memory', icon: Brain },
  { id: 'logs', at: 5, x: 620, y: 290, w: 300, label: 'CloudWatch Logs', sub: '/aws/bedrock-agentcore/runtimes/…', tone: 'data', icon: ScrollText },
]
const RES_EDGES: FlowEdge[] = [
  { from: 'proj', to: 'zip' },
  { from: 'zip', to: 'cfn' },
  { from: 'cfn', to: 'role' },
  { from: 'cfn', to: 'rt' },
  { from: 'ep', to: 'rt' },
  { from: 'rt', to: 'mem', dashed: true },
  { from: 'rt', to: 'logs', dashed: true },
  { from: 'cli', to: 'ep' },
]
const PHASE_FLOWS: string[][] = [[], [], [], [], ['proj>zip'], ['zip>cfn', 'cfn>rt', 'cfn>role'], ['cli>ep', 'ep>rt']]

export function CliLab() {
  const player = useTerminalPlayer(TERM_CLI)
  /* etapa = cuántas fases ya se completaron (su comando terminó de escribirse) */
  const phase = useMemo(() => {
    let p = 0
    TERM_CLI.slice(0, player.upTo).forEach((l) => {
      if (l.kind !== 'cmd') return
      const idx = CLI_PHASES.findIndex((ph) => l.text.startsWith(ph.until))
      if (idx >= 0) p = Math.max(p, idx + 1)
    })
    return p
  }, [player.upTo])
  const nodes = RES.map((n) => (n.at === phase ? { ...n, cls: 'aws-dep-fresh' } : n))
  const created = RES.filter((n) => n.at <= phase).map((n) => n.id)
  const note = CLI_PHASE_NOTES[phase]
  return (
    <Lab
      title="De create a invoke con el AgentCore CLI"
      hint="Pulsa ▶ y mira qué aparece"
      footer={<span className="small muted">Los comandos y flags son reales. La salida está <strong>simulada</strong> y resumida; el primer deploy real tarda minutos.</span>}
    >
      <div className="aws-dep-cli">
        <Terminal lines={TERM_CLI} upTo={player.upTo} typed={player.typed} player={player} title="bash · ~/andes" maxHeight={430} />
        <div className="stack">
          <Panel title="Etapas" tone="system">
            <Checklist items={CLI_PHASES.map((p) => p.label)} current={phase} />
          </Panel>
          <div className="aws-dep-note" key={phase}>
            <strong className="anim-fade" style={{ display: 'block' }}>
              {note.title}
            </strong>
            <span className="anim-fade">{note.body}</span>
          </div>
        </div>
      </div>
      <div className="aws-dep-res-head">
        <span className="label">Qué existe ahora</span>
        <span className="small muted">
          {created.length} de {RES.length} piezas
        </span>
      </div>
      <FlowDiagram nodes={nodes} edges={RES_EDGES} width={980} height={335} active={created} dimInactive flows={PHASE_FLOWS[phase]} ariaLabel="Recursos que crea el AgentCore CLI en cada etapa" />
    </Lab>
  )
}
