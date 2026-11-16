import type { LessonMeta } from '@/catalog/types'

export const meta: LessonMeta = {
  slug: 'primer-agente',
  module: 'construir',
  order: 1,
  title: 'Tu primer agente con AI SDK: Andi responde por un pedido',
  short: 'Tu primer agente',
  summary:
    'Un agente completo en TypeScript con ToolLoopAgent y una herramienta. Verás qué recibe el modelo, qué es un paso, cuándo se detiene el loop y qué forma tiene el resultado.',
  minutes: 17,
  concepts: ['ToolLoopAgent', 'tool()', 'inputSchema', 'stopWhen', 'prepareStep', 'result.steps', 'createMCPClient'],
  topics: ['ciclo', 'herramientas'],
}
