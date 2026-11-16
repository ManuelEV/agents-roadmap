import { useEffect, useState, type CSSProperties } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowRight, BookOpen, FlaskConical, Pause, Play } from 'lucide-react'
import { ArchDiagram } from '@/components/Arch'
import { getTrack, stopKey, stopsByModule, stopsOf, trackMinutes, TRACKS, type Track } from '@/catalog'
import { useVisited } from '@/lib/hooks'
import { ARCH_STAGES } from '@/sim/google/architecture'
import { NotFoundPage } from './NotFoundPage'

/** La arquitectura que la línea Google construye etapa a etapa. */
function GoogleStage() {
  const [stage, setStage] = useState(1)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused) return
    const t = setTimeout(() => setStage((s) => (s % ARCH_STAGES.length) + 1), 2600)
    return () => clearTimeout(t)
  }, [stage, paused])
  const current = ARCH_STAGES[stage - 1]
  return (
    <div className="lab track-stage">
      <div className="lab-head">
        <span className="lab-title">La arquitectura que vas a construir</span>
        <span className="lab-hint">
          <button className="btn btn-ghost btn-sm" onClick={() => setPaused((p) => !p)}>
            {paused ? <Play size={14} /> : <Pause size={14} />} {paused ? 'Reproducir' : 'Pausar'}
          </button>
        </span>
      </div>
      <div className="lab-body" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <ArchDiagram stage={stage} />
        <div className="stage-steps">
          {ARCH_STAGES.map((s) => (
            <button
              key={s.stage}
              className={s.stage === stage ? 'is-active' : s.stage < stage ? 'is-done' : ''}
              onClick={() => {
                setStage(s.stage)
                setPaused(true)
              }}
              title={s.title}
              aria-label={`Etapa ${s.stage}: ${s.title}`}
              aria-pressed={s.stage === stage}
            >
              {s.stage}
            </button>
          ))}
          {current && (
            <Link to={`/google/${current.lesson}`} className="stage-link">
              Ir a esta lección <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

const KIND_LABEL: Record<Track['kind'], string> = { labs: 'Línea troncal · laboratorios', guia: 'Línea troncal · lectura', ecosistema: 'Línea de ecosistema' }

export function TrackPage() {
  const { track: trackId } = useParams()
  const track = getTrack(trackId)
  const visited = useVisited()

  useEffect(() => {
    if (track) document.title = `${track.title} · Agents Roadmap`
  }, [track])

  if (!track) return <NotFoundPage />
  const stops = stopsOf(track.id)
  const done = stops.filter((s) => visited.includes(stopKey(s))).length
  const next = stops.find((s) => !visited.includes(stopKey(s))) ?? stops[0]
  const hours = Math.max(1, Math.round(trackMinutes(track.id) / 60))
  const others = TRACKS.filter((t) => t.kind === track.kind && t.id !== track.id)

  return (
    <div className="home track-page" style={{ '--line': `var(--line-${track.id})` } as CSSProperties}>
      <section className={`track-hero${track.id === 'google' ? ' has-stage' : ''}`}>
        <div>
          <div className="eyebrow track-kicker">
            <span className="line-dot" /> {KIND_LABEL[track.kind]} · verificado en {track.verified}
          </div>
          <h1>{track.title}</h1>
          <p className="lead">{track.description}</p>
          <p className="track-aud">{track.audience}</p>
          <div className="home-cta">
            {next && (
              <Link className="btn btn-primary btn-lg" to={next.path}>
                {done > 0 ? `Continuar en la parada ${String(next.n).padStart(2, '0')}` : 'Empezar la línea'} <ArrowRight size={17} />
              </Link>
            )}
            <span className="track-stats">
              {stops.length} paradas · unas {hours} h{done > 0 ? ` · ${done} ${done === 1 ? 'vista' : 'vistas'}` : ''}
            </span>
          </div>
        </div>
        {track.id === 'google' && <GoogleStage />}
      </section>

      {stops.length === 0 ? (
        <p className="muted">Esta línea está en construcción.</p>
      ) : (
        <section className="route" aria-label="Paradas de la línea">
          {track.modules.map((m) => {
            const list = stopsByModule(track.id, m.id)
            if (list.length === 0) return null
            return (
              <div key={m.id} className="route-module" data-tone={m.tone}>
                <div className="route-module-info">
                  <div className="route-module-n">Tramo {m.n}</div>
                  <h3>{m.title}</h3>
                  <p>{m.description}</p>
                </div>
                <ol className="route-stops">
                  {list.map((s) => {
                    const seen = visited.includes(stopKey(s))
                    return (
                      <li key={s.slug}>
                        <Link to={s.path} className={`route-stop${seen ? ' is-visited' : ''}`}>
                          <span className="stop" />
                          <span className="num">{String(s.n).padStart(2, '0')}</span>
                          <span>
                            <span className="t">{s.title}</span>
                            <span className="c">
                              {seen ? 'Vista · ' : ''}
                              {s.concepts.slice(0, 4).join(' · ')}
                            </span>
                          </span>
                          <span className="m">
                            {s.kind === 'guia' ? <BookOpen size={13} /> : <FlaskConical size={13} />} {s.minutes} min
                          </span>
                          <ArrowRight size={16} className="go" />
                        </Link>
                      </li>
                    )
                  })}
                </ol>
              </div>
            )
          })}
        </section>
      )}

      {others.length > 0 && (
        <section className="track-others">
          <h2>{track.kind === 'ecosistema' ? 'El mismo agente en otras nubes' : 'La otra línea troncal'}</h2>
          <div className="lines-list">
            {others.map((t) => (
              <Link key={t.id} to={`/${t.id}`} className="line-row" style={{ '--line': `var(--line-${t.id})` } as CSSProperties}>
                <span className="line-row-mark" />
                <span className="line-row-name">
                  <strong>{t.title}</strong>
                  <span>{t.tagline}</span>
                </span>
                <span className="line-row-aud">{t.audience}</span>
                <span className="line-row-meta">
                  {stopsOf(t.id).length || 'pronto'}
                  <ArrowRight size={16} />
                </span>
              </Link>
            ))}
            {track.kind === 'ecosistema' && (
              <Link to="/comparar" className="line-row" style={{ '--line': 'var(--text-3)' } as CSSProperties}>
                <span className="line-row-mark" />
                <span className="line-row-name">
                  <strong>Comparar ecosistemas</strong>
                  <span>La misma pieza, lado a lado, en las cuatro plataformas</span>
                </span>
                <span className="line-row-aud">Para ver qué cambia y qué no al cambiar de nube.</span>
                <span className="line-row-meta">
                  <ArrowRight size={16} />
                </span>
              </Link>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
