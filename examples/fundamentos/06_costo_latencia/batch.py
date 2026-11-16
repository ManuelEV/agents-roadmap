"""Módulo 06 · Batch: 50 % de descuento a cambio de no tener la respuesta al instante.

    python 06_costo_latencia/batch.py              # envía el lote y espera el resultado
    python 06_costo_latencia/batch.py --id msgbatch_...   # retoma un lote ya enviado

Clasifica 12 tickets de soporte en un solo lote. Sirve para todo lo que no tiene a una persona
esperando: clasificar el backlog, correr evals de noche, re-etiquetar históricos. La mayoría de los
lotes termina en minutos, pero el plazo garantizado es de 24 horas.
"""
import argparse
import json
import sys
import time

from anthropic.types.message_create_params import MessageCreateParamsNonStreaming
from anthropic.types.messages.batch_create_params import Request

from andes.llm import MODEL_RAPIDO, PRECIOS, cliente

TICKETS = [
    "Me llegó la parka con el cierre roto, quiero cambiarla.",
    "¿Puedo pagar con dos tarjetas distintas?",
    "Llevo 10 días esperando el pedido 5230 y nadie responde. Voy a reclamar al SERNAC.",
    "No puedo entrar a mi cuenta, dice contraseña incorrecta.",
    "¿Hacen despacho a Punta Arenas?",
    "Me cobraron dos veces la misma compra en la tarjeta.",
    "Quiero cambiar la talla de las zapatillas, pedí 40 y necesito 41.",
    "¿Cuándo vuelven a tener stock de la mochila urbana?",
    "El courier dice que entregó pero yo no recibí nada.",
    "Necesito factura con el RUT de mi empresa para una compra de ayer.",
    "La app se cierra sola cuando abro el carrito.",
    "Gracias, el pedido llegó perfecto y antes de lo esperado.",
]

ESQUEMA = {
    "type": "object",
    "properties": {
        "categoria": {"type": "string", "enum": ["despacho", "devolucion_garantia", "pagos", "cuenta", "producto", "otro"]},
        "urgencia": {"type": "string", "enum": ["baja", "media", "alta"]},
        "resumen": {"type": "string"},
    },
    "required": ["categoria", "urgencia", "resumen"],
    "additionalProperties": False,
}
SYSTEM = ("Clasificas tickets de soporte de un retail online. Urgencia alta: dinero cobrado de más, pedido perdido "
          "o amenaza de reclamo formal. El resumen va en una frase de máximo 12 palabras.")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--id", help="id de un lote ya enviado")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    client = cliente()

    if args.id:
        lote_id = args.id
    else:
        lote = client.messages.batches.create(requests=[
            Request(custom_id=f"ticket-{i:02d}", params=MessageCreateParamsNonStreaming(
                model=MODEL_RAPIDO, max_tokens=500, system=SYSTEM, output_config={"effort": "low", "format": {"type": "json_schema", "schema": ESQUEMA}},
                messages=[{"role": "user", "content": ticket}],
            ))
            for i, ticket in enumerate(TICKETS)
        ])
        lote_id = lote.id
        print(f"Lote enviado: {lote_id} ({len(TICKETS)} solicitudes)")

    inicio = time.time()
    while True:
        lote = client.messages.batches.retrieve(lote_id)
        if lote.processing_status == "ended":
            break
        if time.time() - inicio > 900:
            sys.exit(f"Sigue en proceso. Retómalo después con: python 06_costo_latencia/batch.py --id {lote_id}")
        print(f"  {lote.processing_status} · en proceso: {lote.request_counts.processing}")
        time.sleep(15)

    # Los resultados llegan en cualquier orden: se cruzan por custom_id, nunca por posición.
    entrada = salida = 0
    filas = {}
    for r in client.messages.batches.results(lote_id):
        if r.result.type != "succeeded":
            filas[r.custom_id] = f"({r.result.type})"
            continue
        mensaje = r.result.message
        entrada, salida = entrada + mensaje.usage.input_tokens, salida + mensaje.usage.output_tokens
        datos = json.loads(next(b.text for b in mensaje.content if b.type == "text"))
        filas[r.custom_id] = f"{datos['categoria']:<20}{datos['urgencia']:<7}{datos['resumen']}"
    for i, ticket in enumerate(TICKETS):
        print(f"{ticket[:58]:<60}{filas.get(f'ticket-{i:02d}', '(sin resultado)')}")

    p_in, p_out, _ = PRECIOS.get(MODEL_RAPIDO, (0, 0, 0))
    normal = (entrada * p_in + salida * p_out) / 1e6
    print(f"\n{entrada} tokens de input · {salida} de output · en línea US$ {normal:.5f} → en batch US$ {normal / 2:.5f}")


if __name__ == "__main__":
    main()
