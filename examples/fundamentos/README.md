# Ejemplos · Andi contra un modelo real

Las lecciones del taller muestran el mecanismo con datos simulados. Aquí el mismo agente (*Andi*, soporte de Andes Market) corre contra la **API real de Claude**: el modelo decide de verdad, a veces se equivoca, las herramientas fallan y cada llamada cuesta tokens. Son seis módulos, uno por cada cosa que la simulación no puede enseñar.

**Qué es real y qué no.** Reales: las llamadas al modelo, el loop, los formatos (`tool_use` / `tool_result`, `stop_reason`, `usage`), la búsqueda BM25, el navegador que maneja el agente. Simulados: los pedidos, la base de conocimiento y los «sistemas» de Andes Market (viven en memoria, en `andes/herramientas.py`). Cada corrida gasta créditos de tu cuenta; todos los scripts imprimen tokens y costo al terminar.

| Módulo | Qué aprendes | Lección relacionada |
|---|---|---|
| [`01_agente_real/`](01_agente_real/chat.py) | El loop escrito a mano con todo lo que exige un modelo real: streaming, todos los `stop_reason`, errores de herramienta, aprobación humana, traza con costo | El ciclo del agente · Herramientas |
| [`02_evals/`](02_evals/correr.py) | Una suite de evals: casos, graders en código sobre trayectoria y estado final, juez LLM, calibración del juez contra etiquetas humanas, regresiones para CI | Trazas, costos y evaluación |
| [`03_larga_duracion/`](03_larga_duracion/checkpoints.py) | Checkpoints y reanudación con idempotencia, compactación de contexto, sub-agentes, sandbox de ejecución de código | Ventana de contexto · Memoria · Patrones multi-agente |
| [`04_red_team/`](04_red_team/correr.py) | Atacar a tu propio agente (inyección directa, vía RAG y vía resultado de herramienta) y medir la tasa de éxito con y sin defensas en capas | Guardrails y prompt injection |
| [`05_computer_use/`](05_computer_use/agente_navegador.py) | Un agente que opera una aplicación web mirando capturas de pantalla; lectura de PDF con extracción validada y citas | — |
| [`06_costo_latencia/`](06_costo_latencia/palancas.py) | El efecto medido de prompt caching, `effort`, cambio de modelo y batch sobre la misma tarea | Trazas, costos y evaluación |

## Instalar

Python ≥ 3.11. Desde esta carpeta (`examples/`):

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1            # macOS/Linux: source .venv/bin/activate
pip install -e ".[navegador,dev]"     # «navegador» solo hace falta para el módulo 05
Copy-Item .env.example .env           # y pega tu ANTHROPIC_API_KEY (https://platform.claude.com)
pytest                                # 18 pruebas offline: no usan la API ni gastan nada
```

El módulo 05 usa tu Chrome instalado; si no tienes, corre `playwright install chromium`.

El modelo por defecto es `claude-sonnet-5-5` (el `MODEL_ID` de las lecciones) y `claude-haiku-5-5` para el juez, los sub-agentes y la variante barata. Se cambian con `ANDES_MODEL` y `ANDES_MODEL_RAPIDO`.

## Recorrido

Corre siempre desde `examples/`. Cada script explica en su cabecera qué mirar (`--help`).

### 01 · El agente real

```powershell
python 01_agente_real/chat.py
python 01_agente_real/chat.py --falla buscar_pedido -p "¿Dónde está mi pedido 4821?"
```

Prueba: pedir un reembolso del 4790 y rechazarlo cuando te pida aprobación; preguntar por el pedido 6001 (es de otro cliente); cambiar la dirección del 4821 (ya despachado). Después abre `runs/chat.jsonl` y lee la traza. El loop está en [`andes/agente.py`](andes/agente.py): son ~100 líneas y todo el resto de los módulos lo reutiliza.

### 02 · Evals

```powershell
python 02_evals/calibrar_juez.py          # primero: ¿el juez califica como una persona?
python 02_evals/correr.py --n 3           # la suite, 3 intentos por caso
python 02_evals/correr.py --guardar-baseline
# cambia algo (el system prompt en andes/agente.py, o $env:ANDES_MODEL="claude-haiku-5-5") y:
python 02_evals/correr.py --n 3 --baseline
```

Los casos están en [`casos.jsonl`](02_evals/casos.jsonl). Lo importante es el orden de confianza: estado final del entorno > trayectoria > texto > juez. Ejercicio: agrega un caso por cada fallo que hayas visto en el chat del módulo 01.

### 03 · Agentes de larga duración

```powershell
python 03_larga_duracion/checkpoints.py --morir-tras crear_ticket
python 03_larga_duracion/checkpoints.py --reanudar
python 03_larga_duracion/compactacion.py
python 03_larga_duracion/subagentes.py
python 03_larga_duracion/subagentes.py --sin-subagentes
python 03_larga_duracion/sandbox.py
```

### 04 · Red team

```powershell
python 04_red_team/correr.py --ver exfiltracion_por_correo   # una traza, con y sin defensas
python 04_red_team/correr.py --n 5                           # la tabla completa
```

Los ataques apuntan solo a este agente y a su entorno simulado. La lección está en [`defensas.py`](04_red_team/defensas.py): las capas que funcionan son las que no dependen del modelo. El secreto plantado en el system prompt existe para medir fugas; la defensa real es no poner secretos ahí. Ejercicio: escribe un ataque nuevo que pase las defensas y luego la defensa que lo detiene.

### 05 · Computer use y documentos

```powershell
python 05_computer_use/agente_navegador.py --visible
python 05_computer_use/documentos.py
```

El navegador está aislado: solo puede cargar `backoffice.html`. Las capturas de cada paso quedan en `runs/navegador/`.

### 06 · Costo y latencia

```powershell
python 06_costo_latencia/palancas.py
python 06_costo_latencia/batch.py
```

## Estructura

```
andes/                paquete compartido
  datos.py  kb.json   pedidos y base de conocimiento (los mismos de src/sim/)
  busqueda.py         BM25
  herramientas.py     definiciones de tools + Entorno (estado, validación, fallas inyectables, idempotencia)
  llm.py              cliente, modelos, precios, medición de uso y costo
  agente.py           el loop
01_… 06_…             un módulo por tema; cada script se corre directo
tests/                pruebas offline con un cliente falso
runs/                 trazas, checkpoints, capturas y resultados (fuera de git)
```

## Lo que no está

Voz en tiempo real (la API de Claude no tiene un endpoint de audio en vivo; el lugar natural es la Live API de Gemini, en `google-agents-ecosystem`), GraphRAG, text-to-SQL, interfaces generativas (AG-UI) y evaluación online con feedback de usuarios reales.

> Si un rechazo de seguridad (`stop_reason: "refusal"`) corta una respuesta, los scripts piden al servidor reintentar en otro modelo (`fallbacks: "default"`, beta). Se desactiva con `ANDES_FALLBACKS=0`.
