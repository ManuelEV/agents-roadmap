"""Graders en código: deterministas, gratis y sin opiniones. Úsalos para todo lo que se pueda
verificar mirando la TRAYECTORIA (qué herramientas llamó y con qué argumentos) y el ESTADO FINAL
del entorno. Lo que queda (¿la respuesta es correcta y no inventa?) va al juez LLM."""
from __future__ import annotations

import unicodedata


def _plano(s: str) -> str:
    s = unicodedata.normalize("NFD", str(s).lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def _ruta(estado: dict, ruta: str):
    valor = estado
    for parte in ruta.split("."):
        valor = valor[parte]
    return valor


def evaluar_codigo(caso: dict, texto: str, llamadas: list[dict], estado: dict) -> list[dict]:
    """Devuelve una lista de checks: [{"check", "ok", "detalle"}].

    `llamadas` son los pasos de tipo herramienta de la traza; `estado` es Entorno.a_dict().
    """
    checks = []

    def check(nombre: str, ok: bool, detalle: str = "") -> None:
        checks.append({"check": nombre, "ok": bool(ok), "detalle": detalle})

    usadas = [ll["nombre"] for ll in llamadas]

    for h in caso.get("requeridas", []):
        check(f"llama {h}", h in usadas, f"usó: {usadas}")
    for h in caso.get("prohibidas", []):
        check(f"no llama {h}", h not in usadas, f"usó: {usadas}")
    for h, minimo in caso.get("min_llamadas", {}).items():
        check(f"{h} ≥ {minimo} veces", usadas.count(h) >= minimo, f"{usadas.count(h)} veces")
    for h, esperados in caso.get("args", {}).items():
        entradas = [ll["entrada"] for ll in llamadas if ll["nombre"] == h]
        ok = any(all(e.get(k) == v for k, v in esperados.items()) for e in entradas)
        check(f"args de {h}", ok, f"esperado {esperados}, recibido {entradas}")

    for frase in caso.get("contiene", []):
        check(f"contiene «{frase}»", _plano(frase) in _plano(texto))
    for frase in caso.get("no_contiene", []):
        check(f"no contiene «{frase}»", _plano(frase) not in _plano(texto))

    for regla in caso.get("estado", []):
        valor = _ruta(estado, regla["ruta"])
        if "igual" in regla:
            check(f"{regla['ruta']} == {regla['igual']!r}", valor == regla["igual"], f"es {valor!r}")
        if "contiene" in regla:
            check(f"{regla['ruta']} contiene {regla['contiene']!r}", _plano(regla["contiene"]) in _plano(valor), f"es {valor!r}")
        if "largo" in regla:
            check(f"len({regla['ruta']}) == {regla['largo']}", len(valor) == regla["largo"], f"es {len(valor)}")
        if "largo_min" in regla:
            check(f"len({regla['ruta']}) ≥ {regla['largo_min']}", len(valor) >= regla["largo_min"], f"es {len(valor)}")

    return checks
