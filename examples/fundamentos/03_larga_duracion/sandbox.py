"""Módulo 03 · Sandbox de ejecución de código (herramienta del servidor).

    python 03_larga_duracion/sandbox.py

En vez de «calcular de memoria», el modelo escribe código y Anthropic lo ejecuta en un contenedor
aislado. Tu aplicación no ejecuta nada: declaras la herramienta y lees los bloques del resultado.
Es la misma idea con la que trabajan los agentes de código: razonar con un intérprete a mano.
"""
import random
import sys

from andes.llm import MODEL, Uso, a_params, cliente, crear


def ventas_csv() -> str:
    rng = random.Random(7)  # determinista: mismos datos en cada corrida
    filas = ["fecha,categoria,unidades,precio_unitario"]
    for mes, factor in (("09", 1.0), ("10", 1.0)):
        for categoria, base, precio, crecimiento in (
            ("zapatillas", 40, 54990, 1.05), ("chaquetas", 25, 32990, 1.42), ("mochilas", 30, 27990, 0.91), ("parkas", 12, 89990, 1.18),
        ):
            for dia in (3, 10, 17, 24):
                unidades = round(base * (crecimiento if mes == "10" else factor) * rng.uniform(0.85, 1.15))
                filas.append(f"2026-{mes}-{dia:02d},{categoria},{unidades},{precio}")
    return "\n".join(filas)


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    client, uso = cliente(), Uso()
    mensajes = [{
        "role": "user",
        "content": f"Estas son las ventas de Andes Market de septiembre y octubre:\n\n<csv>\n{ventas_csv()}\n</csv>\n\n"
                   "¿Qué categoría creció más en ingresos entre septiembre y octubre, y cuánto en porcentaje? "
                   "Calcúlalo con código, no lo estimes. Muestra también la tabla por categoría.",
    }]
    while True:
        resp = crear(client, uso=uso, model=MODEL, max_tokens=16000, messages=mensajes,
                     tools=[{"type": "code_execution_20260521", "name": "code_execution"}])
        for bloque in resp.content:
            if bloque.type == "server_tool_use":
                print(f"\n\033[33m── código que escribió el modelo ──\033[0m\n{bloque.input}")
            elif bloque.type == "bash_code_execution_tool_result":
                salida = getattr(bloque.content, "stdout", None) or getattr(bloque.content, "stderr", None) or bloque.content
                print(f"\033[90m── salida del sandbox ──\n{salida}\033[0m")
            elif bloque.type == "text":
                print(bloque.text)
        if resp.stop_reason != "pause_turn":  # pause_turn: el servidor cortó un turno largo; se reenvía y sigue
            break
        mensajes.append({"role": "assistant", "content": a_params(resp.content)})
    print(f"\n[{resp.stop_reason}] {uso.resumen()}")


if __name__ == "__main__":
    main()
