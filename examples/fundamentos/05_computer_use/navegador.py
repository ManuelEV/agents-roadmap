"""El «computador» que maneja el agente: una pestaña de Chromium sin interfaz, controlada con Playwright.

Computer use es una herramienta del lado del cliente: el modelo solo pide acciones («clic en 512,340»,
«escribe 5102», «captura») y TU código las ejecuta y devuelve el resultado. Esta clase traduce los 17
miembros del toolset `computer_toolset_20260801` a llamadas de Playwright.

Aislamiento: la pestaña solo puede cargar la URL inicial (file://…); cualquier otra solicitud de red se
aborta. Para un agente que navega sitios reales necesitas una VM o contenedor dedicado, sin credenciales.
"""
from __future__ import annotations

import base64

from playwright.sync_api import sync_playwright

# Nombres de teclas estilo xdotool (los que usa el modelo) -> Playwright
TECLAS = {
    "return": "Enter", "enter": "Enter", "ctrl": "Control", "control": "Control", "alt": "Alt", "shift": "Shift",
    "super": "Meta", "cmd": "Meta", "meta": "Meta", "esc": "Escape", "escape": "Escape", "backspace": "Backspace",
    "delete": "Delete", "tab": "Tab", "space": "Space", "up": "ArrowUp", "down": "ArrowDown", "left": "ArrowLeft",
    "right": "ArrowRight", "page_up": "PageUp", "page_down": "PageDown", "prior": "PageUp", "next": "PageDown",
    "home": "Home", "end": "End",
}
BOTONES = {"left_click": ("left", 1), "right_click": ("right", 1), "middle_click": ("middle", 1),
           "double_click": ("left", 2), "triple_click": ("left", 3)}


def _combo(texto: str) -> str:
    return "+".join(TECLAS.get(t.lower(), t) for t in texto.split("+"))


class Navegador:
    # 1280×800 es la resolución recomendada para aplicaciones web y cabe en el límite de imagen del modelo,
    # así que las coordenadas del modelo son píxeles reales de la página (sin reescalar).
    def __init__(self, url: str, ancho: int = 1280, alto: int = 800, visible: bool = False):
        self.url, self.ancho, self.alto, self.visible = url, ancho, alto, visible
        self.x, self.y = ancho // 2, alto // 2

    def __enter__(self) -> "Navegador":
        self._pw = sync_playwright().start()
        try:  # usa el Chrome instalado; si no hay, el Chromium de `playwright install chromium`
            self._browser = self._pw.chromium.launch(channel="chrome", headless=not self.visible)
        except Exception:
            self._browser = self._pw.chromium.launch(headless=not self.visible)
        contexto = self._browser.new_context(viewport={"width": self.ancho, "height": self.alto}, device_scale_factor=1)
        contexto.route("**/*", lambda ruta: ruta.continue_() if ruta.request.url.startswith(self.url) else ruta.abort())
        self.page = contexto.new_page()
        self.page.goto(self.url)
        return self

    def __exit__(self, *exc) -> None:
        self._browser.close()
        self._pw.stop()

    def captura(self, region: list | None = None) -> bytes:
        if region:
            x0, y0, x1, y1 = region
            return self.page.screenshot(type="png", clip={"x": x0, "y": y0, "width": x1 - x0, "height": y1 - y0})
        return self.page.screenshot(type="png")

    def _mover(self, coordenada: list | None) -> None:
        if coordenada:
            self.x, self.y = coordenada
            self.page.mouse.move(self.x, self.y)

    def ejecutar(self, miembro: str, entrada: dict):
        """Ejecuta un miembro del toolset. Devuelve el `content` del tool_result (texto o lista con imagen)."""
        teclado, raton = self.page.keyboard, self.page.mouse
        modificadores = [TECLAS.get(m.lower(), m) for m in entrada.get("text", "").split("+") if m] if miembro in BOTONES or miembro in ("scroll", "left_click_drag") else []

        if miembro in ("screenshot", "zoom"):
            png = self.captura(entrada.get("region"))
            return [{"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": base64.b64encode(png).decode()}}]
        if miembro == "cursor_position":
            return f"X={self.x}, Y={self.y}"
        if miembro == "wait":
            self.page.wait_for_timeout(min(entrada["duration"], 5) * 1000)  # tope de 5 s: es una página local
            return "OK"
        if miembro == "type":
            teclado.type(entrada["text"])
            return "OK"
        if miembro == "key":
            for _ in range(entrada.get("repeat", 1)):
                teclado.press(_combo(entrada["text"]))
            return "OK"
        if miembro == "hold_key":
            teclas = _combo(entrada["text"]).split("+")
            for t in teclas:
                teclado.down(t)
            self.page.wait_for_timeout(min(entrada["duration"], 5) * 1000)
            for t in reversed(teclas):
                teclado.up(t)
            return "OK"
        if miembro == "mouse_move":
            self._mover(entrada["coordinate"])
            return "OK"
        if miembro == "left_mouse_down":
            raton.down()
            return "OK"
        if miembro == "left_mouse_up":
            raton.up()
            return "OK"

        for m in modificadores:
            teclado.down(m)
        try:
            if miembro in BOTONES:
                boton, clics = BOTONES[miembro]
                self._mover(entrada.get("coordinate"))
                raton.click(self.x, self.y, button=boton, click_count=clics)
            elif miembro == "left_click_drag":
                self._mover(entrada["start_coordinate"])
                raton.down()
                self.x, self.y = entrada["coordinate"]
                raton.move(self.x, self.y, steps=12)
                raton.up()
            elif miembro == "scroll":
                self._mover(entrada.get("coordinate"))
                paso = 100 * entrada["scroll_amount"]
                dx, dy = {"up": (0, -paso), "down": (0, paso), "left": (-paso, 0), "right": (paso, 0)}[entrada["scroll_direction"]]
                raton.wheel(dx, dy)
            else:
                raise ValueError(f"miembro no implementado: {miembro}")
        finally:
            for m in reversed(modificadores):
                teclado.up(m)
        return "OK"
