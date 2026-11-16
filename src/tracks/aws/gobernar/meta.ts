import type { LessonMeta } from '@/catalog/types'

export const meta: LessonMeta = {
  slug: 'gobernar',
  module: 'operar',
  order: 2,
  title: 'Gobernar al agente: identidad, políticas, guardrails y observabilidad',
  short: 'Identidad, guardrails y trazas',
  summary:
    'Con qué identidad llama Andi a una herramienta, cómo Policy decide cada tool call en el Gateway, qué filtra Bedrock Guardrails (y qué no ve) y de dónde salen las trazas y los evaluadores.',
  minutes: 18,
  concepts: ['AgentCore Identity', 'token vault', 'Policy · Cedar', 'Bedrock Guardrails', 'ApplyGuardrail', 'Observability', 'Evaluations'],
  topics: ['guardrails', 'identidad', 'evaluacion'],
}
