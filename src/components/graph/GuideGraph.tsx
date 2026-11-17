import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { STOPS, TRACKS, getTrack, unitName, type Stop, type TrackId } from '@/catalog'
import { useTheme } from '@/lib/theme'

/* ==========================================================================
   El grafo del inicio.

   Un canvas 2D fijo detrás de la página dibuja la guía como grafo:
     · cada tarjeta de sección ([data-node="<id>"]) es un nodo grande;
     · cada lección es un punto que orbita su tarjeta, en orden;
     · la portada ([data-core]) es el nodo central: de ella salen aristas a
       cada sección, y por ellas los pulsos de luz;
     · el resto de las aristas son el orden dentro de cada sección y los
       temas que comparten secciones distintas.
   Los nodos brillan y por las aristas viajan pulsos de luz. Esa luz se
   proyecta sobre el HTML: cada elemento con [data-glow] recibe en variables
   CSS la posición, el color y la intensidad de la luz que tiene cerca
   (--gx, --gy, --gc, --ga) y la del puntero (--px, --py, --pa).

   Todo se mide del DOM: el grafo se adapta solo a la grilla de tarjetas en
   escritorio, tablet o teléfono.
   ========================================================================== */

type RGB = [number, number, number]
type Rect = { x: number; y: number; w: number; h: number }
type NodeKind = 'core' | 'hub' | 'dot'
type GNode = {
  kind: NodeKind
  x: number
  y: number
  track?: TrackId
  stop?: Stop
  rect?: Rect
  nx: number
  ny: number
  color: RGB
  phase: number
  glow: number
  flash: number
  hitX: number
  hitY: number
  adj: number[]
}
type EdgeKind = 'core' | 'trunk' | 'spoke' | 'chain' | 'topic'
type GEdge = { a: number; b: number; kind: EdgeKind; x1: number; y1: number; x2: number; y2: number; cx: number; cy: number; len: number; lit: number }
type Pulse = { e: number; dir: 1 | -1; t: number; dur: number; hops: number }
type Glow = { el: HTMLElement; r: Rect; last: string }

type World = {
  nodes: GNode[]
  edges: GEdge[]
  glows: Glow[]
  root: Rect
  core: number
  byPath: Map<string, number>
}

/** Enlaces entre secciones vecinas (además de los que salen de la portada). */
const TRUNK: [TrackId, TrackId][] = [
  ['fundamentos', 'google'],
  ['google', 'azure'],
  ['guia', 'aws'],
  ['aws', 'vercel'],
  ['fundamentos', 'guia'],
  ['google', 'aws'],
  ['azure', 'vercel'],
]

const BASE: Record<EdgeKind, number> = { core: 0.34, trunk: 0.26, spoke: 0.2, chain: 0.17, topic: 0.07 }
const WIDTH: Record<EdgeKind, number> = { core: 1.3, trunk: 1.1, spoke: 1, chain: 1, topic: 0.8 }

/* ---------------------------------------------------------------- geometría */

const docRect = (el: Element): Rect => {
  const r = el.getBoundingClientRect()
  return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }
}
const inflate = (r: Rect, d: number): Rect => ({ x: r.x - d, y: r.y - d, w: r.w + 2 * d, h: r.h + 2 * d })
const inside = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
const center = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })

/** Punto del borde de `r` en dirección a (tx, ty), un poco hacia afuera. */
function rim(r: Rect, tx: number, ty: number, out = 3) {
  const c = center(r)
  const dx = tx - c.x
  const dy = ty - c.y
  const s = Math.min(Math.abs(r.w / 2 / (dx || 1e-6)), Math.abs(r.h / 2 / (dy || 1e-6)))
  const len = Math.hypot(dx, dy) || 1
  return { x: c.x + dx * s + (dx / len) * out, y: c.y + dy * s + (dy / len) * out }
}

/** Punto del borde de `r` más cercano a (px, py). */
function nearestRim(r: Rect, px: number, py: number) {
  return { x: Math.max(r.x, Math.min(r.x + r.w, px)), y: Math.max(r.y, Math.min(r.y + r.h, py)) }
}

/** ¿El segmento cruza alguno de los rectángulos? (muestreo; basta para tarjetas grandes) */
function crosses(x1: number, y1: number, x2: number, y2: number, rects: Rect[]) {
  const n = Math.max(8, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 10))
  for (let i = 1; i < n; i++) {
    const t = i / n
    const x = x1 + (x2 - x1) * t
    const y = y1 + (y2 - y1) * t
    for (const r of rects) if (inside(r, x, y)) return true
  }
  return false
}

/** Muestras sobre el contorno de `r` inflado en `d` (esquinas redondas), en sentido horario desde arriba a la izquierda. */
function ring(r: Rect, d: number, step = 4) {
  const pts: { x: number; y: number; nx: number; ny: number }[] = []
  const { x, y, w, h } = r
  const line = (x0: number, y0: number, x1: number, y1: number, nx: number, ny: number) => {
    const n = Math.max(1, Math.floor(Math.hypot(x1 - x0, y1 - y0) / step))
    for (let i = 0; i < n; i++) pts.push({ x: x0 + ((x1 - x0) * i) / n, y: y0 + ((y1 - y0) * i) / n, nx, ny })
  }
  const arc = (cx: number, cy: number, a0: number) => {
    const n = Math.max(2, Math.floor((Math.PI / 2) * d / step))
    for (let i = 0; i < n; i++) {
      const a = a0 + (Math.PI / 2) * (i / n)
      pts.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, nx: Math.cos(a), ny: Math.sin(a) })
    }
  }
  line(x, y - d, x + w, y - d, 0, -1)
  arc(x + w, y, -Math.PI / 2)
  line(x + w + d, y, x + w + d, y + h, 1, 0)
  arc(x + w, y + h, 0)
  line(x + w, y + h + d, x, y + h + d, 0, 1)
  arc(x, y + h, Math.PI / 2)
  line(x - d, y + h, x - d, y, -1, 0)
  arc(x, y, Math.PI)
  return pts
}

const hash = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return ((h >>> 0) % 10000) / 10000
}

function parseColor(v: string): RGB {
  const s = v.trim()
  if (s.startsWith('#')) {
    const h = s.length === 4 ? s.slice(1).replace(/./g, (c) => c + c) : s.slice(1, 7)
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  }
  const m = s.match(/[\d.]+/g)
  return m ? [Number(m[0]), Number(m[1]), Number(m[2])] : [200, 200, 210]
}

const bez = (e: GEdge, t: number) => {
  const u = 1 - t
  return { x: u * u * e.x1 + 2 * u * t * e.cx + t * t * e.x2, y: u * u * e.y1 + 2 * u * t * e.cy + t * t * e.y2 }
}

/* ---------------------------------------------------------- construcción */

function build(root: HTMLElement, colors: Record<string, RGB>): World {
  const nodes: GNode[] = []
  const edges: GEdge[] = []
  const byPath = new Map<string, number>()
  const vw = document.documentElement.clientWidth

  const cards = new Map<TrackId, Rect>()
  root.querySelectorAll<HTMLElement>('[data-node]').forEach((el) => cards.set(el.dataset.node as TrackId, docRect(el)))
  const cardRects = [...cards.values()]
  const obstacles = [...root.querySelectorAll<HTMLElement>('[data-obstacle]')].map((el) => inflate(docRect(el), 10))

  const board = root.querySelector<HTMLElement>('[data-board]')
  const cs = board ? getComputedStyle(board) : null
  const gapX = cs ? parseFloat(cs.columnGap) || 0 : 0
  const gapY = cs ? parseFloat(cs.rowGap) || 0 : 0
  const oneCol = cardRects.every((r) => Math.abs(r.x - cardRects[0].x) < 2)
  const gap = oneCol ? gapY : Math.min(gapX || gapY, gapY || gapX)
  const dmax = Math.max(14, Math.min(58, gap / 2 - 9))
  const d1 = Math.max(12, dmax * 0.42)

  const node = (n: Omit<GNode, 'glow' | 'flash' | 'adj' | 'hitX' | 'hitY'>) => {
    nodes.push({ ...n, glow: 0.3, flash: 0, adj: [], hitX: n.x, hitY: n.y })
    return nodes.length - 1
  }

  // núcleo: la portada; las aristas salen de un borde invisible un poco más afuera
  let core = -1
  const coreEl = root.querySelector('[data-core]')
  const coreRect = coreEl ? inflate(docRect(coreEl), 14) : null
  if (coreRect) {
    const c = center(coreRect)
    core = node({ kind: 'core', x: c.x, y: c.y, rect: coreRect, nx: 0, ny: 0, color: [240, 242, 248], phase: 0 })
  }
  const coreN = core >= 0 ? nodes[core] : null
  const blockers = coreRect ? [...cardRects, coreRect] : cardRects

  // tarjetas
  const hubOf = new Map<TrackId, number>()
  for (const t of TRACKS) {
    const r = cards.get(t.id)
    if (!r) continue
    const c = center(r)
    hubOf.set(t.id, node({ kind: 'hub', x: c.x, y: c.y, track: t.id, rect: r, nx: 0, ny: 0, color: colors[t.id], phase: hash(t.id) * 6 }))
  }

  // lecciones alrededor de su tarjeta
  for (const t of TRACKS) {
    const r = cards.get(t.id)
    if (!r) continue
    const list = STOPS.filter((s) => s.track === t.id)
    if (list.length === 0) continue
    const others = cardRects.filter((o) => o !== r).map((o) => inflate(o, 9))
    const valid = (x: number, y: number) =>
      x > 10 && x < vw - 10 && !others.some((o) => inside(o, x, y)) && !obstacles.some((o) => inside(o, x, y))
    const base = ring(r, d1).filter((p) => valid(p.x, p.y))
    if (base.length === 0) continue
    list.forEach((s, i) => {
      const p = base[Math.min(base.length - 1, Math.floor(((i + 0.5) * base.length) / list.length))]
      const h = hash(s.path)
      const out = (dmax - d1) * (i % 2 ? 0.55 + 0.45 * h : 0.15 * h)
      let x = p.x + p.nx * out
      let y = p.y + p.ny * out
      if (!valid(x, y)) {
        x = p.x
        y = p.y
      }
      const k = node({ kind: 'dot', x, y, track: t.id, stop: s, nx: p.nx, ny: p.ny, color: colors[t.id], phase: h * Math.PI * 2 })
      byPath.set(s.path, k)
    })
  }

  const edge = (a: number, b: number, kind: EdgeKind, bend: number) => {
    const A = nodes[a]
    const B = nodes[b]
    const pa = A.rect ? rim(A.rect, B.x, B.y) : { x: A.x, y: A.y }
    const pb = B.rect ? rim(B.rect, A.x, A.y) : { x: B.x, y: B.y }
    if (A.kind === 'dot' && B.rect) Object.assign(pb, nearestRim(B.rect, A.x, A.y))
    const len = Math.hypot(pb.x - pa.x, pb.y - pa.y)
    const mx = (pa.x + pb.x) / 2
    const my = (pa.y + pb.y) / 2
    const nx = -(pb.y - pa.y) / (len || 1)
    const ny = (pb.x - pa.x) / (len || 1)
    edges.push({ a, b, kind, x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, cx: mx + nx * bend * len, cy: my + ny * bend * len, len, lit: 0 })
    A.adj.push(edges.length - 1)
    B.adj.push(edges.length - 1)
  }

  // portada → tarjetas
  if (coreN && coreRect) {
    for (const [id, h] of hubOf) {
      const r = cards.get(id)!
      const c = center(r)
      const a = rim(coreRect, c.x, c.y, 0)
      const b = rim(r, a.x, a.y)
      if (!crosses(a.x, a.y, b.x, b.y, cardRects.filter((o) => o !== r).map((o) => inflate(o, 4)))) edge(core, h, 'core', 0.08)
    }
  }
  // tarjetas vecinas
  for (const [a, b] of TRUNK) {
    const ha = hubOf.get(a)
    const hb = hubOf.get(b)
    if (ha === undefined || hb === undefined) continue
    const ra = cards.get(a)!
    const rb = cards.get(b)!
    const pa = rim(ra, center(rb).x, center(rb).y)
    const pb = rim(rb, center(ra).x, center(ra).y)
    const rest = blockers.filter((o) => o !== ra && o !== rb).map((o) => inflate(o, 4))
    // solo entre vecinas: una arista larga cruzaría la portada o el resto del grafo
    if (Math.hypot(pb.x - pa.x, pb.y - pa.y) > Math.max(gapX, gapY) * 1.6) continue
    if (!crosses(pa.x, pa.y, pb.x, pb.y, rest)) edge(ha, hb, 'trunk', 0)
  }
  // orden dentro de la sección: cadena y radios hacia la tarjeta
  for (const t of TRACKS) {
    const ids = STOPS.filter((s) => s.track === t.id)
      .map((s) => byPath.get(s.path))
      .filter((k): k is number => k !== undefined)
    const hub = hubOf.get(t.id)
    if (hub === undefined) continue
    const spacing = ids.length > 1 ? (2 * (cards.get(t.id)!.w + cards.get(t.id)!.h)) / ids.length : 40
    ids.forEach((k, i) => {
      const prev = ids[i - 1]
      const s = nodes[k].stop!
      const near = prev !== undefined && Math.hypot(nodes[k].x - nodes[prev].x, nodes[k].y - nodes[prev].y) < Math.max(70, spacing * 2.4)
      if (near) edge(prev, k, 'chain', i % 2 ? 0.16 : -0.16)
      if (!near || nodes[prev!]?.stop?.module !== s.module) edge(k, hub, 'spoke', 0)
    })
  }
  // temas compartidos entre secciones: una conexión por lección, la más cercana
  const seen = new Set<string>()
  const cardsIn = blockers.map((r) => inflate(r, 2))
  for (const [path, k] of byPath) {
    const A = nodes[k]
    const best = STOPS.filter((s) => s.track !== A.track && s.topics.some((x) => A.stop!.topics.includes(x)))
      .map((s) => ({ s, k: byPath.get(s.path) }))
      .filter((x): x is { s: Stop; k: number } => x.k !== undefined)
      .map((x) => ({ ...x, d: Math.hypot(nodes[x.k].x - A.x, nodes[x.k].y - A.y) - 90 * x.s.topics.filter((t) => A.stop!.topics.includes(t)).length }))
      .sort((a, b) => a.d - b.d)
    for (const b of best.slice(0, 3)) {
      const key = [path, b.s.path].sort().join('|')
      if (seen.has(key)) break
      const B = nodes[b.k]
      if (crosses(A.x, A.y, B.x, B.y, cardsIn)) continue
      seen.add(key)
      edge(k, b.k, 'topic', 0.1)
      break
    }
  }

  const glows = [...root.querySelectorAll<HTMLElement>('[data-glow]')].map((el) => ({ el, r: docRect(el), last: '' }))
  return { nodes, edges, glows, root: docRect(root), core, byPath }
}

/* --------------------------------------------------------------- sprites */

function sprite(c: RGB, dark: boolean) {
  const s = 96
  const cv = document.createElement('canvas')
  cv.width = cv.height = s
  const g = cv.getContext('2d')!
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  const [r, gg, b] = c
  const k = dark ? 1 : 0.55
  grad.addColorStop(0, `rgba(${r},${gg},${b},${0.95 * k})`)
  grad.addColorStop(0.12, `rgba(${r},${gg},${b},${0.55 * k})`)
  grad.addColorStop(0.36, `rgba(${r},${gg},${b},${0.16 * k})`)
  grad.addColorStop(1, `rgba(${r},${gg},${b},0)`)
  g.fillStyle = grad
  g.fillRect(0, 0, s, s)
  return cv
}

/* ------------------------------------------------------------- componente */

type Tip = { i: number; x: number; y: number; pinned: boolean }

export function GuideGraph({ rootRef, focus, selection }: { rootRef: RefObject<HTMLElement | null>; focus: TrackId | null; selection: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const theme = useTheme()
  const navigate = useNavigate()
  const [tip, setTip] = useState<Tip | null>(null)
  const worldRef = useRef<World | null>(null)
  const focusRef = useRef(focus)
  const selRef = useRef(selection)
  const dirty = useRef(true)
  focusRef.current = focus
  selRef.current = selection
  useEffect(() => {
    dirty.current = true
  }, [focus, selection])

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return
    const ctx = canvas.getContext('2d')!
    const dark = theme === 'dark'
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const css = getComputedStyle(document.documentElement)
    const colors: Record<string, RGB> = {}
    for (const t of TRACKS) colors[t.id] = parseColor(css.getPropertyValue(`--line-${t.id}`))
    const text = parseColor(css.getPropertyValue('--text'))
    const mono = css.getPropertyValue('--font-mono') || 'monospace'
    const sprites = new Map<string, HTMLCanvasElement>()
    const spr = (c: RGB) => {
      const k = c.join(',')
      if (!sprites.has(k)) sprites.set(k, sprite(c, dark))
      return sprites.get(k)!
    }

    let world = build(root, colors)
    worldRef.current = world
    let dpr = 1
    const size = () => {
      dpr = Math.min(2, devicePixelRatio || 1)
      canvas.width = Math.round(innerWidth * dpr)
      canvas.height = Math.round(innerHeight * dpr)
      dirty.current = true
    }
    size()

    let raf = 0
    let measureTimer = 0
    const remeasure = () => {
      clearTimeout(measureTimer)
      measureTimer = window.setTimeout(() => {
        world = build(root, colors)
        worldRef.current = world
        pulses.length = 0
        dirty.current = true
      }, 60)
    }
    const ro = new ResizeObserver(remeasure)
    ro.observe(root)
    root.querySelectorAll('[data-node],[data-glow]').forEach((el) => ro.observe(el))
    const onResize = () => {
      size()
      remeasure()
    }
    addEventListener('resize', onResize)
    document.fonts?.ready.then(remeasure)

    // puntero (coordenadas de documento)
    const ptr = { cx: -1e4, cy: -1e4, x: -1e4, y: -1e4, active: 0, touch: false }
    let hover = -1
    const hit = (x: number, y: number, rad: number) => {
      let best = -1
      let bd = rad
      world.nodes.forEach((n, i) => {
        if (n.kind !== 'dot') return
        const d = Math.hypot(n.x - x, n.y - y)
        if (d < bd) {
          bd = d
          best = i
        }
      })
      return best
    }
    const interactive = (t: EventTarget | null) => !!(t as Element | null)?.closest?.('a,button,input,[data-node],.gtip')
    const showTip = (i: number, pinned: boolean) => {
      if (i < 0) return setTip(null)
      const n = world.nodes[i]
      setTip({ i, x: n.x - world.root.x, y: n.y - world.root.y, pinned })
    }
    const onMove = (e: PointerEvent) => {
      ptr.touch = e.pointerType === 'touch'
      ptr.cx = e.clientX
      ptr.cy = e.clientY
      ptr.x = e.clientX + scrollX
      ptr.y = e.clientY + scrollY
      ptr.active = performance.now()
      dirty.current = true
      if (ptr.touch) return
      const h = interactive(e.target) ? -1 : hit(ptr.x, ptr.y, 16)
      if (h !== hover) {
        hover = h
        root.style.cursor = h >= 0 ? 'pointer' : ''
        showTip(h, false)
      }
    }
    const onLeave = () => {
      ptr.x = ptr.y = ptr.cx = ptr.cy = -1e4
      dirty.current = true
    }
    const onClick = (e: MouseEvent) => {
      if (interactive(e.target)) return
      const x = e.clientX + scrollX
      const y = e.clientY + scrollY
      const touch = (e as PointerEvent).pointerType === 'touch' || ptr.touch
      const h = hit(x, y, touch ? 24 : 16)
      if (h < 0) {
        hover = -1
        return showTip(-1, false)
      }
      const s = world.nodes[h].stop!
      if (touch) {
        hover = h
        showTip(h, true)
      } else navigate(s.path)
    }
    const onScroll = () => {
      ptr.x = ptr.cx + scrollX
      ptr.y = ptr.cy + scrollY
      dirty.current = true
    }
    addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    root.addEventListener('click', onClick)
    addEventListener('scroll', onScroll, { passive: true })

    // pulsos de luz
    const pulses: Pulse[] = []
    let nextPulse = 0
    const spawn = (now: number) => {
      const E = world.edges
      if (E.length === 0) return
      // casi siempre desde el núcleo o una tarjeta, a veces desde un tema compartido
      const from = Math.random() < 0.55 ? E.filter((e) => e.kind === 'core') : Math.random() < 0.5 ? E.filter((e) => e.kind === 'topic') : E
      const pool = from.length ? from : E
      const e = pool[Math.floor(Math.random() * pool.length)]
      const k = E.indexOf(e)
      const dir: 1 | -1 = e.kind === 'core' ? (world.nodes[e.a].kind === 'core' ? 1 : -1) : Math.random() < 0.5 ? 1 : -1
      pulses.push({ e: k, dir, t: 0, dur: Math.min(2.6, Math.max(0.6, e.len / 210)), hops: 3 + Math.floor(Math.random() * 4) })
      nextPulse = now + 380 + Math.random() * 520
    }

    // luces sobre el HTML
    const lightDom = (sources: { x: number; y: number; c: RGB; i: number }[]) => {
      for (const g of world.glows) {
        const r = g.r
        let sw = 0
        let sx = 0
        let sy = 0
        let sr = 0
        let sg = 0
        let sb = 0
        for (const s of sources) {
          const nx = Math.max(r.x, Math.min(r.x + r.w, s.x))
          const ny = Math.max(r.y, Math.min(r.y + r.h, s.y))
          const d = Math.hypot(s.x - nx, s.y - ny)
          if (d > 280) continue
          const w = s.i / (1 + (d / 64) ** 2)
          sw += w
          sx += w * s.x
          sy += w * s.y
          sr += w * s.c[0]
          sg += w * s.c[1]
          sb += w * s.c[2]
        }
        let v = '0'
        let gx = r.w / 2
        let gy = -60
        let col = '255 255 255'
        if (sw > 0.001) {
          v = (1 - Math.exp(-sw * 0.85)).toFixed(3)
          gx = sx / sw - r.x
          gy = sy / sw - r.y
          col = `${Math.round(sr / sw)} ${Math.round(sg / sw)} ${Math.round(sb / sw)}`
        }
        // puntero
        const pnx = Math.max(r.x, Math.min(r.x + r.w, ptr.x))
        const pny = Math.max(r.y, Math.min(r.y + r.h, ptr.y))
        const pd = Math.hypot(ptr.x - pnx, ptr.y - pny)
        const pa = ptr.touch ? 0 : Math.max(0, 1 - pd / 220)
        const key = `${v}|${gx | 0}|${gy | 0}|${col}|${pa.toFixed(2)}|${(ptr.x - r.x) | 0}|${(ptr.y - r.y) | 0}`
        if (key === g.last) continue
        g.last = key
        const st = g.el.style
        st.setProperty('--ga', v)
        st.setProperty('--gx', `${gx.toFixed(0)}px`)
        st.setProperty('--gy', `${gy.toFixed(0)}px`)
        st.setProperty('--gc', col)
        st.setProperty('--pa', pa.toFixed(2))
        st.setProperty('--px', `${(ptr.x - r.x).toFixed(0)}px`)
        st.setProperty('--py', `${(ptr.y - r.y).toFixed(0)}px`)
      }
    }

    let last = performance.now()
    let frame = 0
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const idle = now - ptr.active > 5000
      frame++
      if (reduced && !dirty.current) return
      if (!reduced && idle && frame % 2) return // en reposo basta con 30 fps
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      dirty.current = false
      const W = world
      const N = W.nodes
      const f = focusRef.current
      const sel = selRef.current
      const selSet = new Map<number, number>()
      sel.forEach((p, i) => {
        const k = W.byPath.get(p)
        if (k !== undefined) selSet.set(k, i + 1)
      })
      const hovered = hover >= 0 ? hover : -1

      // qué está encendido: la sección enfocada, la lección apuntada y sus vecinas por tema
      const lit = new Set<number>()
      for (const e of W.edges) {
        const A = N[e.a]
        const B = N[e.b]
        let l = 0
        if (f && (A.track === f || B.track === f)) l = e.kind === 'topic' ? 0.9 : 1
        if (hovered >= 0 && (e.a === hovered || e.b === hovered)) l = 1
        if (selSet.size && selSet.has(e.a) && selSet.has(e.b)) l = 1
        e.lit += (l - e.lit) * (reduced ? 1 : 1 - Math.exp(-dt * 7))
        if (l > 0 && e.kind === 'topic') {
          lit.add(e.a)
          lit.add(e.b)
        }
      }

      for (let i = 0; i < N.length; i++) {
        const n = N[i]
        let target = n.kind === 'dot' ? 0.34 + (reduced ? 0 : 0.18 * Math.sin(now * 0.0011 + n.phase)) : n.kind === 'core' ? 1 : 0
        const pd = Math.hypot(n.x - ptr.x, n.y - ptr.y)
        if (pd < 170) target += 1.15 * (1 - pd / 170) ** 2
        if (f) target *= n.track === f ? 2.1 : lit.has(i) ? 1.7 : 0.45
        if (selSet.size) target = selSet.has(i) ? 1.5 : target * 0.4
        if (i === hovered) target = 1.8
        target += n.flash
        n.glow += (target - n.glow) * (reduced ? 1 : 1 - Math.exp(-dt * 8))
        n.flash *= Math.exp(-dt * 2.6)
      }

      // pulsos
      if (!reduced) {
        if (now > nextPulse && pulses.length < 9) spawn(now)
        for (let i = pulses.length - 1; i >= 0; i--) {
          const p = pulses[i]
          p.t += dt / p.dur
          if (p.t < 1) continue
          const e = W.edges[p.e]
          const end = p.dir === 1 ? e.b : e.a
          const n = N[end]
          if (!n) {
            pulses.splice(i, 1)
            continue
          }
          n.flash = Math.min(1.4, n.flash + 0.9)
          if (n.kind === 'hub') {
            n.hitX = p.dir === 1 ? e.x2 : e.x1
            n.hitY = p.dir === 1 ? e.y2 : e.y1
          }
          const next = n.adj.filter((k) => k !== p.e)
          if (p.hops <= 0 || next.length === 0) {
            pulses.splice(i, 1)
            continue
          }
          const k = next[Math.floor(Math.random() * next.length)]
          const ne = W.edges[k]
          p.e = k
          p.dir = ne.a === end ? 1 : -1
          p.t = 0
          p.dur = Math.min(2.4, Math.max(0.45, ne.len / 210))
          p.hops--
        }
      }

      // dibujo
      const vy0 = scrollY - 120
      const vy1 = scrollY + innerHeight + 120
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(dpr, 0, 0, dpr, -scrollX * dpr, -scrollY * dpr)
      ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over'
      ctx.lineCap = 'round'
      const dim = f || selSet.size ? 0.55 : 1
      for (const e of W.edges) {
        if (Math.max(e.y1, e.y2, e.cy) < vy0 || Math.min(e.y1, e.y2, e.cy) > vy1) continue
        const A = N[e.a]
        const B = N[e.b]
        const c = A.kind === 'core' ? B.color : A.color
        const a = (BASE[e.kind] * dim + e.lit * 0.5) * (dark ? 1 : 1.25)
        if (a < 0.01) continue
        if (A.color !== B.color && A.kind !== 'core' && B.kind !== 'core') {
          const g = ctx.createLinearGradient(e.x1, e.y1, e.x2, e.y2)
          g.addColorStop(0, `rgb(${A.color})`)
          g.addColorStop(1, `rgb(${B.color})`)
          ctx.strokeStyle = g
        } else ctx.strokeStyle = `rgb(${c})`
        ctx.globalAlpha = Math.min(1, a)
        ctx.lineWidth = WIDTH[e.kind] + e.lit * 0.6
        ctx.beginPath()
        ctx.moveTo(e.x1, e.y1)
        ctx.quadraticCurveTo(e.cx, e.cy, e.x2, e.y2)
        ctx.stroke()
      }

      for (let i = 0; i < N.length; i++) {
        const n = N[i]
        if (n.y < vy0 || n.y > vy1) continue
        if (n.kind === 'dot') {
          const g = Math.max(0, n.glow)
          const s = 7 + 15 * Math.min(2, g)
          ctx.globalAlpha = Math.min(1, 0.2 + 0.55 * g)
          ctx.drawImage(spr(n.color), n.x - s, n.y - s, s * 2, s * 2)
          ctx.globalAlpha = Math.min(1, 0.55 + 0.4 * g)
          ctx.fillStyle = `rgb(${n.color})`
          ctx.beginPath()
          ctx.arc(n.x, n.y, 1.7 + Math.min(1.6, g * 0.9), 0, Math.PI * 2)
          ctx.fill()
          if (g > 1.1 && dark) {
            ctx.fillStyle = '#fff'
            ctx.globalAlpha = Math.min(1, g - 1.1)
            ctx.beginPath()
            ctx.arc(n.x, n.y, 1.2, 0, Math.PI * 2)
            ctx.fill()
          }
          const order = selSet.get(i)
          if (order) {
            ctx.globalAlpha = 1
            ctx.fillStyle = dark ? '#fff' : `rgb(${text})`
            ctx.font = `600 11px ${mono}`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(String(order), n.x + n.nx * 13, n.y + n.ny * 13)
          }
        } else if (n.kind === 'core') {
          // un puerto por arista, en el borde de la portada, del color de la sección a la que va
          for (const k of n.adj) {
            const e = W.edges[k]
            const B = N[e.a === i ? e.b : e.a]
            const g = 0.5 + n.flash * 0.6 + e.lit * 0.6 + (reduced ? 0 : 0.15 * Math.sin(now * 0.0016 + B.phase))
            const s = 12 + 12 * g
            ctx.globalAlpha = Math.min(1, 0.35 + 0.5 * g)
            ctx.drawImage(spr(B.color), e.x1 - s, e.y1 - s, s * 2, s * 2)
            ctx.globalAlpha = 1
            ctx.fillStyle = dark ? '#fff' : `rgb(${B.color})`
            ctx.beginPath()
            ctx.arc(e.x1, e.y1, 2.2, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      const sources: { x: number; y: number; c: RGB; i: number }[] = []
      for (const p of pulses) {
        const e = W.edges[p.e]
        const A = N[e.a]
        const B = N[e.b]
        const from = p.dir === 1 ? A : B
        const to = p.dir === 1 ? B : A
        const c = to.kind === 'core' ? from.color : to.color
        for (let k = 3; k >= 0; k--) {
          const t = p.t - k * 0.035
          if (t < 0) continue
          const q = bez(e, p.dir === 1 ? t : 1 - t)
          if (q.y < vy0 || q.y > vy1) continue
          const s = k === 0 ? 20 : 12 - k * 2
          ctx.globalAlpha = k === 0 ? 0.95 : 0.35 / k
          ctx.drawImage(spr(c), q.x - s, q.y - s, s * 2, s * 2)
          if (k === 0) {
            ctx.fillStyle = dark ? '#fff' : `rgb(${c})`
            ctx.beginPath()
            ctx.arc(q.x, q.y, 1.6, 0, Math.PI * 2)
            ctx.fill()
            sources.push({ x: q.x, y: q.y, c, i: 1.25 })
          }
        }
      }
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'

      if (frame % 2 === 0 || reduced) {
        for (const n of N) {
          if (n.kind === 'dot' && n.glow > 0.2) sources.push({ x: n.x, y: n.y, c: n.color, i: n.glow * 0.42 })
          else if (n.kind === 'hub' && n.flash > 0.05) sources.push({ x: n.hitX, y: n.hitY, c: n.color, i: n.flash * 1.6 })
          else if (n.kind === 'core')
            for (const k of n.adj) {
              const e = W.edges[k]
              sources.push({ x: e.x1, y: e.y1, c: N[e.a === N.indexOf(n) ? e.b : e.a].color, i: 0.55 + n.flash })
            }
        }
        lightDom(sources)
      }
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(measureTimer)
      ro.disconnect()
      removeEventListener('resize', onResize)
      removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
      root.removeEventListener('click', onClick)
      removeEventListener('scroll', onScroll)
      root.style.cursor = ''
    }
  }, [rootRef, theme, navigate])

  const node = tip ? worldRef.current?.nodes[tip.i] : undefined
  const s = node?.stop
  const t = s ? getTrack(s.track) : undefined
  const flip = tip && worldRef.current ? tip.x > worldRef.current.root.w - 300 : false
  return (
    <>
      <canvas ref={canvasRef} className="graph-canvas" aria-hidden />
      {tip && s && t && (
        <div
          className={`gtip${tip.pinned ? ' is-pinned' : ''}${flip ? ' is-flip' : ''}`}
          style={{ left: tip.x, top: tip.y, '--line': `var(--line-${s.track})` } as CSSProperties}
          role="tooltip"
        >
          <span className="gtip-line">
            <span className="line-dot" />
            {t.short} · {unitName(s)} {String(s.n).padStart(2, '0')} · {s.minutes} min
          </span>
          <strong>{s.title}</strong>
          {tip.pinned ? (
            <Link to={s.path} className="gtip-open">
              Abrir <ArrowRight size={14} />
            </Link>
          ) : (
            <span className="gtip-hint">Clic para abrir</span>
          )}
        </div>
      )}
    </>
  )
}
