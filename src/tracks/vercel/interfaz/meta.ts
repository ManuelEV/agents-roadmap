import type { LessonMeta } from '@/catalog/types'

export const meta: LessonMeta = {
  slug: 'interfaz',
  module: 'construir',
  order: 2,
  title: 'Del agente a la interfaz: streaming, aprobación humana y persistencia',
  short: 'Del agente a la interfaz',
  summary:
    'El stream de un agente del AI SDK es un protocolo tipado que la interfaz entiende. Verás qué partes viajan del servidor a useChat mientras Andi piensa, llama una tool y responde; cómo una tool call se dibuja como componente, cómo un reembolso sobre $50.000 espera a un supervisor con toolApproval, y qué tienes que guardar tú para que la conversación sobreviva a una recarga.',
  minutes: 18,
  concepts: ['useChat', 'UI message stream', 'message.parts', 'tool-{nombre}', 'toolApproval', 'addToolApprovalResponse', 'onEnd + UIMessage[]'],
  topics: ['interfaz', 'memoria'],
}
