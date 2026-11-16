import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'motion/react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Pause, Play, X } from 'lucide-react'
import type { Player } from '@/lib/hooks'

/* ==========================================================================
   Que lo que cambia quede a la vista.

   En un teléfono, un lab suele ser más alto que la pantalla: tocas arriba y la
   respuesta aparece abajo, fuera de vista. Estas tres piezas lo resuelven sin
   mover la página por su cuenta (el lector decide dónde mirar):

   · DetailDock  → patrón "elige un ítem, mira su ficha": en móvil la ficha sube
                   como una hoja inferior en vez de quedar varios bloques abajo.
   · PlayerDock  → los controles de un reproductor quedan flotando abajo cuando
                   su barra ya no está visible pero su lab sí.
   · useChangeHint → red de seguridad para cualquier lab: si un toque cambia algo
                   que quedó fuera de pantalla, aparece un aviso para ir (y volver).
   ========================================================================== */

const SHEET_SPRING = { type: 'spring', bounce: 0.14, duration: 0.42 } as const
const MOBILE = '(max-width: 760px)'

function useMedia(query: string) {
  const [on, setOn] = useState(() => (typeof matchMedia === 'undefined' ? false : matchMedia(query).matches))
  useEffect(() => {
    const mq = matchMedia(query)
    const fn = () => setOn(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [query])
  return on
}

const headerH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72

/** ¿Está el elemento razonablemente a la vista? (al menos `min` px dentro del área útil) */
function inView(el: Element, min = 80) {
  const r = el.getBoundingClientRect()
  const top = headerH()
  const visible = Math.min(r.bottom, innerHeight) - Math.max(r.top, top)
  return visible >= Math.min(min, r.height * 0.6)
}

/* -------------------------------------------------------------------------- */
/* DetailDock                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Envuelve la ficha de detalle de un lab "maestro → detalle".
 * En escritorio no cambia nada. En móvil, cuando `k` cambia por una elección del
 * lector y la ficha no está a la vista, se muestra además en una hoja inferior
 * que se cierra arrastrándola hacia abajo.
 *
 *   <DetailDock k={sel} title={c.name}><Detail c={c} /></DetailDock>
 *
 * Sin `k`, detecta sola el cambio: se abre cuando su contenido cambia justo después
 * de un toque del lector dentro del mismo lab.
 *
 * El contenido debe ser de solo lectura (se dibuja dos veces: en su lugar y en la hoja).
 */
export function DetailDock({
  k,
  title,
  sticky,
  children,
}: {
  k?: string | number | null
  title?: ReactNode
  /** solo si la ficha vive en una columna al lado de la lista: en escritorio acompaña el desplazamiento */
  sticky?: boolean
  children: ReactNode
}) {
  const mobile = useMedia(MOBILE)
  const ref = useRef<HTMLDivElement>(null)
  const first = useRef(true)
  const [open, setOpen] = useState(false)
  const controls = useDragControls()
  const auto = k === undefined
  const [ver, setVer] = useState(0)

  // modo automático: contenido que cambia tras un toque en el lab, y que no está a la vista
  useEffect(() => {
    if (!auto) return
    const el = ref.current
    const lab = el?.closest('.lab')
    if (!el || !lab) return
    let lastClick = 0
    const onClick = (e: Event) => {
      if (!el.contains(e.target as Node)) lastClick = Date.now()
    }
    const mo = new MutationObserver(() => {
      if (Date.now() - lastClick > 700) return
      setVer((v) => v + 1)
      if (!inView(el, 140)) setOpen(true)
    })
    lab.addEventListener('click', onClick, true)
    mo.observe(el, { childList: true, subtree: true, characterData: true })
    return () => {
      lab.removeEventListener('click', onClick, true)
      mo.disconnect()
    }
  }, [auto])

  useEffect(() => {
    if (auto) return
    if (first.current) {
      first.current = false
      return
    }
    if (k === null || k === undefined) return
    if (ref.current && inView(ref.current, 140)) return
    setOpen(true)
  }, [k, auto])

  // se cierra sola cuando el lab sale de pantalla o cuando la ficha en su lugar ya se ve
  useEffect(() => {
    if (!open) return
    const lab = ref.current?.closest('.lab') ?? ref.current
    const check = () => {
      if (!ref.current || !lab) return
      const r = lab.getBoundingClientRect()
      if (r.bottom < headerH() || r.top > innerHeight) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    // proyecta el impulso: un gesto corto y rápido cierra igual que uno largo
    if (info.offset.y + info.velocity.y * 0.2 > 90) setOpen(false)
  }

  return (
    <>
      <div ref={ref} className={`detail-dock-inline${sticky ? ' is-sticky' : ''}`}>
        {children}
      </div>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              className={`detail-sheet${mobile ? '' : ' is-card'}`}
              data-detail-sheet
              role="region"
              aria-label="Detalle de la selección"
              initial={mobile ? { y: '105%' } : { opacity: 0, y: 24, scale: 0.97 }}
              animate={mobile ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
              exit={mobile ? { y: '105%' } : { opacity: 0, y: 24, scale: 0.97 }}
              transition={SHEET_SPRING}
              drag={mobile ? 'y' : false}
              dragControls={controls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.04, bottom: 1 }}
              onDragEnd={onDragEnd}
            >
              <div className="detail-sheet-grip" onPointerDown={(e) => controls.start(e)}>
                <i />
                {title && <span className="detail-sheet-title">{title}</span>}
                <button className="icon-btn" onClick={() => setOpen(false)} onPointerDown={(e) => e.stopPropagation()} aria-label="Cerrar detalle">
                  <X size={18} />
                </button>
              </div>
              <div className="detail-sheet-body" key={auto ? ver : String(k)}>
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* PlayerDock                                                                  */
/* -------------------------------------------------------------------------- */

/* Solo un reproductor puede estar "acoplado" a la vez: el del lab con más área visible.
   Cada barra publica cuánta área de su lab se ve y todas se enteran cuando cambia. */
const dockArea = new Map<symbol, number>()
const dockSubs = new Set<() => void>()
const dockWinner = () => {
  let best: symbol | null = null
  let max = 0
  for (const [id, v] of dockArea) if (v > max) [best, max] = [id, v]
  return best
}

function useDocked(barRef: RefObject<HTMLElement | null>) {
  const [docked, setDocked] = useState(false)
  useEffect(() => {
    const id = Symbol('player')
    let raf = 0
    const sync = () => setDocked(dockWinner() === id)
    const check = () => {
      raf = 0
      const bar = barRef.current
      if (!bar) return
      const lab = bar.closest('.lab') ?? bar.parentElement
      if (!lab) return
      const lr = lab.getBoundingClientRect()
      const top = headerH()
      const visible = Math.min(lr.bottom, innerHeight) - Math.max(lr.top, top)
      // el lab ocupa buena parte de la pantalla y su barra de controles no se ve
      const want = visible > 150 && lr.top < innerHeight * 0.6 && !inView(bar, 20)
      const prev = dockArea.get(id) ?? 0
      const next = want ? visible : 0
      if (prev === next) return
      if (next) dockArea.set(id, next)
      else dockArea.delete(id)
      dockSubs.forEach((fn) => fn())
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(check)
    }
    dockSubs.add(sync)
    check()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
      if (raf) cancelAnimationFrame(raf)
      dockSubs.delete(sync)
      dockArea.delete(id)
      dockSubs.forEach((fn) => fn())
    }
  }, [barRef])
  return docked
}

/** Controles flotantes de un reproductor cuando su barra quedó fuera de vista. */
export function PlayerDock({ player, labels, barRef }: { player: Player; labels?: string[]; barRef: RefObject<HTMLElement | null> }) {
  const docked = useDocked(barRef)
  const { step, count, playing } = player
  const label = labels?.[step]
  return createPortal(
    <AnimatePresence>
      {docked && (
        <motion.div
          className="player-dock glass"
          role="group"
          aria-label="Controles del paso a paso"
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
        >
          <button className="icon-btn" onClick={player.prev} disabled={player.isFirst} aria-label="Paso anterior (flotante)">
            <ChevronLeft size={19} />
          </button>
          <button className="icon-btn play" onClick={player.toggle} aria-label={playing ? 'Pausar (flotante)' : 'Reproducir (flotante)'}>
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button className="icon-btn" onClick={player.next} disabled={player.isLast} aria-label="Paso siguiente (flotante)">
            <ChevronRight size={19} />
          </button>
          <button
            className="player-dock-text"
            onClick={() => barRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })}
            title="Volver a los controles del lab"
          >
            <span className="n">
              {step + 1}/{count}
            </span>
            {label && <span className="t">{label}</span>}
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/* -------------------------------------------------------------------------- */
/* Aviso de cambio fuera de pantalla                                           */
/* -------------------------------------------------------------------------- */

type Hint = { target: Element; origin: Element; dir: 'down' | 'up'; back: boolean }

/**
 * Observa un lab: si un toque del lector cambia contenido que quedó fuera de
 * pantalla, devuelve el aviso a mostrar. No mueve la página por su cuenta.
 */
export function useChangeHint(ref: RefObject<HTMLElement | null>) {
  const [hint, setHint] = useState<Hint | null>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    let mo: MutationObserver | null = null
    let timer = 0

    const onClick = (ev: MouseEvent) => {
      const origin = (ev.target as Element | null)?.closest('button, [role="tab"], [role="button"], input, select, a, .is-clickable')
      if (!origin || !root.contains(origin)) return
      mo?.disconnect()
      window.clearTimeout(timer)
      const touched = new Set<Element>()
      mo = new MutationObserver((records) => {
        for (const r of records) {
          const el = r.target.nodeType === 1 ? (r.target as Element) : r.target.parentElement
          if (el) touched.add(el)
          r.addedNodes.forEach((n) => n.nodeType === 1 && touched.add(n as Element))
        }
      })
      mo.observe(root, { childList: true, subtree: true, characterData: true })
      timer = window.setTimeout(() => {
        mo?.disconnect()
        if (document.querySelector('[data-detail-sheet]')) return // la hoja inferior ya lo muestra
        const top = headerH()
        const all = [...touched].filter((el) => el.isConnected && !el.contains(origin)).map((el) => ({ el, r: el.getBoundingClientRect() }))
        // si el lector ya vio una respuesta (algo cambió a la vista, aunque sea pequeño), no hay nada que avisar
        if (all.some(({ r }) => r.width > 8 && r.height > 8 && Math.min(r.bottom, innerHeight) - Math.max(r.top, top) > Math.min(40, r.height * 0.5))) return
        const rects = all.filter((x) => x.r.width > 40 && x.r.height > 16)
        if (rects.length === 0) return
        const or = origin.getBoundingClientRect()
        const below = rects.filter(({ r }) => r.top >= or.bottom).sort((a, b) => a.r.top - b.r.top)
        const above = rects.filter(({ r }) => r.bottom <= or.top).sort((a, b) => b.r.bottom - a.r.bottom)
        const pick = below[0] ?? above[0]
        if (!pick) return
        setHint({ target: pick.el, origin, dir: below[0] ? 'down' : 'up', back: false })
      }, 380)
    }

    root.addEventListener('click', onClick)
    return () => {
      root.removeEventListener('click', onClick)
      mo?.disconnect()
      window.clearTimeout(timer)
    }
  }, [ref])

  // el aviso se retira cuando ya no hace falta
  useEffect(() => {
    if (!hint) return
    const lab = ref.current
    const check = () => {
      if (!hint.target.isConnected || !hint.origin.isConnected) return setHint(null)
      if (lab) {
        const r = lab.getBoundingClientRect()
        if (r.bottom < headerH() || r.top > innerHeight) return setHint(null)
      }
      const seen = hint.back ? hint.origin : hint.target
      if (inView(seen, 60)) {
        // llegó: si fue de ida, ofrece la vuelta; si fue de vuelta, termina
        if (!hint.back && !inView(hint.origin, 30)) setHint({ ...hint, back: true, dir: hint.dir === 'down' ? 'up' : 'down' })
        else if (hint.back) setHint(null)
        else setHint(null)
      }
    }
    const t = window.setTimeout(() => setHint(null), 14000)
    window.addEventListener('scroll', check, { passive: true })
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('scroll', check)
    }
  }, [hint, ref])

  return { hint, clear: () => setHint(null) }
}

/** Clases del destino y de sus ancestros hasta el cuerpo del lab (para la auditoría de UX). */
function chainOf(el: Element) {
  const out: string[] = []
  let cur: Element | null = el
  while (cur && !cur.classList.contains('lab-body') && !cur.classList.contains('lab') && out.length < 7) {
    out.push(`${cur.tagName.toLowerCase()}${cur.classList.length ? '.' + [...cur.classList].slice(0, 2).join('.') : ''}`)
    cur = cur.parentElement
  }
  return out.join(' < ')
}

export function ChangeHint({ hint, clear }: { hint: Hint | null; clear: () => void }) {
  // evita que el aviso tape los controles flotantes del reproductor
  const [lift, setLift] = useState(false)
  useLayoutEffect(() => {
    setLift(!!document.querySelector('.player-dock'))
  }, [hint])
  return createPortal(
    <AnimatePresence>
      {hint && (
        <motion.button
          key={hint.back ? 'back' : 'go'}
          className={`change-hint${lift ? ' is-lifted' : ''}`}
          data-chain={chainOf(hint.target)}
          onClick={() => {
            const el = hint.back ? hint.origin : hint.target
            const r = el.getBoundingClientRect()
            const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches
            // deja el destino un poco bajo la barra superior
            window.scrollTo({ top: r.top + scrollY - headerH() - (hint.back ? 120 : 16), behavior: smooth ? 'smooth' : 'auto' })
            if (hint.back) clear()
          }}
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.96 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.28 }}
        >
          {hint.dir === 'down' ? <ArrowDown size={15} /> : <ArrowUp size={15} />}
          {hint.back ? 'Volver a donde estabas' : hint.dir === 'down' ? 'Ver lo que cambió' : 'Lo que cambió está arriba'}
        </motion.button>
      )}
    </AnimatePresence>,
    document.body,
  )
}
