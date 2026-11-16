import type { LessonMeta } from '@/catalog/types'

export const meta: LessonMeta = {
  slug: 'gobernar',
  module: 'operar',
  order: 2,
  title: 'Gobernar al agente: Entra Agent ID, guardrails, evaluación y trazas',
  short: 'Identidad, guardrails y evaluación',
  summary:
    'Andi ya corre en Foundry. Ahora toca responder quién es, qué le dejas hacer, qué revisan los guardrails (y qué no), cómo mides si empeoró y cómo llega a Teams y Microsoft 365 Copilot.',
  minutes: 18,
  concepts: ['Entra Agent ID', 'agent identity blueprint', 'Foundry User', 'Guardrails', 'rai_config', 'client.evals', 'Application Insights'],
  topics: ['guardrails', 'identidad', 'evaluacion'],
}
