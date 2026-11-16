import type { LessonMeta } from '@/catalog/types'

export const meta: LessonMeta = {
  slug: 'desplegar',
  module: 'operar',
  order: 1,
  title: 'Desplegar en Foundry Agent Service: agentes de prompt y agentes hospedados',
  short: 'Foundry Agent Service',
  summary:
    'Tres formas de correr a Andi en Foundry y cuándo conviene cada una: un prompt agent versionado en el servicio, tu código de Agent Framework como hosted agent desplegado con azd, o la Responses API directa. Cómo se invoca con conversations y responses, y dónde queda el estado.',
  minutes: 17,
  concepts: ['Prompt agent', 'Hosted agent', 'create_version', 'conversations + responses', 'azd ai agent', 'ResponsesHostServer'],
  topics: ['despliegue'],
}
