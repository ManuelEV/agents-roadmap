"""Módulo 03 · Checkpoints, reanudación e idempotencia.

    python 03_larga_duracion/checkpoints.py --morir-tras crear_ticket   # el proceso muere a mitad de la tarea
    python 03_larga_duracion/checkpoints.py --reanudar                  # continúa donde quedó: 1 solo ticket
    python 03_larga_duracion/checkpoints.py --reanudar --sin-idempotencia   # (repite el primer paso antes) 2 tickets

Hay dos cosas durables y se guardan en momentos distintos:
- runs/checkpoint.json  la conversación (`messages`). Se guarda después de cada respuesta del modelo
                        y después de cada tanda de tool_result.
- runs/entorno.json     «la base de datos»: lo que las herramientas cambiaron. Se guarda al ejecutar.

El proceso muere justo después de ejecutar la herramienta y antes de guardar su tool_result. Al
reanudar, el último mensaje es un tool_use sin respuesta, así que el loop repite la llamada con el
MISMO tool_use_id. Como el entorno usa ese id como clave de idempotencia, no crea un segundo ticket.
"""
import argparse
import json
import os
import sys
from pathlib import Path

from andes.agente import ejecutar_agente
from andes.herramientas import Entorno
from andes.llm import cliente

RUNS = Path(__file__).resolve().parent.parent / "runs"
CHECKPOINT, BD = RUNS / "checkpoint.json", RUNS / "entorno.json"
TAREA = ("Revisa mis pedidos 4821 y 5230. Después crea un ticket de prioridad media pidiendo que un ejecutivo "
         "me llame por el 5230. Al final dame un resumen de lo que hiciste.")


def guardar(ruta: Path, datos) -> None:
    RUNS.mkdir(exist_ok=True)
    tmp = ruta.with_suffix(".tmp")
    tmp.write_text(json.dumps(datos, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(ruta)  # escritura atómica: nunca queda un checkpoint a medias


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--morir-tras", metavar="HERRAMIENTA", help="mata el proceso después de ejecutar esta herramienta")
    ap.add_argument("--reanudar", action="store_true")
    ap.add_argument("--sin-idempotencia", action="store_true", help="olvida qué llamadas ya se ejecutaron")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")

    if args.reanudar:
        if not CHECKPOINT.exists():
            sys.exit("No hay checkpoint. Corre primero con --morir-tras crear_ticket.")
        mensajes = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        entorno = Entorno.desde_dict(json.loads(BD.read_text(encoding="utf-8")))
        if args.sin_idempotencia:
            entorno.ejecutadas = {}
        print(f"Reanudando desde el mensaje {len(mensajes)} · tickets en la base: {len(entorno.tickets)}")
    else:
        mensajes, entorno = [{"role": "user", "content": TAREA}], Entorno()
        guardar(BD, entorno.a_dict())

    def al_evento(p: dict) -> None:
        if p["tipo"] != "herramienta":
            print(f"  [modelo · turno {p['turno']} · {p['stop_reason']}]")
            return
        guardar(BD, entorno.a_dict())  # el efecto de la herramienta ya es durable…
        print(f"  ⚙ {p['nombre']}({json.dumps(p['entrada'], ensure_ascii=False)}) → {p['estado']}")
        if p["nombre"] == args.morir_tras:
            print("\n  ✗ Proceso muerto (simulado) antes de guardar el tool_result. Vuelve a correr con --reanudar.")
            os._exit(1)  # …pero la conversación todavía no sabe que se ejecutó

    res = ejecutar_agente(
        cliente(), entorno, mensajes, al_evento=al_evento,
        al_checkpoint=lambda m: guardar(CHECKPOINT, m),
    )
    print(f"\n{res.texto}\n")
    print(f"Tickets creados: {len(entorno.tickets)} · llamadas respondidas desde el registro de idempotencia: {entorno.repetidas}")
    print(res.uso.resumen())


if __name__ == "__main__":
    main()
