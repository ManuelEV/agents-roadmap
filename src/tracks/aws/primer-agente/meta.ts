import type { LessonMeta } from '@/catalog/types'

export const meta: LessonMeta = {
  slug: 'primer-agente',
  module: 'construir',
  order: 1,
  title: 'Tu primer agente con Strands: Andi responde por un pedido',
  short: 'Tu primer agente',
  summary:
    'Un archivo Python con Strands Agents: una función con @tool, un BedrockModel y un Agent. Verás qué recibe el modelo de tu función, qué pasa dentro de una invocación y cómo correrlo en tu máquina con streaming.',
  minutes: 17,
  concepts: ['Strands Agents', 'Agent', '@tool', 'BedrockModel', 'toolUse / toolResult', 'stream_async', 'stop_reason'],
  topics: ['ciclo', 'herramientas'],
}
