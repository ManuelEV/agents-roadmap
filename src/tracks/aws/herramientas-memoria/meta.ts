import type { LessonMeta } from '@/catalog/types'

export const meta: LessonMeta = {
  slug: 'herramientas-memoria',
  module: 'construir',
  order: 2,
  title: 'Herramientas, MCP y memoria: Gateway y AgentCore Memory',
  short: 'Herramientas y memoria',
  summary:
    'Saca las herramientas de Andi del código del agente y ponlas detrás de AgentCore Gateway: un solo endpoint MCP, credenciales fuera del agente y búsqueda de tools. Después, separa lo que Andi recuerda: estado de sesión, eventos de corto plazo y memorias de largo plazo por cliente.',
  minutes: 18,
  concepts: ['MCPClient', 'AgentCore Gateway', 'targets', 'auth entrante y saliente', 'session manager', 'AgentCore Memory', 'namespaces'],
  topics: ['herramientas', 'mcp', 'memoria'],
}
