"""BM25 real sobre los párrafos de la base de conocimiento (la fórmula de la lección
«Búsqueda híbrida»). Sin dependencias: suficiente para 20 párrafos y fácil de leer."""
from __future__ import annotations

import math
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass

STOPWORDS = set(
    "a al algo como con cual cuando de del desde donde el ella en es esta este la las lo los me mi "
    "no o para pero por que se si sin su sus te tu un una uno y ya puedo puede hay mas muy ser son".split()
)


def tokenizar(texto: str) -> list[str]:
    plano = unicodedata.normalize("NFD", texto.lower())
    plano = "".join(c for c in plano if unicodedata.category(c) != "Mn")  # quita tildes
    # Recorte burdo de plurales: "devoluciones" y "devolución" quedan como el mismo término.
    return [re.sub(r"(es|s)$", "", t) if len(t) > 4 else t for t in re.findall(r"[a-z0-9]+", plano) if t not in STOPWORDS]


@dataclass
class Fragmento:
    fuente: str
    titulo: str
    texto: str


class IndiceBM25:
    def __init__(self, docs: list[dict], k1: float = 1.5, b: float = 0.75):
        self.k1, self.b = k1, b
        self.fragmentos = [Fragmento(d["source"], d["title"], p) for d in docs for p in d["paragraphs"]]
        self._tf = [Counter(tokenizar(f"{f.titulo} {f.texto}")) for f in self.fragmentos]
        self._largo = [sum(tf.values()) for tf in self._tf]
        self._largo_medio = sum(self._largo) / max(len(self._largo), 1)
        df = Counter(t for tf in self._tf for t in tf)
        n = len(self.fragmentos)
        self._idf = {t: math.log(1 + (n - c + 0.5) / (c + 0.5)) for t, c in df.items()}

    def buscar(self, consulta: str, k: int = 3) -> list[tuple[Fragmento, float]]:
        terminos = tokenizar(consulta)
        puntajes = []
        for i, tf in enumerate(self._tf):
            s = 0.0
            for t in terminos:
                if t in tf:
                    norma = 1 - self.b + self.b * self._largo[i] / self._largo_medio
                    s += self._idf[t] * tf[t] * (self.k1 + 1) / (tf[t] + self.k1 * norma)
            if s > 0:
                puntajes.append((self.fragmentos[i], s))
        return sorted(puntajes, key=lambda x: -x[1])[:k]
