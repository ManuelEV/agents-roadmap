"""Módulo 05 · Computer use: el agente opera una aplicación web mirando la pantalla.

    pip install -e ".[navegador]"        (una vez; usa tu Chrome, o corre `playwright install chromium`)
    python 05_computer_use/agente_navegador.py
    python 05_computer_use/agente_navegador.py --visible     # abre la ventana para ver al agente trabajar
    python 05_computer_use/agente_navegador.py --tarea "Marca el pedido 4821 como prioridad urgente y guarda"

El backoffice (backoffice.html) no tiene API: la única forma de usarlo es la interfaz. El loop es el
mismo de siempre; cambia que las «herramientas» son captura, clic y teclado. Las capturas de cada paso
quedan en runs/navegador/. Al final el script lee el estado de la página para verificar el resultado.
"""
import argparse
import base64
import json
import sys
from pathlib import Path

from andes.llm import MODEL, Uso, a_params, cliente, crear, texto_de
from navegador import Navegador

AQUI = Path(__file__).resolve().parent
CAPTURAS = AQUI.parent / "runs" / "navegador"
TAREA = "Busca el pedido 5102, escribe la nota interna «Entregar después de las 18:00» y guarda los cambios."
SYSTEM = """Operas el backoffice de pedidos de Andes Market en un navegador de 1280×800. La página ya está abierta.
Empieza con una captura. Después de cada acción que cambie la pantalla, verifica con otra captura antes de seguir.
Cuando termines, confirma con una captura que el cambio quedó guardado y responde en una frase qué hiciste."""
NO_EJECUTADA = "Not executed: an earlier computer action in this turn failed."


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--tarea", default=TAREA)
    ap.add_argument("--visible", action="store_true")
    ap.add_argument("--max-turnos", type=int, default=25)
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    CAPTURAS.mkdir(parents=True, exist_ok=True)

    client, uso = cliente(), Uso()
    mensajes = [{"role": "user", "content": args.tarea}]
    capturas = 0

    with Navegador((AQUI / "backoffice.html").as_uri(), visible=args.visible) as nav:
        for turno in range(1, args.max_turnos + 1):
            resp = crear(client, uso=uso, model=MODEL, max_tokens=4096, system=SYSTEM, messages=mensajes,
                         tools=[{"type": "computer_toolset_20260801"}], cache_control={"type": "ephemeral"})
            if resp.stop_reason in ("refusal", "max_tokens"):
                print(f"El modelo se detuvo: {resp.stop_reason}")
                break
            mensajes.append({"role": "assistant", "content": a_params(resp.content)})

            # Las acciones de un turno se ejecutan en orden. Si una falla, las siguientes NO se ejecutan
            # (el modelo las planeó asumiendo que la anterior funcionó), pero todas reciben su tool_result.
            resultados, fallo = [], False
            for bloque in resp.content:
                if bloque.type != "tool_use":
                    continue
                resultado = {"type": "tool_result", "tool_use_id": bloque.id, "toolset_name": "computer"}
                if fallo:
                    resultado.update(content=NO_EJECUTADA, is_error=True)
                else:
                    try:
                        resultado["content"] = nav.ejecutar(bloque.name, bloque.input)
                        if bloque.name in ("screenshot", "zoom"):
                            capturas += 1
                            (CAPTURAS / f"{capturas:02d}-{bloque.name}.png").write_bytes(
                                base64.b64decode(resultado["content"][0]["source"]["data"]))
                    except Exception as e:  # coordenada fuera de pantalla, tecla desconocida…
                        resultado.update(content=f"Error: {e}", is_error=True)
                        fallo = True
                print(f"  [{turno:>2}] {bloque.name} {json.dumps(bloque.input, ensure_ascii=False)}"
                      + ("  ✗ " + str(resultado["content"]) if resultado.get("is_error") else ""))
                resultados.append(resultado)

            if not resultados:  # sin más acciones: terminó
                print(f"\nandi > {texto_de(resp.content)}")
                break
            mensajes.append({"role": "user", "content": resultados})

        estado = nav.page.evaluate("window.__estado")

    print("\nEstado real de la página (verificación independiente de lo que dijo el modelo):")
    for pid, p in estado["pedidos"].items():
        if p["nota"] or p["prioridad"] != "normal":
            print(f"  pedido {pid}: nota={p['nota']!r} · prioridad={p['prioridad']}")
    print(f"  veces que se presionó Guardar: {estado['guardados']}")
    print(f"\n{capturas} capturas en {CAPTURAS}\n{uso.resumen()}")


if __name__ == "__main__":
    main()
