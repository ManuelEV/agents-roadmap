"""Módulo 03 · Compactación: qué hacer cuando la conversación ya no cabe (o sale cara).

    python 03_larga_duracion/compactacion.py                 # compactación propia, umbral 2500 tokens
    python 03_larga_duracion/compactacion.py --umbral 100000 # sin compactar: compara tokens y respuesta final
    python 03_larga_duracion/compactacion.py --servidor      # compactación del lado del servidor (beta)

Compactación propia («simple»): cuando el contexto supera el umbral, se le pide al modelo un resumen
y la conversación se REEMPLAZA entera por ese resumen. No se conservan turnos viejos al lado del
resumen: los modelos actuales validan que el historial que acompaña a sus bloques de razonamiento no
haya sido editado, y «resumen + últimos turnos tal cual» rompe esa validación. Si necesitas conservar
turnos, usa la compactación del servidor, que no cuenta como edición.

La última pregunta depende de un dato del primer turno: sirve para ver qué sobrevivió al resumen.
"""
import argparse
import sys

from andes.agente import ejecutar_agente, system_prompt
from andes.herramientas import TOOLS, Entorno
from andes.llm import MODEL, Uso, cliente, crear, texto_de

GUION = [
    "Hola. Antes de empezar: si me tienen que llamar, que sea después de las 18:00. ¿Dónde está mi pedido 4821?",
    "¿Y el 5102? Cámbiale la dirección a Los Leones 250, Providencia.",
    "¿Cuánto demora un reembolso con tarjeta de crédito?",
    "¿Qué garantía tienen las zapatillas del 4821?",
    "¿Puedo pagar en cuotas una compra nueva?",
    "Crea un ticket para que me llamen por el pedido 5230. Indica en el ticket el horario en que prefiero que me llamen.",
]

INSTRUCCION_RESUMEN = """Voy a reemplazar esta conversación por un resumen. Escríbelo ahora, sin llamar herramientas.
Incluye: preferencias y datos que dio el cliente, estado actual de cada pedido consultado, acciones ya
ejecutadas (con sus identificadores) y temas pendientes. Omite saludos y texto de las políticas ya citadas."""


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--umbral", type=int, default=2500, help="tokens de contexto a partir de los cuales se compacta")
    ap.add_argument("--servidor", action="store_true")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")

    client, entorno, uso, mensajes = cliente(), Entorno(), Uso(), []
    system = system_prompt(entorno)
    extra, betas = None, ()
    if args.servidor:
        # El servidor resume solo cuando el input se acerca al umbral (150K tokens por defecto) y devuelve
        # un bloque `compaction` que hay que reenviar tal cual; a_params() ya conserva todos los bloques.
        # Con este guion corto no llega a dispararse: lo que muestra es cómo se conecta.
        extra, betas = {"context_management": {"edits": [{"type": "compact_20260112"}]}}, ("compact-2026-01-12",)

    for pregunta in GUION:
        mensajes.append({"role": "user", "content": pregunta})
        res = ejecutar_agente(client, entorno, mensajes, system=system, aprobar=lambda *_: True, uso=uso,
                              extra=extra, betas=betas)
        contexto = sum(m["input"] + m["cache_lectura"] + m["cache_escritura"] for m in uso.por_modelo.values())
        # Tamaño del contexto = input de la ÚLTIMA llamada (cada llamada reenvía todo el historial).
        ultimo = client.messages.count_tokens(model=MODEL, system=system, tools=TOOLS, messages=mensajes).input_tokens
        print(f"\ntú  > {pregunta}\nandi> {res.texto}\n      [contexto: {ultimo} tokens · {len(mensajes)} mensajes · input acumulado {contexto}]")

        if not args.servidor and ultimo > args.umbral:
            # Mismo system y mismas tools que el agente: el resumen lee el prefijo desde la caché.
            resumen = crear(client, uso=uso, model=MODEL, max_tokens=4000, system=system, tools=TOOLS,
                            cache_control={"type": "ephemeral"}, output_config={"effort": "low"},
                            messages=mensajes + [{"role": "user", "content": INSTRUCCION_RESUMEN}])
            texto = texto_de(resumen.content)
            mensajes.clear()
            mensajes.append({"role": "user", "content": f"<resumen_de_la_conversacion_anterior>\n{texto}\n</resumen_de_la_conversacion_anterior>"})
            mensajes.append({"role": "assistant", "content": "Entendido, continúo desde ese resumen."})
            despues = client.messages.count_tokens(model=MODEL, system=system, tools=TOOLS, messages=mensajes).input_tokens
            print(f"\n  ── compactado: {ultimo} → {despues} tokens ──\n{texto}\n  ──")

    print(f"\nTicket creado: {entorno.tickets}")
    print("¿El ticket menciona «después de las 18:00»? Ese dato solo estaba en el primer mensaje.")
    print(uso.resumen())


if __name__ == "__main__":
    main()
