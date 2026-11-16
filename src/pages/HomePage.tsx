import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { motion } from 'motion/react'
import { ArrowLeftRight, ArrowRight, BookOpen, FlaskConical } from 'lucide-react'
import { RouteMap } from '@/components/RouteMap'
import { SPRING } from '@/components/Layout'
import { STOPS, TRACKS, getStop, getTrack, stopKey, stopsOf, type Stop, type TrackId } from '@/catalog'
import { ECOSYSTEMS, ITINERARIES, type Itinerary } from '@/catalog/itineraries'
import { useVisited } from '@/lib/hooks'

type Leg = { kind: 'stop'; stop: Stop } | { kind: 'page'; path: string; title: string }

/** Convierte las referencias de un itinerario en paradas reales (omite las que no existen). */
function resolve(it: Itinerary, eco: TrackId): Leg[] {
  const legs: Leg[] = []
  for (const ref of it.stops) {
    if (ref === 'comparar') {
      legs.push({ kind: 'page', path: '/comparar', title: 'Comparar ecosistemas' })
      continue
    }
    const [trackRaw, slug] = ref.split('/')
    const track = trackRaw === '{eco}' ? eco : trackRaw
    let stop: Stop | undefined
    if (slug.startsWith('@')) {
      const list = stopsOf(track as TrackId)
      stop = slug === '@last' ? list[list.length - 1] : list[Number(slug.slice(1)) - 1]
    } else stop = getStop(track, slug)
    if (stop && !legs.some((l) => l.kind === 'stop' && l.stop.path === stop.path)) legs.push({ kind: 'stop', stop })
  }
  return legs
}

function Planner() {
  const visited = useVisited()
  const [id, setId] = useState(ITINERARIES[0].id)
  const [eco, setEco] = useState<TrackId>('google')
  const it = ITINERARIES.find((x) => x.id === id) ?? ITINERARIES[0]
  const legs = resolve(it, eco)
  const minutes = legs.reduce((a, l) => a + (l.kind === 'stop' ? l.stop.minutes : 5), 0)
  const first = legs.find((l) => l.kind === 'page' || !visited.includes(stopKey(l.stop))) ?? legs[0]

  return (
    <section className="planner" aria-labelledby="planner-title">
      <div className="section-intro">
        <h2 id="planner-title">¿Qué necesitas hoy?</h2>
        <p>Elige una necesidad y te armamos el viaje: paradas de distintas líneas, en el orden en que conviene tomarlas.</p>
      </div>
      <div className="planner-needs" role="tablist" aria-label="Necesidad">
        {ITINERARIES.map((x) => (
          <button key={x.id} role="tab" aria-selected={x.id === id} className={x.id === id ? 'is-active' : ''} onClick={() => setId(x.id)}>
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
                  onClick={() => setEco(e)}
                  style={{ '--line': `var(--line-${e})` } as CSSProperties}
                >
                  <span className="line-dot" />
                  {getTrack(e)?.short}
                </button>
              ))}
            </div>
          )}
          <div className="planner-meta">
            {legs.length} paradas · unos {minutes} min
          </div>
          {first && (
            <Link className="btn btn-primary" to={first.kind === 'stop' ? first.stop.path : first.path}>
              {legs.some((l) => l.kind === 'stop' && visited.includes(stopKey(l.stop))) ? 'Continuar el viaje' : 'Empezar el viaje'} <ArrowRight size={16} />
            </Link>
          )}
        </div>

        <ol className="trip" key={`${it.id}-${eco}`}>
          {legs.map((l, i) => {
            const prev = legs[i - 1]
            const track = l.kind === 'stop' ? l.stop.track : undefined
            const prevTrack = prev?.kind === 'stop' ? prev.stop.track : undefined
            const transfer = i > 0 && track !== prevTrack
            const seen = l.kind === 'stop' && visited.includes(stopKey(l.stop))
            return (
              <motion.li
                key={l.kind === 'stop' ? l.stop.path : l.path}
                className={`trip-leg${transfer ? ' is-transfer' : ''}${seen ? ' is-visited' : ''}`}
                style={{ '--line': track ? `var(--line-${track})` : 'var(--text-3)' } as CSSProperties}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: i * 0.035 }}
              >
                <Link to={l.kind === 'stop' ? l.stop.path : l.path}>
                  <span className="stop" />
                  <span className="trip-text">
                    <span className="trip-line">
                      {l.kind === 'stop' ? (
                        <>
                          {getTrack(l.stop.track)?.short} · {String(l.stop.n).padStart(2, '0')}
                          {l.stop.kind === 'guia' ? <BookOpen size={12} /> : <FlaskConical size={12} />}
                          {l.stop.kind === 'guia' ? 'lectura' : 'laboratorio'}
                          {seen && ' · vista'}
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
  const visited = useVisited()
  useEffect(() => {
    document.title = 'Agents Roadmap · De cómo piensa un LLM a un agente en producción'
  }, [])
  const labs = STOPS.filter((s) => s.kind === 'lab').length
  const reads = STOPS.filter((s) => s.kind === 'guia').length
  const last = [...visited].reverse().map((k) => STOPS.find((s) => stopKey(s) === k)).find(Boolean)

  return (
    <div className="home">
      <section className="home-hero">
        <div className="eyebrow">
          {labs} laboratorios · {reads} lecturas · {TRACKS.length} líneas · en español
        </div>
        <h1>
          De cómo piensa un LLM a un agente en producción, <em>en la nube que uses</em>
        </h1>
        <p className="lead">
          Un solo mapa para aprender agentes de IA: laboratorios que abren el mecanismo, una guía para decidir con criterio y el recorrido completo en{' '}
          <strong>Google Cloud</strong>, <strong>AWS</strong>, <strong>Azure</strong> y <strong>Vercel</strong>, siempre con el mismo agente para que puedas
          comparar.
        </p>
        <div className="home-cta">
          {last ? (
            <Link className="btn btn-primary btn-lg" to={last.path}>
              Seguir donde quedaste <ArrowRight size={17} />
            </Link>
          ) : (
            <Link className="btn btn-primary btn-lg" to="/fundamentos/tokens">
              Empezar por el primer laboratorio <ArrowRight size={17} />
            </Link>
          )}
          <Link className="textlink" to="/comparar">
            Comparar ecosistemas
          </Link>
          <Link className="textlink" to="/guia/panorama">
            Leer el panorama
          </Link>
        </div>
      </section>

      <section className="home-map" aria-label="Mapa de líneas">
        <RouteMap />
      </section>

      <Planner />

      <section className="lines" aria-labelledby="lines-title">
        <div className="section-intro">
          <h2 id="lines-title">Las líneas</h2>
          <p>Dos líneas troncales que valen para cualquier nube y cuatro que recorren un ecosistema completo.</p>
        </div>
        <div className="lines-list">
          {TRACKS.map((t) => {
            const stops = stopsOf(t.id)
            const done = stops.filter((s) => visited.includes(stopKey(s))).length
            return (
              <Link key={t.id} to={`/${t.id}`} className="line-row" style={{ '--line': `var(--line-${t.id})` } as CSSProperties}>
                <span className="line-row-mark" />
                <span className="line-row-name">
                  <strong>{t.title}</strong>
                  <span>{t.tagline}</span>
                </span>
                <span className="line-row-aud">{t.audience}</span>
                <span className="line-row-meta">
                  {stops.length > 0 ? `${done}/${stops.length}` : 'pronto'}
                  <ArrowRight size={16} />
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="home-about">
        <h2>Cómo está hecho</h2>
        <div className="about-grid">
          <div>
            <h3>Un solo escenario</h3>
            <p>
              <strong>Andes Market</strong>, un retail online ficticio, y su agente de operaciones <strong>Andi</strong>. La misma clienta, los mismos pedidos
              y las mismas herramientas en todas las líneas: lo que cambia entre nubes es la plataforma, no el problema.
            </p>
          </div>
          <div>
            <h3>Qué es real y qué es simulado</h3>
            <p>
              Comandos, APIs, nombres de productos, formatos de eventos y precios: <strong>reales</strong>, tomados de la documentación oficial y con fecha de
              verificación en cada línea. Consolas, terminales y respuestas de modelos: <strong>simuladas</strong>, y lo decimos donde aparecen.
            </p>
          </div>
          <div>
            <h3>Código para probar</h3>
            <p>
              La carpeta <code>examples/</code> del repositorio trae los proyectos completos de las líneas Fundamentos y Google Cloud, listos para correr en tu
              máquina.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
