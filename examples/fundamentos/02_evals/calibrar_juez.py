"""Módulo 02 · ¿Se puede confiar en el juez? Compáralo contra etiquetas humanas.

    python 02_evals/calibrar_juez.py

etiquetas_humanas.jsonl tiene 12 respuestas calificadas a mano (algunas con errores sutiles:
una fecha inventada, «hábiles» en vez de «corridos», una acción que nunca ocurrió). El script
corre el juez sobre cada una y muestra la matriz de confusión y los desacuerdos.

Lo que más importa es la fila «humano reprueba»: un juez que aprueba respuestas malas hace que
tu suite pase en verde con un agente roto. Si hay desacuerdos, corrige la rúbrica o el prompt del
juez (juez.py) y vuelve a correr. Con datos propios, etiqueta 50–100 ejemplos de trazas reales.
"""
import json
import sys
from pathlib import Path

from andes.llm import Uso, cliente
from juez import MODEL_JUEZ, juzgar


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    ejemplos = [json.loads(l) for l in (Path(__file__).parent / "etiquetas_humanas.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
    client, uso = cliente(), Uso()
    matriz = {(h, j): 0 for h in (True, False) for j in (True, False)}
    desacuerdos = []
    for e in ejemplos:
        v = juzgar(client, e["pregunta"], e["respuesta"], e["rubrica"], e["evidencia"], uso=uso)
        matriz[(e["humano"], v.aprobado)] += 1
        if v.aprobado != e["humano"]:
            desacuerdos.append((e, v))

    print(f"Juez: {MODEL_JUEZ} · {len(ejemplos)} ejemplos\n")
    print("                     juez aprueba   juez reprueba")
    print(f"humano aprueba       {matriz[(True, True)]:>8}       {matriz[(True, False)]:>8}")
    print(f"humano reprueba      {matriz[(False, True)]:>8}       {matriz[(False, False)]:>8}")
    malas = matriz[(False, True)] + matriz[(False, False)]
    buenas = matriz[(True, True)] + matriz[(True, False)]
    print(f"\nAcuerdo: {(matriz[(True, True)] + matriz[(False, False)]) / len(ejemplos):.0%}")
    print(f"Detecta respuestas malas: {matriz[(False, False)]}/{malas} · No castiga respuestas buenas: {matriz[(True, True)]}/{buenas}")
    for e, v in desacuerdos:
        print(f"\n✗ {e['id']} · humano={'aprueba' if e['humano'] else 'reprueba'} ({e.get('nota', '')}) · juez={'aprueba' if v.aprobado else 'reprueba'}")
        print(f"  respuesta: {e['respuesta']}\n  juez: {v.razonamiento}")
    print(f"\n{uso.resumen()}")


if __name__ == "__main__":
    main()
