import { useEffect, useRef, useState } from 'react'
import { Crosshair, type LucideIcon } from 'lucide-react'
import { toneVar, type Tone } from './ui'

/* ==========================================================================
   Diagrama de flujo SVG animado.

   - Nodos: cajas posicionadas por su CENTRO (x, y) dentro de un viewBox
     width×height (por defecto 900×360). Se escala al ancho disponible.
   - Aristas: líneas (o curvas con `curve`) con flecha. Una arista está activa
     si aparece en `flows` como "a>b" o "b>a"; entonces se anima y viaja un
     "paquete" en el sentido indicado. Si `flows` incluye un par sin arista
     declarada, se dibuja una curva temporal.
   - `active`: ids de nodos resaltados. `dimInactive` atenúa el resto.
   ========================================================================== */

export type FlowNode = {
  id: string
  x: number
  y: number
  w?: number
  h?: number
  label: string
  sub?: string
  tone?: Tone
  icon?: LucideIcon
  /** clases extra (p. ej. "is-outside" para dibujar el borde discontinuo, "is-fresh" para la animación de entrada) */
  cls?: string
  /** etiqueta pequeña en la esquina superior derecha */
  badge?: string
}

export type FlowEdge = {
  from: string
  to: string
  label?: string
  dashed?: boolean
  /** curvatura (px): positivo dobla a la izquierda del sentido from→to */
  curve?: number
  tone?: Tone
}

type Pt = { x: number; y: number }

function borderPoint(n: FlowNode, toward: Pt): Pt {
  const w = (n.w ?? 150) / 2 + 4
  const h = (n.h ?? 58) / 2 + 4
  const dx = toward.x - n.x
  const dy = toward.y - n.y
  if (dx === 0 && dy === 0) return { x: n.x, y: n.y }
  const s = Math.min(w / Math.abs(dx || 1e-9), h / Math.abs(dy || 1e-9))
  return { x: n.x + dx * s, y: n.y + dy * s }
}

function edgeGeometry(a: FlowNode, b: FlowNode, curve = 0) {
  // punto de control para la curva (en el centro desplazado por la normal)
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const c = { x: mx + (-dy / len) * curve, y: my + (dx / len) * curve }
  const p1 = borderPoint(a, curve ? c : b)
  const p2 = borderPoint(b, curve ? c : a)
  const d = curve ? `M${p1.x},${p1.y} Q${c.x},${c.y} ${p2.x},${p2.y}` : `M${p1.x},${p1.y} L${p2.x},${p2.y}`
  // tangente al final para la flecha
  const tx = curve ? p2.x - c.x : p2.x - p1.x
  const ty = curve ? p2.y - c.y : p2.y - p1.y
  const tl = Math.hypot(tx, ty) || 1
  const ux = tx / tl
  const uy = ty / tl
  const arrow = `${p2.x},${p2.y} ${p2.x - ux * 9 - uy * 4.5},${p2.y - uy * 9 + ux * 4.5} ${p2.x - ux * 9 + uy * 4.5},${p2.y - uy * 9 - ux * 4.5}`
  // punto medio de la curva (t=0.5)
  const mid = curve ? { x: 0.25 * p1.x + 0.5 * c.x + 0.25 * p2.x, y: 0.25 * p1.y + 0.5 * c.y + 0.25 * p2.y } : { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
  return { d, arrow, mid }
}

export function FlowDiagram({
  nodes,
  edges,
  width = 900,
  height = 360,
  active = [],
  flows = [],
  dimInactive = false,
  onNodeClick,
  packetDur = 1.1,
  ariaLabel,
}: {
  nodes: FlowNode[]
  edges: FlowEdge[]
  width?: number
  height?: number
  active?: string[]
  flows?: string[]
  dimInactive?: boolean
  onNodeClick?: (id: string) => void
  packetDur?: number
  ariaLabel?: string
}) {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const flowPairs = flows.map((f) => f.split('>') as [string, string])
  const activeNodes = new Set([...active, ...flowPairs.flat()])
  const flowKey = flows.join('|')

  /* Seguimiento: cuando el diagrama no cabe (móvil) y cambia lo activo, la vista se
     desplaza sola hasta las piezas activas. Si el lector arrastra el diagrama, el
     seguimiento se suelta; el botón lo vuelve a activar. */
  const scrollRef = useRef<HTMLDivElement>(null)
  const [follow, setFollow] = useState(true)
  const [scrollable, setScrollable] = useState(false)
  const [edge, setEdge] = useState({ left: false, right: false })
  const focusKey = [...activeNodes].sort().join('|')
  const programmatic = useRef(0)

  const measure = () => {
    const el = scrollRef.current
    if (!el) return
    const can = el.scrollWidth - el.clientWidth > 4
    setScrollable(can)
    setEdge({ left: el.scrollLeft > 4, right: el.scrollLeft < el.scrollWidth - el.clientWidth - 4 })
  }
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !follow || activeNodes.size === 0) return
    if (el.scrollWidth - el.clientWidth <= 4) return
    const act = nodes.filter((n) => activeNodes.has(n.id))
    if (act.length === 0) return
    const x0 = Math.min(...act.map((n) => n.x - (n.w ?? 150) / 2))
    const x1 = Math.max(...act.map((n) => n.x + (n.w ?? 150) / 2))
    const k = el.scrollWidth / width
    const span = (x1 - x0) * k
    // si todo lo activo cabe, se centra; si no, se muestra desde su borde izquierdo
    const left = span <= el.clientWidth - 24 ? ((x0 + x1) / 2) * k - el.clientWidth / 2 : x0 * k - 12
    const target = Math.max(0, Math.min(el.scrollWidth - el.clientWidth, left))
    if (Math.abs(target - el.scrollLeft) < 6) return
    programmatic.current = Date.now()
    el.scrollTo({ left: target, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    // solo debe reaccionar a un cambio de lo activo, no a cada render
  }, [focusKey, follow, width]) // eslint-disable-line react-hooks/exhaustive-deps

  const release = () => {
    // un gesto del lector suelta el seguimiento (no el desplazamiento que hacemos nosotros)
    if (Date.now() - programmatic.current > 700) setFollow(false)
  }

  const isFlow = (e: FlowEdge) => flowPairs.find(([a, b]) => (a === e.from && b === e.to) || (a === e.to && b === e.from))
  const tempEdges: FlowEdge[] = flowPairs
    .filter(([a, b]) => !edges.some((e) => (e.from === a && e.to === b) || (e.from === b && e.to === a)))
    .map(([a, b]) => ({ from: a, to: b, curve: -50, dashed: true }))

  return (
    <div className={`flow-wrap${scrollable ? ' is-scrollable' : ''}${edge.left ? ' fade-left' : ''}${edge.right ? ' fade-right' : ''}`}>
    {scrollable && (
      <button
        type="button"
        className={`flow-follow${follow ? ' is-on' : ''}`}
        onClick={() => setFollow((f) => !f)}
        aria-pressed={follow}
        aria-label={follow ? 'Seguir el paso: activado' : 'Seguir el paso: desactivado'}
        title={follow ? 'La vista sigue las piezas activas. Arrastra el diagrama para moverlo libremente.' : 'Toca para que la vista vuelva a seguir las piezas activas.'}
      >
        <Crosshair size={14} />
        <span>{follow ? 'Siguiendo' : 'Seguir'}</span>
      </button>
    )}
    <div className="flow-scroll" ref={scrollRef} onScroll={measure} onTouchStart={release} onWheel={release} onPointerDown={(e) => e.pointerType !== 'touch' && release()}>
    <svg className="flow flow-min" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} style={{ ['--flow-min' as string]: `${Math.round(width * 0.86)}px` }}>
      {[...edges, ...tempEdges].map((e, i) => {
        const a = byId.get(e.from)
        const b = byId.get(e.to)
        if (!a || !b) return null
        const { d, arrow, mid } = edgeGeometry(a, b, e.curve)
        const f = isFlow(e)
        const reverse = f && f[0] === e.to
        const etone = toneVar(e.tone ?? b.tone ?? 'accent')
        const labelW = (e.label?.length ?? 0) * 7 + 10
        return (
          <g key={`${e.from}-${e.to}-${i}`} className={`flow-edge${f ? ' is-active' : ''}${e.dashed ? ' is-dashed' : ''}`} style={{ ['--etone' as string]: etone }}>
            <path className="line" d={d} />
            <polygon points={arrow} className="flow-arrow" style={f ? { fill: etone } : undefined} />
            {e.label && (
              <g>
                <rect className="edge-label-bg" x={mid.x - labelW / 2} y={mid.y - 9} width={labelW} height={17} rx={5} />
                <text x={mid.x} y={mid.y + 4} textAnchor="middle">
                  {e.label}
                </text>
              </g>
            )}
            {f && (
              <circle key={flowKey} r={5.5} className="flow-packet">
                <animateMotion
                  dur={`${packetDur}s`}
                  repeatCount="indefinite"
                  path={d}
                  keyPoints={reverse ? '1;0' : '0;1'}
                  keyTimes="0;1"
                  calcMode="linear"
                />
              </circle>
            )}
          </g>
        )
      })}
      {nodes.map((n) => {
        const w = n.w ?? 150
        const h = n.h ?? 58
        const x0 = n.x - w / 2
        const y0 = n.y - h / 2
        const on = activeNodes.has(n.id)
        const Icon = n.icon
        const tx = x0 + (Icon ? 44 : 16)
        return (
          <g
            key={n.id}
            className={`flow-node${on ? ' is-active' : ''}${dimInactive && !on ? ' is-dim' : ''}${onNodeClick ? ' is-clickable' : ''}${n.cls ? ` ${n.cls}` : ''}`}
            data-tone={n.tone ?? 'system'}
            onClick={onNodeClick ? () => onNodeClick(n.id) : undefined}
          >
            <rect className="halo" x={x0 - 4} y={y0 - 4} width={w + 8} height={h + 8} rx={16} />
            <rect className="box" x={x0} y={y0} width={w} height={h} rx={12} />
            <rect className="accent-bar" x={x0} y={y0 + 10} width={3.5} height={h - 20} rx={2} />
            {Icon && <Icon x={x0 + 15} y={n.y - 10} width={20} height={20} className="icon" />}
            <text className="lbl" x={tx} y={n.sub ? n.y - 2 : n.y + 5}>
              {n.label}
            </text>
            {n.sub && (
              <text className="sub" x={tx} y={n.y + 15}>
                {n.sub}
              </text>
            )}
            {n.badge && (
              <g className="badge">
                <rect x={x0 + w - n.badge.length * 6.2 - 14} y={y0 - 9} width={n.badge.length * 6.2 + 10} height={16} rx={8} />
                <text x={x0 + w - 9} y={y0 + 3} textAnchor="end">
                  {n.badge}
                </text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
    </div>
    </div>
  )
}
