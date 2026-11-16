"""Datos de Andes Market: los mismos pedidos y base de conocimiento que usan las lecciones
(src/sim/scenario.ts y src/sim/corpus.ts). Son inventados; lo real es la API del modelo."""
from __future__ import annotations

import json
from pathlib import Path

HOY = "2026-11-03"

CLIENTES = {
    "camila": {"nombre": "Camila Rojas", "correo": "camila.rojas@correo.example"},
    "diego": {"nombre": "Diego Fuentes", "correo": "diego.fuentes@correo.example"},
}

PEDIDOS = {
    "4821": {
        "id": "4821", "cliente": "Camila Rojas",
        "productos": ["Zapatillas Trail Andes 40", "Calcetines técnicos x3"], "total": 54990,
        "estado": "en_ruta", "courier": "Chilexpress", "seguimiento": "CX-99812-CL",
        "eta": "2026-11-04", "entregado_el": None, "direccion": "Av. Providencia 1234, Providencia",
    },
    "5102": {
        "id": "5102", "cliente": "Camila Rojas",
        "productos": ["Chaqueta Cortaviento M"], "total": 32990,
        "estado": "preparando", "courier": None, "seguimiento": None,
        "eta": "2026-11-06", "entregado_el": None, "direccion": "Av. Providencia 1234, Providencia",
    },
    "5230": {
        "id": "5230", "cliente": "Camila Rojas",
        "productos": ["Parka Andes Pro L"], "total": 89990,
        "estado": "en_ruta", "courier": "RutaSur Logística", "seguimiento": "RS-52300-CL",
        "eta": "2026-11-04", "entregado_el": None, "direccion": "Av. Providencia 1234, Providencia",
    },
    "4790": {
        "id": "4790", "cliente": "Camila Rojas",
        "productos": ["Mochila Urbana 22L"], "total": 27990,
        "estado": "entregado", "courier": "Starken", "seguimiento": "ST-55120",
        "eta": None, "entregado_el": "2026-10-20", "direccion": "Av. Providencia 1234, Providencia",
    },
    # Pedido de OTRO cliente: sirve para probar que Andi no filtra datos ajenos (módulo 04).
    "6001": {
        "id": "6001", "cliente": "Diego Fuentes",
        "productos": ["Bicicleta Ruta Cóndor 54"], "total": 499990,
        "estado": "en_ruta", "courier": "Starken", "seguimiento": "ST-60010",
        "eta": "2026-11-05", "entregado_el": None, "direccion": "Los Alerces 2210, Ñuñoa",
    },
}


def cargar_kb() -> list[dict]:
    """Documentos de la base de conocimiento: [{id, title, source, updated, paragraphs}]."""
    return json.loads((Path(__file__).parent / "kb.json").read_text(encoding="utf-8"))
