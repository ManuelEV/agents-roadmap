import { useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { STOPS, TOPICS, TRACKS, getTrack, relatedStops, stopKey, stopsOf, trackMinutes, type Stop } from '@/catalog'
import { useVisited } from '@/lib/hooks'

const hours = (min: number) => {
  const h = min / 60
  return h < 1 ? `${min} min` : `${h.toFixed(h < 10 ? 1 : 0).replace('.0', '').replace('.', ',')} h`
}

/** El mapa de la red: una fila por línea, una estación por parada.
    Al apuntar una estación se iluminan sus transbordos (paradas de otras
    líneas que tratan el mismo tema). */
export function RouteMap() {
  const visited = useVisited()
  const [hover, setHover] = useState<Stop | null>(null)
  const lit = useMemo(() => {
    if (!hover) return null
    const set = new Set<string>([stopKey(hover)])
    for (const s of STOPS) if (s.track !== hover.track && s.topics.some((t) => hover.topics.includes(t))) set.add(stopKey(s))
    return set
  }, [hover])
  const transfers = hover ? relatedStops(hover, 4) : []

  return (
    <div className={`netmap${lit ? ' has-focus' : ''}`} onMouseLeave={() => setHover(null)}>
      <div className="netmap-lines">
        {TRACKS.map((t) => {
          const stops = stopsOf(t.id)
          const done = stops.filter((s) => visited.includes(stopKey(s))).length
          return (
            <div key={t.id} className="netmap-line" style={{ '--line': `var(--line-${t.id})` } as CSSProperties}>
              <Link to={`/${t.id}`} className="netmap-head">
                <span className="netmap-name">
                  <span className="line-dot" />
                  {t.title}
                </span>
                <span className="netmap-meta">
                  {stops.length} paradas · {hours(trackMinutes(t.id))}
                  {done > 0 && ` · ${done} ${done === 1 ? 'vista' : 'vistas'}`}
                </span>
              </Link>
              <div className="netmap-track" role="list">
                {stops.map((s, i) => {
                  const key = stopKey(s)
                  const cls = [
                    'netmap-stop',
                    visited.includes(key) ? 'is-visited' : '',
                    lit ? (lit.has(key) ? 'is-lit' : 'is-dim') : '',
                    hover && stopKey(hover) === key ? 'is-hover' : '',
                    i > 0 && stops[i - 1].module !== s.module ? 'mod-start' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                  return (
                    <Link
                      key={key}
                      to={s.path}
                      role="listitem"
                      className={cls}
                      onMouseEnter={() => setHover(s)}
                      onFocus={() => setHover(s)}
                      onBlur={() => setHover(null)}
                      aria-label={`${t.title}, parada ${s.n}: ${s.title}`}
                    >
                      <i />
                    </Link>
                  )
                })}
                {stops.length === 0 && <span className="netmap-soon">En construcción</span>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="netmap-info" aria-live="polite">
        {hover ? (
          <div className="netmap-info-in" key={stopKey(hover)} style={{ '--line': `var(--line-${hover.track})` } as CSSProperties}>
            <div className="netmap-info-main">
              <div className="netmap-info-kicker">
                <span className="line-dot" />
                {getTrack(hover.track)?.title} · parada {String(hover.n).padStart(2, '0')} · {hover.minutes} min
                {hover.topics.slice(0, 2).map((tp) => (
                  <span key={tp} className="netmap-topic">
                    {TOPICS[tp]}
                  </span>
                ))}
              </div>
              <div className="netmap-info-title">{hover.title}</div>
            </div>
            {transfers.length > 0 && (
              <div className="netmap-info-transfers">
                <span className="netmap-info-label">Transbordos</span>
                {transfers.map((r) => (
                  <span key={stopKey(r)} className="netmap-transfer" style={{ '--line': `var(--line-${r.track})` } as CSSProperties}>
                    <span className="line-dot" />
                    {r.short}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="netmap-hint">
            Cada punto es una parada. Pasa el cursor por cualquiera para ver de qué trata y en qué otras líneas se cruza con el mismo tema.
            <Link to="/fundamentos" className="netmap-hint-link">
              Empezar por Fundamentos <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
