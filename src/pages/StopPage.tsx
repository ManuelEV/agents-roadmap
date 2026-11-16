import { Component, lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type ComponentType, type CSSProperties, type LazyExoticComponent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { MDXProvider } from '@mdx-js/react'
import { ArrowLeft, ArrowRight, BookOpen, Clock, ExternalLink, FlaskConical, Gauge } from 'lucide-react'
import { TOPICS, adjacentStops, getStop, getTrack, lessonComponent, relatedStops, stopKey, stopsOf, type Stop, type Track } from '@/catalog'
import { mdxComponents } from '@/guide/components/mdx'
import { getPost, loadPostContent, type Reference } from '@/guide/lib/content'
import { markVisited } from '@/lib/hooks'
import { Pill } from '@/components/ui'
import { NotFoundPage } from './NotFoundPage'

class StopBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error)
      return (
        <div className="callout" data-tone="error">
          <span />
          <div>
            <div className="callout-title">La lección falló al renderizar</div>
            <div className="callout-body mono small">{this.state.error.message}</div>
          </div>
        </div>
      )
    return this.props.children
  }
}

/* -------------------------------------------------------------------------- */
/* Cabecera, transbordos y navegación: iguales para labs y artículos           */
/* -------------------------------------------------------------------------- */

function StopHeader({ stop, track }: { stop: Stop; track: Track }) {
  const mod = track.modules.find((m) => m.id === stop.module)
  return (
    <header className="lesson-hero">
      <div className="eyebrow">
        <span className="stop-badge" aria-label={`Parada ${stop.n} de ${stopsOf(track.id).length}`}>
          {String(stop.n).padStart(2, '0')}
        </span>
        <Link to={`/${track.id}`} className="eyebrow-link">
          {track.title}
        </Link>
        {mod && <span className="eyebrow-mod">· {mod.title}</span>}
      </div>
      <h1>{stop.title}</h1>
      <p className="lead">{stop.summary}</p>
      <div className="hero-meta">
        <span className="minutes">
          <Clock size={13} /> {stop.minutes} min
        </span>
        <span className="minutes">
          {stop.kind === 'guia' ? <BookOpen size={13} /> : <FlaskConical size={13} />} {stop.kind === 'guia' ? 'Lectura con diagramas' : 'Laboratorio interactivo'}
        </span>
        {stop.level && (
          <span className="minutes">
            <Gauge size={13} /> Nivel {stop.level}
          </span>
        )}
        {stop.concepts.slice(0, 7).map((c) => (
          <Pill key={c} tone={mod?.tone} mono={stop.kind === 'lab'}>
            {c}
          </Pill>
        ))}
      </div>
    </header>
  )
}

/** Transbordos: el mismo tema en otras líneas. */
function Transfers({ stop }: { stop: Stop }) {
  const related = relatedStops(stop)
  if (related.length === 0) return null
  return (
    <section className="transfers" aria-labelledby="transfers-title">
      <h2 id="transfers-title">Transbordos</h2>
      <p className="transfers-sub">
        El mismo tema ({stop.topics.map((t) => TOPICS[t].toLowerCase()).join(', ')}) en otras líneas.
      </p>
      <div className="transfers-list">
        {related.map((r) => (
          <Link key={stopKey(r)} to={r.path} className="transfer" style={{ '--line': `var(--line-${r.track})` } as CSSProperties}>
            <span className="transfer-line">
              <span className="line-dot" />
              {getTrack(r.track)?.title} · {String(r.n).padStart(2, '0')}
              <span className="transfer-kind">
                {r.kind === 'guia' ? <BookOpen size={12} /> : <FlaskConical size={12} />} {r.kind === 'guia' ? 'lectura' : 'laboratorio'}
              </span>
            </span>
            <span className="transfer-title">{r.title}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function StopNav({ stop, track }: { stop: Stop; track: Track }) {
  const { prev, next } = adjacentStops(stop)
  return (
    <nav className="lesson-nav" aria-label="Navegación entre paradas">
      {prev ? (
        <Link to={prev.path}>
          <span className="dir">
            <ArrowLeft size={13} /> Anterior
          </span>
          <span className="t">{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link to={next.path} className="next">
          <span className="dir">
            Siguiente <ArrowRight size={13} />
          </span>
          <span className="t">{next.title}</span>
        </Link>
      ) : (
        <Link to={`/${track.id}`} className="next">
          <span className="dir">
            Fin de la línea <ArrowRight size={13} />
          </span>
          <span className="t">Volver a {track.title}</span>
        </Link>
      )}
    </nav>
  )
}

/* -------------------------------------------------------------------------- */
/* Artículo de la guía (MDX)                                                   */
/* -------------------------------------------------------------------------- */

const mdxCache = new Map<string, LazyExoticComponent<ComponentType>>()
function contentFor(slug: string) {
  let c = mdxCache.get(slug)
  if (!c) {
    c = lazy(() => loadPostContent(slug))
    mdxCache.set(slug, c)
  }
  return c
}

type Heading = { id: string; text: string; level: number }

function Article({ slug, onHeadings }: { slug: string; onHeadings: (h: Heading[]) => void }) {
  const Content = contentFor(slug)
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const hs = [...el.querySelectorAll<HTMLHeadingElement>('h2[id], h3[id]')].map((h) => ({ id: h.id, text: h.textContent ?? '', level: h.tagName === 'H2' ? 2 : 3 }))
    onHeadings(hs)
    if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView()
  }, [slug, onHeadings])
  return (
    <div ref={ref} className="gprose">
      <MDXProvider components={mdxComponents}>
        <Content />
      </MDXProvider>
    </div>
  )
}

function Toc({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    const els = headings.map((h) => document.getElementById(h.id)).filter((e): e is HTMLElement => !!e)
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-90px 0px -70% 0px' },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [headings])
  if (headings.length === 0) return null
  return (
    <nav className="toc" aria-label="En esta página">
      <div className="toc-title">En esta página</div>
      <ul>
        {headings.map((h) => (
          <li key={h.id} className={`toc-l${h.level}${active === h.id ? ' is-active' : ''}`}>
            <a href={`#${h.id}`}>{h.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function ReferenceList({ refs }: { refs: Reference[] }) {
  return (
    <ol className="refs">
      {refs.map((r) => (
        <li key={r.url + r.title}>
          <a href={r.url} target="_blank" rel="noreferrer">
            {r.title} <ExternalLink size={12} />
          </a>
          <span className="refs-meta">
            {r.org}
            {r.date ? ` · ${r.date}` : ''}
            {r.note ? ` — ${r.note}` : ''}
          </span>
        </li>
      ))}
    </ol>
  )
}

function GuideView({ stop, track }: { stop: Stop; track: Track }) {
  const post = getPost(stop.slug)
  const [headings, setHeadings] = useState<Heading[]>([])
  useEffect(() => setHeadings([]), [stop.slug])
  return (
    <div className="post-layout">
      <article className="lesson guide-scope" key={stop.slug}>
        <StopHeader stop={stop} track={track} />
        <StopBoundary>
          <Suspense
            fallback={
              <div className="skeleton" aria-busy="true">
                <div />
                <div />
                <div />
                <div />
              </div>
            }
          >
            <Article key={stop.slug} slug={stop.slug} onHeadings={setHeadings} />
          </Suspense>
        </StopBoundary>
        {post && post.references.length > 0 && (
          <section className="post-refs">
            <h2 id="referencias">Referencias</h2>
            <p className="muted">Fuentes primarias usadas en este artículo, para profundizar o verificar.</p>
            <ReferenceList refs={post.references} />
          </section>
        )}
        <Transfers stop={stop} />
        <StopNav stop={stop} track={track} />
      </article>
      <aside className="post-aside">
        <Toc headings={headings} />
      </aside>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Laboratorio                                                                 */
/* -------------------------------------------------------------------------- */

function LabView({ stop, track }: { stop: Stop; track: Track }) {
  const Comp = lessonComponent(stop.track, stop.slug)
  if (!Comp) return <NotFoundPage />
  return (
    <article className="lesson" key={stopKey(stop)}>
      <div className="lesson-track">
        <StopHeader stop={stop} track={track} />
        <StopBoundary>
          <Suspense fallback={<div className="muted">Cargando lección…</div>}>
            <Comp />
          </Suspense>
        </StopBoundary>
      </div>
      <Transfers stop={stop} />
      <StopNav stop={stop} track={track} />
    </article>
  )
}

export function StopPage() {
  const { track: trackId, slug } = useParams()
  const track = getTrack(trackId)
  const stop = getStop(trackId, slug)

  useEffect(() => {
    if (stop && track) {
      markVisited(stopKey(stop))
      document.title = `${stop.title} · ${track.title} · Agents Roadmap`
      document.querySelector('meta[name="description"]')?.setAttribute('content', stop.summary)
    }
  }, [stop, track])

  if (!track || !stop) return <NotFoundPage />
  return stop.kind === 'guia' ? <GuideView stop={stop} track={track} /> : <LabView stop={stop} track={track} />
}
