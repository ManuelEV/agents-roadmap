import type { LessonMeta } from '@/catalog/types'

export const meta: LessonMeta = {
  slug: 'mapa',
  module: 'mapa',
  order: 1,
  title: 'El ecosistema de agentes de AWS, pieza por pieza',
  short: 'El ecosistema',
  summary:
    'Qué son Amazon Bedrock, Strands Agents y cada servicio de AgentCore, cómo encajan cuando Camila pregunta por su pedido, qué modelo elegir y cuánto cuesta, y cómo se llama cada pieza en Google Cloud.',
  minutes: 15,
  concepts: ['Amazon Bedrock', 'AgentCore', 'Strands Agents', 'Inference profiles', 'Precio por token', 'Bedrock Agents Classic'],
  topics: ['panorama', 'eco-aws', 'llm'],
}
