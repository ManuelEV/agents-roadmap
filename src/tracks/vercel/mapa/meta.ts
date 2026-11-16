import type { LessonMeta } from '@/catalog/types'

export const meta: LessonMeta = {
  slug: 'mapa',
  module: 'mapa',
  order: 1,
  title: 'El ecosistema de Vercel para agentes: qué te da y qué traes tú',
  short: 'El ecosistema',
  summary:
    'Qué son AI SDK, ToolLoopAgent, AI Gateway, Workflow SDK, Sandbox y Fluid compute, cómo encajan dentro de tu app web y qué piezas de un hyperscaler tendrás que traer tú. Además: cómo se elige y se paga un modelo por el gateway, y cómo leer tutoriales de v5/v6.',
  minutes: 14,
  concepts: ['AI SDK 7', 'ToolLoopAgent', 'AI Gateway', 'Workflow SDK', 'Vercel Sandbox', 'Fluid compute', 'providerOptions.gateway'],
  topics: ['panorama', 'eco-vercel', 'llm'],
}
