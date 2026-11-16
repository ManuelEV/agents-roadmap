import { useState } from 'react'
import { Bot, Check, Database, Fingerprint, KeyRound, Minus, ScrollText, UserRound, UserRoundCog, X } from 'lucide-react'
import { Code, linesOf } from '@/components/Code'
import { FlowDiagram, type FlowEdge, type FlowNode } from '@/components/Flow'
import { Narration, PlayerBar } from '@/components/Player'
import { Lab, Pill, Segmented, DetailDock } from '@/components/ui'
import { usePlayer } from '@/lib/hooks'
import { ACTIONS, AGENT_OBJECT_ID, CODE_IDENTITY, FOUNDRY_AGENT, ID_STEPS, PERSONAS, ROLES, type AuthMode, type Cell } from './data'

/* ------------------------------------------------------------------------ */
/* Lab 1 · La identidad del agente, paso a paso                              */
/* ------------------------------------------------------------------------ */
const EDGES: FlowEdge[] = [
  { from: 'dev', to: 'foundry', label: 'create_version' },
  { from: 'foundry', to: 'bp' },
  { from: 'bp', to: 'aid', label: 'obtiene tokens' },
  { from: 'foundry', to: 'aid', dashed: true },
  { from: 'aid', to: 'res' },
  { from: 'admin', to: 'rbac' },
  { from: 'rbac', to: 'res', dashed: true },
  { from: 'user', to: 'foundry', dashed: true },
  { from: 'user', to: 'aid', dashed: true, label: 'OBO' },
]

export function IdentityLab() {
  const [mode, setMode] = useState<AuthMode>('app')
  const steps = ID_STEPS[mode]
  const player = usePlayer(steps.length, { interval: 4600 })
  const s = steps[Math.min(player.step, steps.length - 1)]
  const delegated = mode === 'delegated'

  const nodes: FlowNode[] = [
    { id: 'dev', x: 90, y: 56, w: 160, label: 'Desarrolladora', sub: 'Foundry User', tone: 'user', icon: UserRoundCog },
    { id: 'foundry', x: 416, y: 56, w: 224, label: 'Foundry Agent Service', sub: `${FOUNDRY_AGENT} · v1`, tone: 'model', icon: Bot },
    { id: 'bp', x: 760, y: 56, w: 230, label: 'Agent identity blueprint', sub: 'federated credential', tone: 'guard', icon: ScrollText, cls: s.blueprint ? '' : 'is-outside', badge: s.blueprint ? 'Entra' : undefined },
    {
      id: 'aid',
      x: 760,
      y: 178,
      w: 230,
      label: 'Agent identity',
      sub: delegated ? 'actúa por la usuaria' : s.roles ? '1 rol asignado' : 'sin permisos',
      tone: 'guard',
      icon: Fingerprint,
      cls: s.identity ? '' : 'is-outside',
      badge: s.identity ? (delegated ? 'delegated' : s.roles === 1 ? '1 rol' : '0 roles') : undefined,
    },
    {
      id: 'res',
      x: 760,
      y: 300,
      w: 230,
      label: 'Storage de Andes Market',
      sub: 'comprobantes de despacho',
      tone: s.access === 'denied' ? 'error' : 'data',
      icon: Database,
      badge: s.access === 'denied' ? 'denegado' : s.access === 'allowed' ? 'permitido' : undefined,
    },
    { id: 'rbac', x: 400, y: 300, w: 236, label: 'Asignación de rol', sub: 'az role assignment create', tone: 'guard', icon: KeyRound, cls: delegated || s.roles ? '' : 'is-outside' },
    { id: 'admin', x: 100, y: 300, w: 170, label: 'Administradora', sub: 'asigna RBAC', tone: 'user', icon: UserRound },
    { id: 'user', x: 100, y: 178, w: 170, label: 'Supervisora', sub: 'sesión de Entra', tone: 'user', icon: UserRound, cls: delegated ? '' : 'is-outside' },
  ]
  const edges = EDGES.filter((e) => (delegated ? e.from !== 'admin' && e.from !== 'rbac' : e.from !== 'user'))
  const shown = delegated ? nodes.filter((n) => n.id !== 'rbac' && n.id !== 'admin') : nodes.filter((n) => n.id !== 'user')

  return (
    <Lab
      title="De create_version a la primera tool call autorizada"
      hint="Reproduce o salta de paso; cambia el modelo de autorización"
      footer={
        <span className="small muted">
          Diagrama <strong>simulado</strong>: el object ID y la cuenta de Storage son de ejemplo. El mecanismo (blueprint + agent identity al crear, cero permisos, RBAC
          manual) es el documentado. La delegación de usuario para tools está en <strong>preview</strong>.
        </span>
      }
    >
      <div className="row" style={{ marginBottom: 10 }}>
        <Segmented
          options={[
            { value: 'app', label: 'El agente actúa como sí mismo' },
            { value: 'delegated', label: 'En nombre del usuario · preview' },
          ]}
          value={mode}
          onChange={(v) => {
            setMode(v)
            player.reset()
          }}
        />
      </div>
      <PlayerBar player={player} labels={steps.map((x) => x.title)} />
      <FlowDiagram nodes={shown} edges={edges} width={900} height={350} flows={s.flows} ariaLabel="Ciclo de vida de la identidad de un agente de Foundry en Microsoft Entra" />
      <div className="az-gob-id-grid">
        <Narration steps={steps} step={player.step} />
        <div className="az-gob-card" data-tone="guard" aria-label="Ficha de la identidad del agente">
          <div className="az-gob-card-head">
            <Fingerprint size={15} /> {FOUNDRY_AGENT} en Microsoft Entra
          </div>
          <dl className="az-gob-kv">
            <dt>blueprint</dt>
            <dd className={s.blueprint ? '' : 'is-off'}>{s.blueprint ? 'creado · guarda la credencial' : 'aún no existe'}</dd>
            <dt>agent identity</dt>
            <dd className={s.identity ? 'mono' : 'is-off'}>{s.identity ? AGENT_OBJECT_ID : 'aún no existe'}</dd>
            <dt>secretos</dt>
            <dd>{s.blueprint ? 'ninguno · federated identity credential' : '—'}</dd>
            <dt>{delegated ? 'autoridad' : 'roles sobre recursos'}</dt>
            <dd>
              {delegated ? (
                <Pill tone="user" mono>
                  delegated · la de quien conversa
                </Pill>
              ) : (
                <Pill tone={s.roles ? 'ok' : s.identity ? 'error' : 'system'} mono>
                  {s.roles} {s.roles === 1 ? 'asignación' : 'asignaciones'}
                </Pill>
              )}
            </dd>
          </dl>
        </div>
      </div>
      {!delegated && (
        <div style={{ marginTop: 12 }}>
          <Code code={CODE_IDENTITY} lang="python" title="Los dos momentos que escribes tú" highlight={s.code ? linesOf(CODE_IDENTITY, ...s.code) : []} dim={!!s.code} />
        </div>
      )}
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 2 · Quién necesita qué rol                                            */
/* ------------------------------------------------------------------------ */
const CELL: Record<Cell, { icon: typeof Check; label: string }> = {
  yes: { icon: Check, label: 'sí' },
  no: { icon: X, label: 'no' },
  na: { icon: Minus, label: 'la tabla de roles no lo dice' },
}

export function RolesLab() {
  const [sel, setSel] = useState(PERSONAS[1].id)
  const p = PERSONAS.find((x) => x.id === sel)!
  const role = ROLES.find((r) => r.id === p.role)!
  return (
    <Lab
      title="¿Qué rol necesita cada quien?"
      hint="Elige a una persona o sistema"
      footer={
        <span className="small muted">
          Matriz armada con la tabla de roles de Foundry (sept-2026). El guion marca lo que esa tabla no afirma. Dos puntos siguen en conflicto en la documentación y
          están por confirmar: si <code>Foundry Owner</code> puede crear asignaciones de rol y si <code>Foundry Project Manager</code> puede crear proyectos.
        </span>
      }
    >
      <div className="az-gob-roles">
        <div className="az-gob-people" role="tablist" aria-label="Personas">
          {PERSONAS.map((x) => (
            <button key={x.id} role="tab" aria-selected={x.id === sel} className={`az-gob-person${x.id === sel ? ' is-active' : ''}`} onClick={() => setSel(x.id)}>
              <strong>{x.who}</strong>
              <span>{x.wants}</span>
            </button>
          ))}
        </div>
        <DetailDock k={p.id}>
          <div className="az-gob-card anim-fade" key={p.id} data-tone={p.role === 'azure' ? 'error' : 'guard'}>
            <div className="az-gob-card-head">
              <KeyRound size={15} /> {p.role === 'azure' ? 'Rol que tiene (y no alcanza)' : 'Rol de mínimo privilegio'}
            </div>
            <div className="az-gob-rolename">{role.name}</div>
            <div className="az-gob-old">
              {role.old ? (
                <>
                  antes <s>{role.old}</s>
                </>
              ) : role.guid ? (
                'rol nuevo: no tiene nombre anterior'
              ) : (
                'rol general de Azure, no de Foundry'
              )}
            </div>
            {role.guid && (
              <div className="az-gob-guid">
                <span className="label">ID del rol · no cambió con el renombre</span>
                <code>{role.guid}</code>
              </div>
            )}
            <p className="small" style={{ margin: '8px 0 0' }}>
              {p.why}
            </p>
            {p.trap && (
              <p className="small az-gob-trap" style={{ margin: '6px 0 0' }}>
                {p.trap}
              </p>
            )}
          </div>
        </DetailDock>
      </div>
      <div className="table-wrap" style={{ marginTop: 14 }}>
        <table className="tbl az-gob-matrix">
          <thead>
            <tr>
              <th>Acción</th>
              {ROLES.map((r) => (
                <th key={r.id} className={r.id === p.role ? 'is-sel' : ''}>
                  {r.name.replace('Foundry ', '')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ACTIONS.map((a) => (
              <tr key={a.id}>
                <td>{a.label}</td>
                {ROLES.map((r) => {
                  const c = a.cells[r.id]
                  const Icon = CELL[c].icon
                  return (
                    <td key={r.id} className={`az-gob-cell is-${c}${r.id === p.role ? ' is-sel' : ''}`} title={CELL[c].label}>
                      <Icon size={15} aria-label={CELL[c].label} />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Lab>
  )
}
