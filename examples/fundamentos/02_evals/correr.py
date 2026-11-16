"""Módulo 02 · Corre la suite de evals contra el agente real.

    python 02_evals/correr.py                      # todos los casos, 1 intento
    python 02_evals/correr.py --n 3                # 3 intentos por caso: mide la varianza
    python 02_evals/correr.py --casos falla_transitoria pedido_ajeno
    python 02_evals/correr.py --guardar-baseline   # guarda este resultado como referencia
    python 02_evals/correr.py --baseline           # compara contra la referencia: lista regresiones

Un intento aprueba si pasan TODOS los checks en código y el juez LLM aprueba la respuesta.
Sale con código 1 si la tasa de aprobación baja del umbral o hay regresiones: úsalo en CI.
"""
import argparse
import json
import statistics
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from andes.agente import preguntar
from andes.herramientas import Entorno
from andes.llm import MODEL, Uso, cliente
from graders import evaluar_codigo
from juez import MODEL_JUEZ, evidencia_de, juzgar

AQUI = Path(__file__).resolve().parent
RUNS = AQUI.parent / "runs" / "evals"
BASELINE = AQUI / "baseline.json"


def correr_intento(client, caso: dict, usar_juez: bool) -> dict:
    entorno = Entorno(fallas=dict(caso.get("fallas", {})))
    uso = Uso()
    # Se aprueba toda acción sensible: queremos ver qué INTENTA el modelo; los checks de estado lo juzgan.
    res = preguntar(client, caso["entrada"], entorno, aprobar=lambda *_: True, uso=uso)
    checks = evaluar_codigo(caso, res.texto, res.herramientas(), entorno.a_dict())
    if res.parada != "end_turn":
        checks.append({"check": "termina con end_turn", "ok": False, "detalle": res.parada})
    veredicto = None
    if usar_juez and caso.get("rubrica"):
        v = juzgar(client, caso["entrada"], res.texto, caso["rubrica"], evidencia_de(res.herramientas()), uso=uso)
        veredicto = v.model_dump()
        checks.append({"check": "juez LLM", "ok": v.aprobado, "detalle": v.razonamiento})
    return {
        "ok": all(c["ok"] for c in checks), "checks": checks, "juez": veredicto, "respuesta": res.texto,
        "herramientas": [ll["nombre"] for ll in res.herramientas()],
        "usd": uso.costo(), "segundos": uso.segundos,
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--n", type=int, default=1, help="intentos por caso")
    ap.add_argument("--casos", nargs="*", help="ids a correr (por defecto, todos)")
    ap.add_argument("--sin-juez", action="store_true", help="solo graders en código")
    ap.add_argument("--umbral", type=float, default=0.9, help="tasa mínima de aprobación")
    ap.add_argument("--hilos", type=int, default=4)
    ap.add_argument("--baseline", action="store_true", help="comparar contra baseline.json")
    ap.add_argument("--guardar-baseline", action="store_true")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")

    casos = [json.loads(l) for l in (AQUI / "casos.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
    if args.casos:
        casos = [c for c in casos if c["id"] in args.casos]
    client = cliente()
    print(f"{len(casos)} casos × {args.n} intentos · agente {MODEL} · juez {'—' if args.sin_juez else MODEL_JUEZ}\n")

    trabajos = [(c, i) for c in casos for i in range(args.n)]
    with ThreadPoolExecutor(args.hilos) as pool:
        intentos = list(pool.map(lambda t: correr_intento(client, t[0], not args.sin_juez), trabajos))

    resultados = {}
    for (caso, _), intento in zip(trabajos, intentos):
        resultados.setdefault(caso["id"], []).append(intento)

    for cid, lista in resultados.items():
        aprobados = sum(i["ok"] for i in lista)
        print(f"{'✓' if aprobados == len(lista) else '✗'} {cid:<28} {aprobados}/{len(lista)}")
        for i in lista:
            for c in i["checks"]:
                if not c["ok"]:
                    print(f"      falla «{c['check']}»: {c['detalle'][:220]}")

    todos = [i for lista in resultados.values() for i in lista]
    tasa = sum(i["ok"] for i in todos) / len(todos)
    print(f"\nAprobación: {tasa:.0%} ({sum(i['ok'] for i in todos)}/{len(todos)}) · "
          f"US$ {sum(i['usd'] for i in todos):.4f} · latencia mediana {statistics.median(i['segundos'] for i in todos):.1f} s por caso")

    resumen = {"modelo": MODEL, "juez": None if args.sin_juez else MODEL_JUEZ, "tasa": tasa,
               "casos": {cid: sum(i["ok"] for i in l) / len(l) for cid, l in resultados.items()}}
    RUNS.mkdir(parents=True, exist_ok=True)
    salida = RUNS / f"{time.strftime('%Y%m%d-%H%M%S')}.json"
    salida.write_text(json.dumps({**resumen, "detalle": resultados}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Detalle (respuestas, checks y razonamiento del juez): {salida}")

    regresiones = []
    if args.baseline and BASELINE.exists():
        antes = json.loads(BASELINE.read_text(encoding="utf-8"))
        for cid, ahora in resumen["casos"].items():
            previo = antes["casos"].get(cid)
            if previo is not None and ahora != previo:
                print(f"  {'REGRESIÓN' if ahora < previo else 'mejora   '} {cid}: {previo:.0%} → {ahora:.0%}")
                if ahora < previo:
                    regresiones.append(cid)
        print(f"Baseline: {antes['tasa']:.0%} → ahora {tasa:.0%}")
    if args.guardar_baseline:
        BASELINE.write_text(json.dumps(resumen, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Baseline guardada en {BASELINE}")

    sys.exit(1 if tasa < args.umbral or regresiones else 0)


if __name__ == "__main__":
    main()
