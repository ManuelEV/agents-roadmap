import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { motion } from 'motion/react'
import { ArrowLeftRight, ArrowRight, BookOpen, FlaskConical } from 'lucide-react'
import { GuideGraph } from '@/components/graph/GuideGraph'
import { SPRING } from '@/components/Layout'
import { STOPS, TRACKS, getStop, getTrack, stopsOf, trackMinutes, unitLabel, type Stop, type Track, type TrackId } from '@/catalog'
import { ECOSYSTEMS, ITINERARIES, type Itinerary } from '@/catalog/itineraries'

type Item = { kind: 'stop'; stop: Stop } | { kind: 'page'; path: string; title: string }

/** Convierte una selección en lecciones reales (omite las que no existen). */
function resolve(it: Itinerary, eco: TrackId): Item[] {
  const items: Item[] = []
  for (const ref of it.stops) {
    if (ref === 'comparar') {
      items.push({ kind: 'page', path: '/comparar', title: 'Comparar ecosistemas' })
      continue
    }
    const [trackRaw, slug] = ref.split('/')
    const track = trackRaw === '{eco}' ? eco : trackRaw
    let stop: Stop | undefined
    if (slug.startsWith('@')) {
      const list = stopsOf(track as TrackId)
      stop = slug === '@last' ? list[list.length - 1] : list[Number(slug.slice(1)) - 1]
    } else stop = getStop(track, slug)
    if (stop && !items.some((l) => l.kind === 'stop' && l.stop.path === stop.path)) items.push({ kind: 'stop', stop })
  }
  return items
}

const KIND: Record<Track['kind'], string> = { labs: 'Base común · laboratorios', guia: 'Base común · artículos', ecosistema: 'Ecosistema' }
/** Orden de lectura de las tarjetas (la grilla las ubica por nombre de área). */
const BOARD: TrackId[] = ['fundamentos', 'guia', 'google', 'aws', 'azure', 'vercel']

function SectionCard({ track, onFocus }: { track: Track; onFocus: (id: TrackId | null) => void }) {
  const stops = stopsOf(track.id)
  const hours = Math.max(1, Math.round(trackMinutes(track.id) / 60))
  return (
    <Link
      to={`/${track.id}`}
      className="gcard glow"
      data-node={track.id}
      data-glow
      style={{ '--line': `var(--line-${track.id})`, gridArea: track.id } as CSSProperties}
      onPointerEnter={() => onFocus(track.id)}
      onPointerLeave={() => onFocus(null)}
      onFocus={() => onFocus(track.id)}
      onBlur={() => onFocus(null)}
    >
      <span className="gcard-kind">
        <span className="line-dot" /> {KIND[track.kind]}
      </span>
      <strong className="gcard-title">{track.title}</strong>
      <span className="gcard-tag">{track.tagline}</span>
      <span className="gcard-aud">{track.audience}</span>
      <span className="gcard-meta">
        {stops.length > 0 ? `${unitLabel(track.id, stops.length)} · unas ${hours} h` : 'pronto'}
        <ArrowRight size={16} />
      </span>
    </Link>
  )
}

function Planner({ onSelect }: { onSelect: (paths: string[]) => void }) {
  const [id, setId] = useState(ITINERARIES[0].id)
  const [eco, setEco] = useState<TrackId>('google')
  const [touched, setTouched] = useState(false)
  const it = ITINERARIES.find((x) => x.id === id) ?? ITINERARIES[0]
  const items = useMemo(() => resolve(it, eco), [it, eco])
  const minutes = items.reduce((a, l) => a + (l.kind === 'stop' ? l.stop.minutes : 5), 0)
  const first = items[0]

  // al elegir un objetivo, sus lecciones se encienden en el grafo, numeradas
  useEffect(() => {
    onSelect(touched ? items.flatMap((l) => (l.kind === 'stop' ? [l.stop.path] : [])) : [])
  }, [items, touched, onSelect])

  return (
    <section className="planner glow" data-glow data-obstacle aria-labelledby="planner-title">
      <div className="section-intro">
        <h2 id="planner-title">¿Por dónde empiezo?</h2>
        <p>Elige un objetivo y te sugerimos qué leer, en orden. Las lecciones salen de distintas secciones y se encienden, numeradas, en el grafo de arriba.</p>
      </div>
      <div className="planner-needs" role="tablist" aria-label="Objetivo">
        {ITINERARIES.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={x.id === id}
            className={x.id === id ? 'is-active' : ''}
            onClick={() => {
              setId(x.id)
              setTouched(true)
            }}
          >
            {x.id === id && <motion.span layoutId="need-pill" className="planner-pill" transition={SPRING} />}
            <span>{x.need}</span>
          </button>
        ))}
      </div>

      <div className="planner-body">
        <div className="planner-copy">
          <h3>{it.title}</h3>
          <p>{it.why}</p>
          {it.usesEco && (
            <div className="planner-eco" role="radiogroup" aria-label="Ecosistema">
              {ECOSYSTEMS.map((e) => (
                <button
                  key={e}
                  role="radio"
                  aria-checked={e === eco}
                  className={e === eco ? 'is-active' : ''}
                  onClick={() => {
                    setEco(e)
                    setTouched(true)
                  }}
                  style={{ '--line': `var(--line-${e})` } as CSSProperties}
                >
                  <span className="line-dot" />
                  {getTrack(e)?.short}
                </button>
              ))}
            </div>
          )}
          <div className="planner-meta">
            {items.length} lecciones · unos {minutes} min
          </div>
          {first && (
            <Link className="btn btn-primary" to={first.kind === 'stop' ? first.stop.path : first.path}>
              Abrir la primera <ArrowRight size={16} />
            </Link>
          )}
        </div>

        <ol className="trip" key={`${it.id}-${eco}`}>
          {items.map((l, i) => {
            const track = l.kind === 'stop' ? l.stop.track : undefined
            return (
              <motion.li
                key={l.kind === 'stop' ? l.stop.path : l.path}
                className="trip-leg"
                style={{ '--line': track ? `var(--line-${track})` : 'var(--text-3)' } as CSSProperties}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: i * 0.035 }}
              >
                <Link to={l.kind === 'stop' ? l.stop.path : l.path}>
                  <span className="stop">{i + 1}</span>
                  <span className="trip-text">
                    <span className="trip-line">
                      {l.kind === 'stop' ? (
                        <>
                          {getTrack(l.stop.track)?.short} · {String(l.stop.n).padStart(2, '0')}
                          {l.stop.kind === 'guia' ? <BookOpen size={12} /> : <FlaskConical size={12} />}
                          {l.stop.kind === 'guia' ? 'artículo' : 'laboratorio'}
                        </>
                      ) : (
                        <>
                          <ArrowLeftRight size={12} /> herramienta
                        </>
                      )}
                    </span>
                    <span className="trip-title">{l.kind === 'stop' ? l.stop.title : l.title}</span>
                  </span>
                  <span className="trip-min">{l.kind === 'stop' ? `${l.stop.minutes} min` : ''}</span>
                </Link>
              </motion.li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

export function HomePage() {
  useEffect(() => {
    document.title = 'Agents Roadmap · De cómo piensa un LLM a un agente en producción'
  }, [])
  const rootRef = useRef<HTMLDivElement>(null)
  const [focus, setFocus] = useState<TrackId | null>(null)
  const [selection, setSelection] = useState<string[]>([])
  const labs = STOPS.filter((s) => s.kind === 'lab').length
  const reads = STOPS.filter((s) => s.kind === 'guia').length
  const tracks = BOARD.map((id) => getTrack(id)).filter((t): t is Track => !!t)

  return (
    <div className="home home-graph" ref={rootRef}>
      <GuideGraph rootRef={rootRef} focus={focus} selection={selection} />

      {/* la portada es el nodo central del grafo; las seis secciones la rodean */}
      <div className="graph-board" data-board>
        <section className="home-hero" data-core data-obstacle aria-labelledby="home-title">
          <div className="eyebrow">
            {labs} laboratorios · {reads} artículos · {TRACKS.length} secciones · en español
          </div>
          <h1 id="home-title" className="glow-text" data-glow>
            De cómo piensa un LLM a un agente en producción, <em>en la nube que uses</em>
          </h1>
          <p className="lead">
            Una guía para entender y construir agentes de IA: laboratorios que abren el mecanismo, artículos para decidir con criterio y el mismo agente
            construido en <strong>Google Cloud</strong>, <strong>AWS</strong>, <strong>Azure</strong> y <strong>Vercel</strong>, para comparar pieza por pieza.
          </p>
          <div className="home-cta">
            <Link className="btn btn-primary btn-lg" to="/fundamentos/tokens">
              Abrir el primer laboratorio <ArrowRight size={17} />
            </Link>
            <Link className="textlink" to="/comparar">
              Comparar ecosistemas
            </Link>
          </div>
          <p className="graph-hint">
            Cada punto es una lección; cada enlace, un tema compartido.<span className="hint-hover"> Pasa por una sección para ver sus conexiones.</span><span className="hint-touch"> Toca un punto para ver cuál es.</span>
          </p>
        </section>
        {tracks.map((t) => (
          <SectionCard key={t.id} track={t} onFocus={setFocus} />
        ))}
      </div>

      <Planner onSelect={setSelection} />

      <section className="home-about" aria-labelledby="about-title">
        <h2 id="about-title" className="glow-text" data-glow>
          Cómo está hecha
        </h2>
        <div className="about-grid">
          <div className="about-card glow" data-glow>
            <h3>Un solo escenario</h3>
            <p>
              <strong>Andes Market</strong>, un retail online ficticio, y su agente de operaciones <strong>Andi</strong>. La misma clienta, los mismos pedidos y
              las mismas herramientas en todas las secciones: lo que cambia entre nubes es la plataforma, no el problema.
            </p>
          </div>
          <div className="about-card glow" data-glow>
            <h3>Qué es real y qué es simulado</h3>
            <p>
              Comandos, APIs, nombres de productos, formatos de eventos y precios: <strong>reales</strong>, tomados de la documentación oficial y con fecha de
              verificación en cada sección. Consolas, terminales y respuestas de modelos: <strong>simuladas</strong>, y lo decimos donde aparecen.
            </p>
          </div>
          <div className="about-card glow" data-glow>
            <h3>Código para probar</h3>
            <p>
              La carpeta <code>examples/</code> del repositorio trae los proyectos completos de las secciones Fundamentos y Google Cloud, listos para correr en tu
              máquina.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
