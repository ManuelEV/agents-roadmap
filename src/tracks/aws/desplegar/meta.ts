import type { LessonMeta } from '@/catalog/types'

export const meta: LessonMeta = {
  slug: 'desplegar',
  module: 'operar',
  order: 1,
  title: 'Desplegar en AgentCore Runtime e invocar al agente',
  short: 'Desplegar en AgentCore Runtime',
  summary:
    'El agente Strands que corría en tu máquina pasa a AgentCore Runtime: el wrapper que lo convierte en un servicio HTTP, el CLI de create a invoke, la microVM que aísla cada sesión, la llamada desde boto3 y lo que cuesta.',
  minutes: 17,
  concepts: ['AgentCore Runtime', 'BedrockAgentCoreApp', '@app.entrypoint', 'agentcore deploy', 'runtimeSessionId', 'invoke_agent_runtime'],
  topics: ['despliegue'],
}
