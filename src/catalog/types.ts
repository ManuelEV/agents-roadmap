import type { Tone } from '@/components/ui'

export type TrackId = 'fundamentos' | 'guia' | 'google' | 'aws' | 'azure' | 'vercel'

export type TopicId =
  | 'panorama'
  | 'llm'
  | 'contexto'
  | 'rag'
  | 'ciclo'
  | 'herramientas'
  | 'mcp'
  | 'datos'
  | 'memoria'
  | 'multiagente'
  | 'a2a'
  | 'guardrails'
  | 'identidad'
  | 'evaluacion'
  | 'despliegue'
  | 'interfaz'
  | 'frameworks'
  | 'arquitectura'
  | 'casos'
  | 'eco-google'
  | 'eco-aws'
  | 'eco-azure'
  | 'eco-vercel'

/** Lo que declara cada lección interactiva en su `meta.ts`. */
export type LessonMeta = {
  /** igual al nombre de la carpeta en src/tracks/<línea>/ */
  slug: string
  /** id de un módulo de la sección (ver src/catalog/tracks.ts) */
  module: string
  /** orden dentro del módulo */
  order: number
  title: string
  /** título corto para la barra lateral (opcional) */
  short?: string
  /** 1–2 frases: qué vas a entender */
  summary: string
  minutes: number
  /** conceptos que se ven (chips en la cabecera) */
  concepts: string[]
  /** etapa de la arquitectura que esta lección completa (solo sección Google) */
  archStage?: number
  /** temas para conectar lecciones entre secciones; si falta, se toma de src/catalog/topics.ts */
  topics?: TopicId[]
}

export type ModuleInfo = { id: string; n: number; title: string; tone: Tone; description: string }

export type TrackKind = 'labs' | 'guia' | 'ecosistema'

export type Track = {
  id: TrackId
  /** nombre de la sección */
  title: string
  /** nombre corto para la navegación */
  short: string
  kind: TrackKind
  /** una frase: qué es */
  tagline: string
  description: string
  /** para quién / cuándo tomarla */
  audience: string
  modules: ModuleInfo[]
  /** fecha de verificación del contenido */
  verified: string
}

/** Una lección: interactiva (lab) o artículo de referencia (guia). */
export type Stop = {
  track: TrackId
  slug: string
  kind: 'lab' | 'guia'
  module: string
  order: number
  /** posición 1..N dentro de la sección */
  n: number
  title: string
  short: string
  summary: string
  minutes: number
  concepts: string[]
  topics: TopicId[]
  path: string
  archStage?: number
  level?: string
}
