"""Módulo 01 · Andi de verdad: el loop de la lección contra la API real.

    python 01_agente_real/chat.py                              # chat interactivo
    python 01_agente_real/chat.py -p "¿Dónde está mi pedido 4821?"
    python 01_agente_real/chat.py --falla buscar_pedido -p "¿Dónde está mi pedido 4821?"

Muestra cada llamada a herramienta, pide tu aprobación antes de mover dinero o enviar correos,
y al final de cada turno imprime tokens, costo y latencia. La traza queda en runs/chat.jsonl.
"""
import argparse
import json
import sys
from pathlib import Path

from andes.agente import ejecutar_agente, guardar_traza
from andes.herramientas import Entorno
from andes.llm import MODEL, cliente

RUNS = Path(__file__).resolve().parent.parent / "runs"
GRIS, NARANJA, ROJO, FIN = "\033[90m", "\033[33m", "\033[31m", "\033[0m"


def mostrar_evento(p: dict) -> None:
    if p["tipo"] == "herramienta":
        color = NARANJA if p["estado"] == "ok" else ROJO
        print(f"\n{color}  ⚙ {p['nombre']}({json.dumps(p['entrada'], ensure_ascii=False)}) → {p['estado']} · {p['ms']} ms{FIN}")
        print(f"{GRIS}    {p['resultado'][:300]}{FIN}")
    else:
        print(f"{GRIS}  [turno {p['turno']} · {p['stop_reason']} · in {p['input']} / out {p['output']} tokens]{FIN}")


def aprobar(nombre: str, entrada: dict) -> bool:
    """Humano en el circuito: el loop se detiene aquí hasta que decidas."""
    print(f"\n{NARANJA}  Andi quiere ejecutar {nombre}: {json.dumps(entrada, ensure_ascii=False)}{FIN}")
    return input("  ¿Aprobar? [s/N] ").strip().lower() == "s"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("-p", "--pregunta", help="una sola pregunta y salir")
    ap.add_argument("--falla", action="append", default=[], metavar="HERRAMIENTA",
                    help="la próxima llamada a esta herramienta falla con timeout (repetible)")
    ap.add_argument("--effort", default="medium", choices=["low", "medium", "high"])
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")

    client, entorno, mensajes = cliente(), Entorno(), []
    for herramienta in args.falla:
        entorno.fallas[herramienta] = entorno.fallas.get(herramienta, 0) + 1
    print(f"Andi ({MODEL}) · cliente: {entorno.nombre_cliente} · pedidos 4821, 5102, 5230, 4790 · Ctrl+C para salir\n")

    while True:
        try:
            pregunta = args.pregunta or input("tú > ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        if not pregunta:
            continue
        mensajes.append({"role": "user", "content": pregunta})
        print("andi > ", end="", flush=True)
        res = ejecutar_agente(
            client, entorno, mensajes, effort=args.effort, aprobar=aprobar, al_evento=mostrar_evento,
            al_texto=lambda t: print(t, end="", flush=True),
        )
        if res.parada != "end_turn":
            print(f"\n{ROJO}  (el loop se detuvo por: {res.parada}){FIN}")
        print(f"\n{GRIS}  {res.uso.resumen()}" + (f" · primer token {res.uso.ttft:.2f} s" if res.uso.ttft else "") + f"{FIN}\n")
        guardar_traza(res, RUNS / "chat.jsonl", pregunta=pregunta)
        if args.pregunta:
            break

    if entorno.reembolsos or entorno.correos or entorno.tickets:
        print("Estado final del entorno:", json.dumps(
            {"reembolsos": entorno.reembolsos, "correos": entorno.correos, "tickets": entorno.tickets},
            ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
