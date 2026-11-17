import type { Lang } from '@/components/Code'
import type { TopicId } from './types'

/* Comparador: la misma pieza en cada ecosistema.
   Los datos viven en src/catalog/compare-data.ts y salen de docs/research/*.md. */

export type Eco = 'google' | 'aws' | 'azure' | 'vercel'
export const ECOS: Eco[] = ['google', 'aws', 'azure', 'vercel']

export type CompareCell = {
  /** nombre del producto o pieza; '—' si no hay equivalente de primera parte */
  name: string
  /** estado: GA, preview… o "lo traes tú" */
  status?: 'GA' | 'preview' | 'beta' | 'tú'
  /** 1–3 frases: qué hace y qué lo distingue */
  note: string
  code?: { lang: Lang; title: string; code: string }
  /** URL de la lección donde se trabaja */
  lesson?: string
  docs?: string
}

export type CompareRow = {
  id: string
  /** nombre del concepto */
  concept: string
  /** la pregunta que responde, corta */
  question: string
  /** explicación de una o dos frases, neutral a la nube */
  intro: string
  topic?: TopicId
  cells: Record<Eco, CompareCell>
}
