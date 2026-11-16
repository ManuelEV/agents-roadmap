import type { LessonMeta } from '@/catalog/types'

export const meta: LessonMeta = {
  slug: 'herramientas-workflows',
  module: 'construir',
  order: 2,
  title: 'Herramientas, MCP, aprobación humana y workflows en grafo',
  short: 'Herramientas y workflows',
  summary:
    'Cómo Andi suma herramientas con Microsoft Agent Framework (funciones y MCP, local u hospedado), cómo una herramienta queda sujeta a aprobación humana y cuándo conviene dejar de sumar herramientas y pasar a un workflow en grafo con checkpoints o a una orquestación lista para usar.',
  minutes: 18,
  concepts: ['@tool · approval_mode', 'MCPStreamableHTTPTool', 'middleware', 'WorkflowBuilder', 'request_info', 'checkpoints', 'orquestaciones'],
  topics: ['herramientas', 'mcp', 'multiagente'],
}
