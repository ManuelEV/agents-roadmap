import type { TrackId } from './types'

/* Itinerarios: viajes que cruzan líneas. Cada parada es "<línea>/<slug>".
   `{eco}` se reemplaza por el ecosistema elegido por el lector.
   Las paradas que no existan se omiten al dibujar (ver HomePage). */
export type Itinerary = {
  id: string
  /** la necesidad, en palabras del lector */
  need: string
  title: string
  why: string
  stops: string[]
  /** si usa {eco}, muestra el selector de ecosistema */
  usesEco?: boolean
}

export const ECOSYSTEMS: TrackId[] = ['google', 'aws', 'azure', 'vercel']

export const ITINERARIES: Itinerary[] = [
  {
    id: 'entender',
    need: 'Entender cómo funciona',
    title: 'Del token al agente, sin saltarte nada',
    why: 'Primero abres el modelo, luego el ciclo y las herramientas, y cierras con la definición formal. Cuando llegues a un framework, ya sabrás qué hace por ti.',
    stops: [
      'fundamentos/tokens',
      'fundamentos/ventana-contexto',
      'fundamentos/loop-agente',
      'fundamentos/herramientas',
      'fundamentos/decision-herramienta',
      'guia/que-es-un-agente',
      'fundamentos/mcp',
    ],
  },
  {
    id: 'construir',
    need: 'Construir en mi nube',
    title: 'Un agente desplegado en tu ecosistema',
    why: 'Un repaso corto del ciclo y de MCP, y después el recorrido de tu nube: mapa, primer agente, despliegue. Termina comparando con las demás para saber qué elegiste.',
    stops: ['fundamentos/loop-agente', 'fundamentos/mcp', '{eco}/@1', '{eco}/@2', '{eco}/@3', '{eco}/@last', 'comparar'],
    usesEco: true,
  },
  {
    id: 'decidir',
    need: 'Decidir qué usar',
    title: 'Elegir framework y plataforma con criterio',
    why: 'El panorama, los patrones que de verdad necesitas, la comparativa de frameworks y una arquitectura de referencia completa antes de comprometerte.',
    stops: ['guia/panorama', 'guia/patrones-de-diseno', 'guia/comparativa-frameworks', 'comparar', 'guia/gateways', 'guia/arquitectura-de-referencia'],
  },
  {
    id: 'produccion',
    need: 'Llevarlo a producción',
    title: 'Lo que separa una demo de un sistema',
    why: 'Guardrails, trazas y evaluación en laboratorio; después la versión completa en la guía y cómo lo resuelve una plataforma concreta.',
    stops: [
      'fundamentos/guardrails',
      'fundamentos/observabilidad',
      'guia/seguridad-gobernanza',
      'guia/evaluacion-observabilidad',
      'google/seguridad',
      'google/evaluar',
      'guia/caso-servicios-financieros',
    ],
  },
  {
    id: 'rag',
    need: 'Dominar RAG',
    title: 'Que el agente encuentre el párrafo correcto',
    why: 'Los cinco laboratorios de búsqueda en orden, la guía de RAG empresarial y una arquitectura de soporte que lo combina con MCP.',
    stops: [
      'fundamentos/embeddings',
      'fundamentos/indexacion',
      'fundamentos/indice-hnsw',
      'fundamentos/busqueda-rag',
      'fundamentos/busqueda-hibrida',
      'guia/rag',
      'guia/arquitectura-soporte-rag-mcp',
    ],
  },
  {
    id: 'casos',
    need: 'Ver cómo lo hacen otros',
    title: 'Empresas que ya operan agentes a escala',
    why: 'Qué construyeron, con qué arquitectura y qué les salió mal. Sirve para calibrar expectativas antes de proponer un proyecto.',
    stops: [
      'guia/casos-reales',
      'guia/caso-atencion-cliente',
      'guia/caso-datos-analitica',
      'guia/caso-migraciones-codigo',
      'guia/caso-plataformas-internas',
      'guia/caso-investigacion-multiagente',
    ],
  },
]
