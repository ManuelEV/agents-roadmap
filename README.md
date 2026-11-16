# Agents Roadmap

Plataforma interactiva en español para aprender a construir agentes de IA: de cómo piensa un LLM a un agente en producción, en la nube que uses.

Unifica tres sitios anteriores y agrega ecosistemas nuevos, organizados como un mapa de **líneas** con **paradas** y **transbordos**:

| Línea | Qué es | Origen |
|---|---|---|
| **Fundamentos** | Laboratorios que abren el mecanismo: tokens, RAG, el ciclo del agente, MCP, A2A, guardrails | `agents-workshop` |
| **Guía de referencia** | Artículos con diagramas paso a paso: patrones, frameworks, arquitecturas y casos reales | `agents-learning` |
| **Google Cloud** | ADK, Agent Runtime, Model Armor, Gemini Enterprise | `google-agents-ecosystem` |
| **AWS** | Strands Agents, Amazon Bedrock y AgentCore | nuevo |
| **Microsoft Azure** | Microsoft Foundry, Agent Framework, Entra Agent ID | nuevo |
| **Vercel** | AI SDK, AI Gateway y Workflow | nuevo |

Además:

- **Mapa de la red** en el inicio: una fila por línea, una estación por parada; al apuntar una estación se iluminan sus transbordos (el mismo tema en otras líneas).
- **Itinerarios**: eliges una necesidad ("entender cómo funciona", "construir en mi nube", "llevarlo a producción"…) y arma un viaje que cruza líneas.
- **Comparar** (`/comparar`): la misma pieza (framework, modelo, memoria, runtime, identidad, guardrails…) lado a lado en las cuatro plataformas.
- **Buscador global** (Ctrl/⌘ K) sobre todas las paradas.
- Todas las líneas de ecosistema cuentan la misma historia (Andes Market y su agente Andi) para que se puedan comparar.

## Desarrollo

Requiere Node 22+ y pnpm.

```bash
pnpm install
pnpm dev          # http://localhost:5200
pnpm typecheck
pnpm build        # tsc + vite build → dist/
pnpm preview
```

Verificación visual y de interacción (necesitan `pnpm dev` corriendo y Chrome instalado; `CHROME_PATH` si no está en la ruta por defecto):

```bash
pnpm visual                    # captura todas las páginas (claro/oscuro, 1280 y 390 px) en scripts/shots/
pnpm visual aws                # una línea
pnpm visual aws/desplegar      # una parada
pnpm fuzz                      # avanza todos los players y pulsa todos los botones; reporta errores
pnpm ux                        # auditoría de UX en teléfono: respuestas fuera de pantalla, objetivos táctiles, texto diminuto (--desktop para escritorio)
pnpm check:content             # valida los diagramas y el MDX de la guía
```

## Desplegar en Cloudflare

El sitio es una SPA estática servida como Worker de solo assets (`wrangler.jsonc`: carpeta `dist/`, `not_found_handling: "single-page-application"`).

```bash
pnpm exec wrangler login       # una vez
pnpm deploy                    # pnpm build && wrangler deploy
```

Con Workers Builds (Git): comando de build `pnpm build`, comando de despliegue `npx wrangler deploy`. `public/_headers` define caché inmutable para `/assets/*` y cabeceras de seguridad.

## Estructura

```
src/
  catalog/        líneas, paradas, temas (transbordos), itinerarios y datos del comparador
  components/     sistema de componentes compartido (labs, consola simulada, terminal, diagramas, navegación)
  tracks/<línea>/<slug>/   lecciones interactivas (meta.ts, index.tsx, data.ts, lesson.css)
  guide/          artículos MDX, diagramas isométricos y sus componentes
  sim/            datos simulados (Andes Market) compartidos por las lecciones
  pages/          inicio, línea, parada, comparar, referencias
  styles/         base.css (sistema visual), platform.css, app.css, guide*.css
docs/
  AUTHORING.md    reglas para escribir lecciones y artículos
  research/       fichas de hechos verificados por ecosistema (fuente de verdad del contenido)
examples/         código ejecutable de las líneas Fundamentos y Google Cloud
```

Para escribir o editar contenido, lee `docs/AUTHORING.md`.

## Qué es real y qué es simulado

Comandos, APIs, nombres de productos, formatos de eventos y precios son reales y salen de la documentación oficial; cada línea indica su fecha de verificación (Fundamentos y Guía: octubre de 2026; ecosistemas: noviembre de 2026). Las pantallas de consola, los terminales y las respuestas de los modelos son simulaciones didácticas. No es un sitio de Google, AWS, Microsoft ni Vercel.
