"""El loop del agente, escrito a mano (lección «El ciclo del agente»).

Es el mismo `while` de la lección, con lo que hace falta cuando el modelo es real:
límite de turnos, todos los stop_reason, errores de herramienta, aprobación humana,
una política en código antes de ejecutar, checkpoints y medición de costo.
"""
from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from pathlib import Path

from .datos import HOY
from .herramientas import SENSIBLES, TOOLS, Entorno
from .llm import MODEL, Uso, a_params, crear, texto_de


def system_prompt(entorno: Entorno) -> str:
    # Sin fecha/hora dinámica ni IDs por request: cualquier byte que cambie aquí invalida la caché.
    return f"""Eres Andi, el asistente de soporte de Andes Market (retail online en Chile).
- Responde en español, breve y cordial.
- Usa las herramientas para consultar datos reales; nunca inventes estados, fechas ni montos.
- Para preguntas de políticas usa consultar_politicas y cita la fuente entre paréntesis.
- Si una herramienta falla por un error transitorio, reintenta una vez; si vuelve a fallar, crea un ticket.
- Si no puedes resolver algo, crea un ticket para un humano.
- Solo atiendes al cliente autenticado y solo sobre sus propios pedidos.

Cliente autenticado: {entorno.nombre_cliente} <{entorno.correo_cliente}>. Hoy es {HOY}."""


@dataclass
class Resultado:
    texto: str
    parada: str  # end_turn | refusal | max_tokens | max_turnos
    mensajes: list
    pasos: list = field(default_factory=list)  # traza: una entrada por llamada al modelo o a una herramienta
    uso: Uso = field(default_factory=Uso)

    def herramientas(self) -> list[dict]:
        return [p for p in self.pasos if p["tipo"] == "herramienta"]


def ejecutar_agente(
    client,
    entorno: Entorno,
    mensajes: list,
    *,
    system: str | None = None,
    tools: list = TOOLS,
    model: str = MODEL,
    effort: str = "medium",
    max_turnos: int = 8,
    max_tokens: int = 16000,
    cache: bool = True,
    aprobar=None,       # (nombre, entrada) -> bool. Humano en el circuito para SENSIBLES. Sin él, se niegan.
    guardia=None,       # (nombre, entrada, entorno) -> motivo | None. Política en código; ve módulo 04.
    envolver=None,      # (nombre, contenido) -> contenido. Marca resultados como datos no confiables.
    al_texto=None,      # callback de streaming: recibe cada trozo de texto
    al_evento=None,     # callback de traza: recibe cada paso
    al_checkpoint=None, # (mensajes) -> None, en cada punto donde es seguro reanudar
    extra: dict | None = None,  # parámetros adicionales del request (p. ej. context_management)
    betas: tuple = (),
    uso: Uso | None = None,
) -> Resultado:
    """Corre el loop sobre `mensajes` (se modifica en el lugar, siempre agregando al final)."""
    res = Resultado("", "max_turnos", mensajes, uso=uso or Uso())
    system = system or system_prompt(entorno)

    def paso(**datos):
        res.pasos.append(datos)
        if al_evento:
            al_evento(datos)

    turno = 0
    while True:
        # El estado del loop vive entero en `mensajes`. Si el último mensaje es del asistente y trae
        # tool_use sin responder (p. ej. al reanudar tras una caída), toca ejecutar, no llamar al modelo.
        pendientes = _tool_use_pendientes(mensajes)
        if not pendientes:
            if turno >= max_turnos:
                return res
            turno += 1
            params = dict(
                model=model, max_tokens=max_tokens, system=system, tools=tools, messages=mensajes,
                output_config={"effort": effort}, **(extra or {}),
            )
            if cache:
                params["cache_control"] = {"type": "ephemeral"}  # cachea el prefijo (tools + system + historial)
            resp = crear(client, uso=res.uso, al_texto=al_texto, betas=betas, **params)
            paso(tipo="modelo", turno=turno, stop_reason=resp.stop_reason, modelo=resp.model,
                 input=resp.usage.input_tokens, output=resp.usage.output_tokens)

            # 1) El modelo rechazó o se cortó: no hay nada que ejecutar.
            if resp.stop_reason in ("refusal", "max_tokens"):
                res.parada, res.texto = resp.stop_reason, texto_de(resp.content)
                return res

            contenido = a_params(resp.content)
            mensajes.append({"role": "assistant", "content": contenido})
            # Checkpoint ANTES de ejecutar: si el proceso muere en medio de una herramienta, al
            # reanudar se repite la misma llamada con el mismo tool_use_id (clave de idempotencia).
            if al_checkpoint:
                al_checkpoint(mensajes)

            # 2) Una herramienta del servidor pausó el turno: reenviar para que continúe.
            if resp.stop_reason == "pause_turn":
                continue
            pendientes = [b for b in contenido if b["type"] == "tool_use"]
            # 3) Terminó (end_turn) o paró por algo que no requiere ejecutar nada.
            if not pendientes:
                res.parada, res.texto = resp.stop_reason, texto_de(resp.content)
                return res

        # 4) tool_use: ejecutar TODAS las llamadas y devolver TODOS los resultados en un solo mensaje.
        resultados = []
        for bloque in pendientes:
            nombre, entrada = bloque["name"], bloque["input"]
            inicio = time.perf_counter()
            motivo = guardia(nombre, entrada, entorno) if guardia else None
            if motivo:
                contenido_r, es_error, estado = json.dumps({"error": f"bloqueado por política: {motivo}"}, ensure_ascii=False), True, "bloqueada"
            elif nombre in SENSIBLES and not (aprobar and aprobar(nombre, entrada)):
                contenido_r, es_error, estado = json.dumps({"error": "acción rechazada por el supervisor humano"}, ensure_ascii=False), True, "rechazada"
            else:
                contenido_r, es_error = entorno.ejecutar(nombre, entrada, bloque["id"])
                estado = "error" if es_error else "ok"
                if envolver and not es_error:
                    contenido_r = envolver(nombre, contenido_r)
            paso(tipo="herramienta", turno=turno, nombre=nombre, entrada=entrada, estado=estado,
                 resultado=contenido_r, ms=round((time.perf_counter() - inicio) * 1000))
            resultados.append({"type": "tool_result", "tool_use_id": bloque["id"], "content": contenido_r, "is_error": es_error})

        mensajes.append({"role": "user", "content": resultados})
        if al_checkpoint:
            al_checkpoint(mensajes)  # historial consistente: cada tool_use tiene su tool_result


def _tool_use_pendientes(mensajes: list) -> list[dict]:
    if not mensajes or mensajes[-1]["role"] != "assistant" or isinstance(mensajes[-1]["content"], str):
        return []
    return [b for b in mensajes[-1]["content"] if b["type"] == "tool_use"]


def preguntar(client, pregunta: str, entorno: Entorno | None = None, **kwargs) -> Resultado:
    """Atajo: una conversación nueva con un solo mensaje del usuario."""
    return ejecutar_agente(client, entorno or Entorno(), [{"role": "user", "content": pregunta}], **kwargs)


def guardar_traza(res: Resultado, ruta: Path, **extra) -> None:
    """Agrega una línea JSON por ejecución. Es lo mínimo que necesitas para depurar y para evaluar."""
    ruta.parent.mkdir(parents=True, exist_ok=True)
    registro = {**extra, "texto": res.texto, "parada": res.parada, "pasos": res.pasos,
                "uso": res.uso.por_modelo, "usd": round(res.uso.costo(), 6), "segundos": round(res.uso.segundos, 2)}
    with ruta.open("a", encoding="utf-8") as f:
        f.write(json.dumps(registro, ensure_ascii=False) + "\n")
