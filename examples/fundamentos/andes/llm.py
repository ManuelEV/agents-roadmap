"""Acceso a la API de Claude: cliente, modelos, una función `crear` que mide tokens, costo y
latencia de cada llamada, y helpers para serializar la conversación."""
from __future__ import annotations

import os
import time
from dataclasses import dataclass, field
from pathlib import Path

import anthropic
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

MODEL = os.environ.get("ANDES_MODEL", "claude-sonnet-5-5")
MODEL_RAPIDO = os.environ.get("ANDES_MODEL_RAPIDO", "claude-haiku-5-5")

# US$ por millón de tokens: (input, output, lectura de caché). Escribir caché (TTL 5 min) cuesta
# 1,25 × input. Precios de lista a nov-2026; la lectura de caché de Haiku es una aproximación (0,1 ×).
PRECIOS = {
    "claude-opus-5-5": (4.00, 20.00, 0.20),
    "claude-sonnet-5-5": (2.00, 10.00, 0.10),
    "claude-haiku-5-5": (0.10, 0.50, 0.01),
}

# Si el clasificador de seguridad rechaza una solicitud (stop_reason "refusal"), el servidor la
# reintenta en otro modelo dentro de la misma llamada. Es una beta; ANDES_FALLBACKS=0 la apaga.
BETA_FALLBACK = "server-side-fallback-2026-07-01"
CON_FALLBACK = ("claude-sonnet-5-5", "claude-opus-5", "claude-fable-5")


def cliente() -> anthropic.Anthropic:
    """Lee ANTHROPIC_API_KEY del entorno o de examples/.env."""
    if not (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")):
        raise SystemExit("Falta la API key: copia .env.example como .env y completa ANTHROPIC_API_KEY.")
    return anthropic.Anthropic()


@dataclass
class Uso:
    """Acumula tokens, tiempo y costo de todas las llamadas de una ejecución, por modelo."""

    por_modelo: dict = field(default_factory=dict)
    llamadas: int = 0
    segundos: float = 0.0
    ttft: float | None = None  # tiempo hasta el primer token de texto (solo con streaming)

    def sumar(self, modelo: str, usage, segundos: float) -> None:
        m = self.por_modelo.setdefault(modelo, {"input": 0, "output": 0, "cache_lectura": 0, "cache_escritura": 0})
        m["input"] += getattr(usage, "input_tokens", 0) or 0
        m["output"] += getattr(usage, "output_tokens", 0) or 0
        m["cache_lectura"] += getattr(usage, "cache_read_input_tokens", 0) or 0
        m["cache_escritura"] += getattr(usage, "cache_creation_input_tokens", 0) or 0
        self.llamadas += 1
        self.segundos += segundos

    def total(self, campo: str) -> int:
        return sum(m[campo] for m in self.por_modelo.values())

    def costo(self) -> float:
        usd = 0.0
        for modelo, m in self.por_modelo.items():
            p_in, p_out, p_cache = PRECIOS.get(modelo, (0, 0, 0))
            usd += (m["input"] * p_in + m["cache_escritura"] * p_in * 1.25 + m["cache_lectura"] * p_cache + m["output"] * p_out) / 1e6
        return usd

    def resumen(self) -> str:
        return (
            f"{self.llamadas} llamadas · in {self.total('input')} · caché {self.total('cache_lectura')} leídos / "
            f"{self.total('cache_escritura')} escritos · out {self.total('output')} · "
            f"US$ {self.costo():.5f} · {self.segundos:.1f} s"
        )


def crear(client, *, uso: Uso | None = None, al_texto=None, betas: tuple = (), **params):
    """Una llamada a la Messages API. Con `al_texto` hace streaming y entrega cada trozo de texto.

    Devuelve el mensaje completo. Revisa siempre `stop_reason` antes de leer `content`.
    """
    betas = list(betas)
    if os.environ.get("ANDES_FALLBACKS", "1") != "0" and params["model"].startswith(CON_FALLBACK):
        betas.append(BETA_FALLBACK)
        params["fallbacks"] = "default"
    api = client.beta.messages if betas else client.messages
    if betas:
        params["betas"] = betas

    inicio = time.perf_counter()
    if al_texto is None:
        mensaje = api.create(**params)
    else:
        with api.stream(**params) as stream:
            for trozo in stream.text_stream:
                if uso is not None and uso.ttft is None:
                    uso.ttft = time.perf_counter() - inicio
                al_texto(trozo)
            mensaje = stream.get_final_message()
    if uso is not None:
        # Con fallback, `mensaje.model` es el modelo que realmente respondió.
        uso.sumar(mensaje.model, mensaje.usage, time.perf_counter() - inicio)
    return mensaje


def a_params(content) -> list[dict]:
    """Bloques de una respuesta -> dicts JSON para reenviarlos tal cual en el siguiente request.

    Hay que devolver TODOS los bloques (thinking, tool_use, compaction…), no solo el texto.
    """
    return [b if isinstance(b, dict) else b.model_dump(mode="json", exclude_unset=True) for b in content]


def texto_de(content) -> str:
    return "".join(b.text for b in content if getattr(b, "type", None) == "text")
