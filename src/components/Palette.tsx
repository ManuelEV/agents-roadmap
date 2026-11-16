import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { ArrowLeftRight, BookOpen, CornerDownLeft, FlaskConical, Search } from 'lucide-react'
import { STOPS, TRACKS, getTrack, type Stop } from '@/catalog'

type Item = { key: string; path: string; title: string; sub: string; line?: string; kind: 'lab' | 'guia' | 'linea' | 'pagina'; hay: string; n?: number }

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

function buildIndex(): Item[] {
  const stopItem = (s: Stop): Item => ({
    key: s.path,
    path: s.path,
    title: s.title,
    sub: `${getTrack(s.track)?.short} · ${String(s.n).padStart(2, '0')}`,
    line: s.track,
    kind: s.kind,
    n: s.n,
    hay: fold([s.title, s.short, s.summary, s.concepts.join(' '), getTrack(s.track)?.title].join(' ')),
  })
  return [
    ...TRACKS.map(
      (t): Item => ({ key: `/${t.id}`, path: `/${t.id}`, title: `Línea ${t.title}`, sub: t.tagline, line: t.id, kind: 'linea', hay: fold(`${t.title} ${t.tagline} linea`) }),
    ),
    { key: '/comparar', path: '/comparar', title: 'Comparar ecosistemas', sub: 'La misma pieza en Google, AWS, Azure y Vercel', kind: 'pagina', hay: fold('comparar ecosistemas equivalencias google aws azure vercel') },
    { key: '/referencias', path: '/referencias', title: 'Referencias', sub: 'Todas las fuentes primarias de la guía', kind: 'pagina', hay: fold('referencias fuentes bibliografia') },
    ...STOPS.map(stopItem),
  ]
}

function search(index: Item[], q: string): Item[] {
  const terms = fold(q).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return index.filter((i) => i.kind === 'linea' || i.kind === 'pagina')
  return index
    .map((item) => {
      const title = fold(item.title)
      let score = 0
      for (const t of terms) {
        if (!item.hay.includes(t)) return { item, score: -1 }
        score += title.startsWith(t) ? 6 : title.includes(t) ? 4 : 1
      }
      if (item.kind === 'linea') score += 2
      return { item, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((x) => x.item)
}

const ICON = { lab: FlaskConical, guia: BookOpen, linea: null, pagina: ArrowLeftRight }

/** Buscador global (Ctrl/⌘ K): todas las paradas de todas las líneas. */
export function Palette({ onClose }: { onClose: () => void }) {
  const index = useMemo(buildIndex, [])
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const nav = useNavigate()
  const listRef = useRef<HTMLUListElement>(null)
  const results = useMemo(() => search(index, q), [index, q])

  useEffect(() => setSel(0), [q])
  useEffect(() => {
    listRef.current?.querySelector('.is-sel')?.scrollIntoView({ block: 'nearest' })
  }, [sel])

  const go = (item?: Item) => {
    if (!item) return
    onClose()
    nav(item.path)
  }

  return (
    <div className="palette" role="dialog" aria-modal="true" aria-label="Buscar">
      <motion.div className="palette-backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} />
      <motion.div
        className="palette-panel glass is-thick"
        initial={{ opacity: 0, scale: 0.96, y: -8, filter: 'blur(6px)' }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, scale: 0.97, y: -6, filter: 'blur(4px)' }}
        transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
      >
        <div className="palette-input">
          <Search size={18} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Busca un tema: MCP, memoria, guardrails, AgentCore…"
            aria-label="Buscar"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSel((s) => Math.min(results.length - 1, s + 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSel((s) => Math.max(0, s - 1))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                go(results[sel])
              }
            }}
          />
          <kbd>Esc</kbd>
        </div>
        <ul className="palette-list" ref={listRef} role="listbox">
          {results.length === 0 && <li className="palette-empty">Nada con «{q}». Prueba con otra palabra o revisa la lista de líneas.</li>}
          {results.map((r, i) => {
            const Icon = ICON[r.kind]
            return (
              <li key={r.key} role="option" aria-selected={i === sel}>
                <button className={i === sel ? 'is-sel' : ''} onMouseMove={() => setSel(i)} onClick={() => go(r)} style={r.line ? ({ '--line': `var(--line-${r.line})` } as CSSProperties) : undefined}>
                  <span className="palette-icon">{Icon ? <Icon size={15} /> : <span className="line-dot" />}</span>
                  <span className="palette-text">
                    <span className="palette-title">{r.title}</span>
                    <span className="palette-sub">
                      {r.line && r.kind !== 'linea' && <span className="line-dot" />}
                      {r.sub}
                    </span>
                  </span>
                  {i === sel && <CornerDownLeft size={14} className="palette-enter" />}
                </button>
              </li>
            )
          })}
        </ul>
      </motion.div>
    </div>
  )
}
