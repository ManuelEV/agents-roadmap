"""Juez LLM: califica una respuesta contra una rúbrica escrita por una persona.

Tres decisiones de diseño que importan:
1. Veredicto binario (aprobado / reprobado). Las escalas 1–5 son ruidosas y nadie sabe qué es un 3.
2. El razonamiento va ANTES del veredicto en el esquema: el modelo decide después de argumentar.
3. El juez ve la evidencia (resultados de herramientas), no solo la respuesta: sin eso no puede
   distinguir un dato correcto de uno inventado.
Un juez es otro modelo que se equivoca: antes de confiar en él, calíbralo (calibrar_juez.py).
"""
from __future__ import annotations

import os
import time

from pydantic import BaseModel, Field

from andes.llm import MODEL_RAPIDO, Uso

MODEL_JUEZ = os.environ.get("ANDES_MODEL_JUEZ", MODEL_RAPIDO)

SYSTEM_JUEZ = """Evalúas respuestas de un agente de soporte de un retail online. Recibes la pregunta del cliente,
la evidencia (resultados reales de las herramientas que consultó el agente), la respuesta final y una rúbrica.

Aprueba solo si la respuesta cumple TODO lo que pide la rúbrica. Reprueba si:
- falta algo que la rúbrica exige,
- afirma un dato (fecha, monto, plazo, estado, courier) que contradice la evidencia o que no aparece en ella,
- dice haber hecho una acción que la evidencia no respalda.
No evalúes el estilo ni la longitud. Las fechas pueden estar en cualquier formato equivalente."""


class Veredicto(BaseModel):
    razonamiento: str = Field(description="Qué exige la rúbrica y si la respuesta lo cumple, en 2 a 4 frases")
    aprobado: bool


def juzgar(client, pregunta: str, respuesta: str, rubrica: str, evidencia: str = "", uso: Uso | None = None) -> Veredicto:
    inicio = time.perf_counter()
    resp = client.messages.parse(
        model=MODEL_JUEZ,
        max_tokens=2000,
        system=SYSTEM_JUEZ,
        messages=[{
            "role": "user",
            "content": f"<pregunta>\n{pregunta}\n</pregunta>\n\n<evidencia>\n{evidencia or '(el agente no llamó herramientas)'}\n</evidencia>\n\n"
                       f"<respuesta>\n{respuesta}\n</respuesta>\n\n<rubrica>\n{rubrica}\n</rubrica>",
        }],
        output_format=Veredicto,
    )
    if uso is not None:
        uso.sumar(resp.model, resp.usage, time.perf_counter() - inicio)
    if resp.parsed_output is None:  # refusal o max_tokens: no hay JSON válido
        return Veredicto(razonamiento=f"el juez no entregó veredicto (stop_reason={resp.stop_reason})", aprobado=False)
    return resp.parsed_output


def evidencia_de(llamadas: list[dict]) -> str:
    """Resume la trayectoria para el juez: una línea por llamada a herramienta."""
    return "\n".join(f"{ll['nombre']}({ll['entrada']}) [{ll['estado']}] → {ll['resultado']}" for ll in llamadas)
