import { useMemo, useState } from 'react'
import { ArrowRight, Bot, Brain, Cloud, Database, KeyRound, Network, ShieldCheck, Truck, User, Wrench } from 'lucide-react'
import { BarRow, Lab, Pill, Segmented, Toggle } from '@/components/ui'
import { Code, linesOf } from '@/components/Code'
import { FlowDiagram, type FlowEdge, type FlowNode } from '@/components/Flow'
import { Narration, PlayerBar } from '@/components/Player'
import { usePlayer } from '@/lib/hooks'
import {
  CALL_STEPS,
  CATEGORIES,
  INBOUND,
  SEARCH_QUERIES,
  SEARCH_TOOL,
  TARGETS,
  WAYS,
  gwToolName,
  toolsListResponse,
  type InboundId,
  type TargetId,
  type WayId,
  type Zone,
} from './data'

/* ------------------------------------------------------------------------ */
/* Lab 1 · tres formas                                                       */
/* ------------------------------------------------------------------------ */

const ITEM_ICON = { agent: Bot, code: Wrench, secret: KeyRound, sys: Database, none: ShieldCheck }

function ZoneBox({ z }: { z: Zone }) {
  return (
    <div className={`aws-hm-zone${z.outside ? ' is-outside' : ''}`} data-tone={z.tone}>
      <div className="aws-hm-zone-title">{z.title}</div>
      <div className="aws-hm-zone-sub">{z.sub}</div>
      <div className="aws-hm-zone-items">
        {z.items.map((it) => {
          const Icon = ITEM_ICON[it.kind]
          return (
            <span key={it.label} className={`aws-hm-chip k-${it.kind}`}>
              <Icon size={13} />
              {it.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export function WaysLab() {
  const [way, setWay] = useState<WayId>('tool')
  const w = WAYS[way]
  const hl = useMemo(() => linesOf(w.code, ...w.needles), [w])
  const secrets = w.zones[0].items.filter((i) => i.kind === 'secret').length
  return (
    <Lab title="Tres formas de darle una herramienta a Andi" hint="Cambia la forma y mira dónde quedan el código y las llaves">
      <div className="row" style={{ marginBottom: 14 }}>
        <Segmented options={(Object.keys(WAYS) as WayId[]).map((k) => ({ value: k, label: WAYS[k].label }))} value={way} onChange={setWay} />
        <Pill tone={secrets ? 'error' : 'ok'}>
          <KeyRound size={12} /> {secrets ? `${secrets} secretos dentro del agente` : '0 secretos de negocio dentro del agente'}
        </Pill>
      </div>
      <div className="aws-hm-zones anim-fade" key={way} role="img" aria-label="Dónde corre el código de la herramienta y dónde se guardan las credenciales">
        {w.zones.map((z, i) => (
          <div className="aws-hm-zone-wrap" key={z.title}>
            {i > 0 && <ArrowRight size={18} className="aws-hm-arrow" aria-hidden />}
            <ZoneBox z={z} />
          </div>
        ))}
      </div>
      <div className="aws-hm-legend">
        <span className="aws-hm-chip k-code">
          <Wrench size={13} /> código de la tool
        </span>
        <span className="aws-hm-chip k-secret">
          <KeyRound size={13} /> credencial
        </span>
      </div>
      <div className="aws-hm-ways-grid">
        <Code code={w.code} lang="python" title={w.file} highlight={hl} dim maxHeight={420} />
        <div className="aws-hm-facts anim-fade" key={way}>
          {w.rows.map(([k, v]) => (
            <div key={k} className="aws-hm-fact">
              <div className="k">{k}</div>
              <div className="v">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 2 · targets → tools/list → búsqueda                                   */
/* ------------------------------------------------------------------------ */

export function TargetsLab() {
  const [on, setOn] = useState<Record<TargetId, boolean>>({ orders: true, carrier: true, erp: false })
  const [search, setSearch] = useState(false)
  const [inbound, setInbound] = useState<InboundId>('CUSTOM_JWT')
  const [qid, setQid] = useState(SEARCH_QUERIES[0].id)
  const resp = useMemo(() => toolsListResponse(on, search), [on, search])
  const json = useMemo(() => JSON.stringify(resp, null, 2), [resp])
  const count = resp.result.tools.length
  const q = SEARCH_QUERIES.find((x) => x.id === qid)!
  const ranked = TARGETS.filter((t) => on[t.id])
    .flatMap((t) => t.tools.map((tool) => ({ name: gwToolName(t.name, tool), score: q.scores[tool] ?? 0 })))
    .sort((a, b) => b.score - a.score)
  const searchReq = JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: SEARCH_TOOL, arguments: { query: q.q } } }, null, 2)

  return (
    <Lab
      title="Arma el Gateway de Andes Market y mira qué ve el agente"
      hint="Activa targets, cambia el authorizer y prueba la búsqueda"
      footer={
        <span className="small muted">
          Los nombres de tools, el formato <code>tools/list</code> y la tool <code>{SEARCH_TOOL}</code> son reales. Los puntajes de la búsqueda son simulados.
        </span>
      }
    >
      <div className="aws-hm-cats">
        {CATEGORIES.map((c) => (
          <div key={c.id} className="aws-hm-cat">
            <div className="aws-hm-cat-title">{c.title}</div>
            <div className="aws-hm-cat-mode">{c.mode}</div>
            <ul>
              {c.kinds.map((k) => (
                <li key={k.label} className={k.andes ? 'is-andes' : ''}>
                  {k.label}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="aws-hm-build">
        <div className="stack">
          <div className="label">Targets del gateway (salida)</div>
          {TARGETS.map((t) => (
            <div key={t.id} className={`aws-hm-target${on[t.id] ? ' is-on' : ''}`}>
              <div className="aws-hm-target-head">
                <Toggle label={<span className="mono">{t.name}</span>} checked={on[t.id]} onChange={(v) => setOn((s) => ({ ...s, [t.id]: v }))} />
                <Pill tone="tool">{t.kind}</Pill>
              </div>
              <div className="aws-hm-target-body">
                <span>
                  <Database size={13} /> {t.system}
                </span>
                <span>
                  <KeyRound size={13} /> {t.outbound}
                </span>
              </div>
            </div>
          ))}
          <div className={`aws-hm-target${search ? ' is-on' : ''}`}>
            <div className="aws-hm-target-head">
              <Toggle label="Búsqueda semántica de tools" checked={search} onChange={setSearch} />
            </div>
            <div className="aws-hm-target-body">
              <span>Se habilita al crear el gateway. Agrega una tool más a la lista.</span>
            </div>
          </div>
          <div className="label" style={{ marginTop: 4 }}>
            Authorizer (entrada)
          </div>
          <Segmented options={(Object.keys(INBOUND) as InboundId[]).map((k) => ({ value: k, label: k }))} value={inbound} onChange={setInbound} />
          <div className="aws-hm-inbound anim-fade" key={inbound}>
            <div>
              <span className="muted">La petición de Andi lleva: </span>
              <code>{INBOUND[inbound].carries}</code>
            </div>
            <div className="muted">{INBOUND[inbound].note}</div>
          </div>
        </div>

        <div className="stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="label">Respuesta a list_tools_sync()</span>
            <Pill tone={count ? 'tool' : 'error'} mono>
              {count} {count === 1 ? 'tool' : 'tools'}
            </Pill>
          </div>
          <Code code={json} lang="json" title="tools/list · result" highlight={linesOf(json, '"name"')} maxHeight={330} />
          <div className="small muted">El código de Andi es el mismo en todos los casos. Lo que cambia es lo que el Gateway responde.</div>
        </div>
      </div>

      <div className="aws-hm-search">
        <div className="label">Búsqueda semántica</div>
        {search ? (
          <div className="aws-hm-build">
            <div className="stack">
              <Segmented options={SEARCH_QUERIES.map((s) => ({ value: s.id, label: s.q }))} value={qid} onChange={setQid} />
              <Code code={searchReq} lang="json" title="tools/call" highlight={linesOf(searchReq, SEARCH_TOOL, '"query"')} />
            </div>
            <div className="stack">
              <div className="small muted">Tools que devuelve, por relevancia. Con cientos de tools, el agente carga solo estas en vez de todas.</div>
              {ranked.length ? (
                ranked.map((r, i) => <BarRow key={r.name} label={<span className="mono">{r.name}</span>} value={r.score} display={r.score.toFixed(2)} tone="tool" pick={i === 0} />)
              ) : (
                <div className="small muted">No hay targets activos: no hay nada que buscar.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="small muted">
            Actívala arriba. Sin ella, la tool <code>{SEARCH_TOOL}</code> no existe y el agente recibe la lista completa en cada conexión.
          </div>
        )}
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 3 · una tool call a través del Gateway                                */
/* ------------------------------------------------------------------------ */

const NODES: FlowNode[] = [
  { id: 'user', x: 68, y: 80, w: 116, label: 'Camila', sub: 'cus_7781', tone: 'user', icon: User },
  { id: 'agent', x: 252, y: 80, w: 196, h: 62, label: 'Andi', sub: 'Strands + MCPClient', tone: 'model', icon: Bot },
  { id: 'model', x: 252, y: 250, w: 196, label: 'Claude Sonnet 5.5', sub: 'Amazon Bedrock', tone: 'model', icon: Brain },
  { id: 'gateway', x: 520, y: 80, w: 208, h: 62, label: 'AgentCore Gateway', sub: 'endpoint /mcp', tone: 'system', icon: Network, badge: 'authorizer' },
  { id: 'identity', x: 520, y: 250, w: 208, label: 'AgentCore Identity', sub: 'token vault', tone: 'guard', icon: KeyRound },
  { id: 'target', x: 792, y: 80, w: 176, h: 62, label: 'AndesExpress', sub: 'target OpenAPI', tone: 'tool', icon: Truck, cls: 'is-outside' },
]
const EDGES: FlowEdge[] = [
  { from: 'user', to: 'agent' },
  { from: 'agent', to: 'model' },
  { from: 'agent', to: 'gateway', label: 'JWT' },
  { from: 'gateway', to: 'identity' },
  { from: 'gateway', to: 'target', label: 'API key' },
]

const HOPS: { id: 'in' | 'vault' | 'out'; who: string; cred: string; icon: typeof Cloud }[] = [
  { id: 'in', who: 'Andi → Gateway', cred: 'entrada: JWT de quien conversa', icon: ShieldCheck },
  { id: 'vault', who: 'Gateway → Identity', cred: 'pide la credencial del target', icon: KeyRound },
  { id: 'out', who: 'Gateway → AndesExpress', cred: 'salida: API key del target', icon: Cloud },
]

export function CallLab() {
  const player = usePlayer(CALL_STEPS.length, { interval: 4200 })
  const s = CALL_STEPS[player.step]
  return (
    <Lab
      title="Una tool call a través del Gateway, tramo por tramo"
      hint="Reproduce o haz clic en un paso"
      footer={
        <span className="small muted">
          Respuestas simuladas. Los mensajes JSON-RPC, el header de autorización y el evento <code>current_tool_use</code> tienen la forma real; la API de
          AndesExpress es ficticia.
        </span>
      }
    >
      <PlayerBar player={player} labels={CALL_STEPS.map((x) => x.title)} />
      <FlowDiagram nodes={NODES} edges={EDGES} width={900} height={320} flows={s.flows} dimInactive ariaLabel="Camila, Andi, el modelo, AgentCore Gateway, Identity y la API de AndesExpress durante una llamada a herramienta" />
      <div className="aws-hm-hops">
        {HOPS.map((h) => (
          <div key={h.id} className={`aws-hm-hop${s.hop === h.id ? ' is-on' : ''}`} data-tone={h.id === 'in' ? 'user' : h.id === 'vault' ? 'guard' : 'tool'}>
            <h.icon size={15} />
            <div>
              <div className="who">{h.who}</div>
              <div className="cred">{h.cred}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="aws-hm-call-grid">
        <Narration steps={CALL_STEPS} step={player.step} />
        <Code key={player.step} code={s.payload} lang={s.payloadLang} title={s.payloadTitle} lineNumbers={false} highlight={linesOf(s.payload, 'Authorization:', 'x-api-key:', '"name"')} maxHeight={300} />
      </div>
    </Lab>
  )
}
