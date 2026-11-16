# Guía de autoría · Agents Roadmap

Plataforma **interactiva** (en español) para aprender a construir agentes de IA. Reúne tres sitios anteriores y suma ecosistemas:

| Línea (`track`) | Tipo | Carpeta | Origen |
|---|---|---|---|
| `fundamentos` | laboratorios | `src/tracks/fundamentos/<slug>/` | agents-workshop |
| `guia` | artículos MDX con diagramas | `src/guide/content/<slug>.{mdx,meta.ts}` | agents-learning |
| `google` | laboratorios | `src/tracks/google/<slug>/` | google-agents-ecosystem |
| `aws`, `azure`, `vercel` | laboratorios | `src/tracks/<línea>/<slug>/` | nuevas (nov-2026) |

Ruta de toda parada: `/<línea>/<slug>`. El catálogo (`src/catalog/`) registra las lecciones solo: basta crear la carpeta con `meta.ts` e `index.tsx`.

Stack: React 19 + Vite 8 + TypeScript 7 + React Router 8 + Motion 14 (pnpm). Iconos: `lucide-react`. Los labs usan **solo SVG + CSS + hooks propios** (sin librerías de gráficos). Alias de imports: `@/` = `src/`.

## Fuente de verdad

| Línea | Archivo |
|---|---|
| google | `docs/research/google-agent-platform-2026-11.md` |
| aws | `docs/research/aws-2026-11.md` |
| azure | `docs/research/azure-2026-11.md` |
| vercel | `docs/research/vercel-2026-11.md` |
| guía / fundamentos | `docs/research/guia/*.md` |

Todo nombre de producto, comando, flag, import, clase, campo de consola, id de modelo o precio tiene que salir de ahí. **Si no está, no lo inventes.** Cada archivo trae una sección **"A confirmar"**: nada de esa lista se afirma en una lección; si necesitas mencionarlo, dilo como "a confirmar en la documentación". Los precios se muestran siempre con su fecha. Cada lección cierra con `<Sources items=[...] />` apuntando a las páginas oficiales que usó (las URL están en el archivo de investigación).

## Idioma y tono

- Español neutro latinoamericano, **tuteo**. Técnico y directo, sin relleno ("En esta lección veremos…" ✗).
- Párrafos de 2–4 frases que preparan lo que el lab muestra. **El lab es el protagonista.**
- Honestidad con la simulación: consolas, terminales y respuestas de modelos son simuladas → dilo con `<ConsoleDisclaimer />` (footer del lab) o un `<Callout tone="info">`. Los comandos, APIs y formatos son reales.
- Nombres actuales de producto; el nombre anterior, una vez y entre paréntesis.
- No copies el logo ni la tipografía de ninguna marca. No es un sitio de Google, AWS, Microsoft ni Vercel.

## Un solo escenario: Andes Market

Todas las líneas de ecosistema cuentan **la misma historia** para que se puedan comparar: Andes Market (retail online chileno ficticio) y su agente de operaciones **Andi** (`andes_ops`). Clienta: Camila Rojas (`cus_7781`). Pedidos: **4821** (en ruta, AndesExpress `AX-88213-CL`), **5102** (preparando), **4790** (entregado, polar de $29.990). Herramientas de negocio: `get_order_status(order_id)`, `track_shipment(tracking)`, `get_stock(sku)`, `request_refund(order_id, amount_clp, reason)` (sobre $50.000 CLP requiere aprobación de un supervisor).

```ts
import { COMPANY, AGENT_NAME, AGENT_DISPLAY, CUSTOMER, ORDERS, INVENTORY, REFUND_POLICY, ROOT_INSTRUCTION, ANDES_TOOLS, orderById, runTool, fmtUsd, fmtClp, fmtInt, pct, clamp, rng } from '@/sim/andes'
```

`runTool(name, args)` devuelve el resultado simulado de cada herramienta (úsalo para que los datos coincidan entre líneas). Los identificadores propios de una plataforma (cuenta, región, ARN, endpoint…) van en el `data.ts` de la lección, con el formato que indique el archivo de investigación.

En una línea de ecosistema, **enseña lo propio de esa plataforma** y enlaza lo genérico: si necesitas explicar qué es MCP o el ciclo del agente, una frase y un enlace (`<Link to="/fundamentos/mcp">`) bastan. Cuando una pieza tenga equivalente en otra nube, dilo en una línea ("lo que en Google es Agent Runtime").

## Archivos de una lección

```
src/tracks/<línea>/<slug>/
  meta.ts     ← export const meta: LessonMeta
  index.tsx   ← export default function Lesson() { ... }
  *.tsx       ← sub-labs (recomendado si index.tsx > 400 líneas)
  data.ts     ← datos/guiones de la lección
  lesson.css  ← estilos propios; prefija TODAS las clases con `<línea>-<slug corto>-` (p. ej. `.aws-dep-`)
```

```ts
// meta.ts
import type { LessonMeta } from '@/catalog/types'

export const meta: LessonMeta = {
  slug: 'primer-agente',        // igual al nombre de la carpeta
  module: 'construir',          // id de un módulo de la línea (src/catalog/tracks.ts)
  order: 1,                     // orden dentro del módulo
  title: 'Tu primer agente con Strands: Andi responde por un pedido',
  short: 'Tu primer agente',    // barra lateral
  summary: '1–2 frases: qué vas a entender.',
  minutes: 16,
  concepts: ['Agent', '@tool', 'BedrockModel'],   // chips de la cabecera (4–7)
  topics: ['ciclo', 'herramientas'],              // temas para los transbordos (TopicId en src/catalog/types.ts)
}
```

La cabecera (título, resumen, chips), los transbordos y la navegación los genera `StopPage`. Tu componente devuelve solo el cuerpo: una secuencia de `<Section>`.

**No edites** archivos fuera de tu carpeta (`src/components`, `src/sim`, `src/styles`, `src/catalog`, otras lecciones). Si necesitas algo compartido, impleméntalo localmente.

## Estructura recomendada

1. `Section n={1}` — la idea en 1–3 párrafos + un lab "de intuición" (diagrama clicable, comparación).
2. `Section n={2..4}` — cómo se hace: **un lab paso a paso** (`usePlayer` + `PlayerBar` + `Narration`) que anime el mecanismo con datos concretos (consola simulada, terminal, eventos, diagrama con paquetes viajando) y labs para jugar (segmented, sliders, toggles).
3. Una sección práctica: código real (10–50 líneas) con `<Code>` resaltando líneas sincronizadas con los pasos (`linesOf`), trade-offs (tabla `.tbl`), errores comunes (`<Callout tone="warn">`).
4. Cierra con `<KeyIdeas items={[...]} />` y `<Sources items={[...]} />`.

Mínimo **3 labs** por lección, al menos **uno animado paso a paso** y, cuando aplique, **uno con la consola simulada o el terminal**. Lección de referencia para imitar en forma y profundidad: `src/tracks/google/primer-agente/` (y `src/tracks/google/desplegar/` para consola + terminal).

## Componentes compartidos

```tsx
import { Section, Lab, Callout, KeyIdeas, Term, Pill, Panel, Segmented, Slider, Tabs, Toggle, BarRow, Stat, Checklist, DocLink, Sources, toneVar, type Tone } from '@/components/ui'
import { Code, Json, linesOf } from '@/components/Code'
import { PlayerBar, Narration, type StepInfo } from '@/components/Player'
import { FlowDiagram, type FlowNode, type FlowEdge } from '@/components/Flow'
import { CloudConsole, Focus, ConsoleField, ConsoleButton, ConsoleCheck, ConsoleCard, ConsoleTable, ConsoleSteps, ConsoleBanner, ConsoleStatus, ConsoleDisclaimer } from '@/components/Console'
import { Terminal, useTerminalPlayer, cmd, out, ok, err, dim, warn, comment, blank, type TermLine } from '@/components/Terminal'
import { usePlayer, useTypewriter, useCountUp } from '@/lib/hooks'
import { Link } from 'react-router'
```

| Componente | Uso |
|---|---|
| `<Section n title id?>` | bloque numerado con `<h2>`. Dentro: `<p>`, `<h3>`, listas, labs. |
| `<Lab title hint? badge? footer?>` | panel interactivo enmarcado. `hint` = instrucción breve ("Reproduce o haz clic en un paso"). |
| `<Callout tone="info\|tip\|warn\|danger\|ok" title?>` | nota destacada. |
| `<KeyIdeas items />`, `<Sources items={[{label, href}]} />` | cierre. |
| `<Term tip>` | glosario al pasar el mouse. `<DocLink href>` enlace a doc oficial. |
| `<Pill tone mono?>`, `<Panel title tone right?>`, `<Stat>`, `<BarRow>` | piezas de UI. |
| `<Segmented>`, `<Slider>`, `<Tabs numbered?>`, `<Toggle>` | controles. |
| `<Checklist items current />` | pasos con estado hecho/actual/pendiente. |
| `<Code code lang title highlight dim maxHeight />` | código; `lang`: python, ts, js, json, bash, yaml, sql, toml, http, text. `linesOf(code, 'texto')` encuentra líneas para `highlight`. |
| `usePlayer(n, {interval})` + `<PlayerBar player labels />` + `<Narration steps step />` | animación por pasos. |
| `<FlowDiagram nodes edges width height flows active dimInactive onNodeClick />` | diagrama SVG; `flows={['a>b']}` anima un paquete. Nodos aceptan `cls` ("is-outside" borde discontinuo) y `badge`. Se lee mejor a ancho completo; pon la narración debajo, no al lado. |
| `<CloudConsole brand="aws\|azure\|vercel\|google" title product nav activeNav url crumbs tabs activeTab project>` | **consola web simulada** de la plataforma. `url` es la ruta después del dominio; `project` es lo que muestra el selector (proyecto, región o cuenta). Dentro: `ConsoleField` (label, value, kind text/select/textarea/code, `focus`), `ConsoleButton` (primary, `focus`), `ConsoleCheck`, `ConsoleCard`, `ConsoleTable`, `ConsoleSteps`, `ConsoleBanner`, `ConsoleStatus`. `focus` dibuja un anillo pulsante + cursor: úsalo para indicar qué toca el paso actual. Cierra el lab con `<ConsoleDisclaimer />` en `footer`. Usa solo nombres de menú y campos que estén en la investigación. |
| `<Terminal lines upTo typed title player footer />` + `useTerminalPlayer(lines)` | terminal animado: `cmd()` se tipea, `out/ok/err/dim/warn/comment` aparecen línea a línea. |

Para mostrar eventos o mensajes del SDK de tu línea, arma una lista local con las clases compartidas `.evs` / `.ev` (`data-tone`, `.ev-head`, `.ev-tag`, `.ev-time`, `.ev-text`, `.ev-block`, `.ev-code`) o `.msgs` / `.msg`; `EventList` de `@/components/Events` solo entiende el formato de eventos de ADK. Para el chat que ve el usuario: `.chat`, `.chat-msg` (`.is-user`), `.chat-bubble`.

### Colores semánticos (`tone`) — úsalos siempre igual

`user` (azul) usuario · `model` (violeta) LLM/agentes · `tool` (naranja) herramientas · `data` (verde) datos/bases · `memory` (rosa) memoria/estado · `guard` (ámbar) guardrails/seguridad · `system` (gris) plataforma/infra · `error` · `ok` · `accent`.

En CSS: `var(--c-user)`, … o `data-tone="tool"` y luego `var(--tone)`. Superficies `--bg`, `--bg-elev`, `--bg-sunken`, `--bg-inset`; texto `--text`, `--text-2`, `--text-3`; bordes `--border`, `--border-strong`; acento `--accent`, `--accent-soft`, `--on-accent`; fuentes `--font-sans`, `--font-mono`, `--font-display`; radios `--radius` (14px), `--radius-lg` (22px). El color de cada línea (`--line-aws`, …) es identidad de la línea: no lo uses como tono de actor. **Nunca hardcodees hex**: debe funcionar en tema claro y oscuro.

### Clases utilitarias

`.row`, `.stack`, `.grid-2`, `.grid-3`, `.split`, `.label`, `.muted`, `.mono`, `.small`, `.tabular`, `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-sm`, `.input`, `.textarea`, `.select`, `.table-wrap` + `table.tbl` (`tr.is-hl`, `td.num`), `.cmp`/`.cmp-row > .k` (comparativa), `.anim-in`, `.anim-fade`, `.caret`.

## Sistema visual

Dos skills guiaron el diseño: `apple-design` de dickwu (HIG: materiales, Liquid Glass, color) y `apple-design` de emilkowalski (movimiento fluido; está en `.claude/skills/apple-design`). Reglas que una lección debe respetar:

- **Dos capas.** El vidrio (`.glass`) es solo para la capa funcional: barra superior, barra lateral, cajón móvil y buscador. **No uses `backdrop-filter` ni `.glass` dentro de una lección**: labs, paneles y código son superficies opacas (`--bg-elev`).
- **La navegación es monocroma; el color es del contenido.** Los tonos pertenecen a los actores del agente. `--accent` queda para la acción principal, enlaces, foco y líneas de código resaltadas. Texto sobre `--accent`: `var(--on-accent)`, nunca `#fff`.
- **Firma: las líneas.** La plataforma es un mapa de líneas con paradas y transbordos. `--page-tone` es el tono del módulo de la lección actual y `--line` el color de la línea.
- **Tipografía.** Google Sans Flex (texto y títulos) y Google Sans Code (código y datos). Sin mayúsculas forzadas en títulos de panel: muchos son identificadores.
- **Sin barras de acento laterales** (`border-left: 4px solid …`). Para marcar un tono usa borde completo tenue (`color-mix(in srgb, var(--tone) 34%, var(--border))`), fondo teñido (7–10 %) o un punto de color.
- **Formas.** Botones y segmentados en cápsula; radios concéntricos: lab 22 px → panel/código 14 px → piezas internas 8–12 px.
- **Movimiento.** Respuesta al presionar, no al soltar (`:active { transform: scale(0.97) }` ya viene en `.btn`). Anima solo `transform` y `opacity`. Entrada y salida por el mismo camino. Las animaciones deben poder interrumpirse: nunca bloquees clics mientras algo se anima. Rebote solo cuando hubo un gesto con impulso; lo demás, sin rebote. `prefers-reduced-motion` ya se respeta globalmente: no lo desactives.
- Los tonos del tema claro cumplen ≥ 4.5:1 como texto. Si agregas un color, mídelo.
- `.term` es el terminal (`div.term`) **y** el glosario (`span.term`): no reutilices ese nombre de clase. Tampoco `.callout`, `.badge`, `.card`, `.prose`, `.steps`.

## Calidad

- Animaciones con propósito: cada paso muestra **qué cambia y dónde** (resalta el elemento activo, atenúa el resto). En la consola simulada, un `focus` por paso.
- Responsive desde ~360 px (`.split`, `.grid-2`, SVG con `viewBox`). Sin scroll horizontal de página.
- No uses `alert/confirm/prompt`. Accesibilidad: `aria-label` en SVG, botones con texto o `aria-label`.
- TypeScript estricto con `noUnusedLocals` y `noUnusedParameters`: no dejes imports ni variables sin usar.

## Validación

```bash
pnpm typecheck                    # 0 errores
pnpm dev                          # http://localhost:5200/<línea>/<slug>
pnpm visual <línea>/<slug>        # capturas en scripts/shots/ (claro/oscuro, 1280 y 390 px); reporta desbordes y errores
pnpm fuzz <línea>/<slug>          # avanza todos los players y pulsa todos los botones; reporta errores
pnpm check:content                # valida diagramas y MDX de la guía
```

`pnpm visual` y `pnpm fuzz` necesitan el servidor de desarrollo corriendo y Chrome instalado (`CHROME_PATH` si no está en la ruta por defecto). **Abre las capturas y míralas**: que no falle no significa que se vea bien.

## Guía (artículos MDX)

`src/guide/content/<slug>.mdx` + `<slug>.meta.ts` (`PostMeta`: sección, orden, minutos, nivel, tags, referencias). Componentes disponibles en MDX: `<Callout type>`, `<Cards cols>` / `<Card title tag href>`, `<CodeTabs labels>`, `<Diagram id | ids>`, `<Steps>`, `<Badge tone>`, `<KeyPoints>`, `<Roadmap />`. Los diagramas paso a paso viven en `src/guide/diagrams/*.ts` (especificación declarativa `IsoSpec`); `node scripts/check-diagrams.mjs` regenera el manifiesto. Los temas de cada artículo para los transbordos se declaran en `src/catalog/topics.ts`.
