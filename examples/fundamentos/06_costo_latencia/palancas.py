"""Módulo 06 · Las palancas de costo y latencia, medidas sobre la misma conversación.

    python 06_costo_latencia/palancas.py

Corre el mismo guion de 3 turnos con cuatro configuraciones y compara tokens, costo, tiempo total,
tiempo al primer token y si la tarea se resolvió. El system prompt lleva toda la base de conocimiento
pegada (≈ 2.000 tokens) para que el prefijo sea grande, como en un agente real con muchas instrucciones.

Qué mirar:
- Caché: el input «normal» baja y aparece input leído de caché, que cuesta una fracción.
  La primera llamada ESCRIBE la caché (1,25 ×): solo conviene si el prefijo se reutiliza.
- Effort: menos razonamiento y menos tokens de salida. Es lo primero que hay que probar antes de cambiar de modelo.
- Modelo rápido: mucho más barato y veloz; la columna «ok» dice si la calidad aguantó EN ESTE guion.
  Para decidir de verdad, corre la suite del módulo 02 con ANDES_MODEL=<modelo>.
"""
import sys

from andes.agente import ejecutar_agente, system_prompt
from andes.herramientas import Entorno
from andes.llm import MODEL, MODEL_RAPIDO, Uso, cliente

GUION = [
    ("¿Dónde está mi pedido 4821?", lambda t, e: "Chilexpress" in t),
    ("¿Y hasta cuándo puedo devolverlo si no me queda bien?", lambda t, e: "30" in t),
    ("Cambia la dirección del pedido 5102 a Los Leones 250, Providencia.", lambda t, e: "Los Leones 250" in e.pedidos["5102"]["direccion"]),
]

VARIANTES = [
    ("base: sin caché, effort high", dict(model=MODEL, effort="high", cache=False)),
    ("+ prompt caching", dict(model=MODEL, effort="high", cache=True)),
    ("+ effort low", dict(model=MODEL, effort="low", cache=True)),
    (f"{MODEL_RAPIDO} + caché + low", dict(model=MODEL_RAPIDO, effort="low", cache=True)),
]


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    client = cliente()
    filas = []
    for i, (nombre, config) in enumerate(VARIANTES):
        entorno, uso, mensajes, aciertos = Entorno(), Uso(), [], 0
        conocimiento = "\n".join(f"[{d['source']}] {p}" for d in entorno.kb for p in d["paragraphs"])
        # La primera línea distinta aísla la caché de cada variante: sin ella, una variante leería la
        # caché que escribió la anterior y la comparación sería injusta.
        system = f"[variante {i}]\n{system_prompt(entorno)}\n\nBase de conocimiento completa:\n{conocimiento}"
        for pregunta, correcto in GUION:
            mensajes.append({"role": "user", "content": pregunta})
            res = ejecutar_agente(client, entorno, mensajes, system=system, uso=uso, al_texto=lambda _: None, **config)
            aciertos += bool(correcto(res.texto, entorno))
        filas.append((nombre, uso, aciertos))
        print(f"  listo: {nombre}")

    print(f"\n{'configuración':<34}{'llam.':>6}{'input':>8}{'caché↓':>8}{'caché↑':>8}{'output':>8}{'US$':>10}{'total s':>9}{'1.er tok':>9}{'ok':>5}")
    for nombre, uso, aciertos in filas:
        print(f"{nombre:<34}{uso.llamadas:>6}{uso.total('input'):>8}{uso.total('cache_lectura'):>8}{uso.total('cache_escritura'):>8}"
              f"{uso.total('output'):>8}{uso.costo():>10.5f}{uso.segundos:>9.1f}{(uso.ttft or 0):>9.2f}{aciertos:>3}/{len(GUION)}")
    base = filas[0][1].costo()
    print("\nCosto relativo a la base: " + " · ".join(f"{n}: {u.costo() / base:.0%}" for n, u, _ in filas[1:]))
    print("caché↓ = tokens leídos de caché · caché↑ = tokens escritos a caché · 1.er tok = espera hasta el primer texto de la primera respuesta")


if __name__ == "__main__":
    main()
