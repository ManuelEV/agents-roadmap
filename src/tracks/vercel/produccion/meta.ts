import type { LessonMeta } from '@/catalog/types'

export const meta: LessonMeta = {
  slug: 'produccion',
  module: 'operar',
  order: 1,
  title: 'Llevar el agente a producción: durabilidad, despliegue, guardrails y trazas',
  short: 'Llevar a producción',
  summary:
    'Por qué un agente que espera una aprobación no cabe en una request, cómo un workflow lo vuelve durable, y qué pone la plataforma (y qué escribes tú) para desplegarlo, protegerlo y observarlo.',
  minutes: 19,
  concepts: ["'use workflow'", "'use step'", 'sleep · hooks', 'WorkflowAgent', 'maxDuration', 'OIDC', 'wrapLanguageModel', 'registerTelemetry'],
  topics: ['despliegue', 'guardrails', 'evaluacion'],
}
