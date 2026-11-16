import { useEffect, useMemo, useState } from 'react'
import { Bot, Cloud, LifeBuoy, Route } from 'lucide-react'
import { Lab, Pill, Segmented, Toggle } from '@/components/ui'
import { Code, linesOf } from '@/components/Code'
import { FlowDiagram, type FlowEdge, type FlowNode } from '@/components/Flow'
import { Narration, PlayerBar, type StepInfo } from '@/components/Player'
import { usePlayer } from '@/lib/hooks'

/* Lab 3 · Una request por AI Gateway: orden de proveedores, caídas y modelo de respaldo.
   Las opciones (order, only, models) y su efecto son reales; las caídas y los tiempos, simulados. */

type Mode = 'order' | 'only' | 'auto'
type Prov = 'bedrock' | 'anthropic' | 'vertex'

const PRIMARY = 'anthropic/claude-sonnet-5.5'
const BACKUP = 'openai/gpt-6.1-terra'
const PROVS: Prov[] = ['bedrock', 'anthropic', 'vertex']
/** latencia reciente simulada (ms al primer token): solo decide el orden en modo "sin opciones" */
const TTFT: Record<Prov, number> = { bedrock: 410, anthropic: 380, vertex: 450 }

const candidatesOf = (mode: Mode): Prov[] =>
  mode === 'order' ? ['bedrock', 'anthropic', 'vertex'] : mode === 'only' ? ['bedrock', 'anthropic'] : [...PROVS].sort((a, b) => TTFT[a] - TTFT[b])

function buildCode(mode: Mode, backup: boolean) {
  const opts: string[] = []
  if (mode === 'order') opts.push(`      order: ['bedrock', 'anthropic', 'vertex'],`)
  if (mode === 'only') opts.push(`      only: ['bedrock', 'anthropic'],`)
  if (backup && mode !== 'only') opts.push(`      models: ['${BACKUP}'],`)
  const po = opts.length ? `\n  providerOptions: {\n    gateway: {\n${opts.join('\n')}\n    },\n  },` : ''
  return `import { generateText } from 'ai';

const { text } = await generateText({
  model: '${PRIMARY}',
  prompt: '¿Dónde está mi pedido 4821?',${po}
});
`
}

type Step = StepInfo & { flows: string[]; needles: string[]; kind: 'send' | 'fail' | 'ok' | 'backup' | 'done' | 'dead'; prov?: Prov; ms?: number }

function buildSteps(mode: Mode, down: Set<Prov>, backup: boolean): Step[] {
  const cands = candidatesOf(mode)
  const optName = mode === 'order' ? 'order' : mode === 'only' ? 'only' : null
  const steps: Step[] = [
    {
      kind: 'send',
      title: 'Andi pide un modelo con un string',
      body: (
        <>
          <code>model: '{PRIMARY}'</code> no nombra un SDK de proveedor: en el AI SDK, AI Gateway es el proveedor por defecto. La request sale de tu ruta
          hacia <code>https://ai-gateway.vercel.sh</code> con una sola credencial (la API key o el token OIDC del proyecto).
        </>
      ),
      flows: ['app>gw'],
      needles: ['model:'],
    },
  ]
  let served: Prov | null = null
  cands.forEach((p, i) => {
    if (served) return
    const isDown = down.has(p)
    const why =
      mode === 'auto'
        ? 'Sin opciones, el gateway ordena los proveedores del modelo por uptime y latencia recientes.'
        : mode === 'order'
          ? `order fija el orden: este es el intento ${i + 1} de ${cands.length}.`
          : `only restringe la request a esta lista: intento ${i + 1} de ${cands.length}.`
    if (isDown) {
      steps.push({
        kind: 'fail',
        prov: p,
        title: `${p} no responde`,
        body: (
          <>
            {why} El proveedor <code>{p}</code> está caído, así que el gateway descarta el intento y pasa al siguiente candidato. Tu código no se entera:
            sigue esperando la misma promesa.
          </>
        ),
        flows: [`gw>${p}`],
        needles: optName ? [`${optName}:`] : ['model:'],
      })
    } else {
      served = p
      steps.push({
        kind: 'ok',
        prov: p,
        ms: TTFT[p],
        title: `${p} atiende la request`,
        body: (
          <>
            {why} <code>{p}</code> responde y ahí termina el ruteo: los candidatos que quedaban no se tocan.
          </>
        ),
        flows: [`gw>${p}`],
        needles: optName ? [`${optName}:`] : ['model:'],
      })
    }
  })
  if (!served && backup && mode !== 'only') {
    steps.push({
      kind: 'backup',
      ms: 520,
      title: 'Ningún proveedor del primario: entra el modelo de respaldo',
      body: (
        <>
          <code>models</code> es la lista de modelos de respaldo, en orden, para cuando el primario falla o no está disponible. El gateway reintenta la
          misma request con <code>{BACKUP}</code>. Cambió el modelo, no tu código; conviene que el respaldo sea uno con el que ya probaste tus tools.
        </>
      ),
      flows: ['gw>fb'],
      needles: ['models:'],
    })
  }
  const last = steps[steps.length - 1]
  if (last.kind === 'ok' || last.kind === 'backup') {
    const fails = steps.filter((s) => s.kind === 'fail').length
    steps.push({
      kind: 'done',
      title: 'La respuesta vuelve a tu ruta',
      body: (
        <>
          <code>generateText</code> resuelve con el texto. {fails > 0 ? `Hubo ${fails} intento${fails > 1 ? 's' : ''} fallido${fails > 1 ? 's' : ''} que Camila nunca vio. ` : ''}
          El gateway registra la request con el modelo, los intentos por proveedor, la latencia, los tokens y el costo en la pestaña Observability; desde
          el SDK llega en <code>providerMetadata.gateway</code>.
        </>
      ),
      flows: [last.kind === 'backup' ? 'fb>gw' : `${last.prov}>gw`, 'gw>app'],
      needles: ['const { text }'],
    })
  } else {
    steps.push({
      kind: 'dead',
      title: 'La request falla',
      body:
        mode === 'only' ? (
          <>
            <code>only</code> no deja salir de la lista: si esos proveedores fallan, la request falla{!down.has('vertex') ? ', aunque vertex esté arriba y sirva el mismo modelo' : ''}.
            Fijar proveedores con <code>only</code> elimina el fallback; úsalo cuando la restricción importe más que la disponibilidad.
          </>
        ) : (
          <>
            Se agotaron los proveedores del modelo primario y no hay <code>models</code> de respaldo. El error llega a tu ruta y a Camila. Activa «Modelo de
            respaldo» y vuelve a reproducir.
          </>
        ),
      flows: ['gw>app'],
      needles: ['const { text }'],
    })
  }
  return steps
}

/** En pantallas angostas el diagrama se dibuja en vertical para que quepa sin desplazarse. */
function useNarrow() {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const on = () => setNarrow(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return narrow
}

const EDGES: FlowEdge[] = [
  { from: 'app', to: 'gw' },
  { from: 'gw', to: 'bedrock' },
  { from: 'gw', to: 'anthropic' },
  { from: 'gw', to: 'vertex' },
  { from: 'gw', to: 'fb', dashed: true },
]

export function GatewayLab() {
  const [mode, setMode] = useState<Mode>('order')
  const [down, setDown] = useState<Set<Prov>>(() => new Set<Prov>(['bedrock']))
  const [backup, setBackup] = useState(true)

  const steps = useMemo(() => buildSteps(mode, down, backup), [mode, down, backup])
  const code = useMemo(() => buildCode(mode, backup), [mode, backup])
  const player = usePlayer(steps.length, { interval: 3200 })
  const step = Math.min(player.step, steps.length - 1)
  const s = steps[step]
  const cands = candidatesOf(mode)
  const hasBackup = backup && mode !== 'only'
  const narrow = useNarrow()

  const toggleDown = (p: Prov) => {
    setDown((d) => {
      const n = new Set(d)
      if (n.has(p)) n.delete(p)
      else n.add(p)
      return n
    })
    player.reset()
  }

  const nodes: FlowNode[] = [
    { id: 'app', x: narrow ? 180 : 95, y: narrow ? 44 : 190, w: 170, h: 64, label: 'andes_ops', sub: 'tu ruta /api/chat', tone: 'model', icon: Bot },
    { id: 'gw', x: narrow ? 180 : 340, y: narrow ? 158 : 190, w: 170, h: 64, label: 'AI Gateway', sub: 'proxy de modelos', tone: 'accent', icon: Route },
    ...PROVS.map((p, i): FlowNode => {
      const pos = cands.indexOf(p)
      return {
        id: p,
        x: narrow ? (i % 2 === 0 ? 92 : 268) : 640,
        y: narrow ? (i < 2 ? 290 : 384) : 60 + i * 96,
        w: narrow ? 164 : 190,
        h: 60,
        label: p,
        sub: down.has(p) ? (narrow ? 'caído' : 'caído (simulado)') : narrow ? 'activo' : 'claude-sonnet-5.5',
        tone: down.has(p) ? 'error' : 'ok',
        icon: Cloud,
        badge: pos === -1 ? 'fuera de only' : `${pos + 1}º`,
      }
    }),
    { id: 'fb', x: narrow ? 268 : 640, y: narrow ? 384 : 356, w: narrow ? 164 : 190, h: 60, label: 'gpt-6.1-terra', sub: hasBackup ? (narrow ? 'respaldo' : 'modelo de respaldo') : 'sin respaldo', tone: hasBackup ? 'tool' : 'system', icon: LifeBuoy, badge: hasBackup ? 'models' : undefined },
  ]

  const log = steps.slice(1, step + 1).filter((x) => x.kind !== 'done')
  const outcome = steps[steps.length - 1].kind === 'done' ? 'ok' : 'error'

  return (
    <Lab
      title="Una request por AI Gateway: tumba un proveedor y mira el desvío"
      hint="Tumba proveedores y reproduce"
      footer={<span className="small muted">Las opciones de providerOptions.gateway y su efecto son los reales. Las caídas, el orden por latencia y los milisegundos son simulados.</span>}
    >
      <div className="vc-mapa-gw-controls">
        <div className="vc-mapa-gw-ctl">
          <span className="label">Opciones de ruteo</span>
          <Segmented<Mode>
            options={[
              { value: 'order', label: 'order' },
              { value: 'only', label: 'only' },
              { value: 'auto', label: 'sin opciones' },
            ]}
            value={mode}
            onChange={(m) => {
              setMode(m)
              player.reset()
            }}
          />
        </div>
        <div className="vc-mapa-gw-ctl">
          <span className="label">Tumbar un proveedor</span>
          <div className="row" style={{ gap: 6 }}>
            {PROVS.map((p) => (
              <button key={p} className={`btn btn-sm vc-mapa-kill${down.has(p) ? ' is-down' : ''}`} aria-pressed={down.has(p)} onClick={() => toggleDown(p)}>
                <span className="dot" />
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="vc-mapa-gw-ctl">
          <span className="label">Respaldo</span>
          {mode === 'only' ? (
            <span className="small muted">con only no hay salida de la lista</span>
          ) : (
            <Toggle
              label="Modelo de respaldo (models)"
              checked={backup}
              onChange={(v) => {
                setBackup(v)
                player.reset()
              }}
            />
          )}
        </div>
      </div>

      <PlayerBar player={player} labels={steps.map((x) => x.title)} />

      <div className="vc-mapa-gw-flow">
      <FlowDiagram
        nodes={nodes}
        edges={EDGES}
        width={narrow ? 360 : 760}
        height={narrow ? 434 : 410}
        flows={s.flows}
        onNodeClick={(id) => {
          if ((PROVS as string[]).includes(id)) toggleDown(id as Prov)
        }}
        ariaLabel="La request de Andi pasa por AI Gateway hacia los proveedores bedrock, anthropic y vertex, con un modelo de respaldo"
      />
      </div>

      <div className="vc-mapa-gw-grid">
        <div className="stack">
          <Code code={code} lang="ts" title="lib/ask-model.ts" highlight={linesOf(code, ...s.needles)} dim />
          <Narration steps={steps} step={step} />
        </div>
        <div className="vc-mapa-gw-log">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="label">Intentos de esta request</span>
            {step === steps.length - 1 && <Pill tone={outcome}>{outcome === 'ok' ? 'respondida' : 'falló'}</Pill>}
          </div>
          {log.length === 0 && <div className="vc-mapa-gw-empty">Aún no hay intentos. Reproduce o avanza un paso.</div>}
          <div className="evs">
            {log.map((x, i) => (
              <div key={`${x.kind}-${x.prov ?? 'fb'}-${i}`} className={`ev anim-fade${i === log.length - 1 ? ' is-hl' : ''}`} data-tone={x.kind === 'fail' || x.kind === 'dead' ? 'error' : x.kind === 'backup' ? 'tool' : 'ok'}>
                <div className="ev-head">
                  {x.kind === 'dead' ? 'resultado' : `intento ${i + 1}`}
                  <span className="ev-tag">{x.kind === 'backup' ? BACKUP : x.kind === 'dead' ? 'error' : `${PRIMARY} · ${x.prov}`}</span>
                  {x.ms && <span className="ev-time">{x.ms} ms al primer token</span>}
                </div>
                <div className="ev-text">
                  {x.kind === 'fail' && 'Sin respuesta del proveedor → siguiente candidato.'}
                  {x.kind === 'ok' && 'Responde. Fin del ruteo.'}
                  {x.kind === 'backup' && 'Primario agotado → se usa el modelo de respaldo.'}
                  {x.kind === 'dead' && 'No queda a quién preguntar: la request falla.'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Lab>
  )
}
