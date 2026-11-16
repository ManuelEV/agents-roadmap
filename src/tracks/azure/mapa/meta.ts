import type { LessonMeta } from '@/catalog/types'

export const meta: LessonMeta = {
  slug: 'mapa',
  module: 'mapa',
  order: 1,
  title: 'Microsoft Foundry, pieza por pieza',
  short: 'El ecosistema',
  summary:
    'Qué es cada pieza del ecosistema de agentes de Microsoft (Foundry, Foundry Agent Service, Agent Framework, Entra Agent ID, guardrails y la publicación en Teams), cómo se llamaba antes, qué modelo elegir para cada rol y a qué equivale en Google Cloud.',
  minutes: 15,
  concepts: ['Microsoft Foundry', 'Foundry Agent Service', 'Agent Framework', 'Entra Agent ID', 'Guardrails', 'Model router'],
  topics: ['panorama', 'eco-azure', 'llm'],
}
