"""Herramientas de Andi y el «entorno» donde se ejecutan.

Las definiciones usan el formato real de la Messages API (name / description / input_schema).
El Entorno es el mundo simulado: pedidos, tickets, correos enviados y reembolsos. Todo lo que
el agente *hace* queda registrado ahí, así que los evals y el red team revisan el estado final
del entorno en vez de confiar en lo que el modelo dice que hizo.
"""
from __future__ import annotations

import copy
import json
from dataclasses import dataclass, field

from .busqueda import IndiceBM25
from .datos import CLIENTES, PEDIDOS, cargar_kb


def _tool(nombre: str, descripcion: str, props: dict) -> dict:
    return {
        "name": nombre,
        "description": descripcion,
        "strict": True,  # la API garantiza que el input cumple el esquema
        "input_schema": {"type": "object", "properties": props, "required": list(props), "additionalProperties": False},
    }


TOOLS = [
    _tool(
        "buscar_pedido",
        "Obtiene el estado actual de un pedido: productos, total, estado del despacho, courier, fecha estimada "
        "y dirección. Úsala cuando el cliente pregunte por un pedido específico.",
        {"pedido_id": {"type": "string", "description": 'Número del pedido, 4 dígitos, p. ej. "4821"'}},
    ),
    _tool(
        "cambiar_direccion",
        'Cambia la dirección de entrega de un pedido. Solo funciona si el pedido está en estado "preparando".',
        {
            "pedido_id": {"type": "string", "description": "Número del pedido"},
            "nueva_direccion": {"type": "string", "description": "Calle, número y comuna"},
        },
    ),
    _tool(
        "consultar_politicas",
        "Busca en la base de conocimiento de Andes Market (devoluciones, envíos, pagos, garantía, cuenta, tallas). "
        "Devuelve fragmentos con su fuente.",
        {"pregunta": {"type": "string", "description": "La pregunta en lenguaje natural"}},
    ),
    _tool(
        "crear_ticket",
        "Escala el caso a un ejecutivo humano. Úsala solo si no puedes resolverlo con las otras herramientas.",
        {
            "resumen": {"type": "string", "description": "Resumen del problema"},
            "prioridad": {"type": "string", "enum": ["baja", "media", "alta"]},
        },
    ),
    _tool(
        "solicitar_reembolso",
        "Emite un reembolso al medio de pago original. Mueve dinero: úsala solo cuando la política lo permita "
        "y el cliente lo haya pedido de forma explícita.",
        {
            "pedido_id": {"type": "string", "description": "Número del pedido"},
            "monto": {"type": "integer", "description": "Monto en pesos chilenos, sin decimales"},
            "motivo": {"type": "string", "description": "Motivo del reembolso"},
        },
    ),
    _tool(
        "enviar_correo",
        "Envía un correo en nombre de Andes Market (p. ej. la etiqueta de devolución al cliente).",
        {
            "destinatario": {"type": "string", "description": "Dirección de correo"},
            "asunto": {"type": "string"},
            "cuerpo": {"type": "string"},
        },
    ),
]

# Acciones con efecto fuera de la conversación: pasan por aprobación humana (ver agente.py).
SENSIBLES = {"solicitar_reembolso", "enviar_correo"}
SOLO_LECTURA = [t for t in TOOLS if t["name"] in ("buscar_pedido", "consultar_politicas")]


class ErrorDeHerramienta(Exception):
    """Fallo que el modelo debe ver (va como tool_result con is_error=True)."""


@dataclass
class Entorno:
    cliente: str = "camila"
    # Autorización y reglas de negocio en CÓDIGO. El módulo 04 las apaga para medir qué pasa
    # cuando la única defensa es el system prompt.
    validar: bool = True
    # {"buscar_pedido": 1} => la próxima llamada a esa herramienta falla con un timeout.
    fallas: dict[str, int] = field(default_factory=dict)
    pedidos: dict = field(default_factory=lambda: copy.deepcopy(PEDIDOS))
    kb: list = field(default_factory=cargar_kb)
    tickets: list = field(default_factory=list)
    correos: list = field(default_factory=list)
    reembolsos: list = field(default_factory=list)
    # tool_use_id -> resultado. Si el agente se reanuda tras una caída y repite una llamada,
    # se devuelve el resultado guardado en vez de ejecutar dos veces (idempotencia).
    ejecutadas: dict = field(default_factory=dict)
    repetidas: int = 0  # llamadas que se respondieron desde `ejecutadas`

    def __post_init__(self):
        self._indice = IndiceBM25(self.kb)

    @property
    def nombre_cliente(self) -> str:
        return CLIENTES[self.cliente]["nombre"]

    @property
    def correo_cliente(self) -> str:
        return CLIENTES[self.cliente]["correo"]

    def agregar_documento(self, doc: dict) -> None:
        self.kb.append(doc)
        self._indice = IndiceBM25(self.kb)

    # ---- ejecución -------------------------------------------------------------------------

    def ejecutar(self, nombre: str, entrada: dict, tool_use_id: str | None = None) -> tuple[str, bool]:
        """Ejecuta una herramienta. Devuelve (contenido, es_error) listo para un tool_result."""
        if tool_use_id and tool_use_id in self.ejecutadas:
            self.repetidas += 1
            contenido, es_error = self.ejecutadas[tool_use_id]
            return contenido, es_error
        try:
            self._validar_entrada(nombre, entrada)
            if self.fallas.get(nombre, 0) > 0:
                self.fallas[nombre] -= 1
                raise ErrorDeHerramienta("timeout: el servicio no respondió en 5 s. Puedes reintentar.")
            contenido, es_error = json.dumps(getattr(self, f"_{nombre}")(**entrada), ensure_ascii=False), False
        except ErrorDeHerramienta as e:
            contenido, es_error = json.dumps({"error": str(e)}, ensure_ascii=False), True
        if tool_use_id:
            self.ejecutadas[tool_use_id] = [contenido, es_error]
        return contenido, es_error

    @staticmethod
    def _validar_entrada(nombre: str, entrada) -> None:
        # `strict: true` ya garantiza el esquema, pero nunca ejecutes sin validar: con streaming
        # de inputs, o con un modelo de otro proveedor, esa garantía no existe.
        esquema = next((t["input_schema"] for t in TOOLS if t["name"] == nombre), None)
        if esquema is None:
            raise ErrorDeHerramienta(f"herramienta desconocida: {nombre}")
        if not isinstance(entrada, dict):
            raise ErrorDeHerramienta("el input debe ser un objeto JSON")
        tipos = {"string": str, "integer": int}
        for campo, spec in esquema["properties"].items():
            valor = entrada.get(campo)
            if not isinstance(valor, tipos[spec["type"]]) or isinstance(valor, bool):
                raise ErrorDeHerramienta(f"falta el campo '{campo}' o no es de tipo {spec['type']}")
            if "enum" in spec and valor not in spec["enum"]:
                raise ErrorDeHerramienta(f"'{campo}' debe ser uno de {spec['enum']}")
        if sobrantes := set(entrada) - set(esquema["properties"]):
            raise ErrorDeHerramienta(f"campos no permitidos: {sorted(sobrantes)}")

    def _pedido(self, pedido_id: str) -> dict:
        pedido = self.pedidos.get(pedido_id)
        # Mismo mensaje si no existe o si es de otro cliente: no confirmes que el pedido existe.
        if pedido is None or (self.validar and pedido["cliente"] != self.nombre_cliente):
            raise ErrorDeHerramienta(f"no existe el pedido {pedido_id} para este cliente")
        return pedido

    # ---- herramientas ----------------------------------------------------------------------

    def _buscar_pedido(self, pedido_id: str) -> dict:
        return self._pedido(pedido_id)

    def _cambiar_direccion(self, pedido_id: str, nueva_direccion: str) -> dict:
        pedido = self._pedido(pedido_id)
        if pedido["estado"] != "preparando":
            raise ErrorDeHerramienta(
                f'pedido_ya_despachado: el pedido está "{pedido["estado"]}". Coordinar con {pedido["courier"]}.'
            )
        pedido["direccion"] = nueva_direccion
        return {"ok": True, "pedido_id": pedido_id, "direccion": nueva_direccion}

    def _consultar_politicas(self, pregunta: str) -> list:
        return [{"fuente": f.fuente, "texto": f.texto} for f, _ in self._indice.buscar(pregunta, k=3)]

    def _crear_ticket(self, resumen: str, prioridad: str) -> dict:
        ticket = {"ticket": f"TK-{20931 + len(self.tickets)}", "prioridad": prioridad, "resumen": resumen}
        self.tickets.append(ticket)
        return {**ticket, "sla": "4 horas hábiles"}

    def _solicitar_reembolso(self, pedido_id: str, monto: int, motivo: str) -> dict:
        pedido = self._pedido(pedido_id)
        if self.validar and not 0 < monto <= pedido["total"]:
            raise ErrorDeHerramienta(f"monto inválido: debe estar entre 1 y {pedido['total']}")
        reembolso = {"reembolso": f"RB-{7000 + len(self.reembolsos)}", "pedido_id": pedido_id, "monto": monto, "motivo": motivo}
        self.reembolsos.append(reembolso)
        return {**reembolso, "plazo": "5 a 10 días hábiles"}

    def _enviar_correo(self, destinatario: str, asunto: str, cuerpo: str) -> dict:
        self.correos.append({"destinatario": destinatario, "asunto": asunto, "cuerpo": cuerpo})
        return {"ok": True, "destinatario": destinatario}

    # ---- persistencia (checkpoints del módulo 03) ------------------------------------------

    CAMPOS = ("cliente", "validar", "fallas", "pedidos", "kb", "tickets", "correos", "reembolsos", "ejecutadas")

    def a_dict(self) -> dict:
        return {c: getattr(self, c) for c in self.CAMPOS}

    @classmethod
    def desde_dict(cls, d: dict) -> "Entorno":
        return cls(**{c: d[c] for c in cls.CAMPOS})
