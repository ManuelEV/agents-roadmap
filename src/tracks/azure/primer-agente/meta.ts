import type { LessonMeta } from '@/catalog/types'

export const meta: LessonMeta = {
  slug: 'primer-agente',
  module: 'construir',
  order: 1,
  title: 'Tu primer agente con Microsoft Agent Framework: Andi responde por un pedido',
  short: 'Tu primer agente',
  summary:
    'Escribes un agente completo en Python con una function tool sobre un modelo de Microsoft Foundry y miras qué pasa dentro de un run: la definición que recibe el modelo, los updates del stream, la sesión y la credencial local.',
  minutes: 17,
  concepts: ['Agent', '@tool', 'FoundryChatClient', 'AzureCliCredential', 'AgentResponseUpdate', 'AgentSession'],
  topics: ['ciclo', 'herramientas'],
}
