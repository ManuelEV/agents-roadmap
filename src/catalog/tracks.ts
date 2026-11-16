import type { Track } from './types'

/* Las líneas del mapa. El orden aquí es el orden en toda la interfaz.
   Cada línea tiene su color en src/styles/base.css (--line-<id>). */
export const TRACKS: Track[] = [
  {
    id: 'fundamentos',
    title: 'Fundamentos',
    short: 'Fundamentos',
    kind: 'labs',
    tagline: 'Cómo funciona un agente por dentro, con laboratorios',
    description:
      'Del token al agente en producción: qué ve un LLM, cómo busca RAG, cómo decide usar una herramienta, cómo se conectan MCP y A2A. Todo con simulaciones que puedes manipular.',
    audience: 'Empieza aquí si nunca abriste un agente por dentro.',
    verified: 'octubre de 2026',
    modules: [
      { id: 'llm', n: 1, title: 'El modelo por dentro', tone: 'model', description: 'Qué ve realmente un LLM: tokens, probabilidades y una ventana de contexto que se reenvía en cada llamada.' },
      { id: 'rag', n: 2, title: 'RAG: buscar antes de responder', tone: 'data', description: 'Embeddings, chunking, vector stores e índices: cómo el agente encuentra el párrafo correcto entre miles.' },
      { id: 'agentes', n: 3, title: 'Agentes', tone: 'tool', description: 'El ciclo razonar → actuar → observar, herramientas, memoria y cómo se coordinan varios agentes.' },
      { id: 'protocolos', n: 4, title: 'Protocolos', tone: 'user', description: 'MCP para conectar herramientas y A2A para que agentes de distintos equipos colaboren.' },
      { id: 'produccion', n: 5, title: 'Producción', tone: 'guard', description: 'Guardrails contra prompt injection, trazas, costos y evaluación de agentes reales.' },
    ],
  },
  {
    id: 'guia',
    title: 'Guía de referencia',
    short: 'Guía',
    kind: 'guia',
    tagline: 'Conceptos, frameworks, arquitecturas y casos reales, para leer',
    description:
      'Artículos con diagramas paso a paso: patrones de diseño, protocolos, comparativa de frameworks, arquitecturas de referencia completas y lo que aprendieron las empresas que ya operan agentes a escala.',
    audience: 'Para decidir con criterio y para volver cuando necesites el detalle.',
    verified: 'octubre de 2026',
    modules: [
      { id: 'inicio', n: 1, title: 'Empieza aquí', tone: 'system', description: 'Panorama del ecosistema y ruta de aprendizaje.' },
      { id: 'fundamentos', n: 2, title: 'Fundamentos', tone: 'model', description: 'Qué es un agente, patrones de diseño y context engineering.' },
      { id: 'conectar', n: 3, title: 'Conocimiento y protocolos', tone: 'data', description: 'RAG, MCP, A2A y gateways: cómo el agente accede al mundo.' },
      { id: 'frameworks', n: 4, title: 'Frameworks', tone: 'tool', description: 'ADK, Strands, LangGraph y el resto, comparados.' },
      { id: 'plataformas', n: 5, title: 'Plataformas cloud', tone: 'user', description: 'AWS, Google Cloud, Microsoft Foundry y Cloudflare.' },
      { id: 'arquitecturas', n: 6, title: 'Arquitecturas de referencia', tone: 'memory', description: 'Ejemplos completos de extremo a extremo.' },
      { id: 'casos', n: 7, title: 'Casos reales', tone: 'ok', description: 'Qué construyeron, cómo y qué aprendieron.' },
      { id: 'produccion', n: 8, title: 'Producción', tone: 'guard', description: 'Evaluación, observabilidad, seguridad y orquestación avanzada.' },
    ],
  },
  {
    id: 'google',
    title: 'Google Cloud',
    short: 'Google',
    kind: 'ecosistema',
    tagline: 'ADK, Agent Runtime, Model Armor y Gemini Enterprise',
    description:
      'Programa un agente con ADK, conéctalo a bases de datos dentro y fuera de Google Cloud, despliégalo en Agent Runtime, protégelo con Model Armor y publícalo en Gemini Enterprise. Con consola simulada y el código completo.',
    audience: 'Si tu empresa ya vive en Google Cloud o Workspace.',
    verified: 'noviembre de 2026',
    modules: [
      { id: 'mapa', n: 1, title: 'El mapa', tone: 'system', description: 'Qué es cada pieza de la plataforma (y cómo se llamaba antes), qué modelo Gemini elegir y cómo dejar listo tu proyecto.' },
      { id: 'construir', n: 2, title: 'Construir con ADK', tone: 'model', description: 'Tu primer agente, herramientas, bases de datos dentro y fuera de Google, y workflows multi-agente con humanos en el circuito.' },
      { id: 'escalar', n: 3, title: 'Escalar', tone: 'data', description: 'Sesiones, estado y Memory Bank; despliegue en Agent Runtime y cómo consultar al agente desplegado.' },
      { id: 'gobernar', n: 4, title: 'Gobernar y optimizar', tone: 'guard', description: 'Guardrails con Model Armor, Agent Identity y Agent Gateway; evaluación con adk eval y trazas en Cloud Trace.' },
      { id: 'publicar', n: 5, title: 'Publicar', tone: 'user', description: 'Registrar el agente en Gemini Enterprise, hablar A2A con agentes de otros equipos y recorrer el proyecto completo.' },
    ],
  },
  {
    id: 'aws',
    title: 'AWS',
    short: 'AWS',
    kind: 'ecosistema',
    tagline: 'Strands Agents, Amazon Bedrock y AgentCore',
    description:
      'El mismo agente de Andes Market, ahora con Strands Agents sobre Amazon Bedrock: herramientas y MCP detrás de AgentCore Gateway, memoria administrada, despliegue en AgentCore Runtime y gobierno con Identity, Policy y Guardrails.',
    audience: 'Si tus datos y tu equipo ya están en AWS.',
    verified: 'noviembre de 2026',
    modules: [
      { id: 'mapa', n: 1, title: 'El mapa', tone: 'system', description: 'Qué es cada pieza: Bedrock, AgentCore y Strands, y a qué equivale en las otras nubes.' },
      { id: 'construir', n: 2, title: 'Construir con Strands', tone: 'model', description: 'Un agente con herramientas, MCP y memoria, corriendo en tu máquina.' },
      { id: 'operar', n: 3, title: 'Desplegar y gobernar', tone: 'guard', description: 'AgentCore Runtime, identidad, guardrails, políticas y observabilidad.' },
    ],
  },
  {
    id: 'azure',
    title: 'Microsoft Azure',
    short: 'Azure',
    kind: 'ecosistema',
    tagline: 'Microsoft Foundry, Agent Framework y Entra Agent ID',
    description:
      'El mismo agente con Microsoft Agent Framework sobre Microsoft Foundry: herramientas, MCP y workflows en grafo, despliegue en Foundry Agent Service y gobierno con Entra Agent ID, Content Safety y evaluadores.',
    audience: 'Si tu empresa ya usa Microsoft 365, Entra y Azure.',
    verified: 'noviembre de 2026',
    modules: [
      { id: 'mapa', n: 1, title: 'El mapa', tone: 'system', description: 'Qué es cada pieza de Microsoft Foundry y a qué equivale en las otras nubes.' },
      { id: 'construir', n: 2, title: 'Construir con Agent Framework', tone: 'model', description: 'Un agente con herramientas, MCP y workflows con humanos en el circuito.' },
      { id: 'operar', n: 3, title: 'Desplegar y gobernar', tone: 'guard', description: 'Foundry Agent Service, identidad de agentes, guardrails, evaluación y trazas.' },
    ],
  },
  {
    id: 'vercel',
    title: 'Vercel',
    short: 'Vercel',
    kind: 'ecosistema',
    tagline: 'AI SDK, AI Gateway y Workflow para agentes en TypeScript',
    description:
      'El camino del equipo de producto: un agente en TypeScript con AI SDK, que transmite a la interfaz mientras piensa, pide aprobación antes de actuar, sobrevive a reinicios con Workflow y cambia de modelo con AI Gateway.',
    audience: 'Si construyes producto web en TypeScript y el agente vive dentro de tu app.',
    verified: 'noviembre de 2026',
    modules: [
      { id: 'mapa', n: 1, title: 'El mapa', tone: 'system', description: 'Qué resuelve cada pieza y qué tendrás que traer tú.' },
      { id: 'construir', n: 2, title: 'Construir con AI SDK', tone: 'model', description: 'El ciclo de herramientas, el streaming hacia la interfaz y la aprobación humana.' },
      { id: 'operar', n: 3, title: 'Llevar a producción', tone: 'guard', description: 'Agentes durables, despliegue, modelos con respaldo, guardrails y trazas.' },
    ],
  },
]
