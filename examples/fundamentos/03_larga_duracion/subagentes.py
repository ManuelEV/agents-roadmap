"""Módulo 03 · Sub-agentes: delegar para proteger el contexto del agente principal.

    python 03_larga_duracion/subagentes.py                  # orquestador + sub-agentes
    python 03_larga_duracion/subagentes.py --sin-subagentes # un solo agente hace todo

El orquestador tiene UNA herramienta, `delegar`. Cada delegación arranca un agente nuevo, con su
propio `messages` vacío, herramientas de solo lectura y un modelo más barato. Al orquestador solo
le vuelve el informe final: los resultados crudos de las herramientas nunca entran a su contexto.

Compara las dos corridas: el contexto del agente principal baja, pero el total de tokens SUBE
(cada sub-agente paga su propio system prompt y sus propios turnos). Delegar compra contexto limpio
y paralelismo, no ahorro: úsalo cuando la lectura es voluminosa y el resultado es corto.
"""
import argparse
import json
import sys

from andes.agente import ejecutar_agente, preguntar, system_prompt
from andes.herramientas import SOLO_LECTURA, Entorno
from andes.llm import MODEL, MODEL_RAPIDO, Uso, cliente

TAREA = ("Para cada uno de mis pedidos (4821, 5102, 5230 y 4790) dime: estado actual, si todavía puedo cambiar la "
         "dirección de entrega y si puedo devolverlo hoy, según las políticas. Responde con una tabla.")

DELEGAR = {
    "name": "delegar",
    "description": "Encarga una tarea de investigación a un sub-agente con acceso de solo lectura a pedidos y "
                   "políticas. El sub-agente no ve esta conversación: la tarea debe ser autocontenida (qué pedido, "
                   "qué preguntas, qué formato de respuesta). Devuelve su informe final. Puedes delegar varias "
                   "tareas independientes en un mismo turno.",
    "strict": True,
    "input_schema": {"type": "object", "properties": {"tarea": {"type": "string"}}, "required": ["tarea"], "additionalProperties": False},
}

SYSTEM_ORQUESTADOR = """Coordinas la atención de un cliente de Andes Market. No tienes acceso directo a los datos:
divide el trabajo en tareas independientes, encárgalas con `delegar` y redacta la respuesta final a partir
de los informes. No inventes datos que no estén en un informe."""


class EntornoOrquestador(Entorno):
    """Entorno cuyo único tool es `delegar`: cada llamada corre un sub-agente completo."""

    def __init__(self, client, uso_subagentes: Uso):
        super().__init__()
        self.client, self.uso_subagentes = client, uso_subagentes

    def ejecutar(self, nombre, entrada, tool_use_id=None):
        if nombre != "delegar":
            return json.dumps({"error": f"herramienta desconocida: {nombre}"}), True
        sub = preguntar(
            self.client, entrada["tarea"], Entorno(), tools=SOLO_LECTURA, model=MODEL_RAPIDO, effort="low",
            system=system_prompt(self) + "\nEres un sub-agente de investigación: responde solo con hechos verificados, de forma compacta.",
            uso=self.uso_subagentes,
        )
        print(f"    ↳ sub-agente ({len(sub.herramientas())} herramientas, parada {sub.parada}): {entrada['tarea'][:90]}…")
        return sub.texto or f"(sin informe: {sub.parada})", sub.parada != "end_turn"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--sin-subagentes", action="store_true")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    client = cliente()

    if args.sin_subagentes:
        res = preguntar(client, TAREA, Entorno(), max_turnos=12)
        uso_sub = Uso()
    else:
        uso_sub = Uso()
        res = ejecutar_agente(client, EntornoOrquestador(client, uso_sub), [{"role": "user", "content": TAREA}],
                              system=SYSTEM_ORQUESTADOR, tools=[DELEGAR], max_turnos=6)

    ultimo = [p for p in res.pasos if p["tipo"] == "modelo"][-1]
    print(f"\n{res.texto}\n")
    print(f"Agente principal ({MODEL}): {res.uso.resumen()}")
    print(f"  input de su última llamada (≈ tamaño de su contexto, sin contar caché): {ultimo['input']} tokens")
    if uso_sub.llamadas:
        print(f"Sub-agentes ({MODEL_RAPIDO}):   {uso_sub.resumen()}")
    print(f"Total: US$ {res.uso.costo() + uso_sub.costo():.5f} · {res.uso.total('input') + uso_sub.total('input')} tokens de input")


if __name__ == "__main__":
    main()
