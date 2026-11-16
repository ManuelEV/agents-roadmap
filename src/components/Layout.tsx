import { useEffect, useState, type CSSProperties } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { AnimatePresence, MotionConfig, motion, useDragControls, type PanInfo } from 'motion/react'
import { ArrowLeftRight, Menu, Moon, Search, Sun, X } from 'lucide-react'
import { setTheme, useTheme } from '@/lib/theme'
import { useVisited } from '@/lib/hooks'
import { TRACKS, getStop, getTrack, stopKey, stopsByModule, stopsOf, type Track } from '@/catalog'
import { Palette } from './Palette'
import { toneVar } from './ui'

/** Color de una línea como variable CSS. */
export const lineVar = (id: string) => `var(--line-${id})`

/* Resorte de la casa: críticamente amortiguado (sin rebote) para la interfaz;
   solo los gestos con impulso (soltar el cajón) llevan un poco de rebote. */
export const SPRING = { type: 'spring', bounce: 0, duration: 0.4 } as const
const SPRING_FLICK = { type: 'spring', bounce: 0.18, duration: 0.45 } as const

export function Logo({ size = 26 }: { size?: number }) {
  // tres líneas que se cruzan en una estación de transbordo
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <path d="M6 20h24l14 24h14" fill="none" stroke="var(--line-fundamentos)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 44h24l14-24h14" fill="none" stroke="var(--line-google)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 32h52" fill="none" stroke="var(--line-aws)" strokeWidth="7" strokeLinecap="round" />
      <circle cx="37" cy="32" r="9" fill="var(--bg-elev)" stroke="var(--text)" strokeWidth="5" />
    </svg>
  )
}

/** La línea de una pista en vertical: módulos como tramos, paradas como estaciones. */
export function TrackNav({ track, onNavigate }: { track: Track; onNavigate?: () => void }) {
  const visited = useVisited()
  return (
    <nav aria-label={`Paradas de ${track.title}`}>
      {track.modules.map((m) => {
        const stops = stopsByModule(track.id, m.id)
        if (stops.length === 0) return null
        return (
          <div key={m.id} className="nav-module" data-tone={m.tone}>
            <div className="nav-module-title">
              <span className="n">{m.n}</span>
              {m.title}
            </div>
            <ul>
              {stops.map((s) => (
                <li key={s.slug}>
                  <NavLink to={s.path} onClick={onNavigate} className={({ isActive }) => `${isActive ? 'is-active' : ''}${visited.includes(stopKey(s)) ? ' is-visited' : ''}`}>
                    <span className="stop" />
                    <span className="t">{s.short}</span>
                    <span className="num">{String(s.n).padStart(2, '0')}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </nav>
  )
}

function TrackHeader({ track }: { track: Track }) {
  const visited = useVisited()
  const stops = stopsOf(track.id)
  const done = stops.filter((s) => visited.includes(stopKey(s))).length
  return (
    <Link to={`/${track.id}`} className="side-head" style={{ '--line': lineVar(track.id) } as CSSProperties}>
      <span className="side-head-line" />
      <span className="side-head-text">
        <span className="side-head-title">{track.title}</span>
        <span className="side-head-meta">
          {done} de {stops.length} paradas
        </span>
      </span>
      <span className="side-head-meter" aria-hidden>
        <span style={{ width: `${(done / Math.max(1, stops.length)) * 100}%` }} />
      </span>
    </Link>
  )
}

/** Cajón móvil: una hoja que sigue al dedo y decide con el impulso al soltar. */
function Drawer({ track, onClose }: { track?: Track; onClose: () => void }) {
  const controls = useDragControls()
  const [open, setOpen] = useState<string | undefined>(track?.id)
  const onDragEnd = (_: unknown, info: PanInfo) => {
    // proyecta el impulso: un gesto corto y rápido cierra igual que uno largo
    const projected = info.offset.x + info.velocity.x * 0.18
    if (projected < -110) onClose()
  }
  return (
    <div className="drawer" role="dialog" aria-modal="true" aria-label="Menú">
      <motion.div className="drawer-backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
      <motion.div
        className="drawer-panel glass is-thick"
        initial={{ x: '-104%' }}
        animate={{ x: 0 }}
        exit={{ x: '-104%' }}
        transition={SPRING_FLICK}
        drag="x"
        dragControls={controls}
        dragListener={false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 1, right: 0.06 }}
        onDragEnd={onDragEnd}
      >
        <div className="drawer-grip" onPointerDown={(e) => controls.start(e)} aria-hidden />
        <div className="drawer-scroll">
          <div className="drawer-head">
            <Link to="/" className="brand" onClick={onClose}>
              <Logo /> <span>Agents Roadmap</span>
            </Link>
            <button className="icon-btn" onClick={onClose} aria-label="Cerrar menú">
              <X size={20} />
            </button>
          </div>
          <div className="drawer-lines">
            {TRACKS.map((t) => {
              const isOpen = open === t.id
              return (
                <div key={t.id} className={`drawer-line${isOpen ? ' is-open' : ''}`} style={{ '--line': lineVar(t.id) } as CSSProperties}>
                  <button className="drawer-line-head" onClick={() => setOpen(isOpen ? undefined : t.id)} aria-expanded={isOpen}>
                    <span className="line-dot" />
                    <span className="t">{t.title}</span>
                    <span className="m">{stopsOf(t.id).length}</span>
                  </button>
                  {isOpen && (
                    <div className="drawer-line-body">
                      <Link to={`/${t.id}`} className="drawer-line-all" onClick={onClose}>
                        Ver toda la línea
                      </Link>
                      <TrackNav track={t} onNavigate={onClose} />
                    </div>
                  )}
                </div>
              )
            })}
            <Link to="/comparar" className="drawer-extra" onClick={onClose}>
              <ArrowLeftRight size={16} /> Comparar ecosistemas
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export function Layout() {
  const theme = useTheme()
  const [drawer, setDrawer] = useState(false)
  const [palette, setPalette] = useState(false)
  const location = useLocation()
  const [, seg1, seg2] = location.pathname.split('/')
  const track = getTrack(seg1)
  const stop = getStop(seg1, seg2)
  const isHome = location.pathname === '/'
  const showSidebar = !!track && !!stop
  const moduleTone = stop && track ? track.modules.find((m) => m.id === stop.module)?.tone : undefined
  const pageTone = moduleTone ? toneVar(moduleTone) : track ? lineVar(track.id) : 'var(--accent)'

  useEffect(() => {
    setDrawer(false)
    setPalette(false)
  }, [location.pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName ?? '')
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        setPalette((v) => !v)
      } else if (e.key === 'Escape') {
        setDrawer(false)
        setPalette(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={`app${isHome ? ' is-home' : ''}`}
        style={{ '--page-tone': pageTone, '--line': track ? lineVar(track.id) : 'var(--text-3)' } as CSSProperties}
      >
        <header className="topbar">
          <div className="topbar-inner glass">
            <button className="icon-btn nav-hide-wide" onClick={() => setDrawer(true)} aria-label="Abrir menú">
              <Menu size={20} />
            </button>
            <Link to="/" className="brand">
              <Logo />
              <span>
                Agents<span className="brand-dim"> Roadmap</span>
              </span>
            </Link>
            <nav className="topnav nav-hide-narrow" aria-label="Líneas">
              {TRACKS.map((t) => {
                const active = track?.id === t.id
                return (
                  <Link key={t.id} to={`/${t.id}`} className={active ? 'is-active' : ''} style={{ '--line': lineVar(t.id) } as CSSProperties} aria-current={active ? 'true' : undefined}>
                    {active && <motion.span layoutId="topnav-pill" className="topnav-pill" transition={SPRING} />}
                    <span className="line-dot" />
                    <span className="topnav-label">{t.short}</span>
                  </Link>
                )
              })}
              <span className="topnav-sep" />
              <Link to="/comparar" className={location.pathname === '/comparar' ? 'is-active' : ''} aria-current={location.pathname === '/comparar' ? 'true' : undefined}>
                {location.pathname === '/comparar' && <motion.span layoutId="topnav-pill" className="topnav-pill" transition={SPRING} />}
                <span className="topnav-label">Comparar</span>
              </Link>
            </nav>
            <div className="spacer" />
            <button className="search-btn" onClick={() => setPalette(true)} aria-label="Buscar en todas las líneas">
              <Search size={16} />
              <span className="search-btn-label">Buscar</span>
              <kbd className="search-btn-kbd">Ctrl K</kbd>
            </button>
            <button
              className="icon-btn"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        <div className={`shell${showSidebar ? '' : ' no-sidebar'}`}>
          {showSidebar && (
            <aside className="sidebar">
              <div className="sidebar-panel glass is-thick">
                <div className="sidebar-scroll">
                  <TrackHeader track={track} />
                  <TrackNav track={track} />
                </div>
              </div>
            </aside>
          )}
          <main className="main">
            <Outlet />
          </main>
        </div>

        <AnimatePresence>{drawer && <Drawer track={track} onClose={() => setDrawer(false)} />}</AnimatePresence>
        <AnimatePresence>{palette && <Palette onClose={() => setPalette(false)} />}</AnimatePresence>

        <footer className="footer">
          <p>
            Agents Roadmap reúne en un solo lugar los laboratorios de fundamentos, la guía de referencia y los recorridos por ecosistema (Google Cloud, AWS,
            Microsoft Azure y Vercel). Las pantallas de consola, los terminales y las respuestas de los modelos son <strong>simulaciones</strong> con fines
            didácticos; los nombres de productos, comandos, APIs y formatos vienen de la documentación oficial, verificada en la fecha que indica cada línea.
            No es un sitio de Google, AWS, Microsoft ni Vercel.
          </p>
          <p className="footer-links">
            <Link to="/referencias">Referencias</Link>
            <Link to="/comparar">Comparar ecosistemas</Link>
            <Link to="/guia/ruta-de-aprendizaje">Ruta de aprendizaje</Link>
          </p>
        </footer>
        <ScrollRestoration />
      </div>
    </MotionConfig>
  )
}
