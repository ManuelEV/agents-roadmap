import { useState } from 'react'
import { Box, Cloud, HeartPulse, User } from 'lucide-react'
import { Lab, Segmented } from '@/components/ui'
import { Code, linesOf } from '@/components/Code'
import { FlowDiagram, type FlowEdge, type FlowNode } from '@/components/Flow'
import { CODE_LOCAL, CODE_RUNTIME, PROTOCOLS, WRAP_PARTS, type Proto } from './data'

/* Lab 1a · el agente local frente al mismo agente envuelto para Runtime */
export function WrapLab() {
  const [view, setView] = useState<'local' | 'runtime'>('runtime')
  const [part, setPart] = useState(WRAP_PARTS[0].id)
  const current = WRAP_PARTS.find((p) => p.id === part) ?? WRAP_PARTS[0]
  const added = WRAP_PARTS.flatMap((p) => linesOf(CODE_RUNTIME, ...p.needles))
  return (
    <Lab title="Antes y después: el mismo agente, envuelto" hint="Cambia de vista y toca cada pieza">
      <div className="row" style={{ marginBottom: 12 }}>
        <Segmented
          options={[
            { value: 'local', label: 'Local (andi_local.py)' },
            { value: 'runtime', label: 'Para Runtime (main.py)' },
          ]}
          value={view}
          onChange={setView}
        />
        <span className="small muted">{view === 'local' ? 'Un script: se ejecuta, responde y termina.' : 'Un servicio: espera invocaciones en el puerto 8080.'}</span>
      </div>
      <div className="aws-dep-wrap">
        <div key={view} className="anim-fade">
          {view === 'local' ? (
            <Code code={CODE_LOCAL} lang="python" title="andi_local.py" highlight={linesOf(CODE_LOCAL, 'agent("')} maxHeight={470} />
          ) : (
            <Code code={CODE_RUNTIME} lang="python" title="app/agent/main.py" add={added} highlight={linesOf(CODE_RUNTIME, ...current.needles)} maxHeight={470} />
          )}
        </div>
        <div className="aws-dep-parts">
          {view === 'local' ? (
            <div className="aws-dep-note">
              La última línea llama al agente una vez. No hay puerto, ni forma de que otra aplicación le mande un mensaje, ni separación entre un
              usuario y otro. Eso es lo que agrega el wrapper; el <code>Agent</code>, el modelo y la herramienta no cambian.
            </div>
          ) : (
            WRAP_PARTS.map((p) => (
              <button key={p.id} className={`aws-dep-part${p.id === part ? ' is-active' : ''}`} onClick={() => setPart(p.id)} aria-pressed={p.id === part}>
                <span className="k">{p.k}</span>
                <span className="d">{p.d}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </Lab>
  )
}

/* Lab 1b · contrato de servicio por protocolo */
function contractNodes(p: Proto): FlowNode[] {
  return [
    { id: 'client', x: 100, y: 80, w: 180, label: 'Quien invoca', sub: 'SigV4 u OAuth 2.0', tone: 'user', icon: User },
    { id: 'rt', x: 400, y: 80, w: 200, label: 'AgentCore Runtime', sub: 'enruta por sesión', tone: 'system', icon: Cloud },
    { id: 'vm', x: 815, y: 80, w: 230, h: 64, label: 'Tu código en la microVM', sub: `0.0.0.0:${p.port} · ARM64`, tone: 'model', icon: Box, badge: p.label },
    { id: 'ping', x: 815, y: 200, w: 230, label: 'GET /ping', sub: 'Healthy · HealthyBusy', tone: 'guard', icon: HeartPulse },
  ]
}
const CONTRACT_EDGES = (p: Proto): FlowEdge[] => [
  { from: 'client', to: 'rt' },
  { from: 'rt', to: 'vm', label: p.id === 'a2a' ? ':9000 /' : p.id === 'mcp' ? ':8000 /mcp' : ':8080 /invocations' },
  { from: 'rt', to: 'ping', dashed: true, curve: 30 },
]

export function ContractLab() {
  const [id, setId] = useState<Proto['id']>('http')
  const p = PROTOCOLS.find((x) => x.id === id) ?? PROTOCOLS[0]
  return (
    <Lab title="El contrato: qué puerto y qué ruta espera Runtime" hint="Elige un protocolo">
      <div className="row" style={{ marginBottom: 8 }}>
        <Segmented options={PROTOCOLS.map((x) => ({ value: x.id, label: x.label }))} value={id} onChange={setId} />
      </div>
      <FlowDiagram nodes={contractNodes(p)} edges={CONTRACT_EDGES(p)} width={940} height={250} flows={['client>rt', 'rt>vm']} ariaLabel={`Contrato de servicio de AgentCore Runtime para ${p.label}`} />
      <div className="aws-dep-facts" key={id}>
        <div>
          <span className="label">Puerto por defecto</span>
          <span className="v mono">{p.port}</span>
        </div>
        <div>
          <span className="label">Ruta</span>
          <span className="v mono">{p.path}</span>
        </div>
        <div>
          <span className="label">Formato</span>
          <span className="v">{p.format}</span>
        </div>
        <div>
          <span className="label">Descubrimiento</span>
          <span className="v">{p.discovery}</span>
        </div>
      </div>
      <p className="aws-dep-note" style={{ marginTop: 10 }}>
        {p.note}
      </p>
    </Lab>
  )
}
