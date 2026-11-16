"""Pruebas offline: no llaman a la API. Usan un cliente falso que devuelve respuestas guionadas con
la misma forma que la Messages API (content, stop_reason, usage)."""
import os
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

os.environ["ANDES_FALLBACKS"] = "0"
RAIZ = Path(__file__).resolve().parent.parent
for carpeta in ("02_evals", "04_red_team", "05_computer_use"):
    sys.path.insert(0, str(RAIZ / carpeta))


class Bloque(SimpleNamespace):
    def model_dump(self, **_):
        return dict(self.__dict__)


def texto(t):
    return Bloque(type="text", text=t)


def tool_use(nombre, entrada, id="toolu_1"):
    return Bloque(type="tool_use", id=id, name=nombre, input=entrada)


def respuesta(*bloques, stop_reason=None):
    stop = stop_reason or ("tool_use" if any(b.type == "tool_use" for b in bloques) else "end_turn")
    uso = SimpleNamespace(input_tokens=100, output_tokens=20, cache_read_input_tokens=0, cache_creation_input_tokens=0)
    return SimpleNamespace(content=list(bloques), stop_reason=stop, usage=uso, model="claude-sonnet-5-5")


class ClienteFalso:
    """client.messages.create(...) devuelve la siguiente respuesta del guion y guarda los requests."""

    def __init__(self, *guion):
        self.guion, self.requests = list(guion), []
        self.messages = SimpleNamespace(create=self._create)

    def _create(self, **params):
        # copia superficial de messages: el loop sigue agregando a la misma lista
        self.requests.append({**params, "messages": list(params["messages"])})
        return self.guion.pop(0)


@pytest.fixture
def falso():
    return SimpleNamespace(Cliente=ClienteFalso, texto=texto, tool_use=tool_use, respuesta=respuesta)
