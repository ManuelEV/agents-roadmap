import { useState } from 'react'
import { Bot, Fingerprint, KeyRound, Server, Smartphone } from 'lucide-react'
import { Lab, Pill, Segmented } from '@/components/ui'
import { Code, linesOf } from '@/components/Code'
import { FlowDiagram, type FlowEdge, type FlowNode } from '@/components/Flow'
import { Narration, PlayerBar } from '@/components/Player'
import { usePlayer } from '@/lib/hooks'
import { CODE_ID_AGENT, CODE_ID_USER, ID_STEPS, type AuthMode } from './data'

const nodesOf = (mode: AuthMode): FlowNode[] => [
  { id: 'app', x: 96, y: 180, w: 156, h: 62, label: 'Camila', sub: 'app de la tienda', tone: 'user', icon: Smartphone },
  { id: 'rt', x: 350, y: 180, w: 176, h: 70, label: 'Runtime', sub: 'andes_ops · workload', tone: 'model', icon: Bot },
  { id: 'idn', x: 624, y: 92, w: 188, label: 'Identity', sub: 'token vault', tone: 'guard', icon: Fingerprint },
  { id: 'as', x: 868, y: 92, w: 168, label: 'Servidor OAuth', sub: mode === 'user' ? 'consentimiento' : 'client credentials', tone: 'system', icon: KeyRound, cls: 'is-outside' },
  { id: 'api', x: 624, y: 268, w: 188, label: mode === 'user' ? 'API de pedidos' : 'API AndesExpress', sub: mode === 'user' ? 've a cus_7781' : 've a andes_ops', tone: 'tool', icon: Server, cls: 'is-outside' },
]
const EDGES: FlowEdge[] = [
  { from: 'app', to: 'rt' },
  { from: 'rt', to: 'idn' },
  { from: 'idn', to: 'as' },
  { from: 'rt', to: 'api' },
  { from: 'app', to: 'idn', curve: -70, dashed: true },
  { from: 'app', to: 'as', curve: -150, dashed: true },
]

export function IdentityLab() {
  const [mode, setMode] = useState<AuthMode>('user')
  const steps = ID_STEPS[mode]
  const player = usePlayer(steps.length, { interval: 4600 })
  const step = Math.min(player.step, steps.length - 1)
  const s = steps[step]
  const code = mode === 'user' ? CODE_ID_USER : CODE_ID_AGENT
  const last = step === steps.length - 1
  return (
    <Lab
      title="¿Quién es Andi cuando llama a una herramienta?"
      hint="Elige un modo y reproduce"
      footer={
        <span className="small muted">
          Flujo <strong>simulado</strong>. El decorador, sus parámetros y los dos valores de <code>auth_flow</code> son los de la documentación; los nombres de
          provider y los scopes son de Andes Market.
        </span>
      }
    >
      <div className="aws-gob-scen">
        <Segmented
          options={[
            { value: 'user', label: 'En nombre de Camila · USER_FEDERATION' },
            { value: 'agent', label: 'Como el agente · M2M' },
          ]}
          value={mode}
          onChange={(v) => {
            setMode(v)
            player.reset()
          }}
        />
      </div>
      <PlayerBar player={player} labels={steps.map((x) => x.title)} />
      <FlowDiagram nodes={nodesOf(mode)} edges={EDGES} width={980} height={330} flows={s.flows} ariaLabel="Flujo de tokens entre la app, el runtime, AgentCore Identity, el servidor OAuth y la API" />
      <Narration steps={steps} step={step} />
      <div className="aws-gob-id-grid">
        <div className="aws-gob-ledger">
          <div className="aws-gob-ledger-row" data-tone="model">
            <span className="label">El código del agente tiene</span>
            <span className="mono small anim-fade" key={s.seen}>
              {s.seen}
            </span>
          </div>
          <div className="aws-gob-ledger-row" data-tone="guard">
            <span className="label">El token vault guarda</span>
            <span className="mono small anim-fade" key={`${mode}-${s.vault}`}>
              {mode === 'user'
                ? s.vault === 'stored'
                  ? 'credenciales OAuth de Camila para andes-orders-provider (incluido el refresh token)'
                  : 'nada todavía para Camila'
                : 'client secret de andesexpress-provider'}
            </span>
          </div>
          <div className="aws-gob-ledger-row" data-tone="tool">
            <span className="label">Camila pide el pedido 4903 (de cus_1032)</span>
            {last ? (
              mode === 'user' ? (
                <span className="small anim-fade">
                  <Pill tone="ok" mono>
                    rechazado por la API
                  </Pill>{' '}
                  el token es de cus_7781.
                </span>
              ) : (
                <span className="small anim-fade">
                  <Pill tone="error" mono>
                    la API lo entregaría
                  </Pill>{' '}
                  solo ve al agente; te queda validar en la tool.
                </span>
              )
            ) : (
              <span className="small muted">avanza hasta el último paso</span>
            )}
          </div>
        </div>
        <Code code={code} lang="python" title={mode === 'user' ? 'tools/orders.py · 3LO' : 'tools/carrier.py · 2LO'} highlight={linesOf(code, ...(s.needles.length ? s.needles : ['\u0000']))} dim={s.needles.length > 0} maxHeight={300} />
      </div>
    </Lab>
  )
}
