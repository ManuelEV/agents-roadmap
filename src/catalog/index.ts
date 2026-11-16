import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import { posts } from '@/guide/lib/content'
import { STOP_TOPICS } from './topics'
import { TRACKS } from './tracks'
import type { LessonMeta, Stop, Track, TrackId } from './types'

export { TRACKS } from './tracks'
export { TOPICS } from './topics'
export type { LessonMeta, ModuleInfo, Stop, TopicId, Track, TrackId } from './types'

/* Catálogo único de la plataforma.

   Una LÍNEA (track) agrupa PARADAS (stops). Hay dos tipos de parada:
     · lab   → src/tracks/<línea>/<slug>/{meta.ts,index.tsx}   (se registran solas por glob)
     · guia  → src/guide/content/<slug>.{mdx,meta.ts}
   La ruta de una parada es siempre /<línea>/<slug>. */

const metaFiles = import.meta.glob<{ meta: LessonMeta }>('../tracks/*/*/meta.ts', { eager: true })
const componentFiles = import.meta.glob<{ default: ComponentType }>('../tracks/*/*/index.tsx')

const trackIndex = (id: TrackId) => TRACKS.findIndex((t) => t.id === id)
export const getTrack = (id: string | undefined): Track | undefined => TRACKS.find((t) => t.id === id)
const moduleIndex = (track: Track, moduleId: string) => {
  const i = track.modules.findIndex((m) => m.id === moduleId)
  return i < 0 ? 99 : i
}

const labStops = Object.entries(metaFiles).flatMap(([file, mod]) => {
  const trackId = file.split('/')[2] as TrackId
  if (!getTrack(trackId)) return []
  const m = mod.meta
  const stop: Omit<Stop, 'n'> = {
    track: trackId,
    slug: m.slug,
    kind: 'lab',
    module: m.module,
    order: m.order,
    title: m.title,
    short: m.short ?? m.title,
    summary: m.summary,
    minutes: m.minutes,
    concepts: m.concepts,
    topics: m.topics ?? STOP_TOPICS[`${trackId}/${m.slug}`] ?? [],
    path: `/${trackId}/${m.slug}`,
    archStage: m.archStage,
  }
  return [stop]
})

/** Título corto de un artículo para la barra lateral: sin prefijo de serie ni subtítulo. */
function guideShort(title: string) {
  const t = title.replace(/^(Caso real|Arquitectura de referencia|Casos reales): /, '').replace(/ (.*)$/, '')
  const head = t.split(':')[0]
  const s = head.length >= 8 ? head : t
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const guideStops = posts.map(
  (p): Omit<Stop, 'n'> => ({
    track: 'guia',
    slug: p.slug,
    kind: 'guia',
    module: p.section,
    order: p.order,
    title: p.title,
    short: guideShort(p.title),
    summary: p.description,
    minutes: p.readingMinutes,
    concepts: p.tags ?? [],
    topics: STOP_TOPICS[`guia/${p.slug}`] ?? [],
    path: `/guia/${p.slug}`,
    level: p.level,
  }),
)

const counters = new Map<TrackId, number>()
export const STOPS: Stop[] = [...labStops, ...guideStops]
  .sort((a, b) => {
    const ta = getTrack(a.track)!
    const tb = getTrack(b.track)!
    return trackIndex(a.track) - trackIndex(b.track) || moduleIndex(ta, a.module) - moduleIndex(tb, b.module) || a.order - b.order
  })
  .map((s) => {
    const n = (counters.get(s.track) ?? 0) + 1
    counters.set(s.track, n)
    return { ...s, n }
  })

export const stopsOf = (track: TrackId) => STOPS.filter((s) => s.track === track)
export const stopsByModule = (track: TrackId, moduleId: string) => STOPS.filter((s) => s.track === track && s.module === moduleId)
export const getStop = (track: string | undefined, slug: string | undefined) => STOPS.find((s) => s.track === track && s.slug === slug)
/** Clave estable de una parada, usada para el progreso guardado. */
export const stopKey = (s: Pick<Stop, 'track' | 'slug'>) => `${s.track}/${s.slug}`
export const trackMinutes = (track: TrackId) => stopsOf(track).reduce((a, s) => a + s.minutes, 0)

export function adjacentStops(stop: Stop) {
  const list = stopsOf(stop.track)
  const i = list.findIndex((s) => s.slug === stop.slug)
  return { prev: list[i - 1], next: list[i + 1] }
}

/** Transbordos: paradas de OTRAS líneas que comparten tema, ordenadas por coincidencia. */
export function relatedStops(stop: Stop, limit = 6): Stop[] {
  if (stop.topics.length === 0) return []
  const scored = STOPS.filter((s) => s.track !== stop.track)
    .map((s) => ({ s, score: s.topics.filter((t) => stop.topics.includes(t)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || trackIndex(a.s.track) - trackIndex(b.s.track) || a.s.n - b.s.n)
  // como mucho dos por línea, para que el transbordo muestre variedad
  const perTrack = new Map<TrackId, number>()
  const out: Stop[] = []
  for (const { s } of scored) {
    const c = perTrack.get(s.track) ?? 0
    if (c >= 2) continue
    perTrack.set(s.track, c + 1)
    out.push(s)
    if (out.length >= limit) break
  }
  return out
}

const cache = new Map<string, LazyExoticComponent<ComponentType>>()
export function lessonComponent(track: string, slug: string) {
  const loader = componentFiles[`../tracks/${track}/${slug}/index.tsx`]
  if (!loader) return null
  const key = `${track}/${slug}`
  if (!cache.has(key)) cache.set(key, lazy(loader))
  return cache.get(key)!
}
