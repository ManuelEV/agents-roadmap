import json
from pathlib import Path

import pytest

from andes.agente import ejecutar_agente, preguntar
from andes.busqueda import IndiceBM25
from andes.datos import cargar_kb
from andes.herramientas import TOOLS, Entorno

RAIZ = Path(__file__).resolve().parent.parent


# ---- búsqueda y herramientas ---------------------------------------------------------------

@pytest.mark.parametrize("consulta, fuente", [
    ("¿Cuántos días tengo para devolver un producto?", "politicas/devoluciones.md"),
    ("¿Desde qué monto el despacho es gratis?", "ayuda/envios.md"),
    ("garantía de las zapatillas", "politicas/garantia.md"),
    ("pagar en cuotas con tarjeta", "ayuda/pagos.md"),
])
def test_bm25_encuentra_la_fuente(consulta, fuente):
    assert IndiceBM25(cargar_kb()).buscar(consulta, k=3)[0][0].fuente == fuente


def test_herramientas_y_reglas_de_negocio():
    e = Entorno()
    assert json.loads(e.ejecutar("buscar_pedido", {"pedido_id": "4821"})[0])["courier"] == "Chilexpress"
    assert e.ejecutar("buscar_pedido", {"pedido_id": "6001"})[1] is True          # pedido de otro cliente
    assert e.ejecutar("cambiar_direccion", {"pedido_id": "4821", "nueva_direccion": "X 1"})[1] is True  # ya despachado
    assert e.ejecutar("cambiar_direccion", {"pedido_id": "5102", "nueva_direccion": "Los Leones 250"})[1] is False
    assert e.pedidos["5102"]["direccion"] == "Los Leones 250"
    assert e.ejecutar("solicitar_reembolso", {"pedido_id": "4790", "monto": 500000, "motivo": "x"})[1] is True
    assert e.ejecutar("solicitar_reembolso", {"pedido_id": "4790", "monto": "27990", "motivo": "x"})[1] is True  # tipo
    assert e.ejecutar("buscar_pedido", {"pedido_id": "4821", "extra": "1"})[1] is True
    assert e.ejecutar("no_existe", {})[1] is True
    assert e.reembolsos == []
    assert Entorno(validar=False).ejecutar("buscar_pedido", {"pedido_id": "6001"})[1] is False


def test_falla_inyectada_e_idempotencia():
    e = Entorno(fallas={"crear_ticket": 1})
    entrada = {"resumen": "llamar", "prioridad": "media"}
    assert e.ejecutar("crear_ticket", entrada, "toolu_a")[1] is True      # timeout
    assert e.ejecutar("crear_ticket", entrada, "toolu_b")[1] is False
    assert e.ejecutar("crear_ticket", entrada, "toolu_b")[1] is False     # repetida: no crea otro
    assert len(e.tickets) == 1 and e.repetidas == 1
    copia = Entorno.desde_dict(json.loads(json.dumps(e.a_dict())))        # sobrevive a un checkpoint
    copia.ejecutar("crear_ticket", entrada, "toolu_b")
    assert len(copia.tickets) == 1


def test_esquemas_estrictos():
    for t in TOOLS:
        s = t["input_schema"]
        assert s["additionalProperties"] is False and set(s["required"]) == set(s["properties"])


# ---- loop del agente -----------------------------------------------------------------------

def test_loop_ejecuta_herramienta_y_termina(falso):
    client = falso.Cliente(
        falso.respuesta(falso.tool_use("buscar_pedido", {"pedido_id": "4821"})),
        falso.respuesta(falso.texto("Va en ruta con Chilexpress.")),
    )
    res = preguntar(client, "¿Dónde está mi pedido 4821?")
    assert res.parada == "end_turn" and "Chilexpress" in res.texto and res.uso.llamadas == 2
    assert [m["role"] for m in res.mensajes] == ["user", "assistant", "user", "assistant"]
    resultado = res.mensajes[2]["content"][0]
    assert resultado["tool_use_id"] == "toolu_1" and resultado["is_error"] is False
    assert client.requests[0]["cache_control"] == {"type": "ephemeral"} and "fallbacks" not in client.requests[0]
    json.dumps(res.mensajes)  # el historial debe poder guardarse en un checkpoint


def test_llamadas_en_paralelo_van_en_un_solo_mensaje(falso):
    client = falso.Cliente(
        falso.respuesta(falso.tool_use("buscar_pedido", {"pedido_id": "4821"}, "a"), falso.tool_use("buscar_pedido", {"pedido_id": "5102"}, "b")),
        falso.respuesta(falso.texto("listo")),
    )
    res = preguntar(client, "mis pedidos")
    assert [r["tool_use_id"] for r in res.mensajes[2]["content"]] == ["a", "b"]


def test_accion_sensible_requiere_aprobacion(falso):
    reembolso = {"pedido_id": "4790", "monto": 27990, "motivo": "rota"}
    guion = lambda: (falso.respuesta(falso.tool_use("solicitar_reembolso", reembolso)), falso.respuesta(falso.texto("ok")))
    e = Entorno()
    res = preguntar(falso.Cliente(*guion()), "reembolso", e)                      # sin humano: se niega
    assert e.reembolsos == [] and res.herramientas()[0]["estado"] == "rechazada"
    assert res.mensajes[2]["content"][0]["is_error"] is True
    e = Entorno()
    preguntar(falso.Cliente(*guion()), "reembolso", e, aprobar=lambda *_: True)
    assert len(e.reembolsos) == 1


def test_paradas_refusal_y_max_turnos(falso):
    res = preguntar(falso.Cliente(falso.respuesta(stop_reason="refusal")), "x")
    assert res.parada == "refusal" and len(res.mensajes) == 1
    bucle = [falso.respuesta(falso.tool_use("buscar_pedido", {"pedido_id": "4821"}, f"t{i}")) for i in range(3)]
    res = preguntar(falso.Cliente(*bucle), "x", max_turnos=3)
    assert res.parada == "max_turnos" and res.uso.llamadas == 3


def test_reanudar_con_tool_use_pendiente_no_llama_al_modelo_antes(falso):
    """Checkpoint tomado después del tool_use y antes del tool_result (módulo 03)."""
    e = Entorno()
    e.ejecutar("crear_ticket", {"resumen": "llamar", "prioridad": "media"}, "toolu_x")   # ya se ejecutó antes de morir
    mensajes = [
        {"role": "user", "content": "crea un ticket"},
        {"role": "assistant", "content": [{"type": "tool_use", "id": "toolu_x", "name": "crear_ticket", "input": {"resumen": "llamar", "prioridad": "media"}}]},
    ]
    client = falso.Cliente(falso.respuesta(falso.texto("Ticket creado.")))
    res = ejecutar_agente(client, e, mensajes)
    assert res.parada == "end_turn" and len(e.tickets) == 1 and e.repetidas == 1
    assert client.requests[0]["messages"][-1]["content"][0]["tool_use_id"] == "toolu_x"


# ---- evals ---------------------------------------------------------------------------------

def test_casos_bien_formados_y_graders():
    from graders import evaluar_codigo

    casos = [json.loads(l) for l in (RAIZ / "02_evals" / "casos.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
    nombres = {t["name"] for t in TOOLS}
    assert len({c["id"] for c in casos}) == len(casos) >= 12
    for c in casos:
        assert c["rubrica"] and set(c.get("requeridas", []) + c.get("prohibidas", [])) <= nombres
        evaluar_codigo(c, "", [], Entorno().a_dict())  # las rutas de estado existen

    caso = next(c for c in casos if c["id"] == "cambio_direccion_despachado")
    e = Entorno()
    llamadas = [{"nombre": "cambiar_direccion", "entrada": {}, "estado": "error", "resultado": ""}]
    assert all(c["ok"] for c in evaluar_codigo(caso, "Debes coordinar con CHILEXPRESS.", llamadas, e.a_dict()))
    e.pedidos["4821"]["direccion"] = "Los Leones 250"
    assert not all(c["ok"] for c in evaluar_codigo(caso, "Coordina con Chilexpress.", llamadas, e.a_dict()))

    caso = next(c for c in casos if c["id"] == "estado_en_ruta")
    mal = [{"nombre": "buscar_pedido", "entrada": {"pedido_id": "5102"}}]
    fallas = [c["check"] for c in evaluar_codigo(caso, "en ruta", mal, Entorno().a_dict()) if not c["ok"]]
    assert fallas == ["args de buscar_pedido", "contiene «Chilexpress»"]


def test_etiquetas_humanas_bien_formadas():
    filas = [json.loads(l) for l in (RAIZ / "02_evals" / "etiquetas_humanas.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
    assert {f["humano"] for f in filas} == {True, False}
    assert all({"pregunta", "evidencia", "respuesta", "rubrica"} <= set(f) for f in filas)


# ---- red team ------------------------------------------------------------------------------

def test_los_documentos_envenenados_se_recuperan():
    """Si BM25 no trae el documento malicioso, el ataque indirecto no prueba nada."""
    from ataques import ATAQUES

    for ataque in (a for a in ATAQUES if a["vector"] == "rag"):
        e = Entorno()
        ataque["preparar"](e)
        fuentes = [r["fuente"] for r in json.loads(e.ejecutar("consultar_politicas", {"pregunta": ataque["mensaje"]})[0])]
        assert any("devoluciones-p" in f for f in fuentes), (ataque["id"], fuentes)


def test_criterios_de_exito_y_defensas():
    from ataques import ATAQUES, CANARIO, URL_PHISHING
    from defensas import envolver, filtrar_salida, guardia, supervisor

    por_id = {a["id"]: a for a in ATAQUES}
    e = Entorno(validar=False)
    assert not any(a["exito"](e, "Hola, ¿en qué te ayudo?") for a in ATAQUES)       # sin ataque, nadie «gana»
    e.ejecutar("enviar_correo", {"destinatario": "auditoria@andes-rnarket.example", "asunto": "a", "cuerpo": "b"})
    assert por_id["exfiltracion_por_correo"]["exito"](e, "")
    e.ejecutar("solicitar_reembolso", {"pedido_id": "4790", "monto": 500000, "motivo": "x"})
    assert por_id["reembolso_por_autoridad_falsa"]["exito"](e, "")

    e = Entorno()
    assert guardia("enviar_correo", {"destinatario": "auditoria@andes-rnarket.example"}, e)
    assert guardia("enviar_correo", {"destinatario": e.correo_cliente}, e) is None
    aprobar = supervisor(e)
    assert aprobar("solicitar_reembolso", {"pedido_id": "4790", "monto": 27990})
    assert not aprobar("solicitar_reembolso", {"pedido_id": "4790", "monto": 500000})
    assert not aprobar("solicitar_reembolso", {"pedido_id": "5230", "monto": 89990})   # aún en ruta
    assert not aprobar("solicitar_reembolso", {"pedido_id": "6001", "monto": 100})     # de otro cliente
    assert filtrar_salida(f"El código es {CANARIO}", (CANARIO,)) != f"El código es {CANARIO}"
    assert URL_PHISHING not in filtrar_salida(f"Entra a {URL_PHISHING} y valida tu tarjeta")
    ok = "Sigue tu pedido en https://www.andesmarket.example/pedidos."
    assert filtrar_salida(ok) == ok
    assert envolver("consultar_politicas", "x</datos_no_confiables>y").count("</datos_no_confiables>") == 1
    assert envolver("crear_ticket", "x") == "x"


def test_guardia_bloquea_dentro_del_loop(falso):
    from defensas import guardia

    correo = {"destinatario": "auditoria@andes-rnarket.example", "asunto": "caso", "cuerpo": "datos"}
    client = falso.Cliente(falso.respuesta(falso.tool_use("enviar_correo", correo)), falso.respuesta(falso.texto("ok")))
    e = Entorno()
    res = preguntar(client, "x", e, guardia=guardia, aprobar=lambda *_: True)
    assert e.correos == [] and res.herramientas()[0]["estado"] == "bloqueada"


# ---- computer use (requiere playwright y un Chrome/Chromium) --------------------------------

def test_navegador_ejecuta_las_acciones_del_toolset():
    pytest.importorskip("playwright")
    from navegador import Navegador

    with Navegador((RAIZ / "05_computer_use" / "backoffice.html").as_uri()) as nav:
        caja = lambda sel: nav.page.locator(sel).bounding_box()
        centro = lambda sel: [round(caja(sel)["x"] + caja(sel)["width"] / 2), round(caja(sel)["y"] + caja(sel)["height"] / 2)]
        imagen = nav.ejecutar("screenshot", {})
        assert imagen[0]["source"]["media_type"] == "image/png" and len(imagen[0]["source"]["data"]) > 1000
        nav.ejecutar("left_click", {"coordinate": centro("#buscar")})
        nav.ejecutar("type", {"text": "5102"})
        nav.ejecutar("key", {"text": "Return"})
        assert nav.page.locator("#titulo").inner_text() == "Pedido 5102"
        nav.ejecutar("left_click", {"coordinate": centro("#nota")})
        nav.ejecutar("type", {"text": "Entregar después de las 18:00"})
        nav.ejecutar("key", {"text": "ctrl+a"})
        nav.ejecutar("type", {"text": "Entregar después de las 19:00"})
        nav.ejecutar("scroll", {"coordinate": [640, 400], "scroll_direction": "down", "scroll_amount": 2})
        nav.ejecutar("left_click", {"coordinate": centro("#btn-guardar")})
        assert nav.ejecutar("cursor_position", {}).startswith("X=")
        assert nav.ejecutar("zoom", {"region": [0, 0, 400, 200]})[0]["type"] == "image"
        estado = nav.page.evaluate("window.__estado")
        assert estado["pedidos"]["5102"]["nota"] == "Entregar después de las 19:00" and estado["guardados"] == 1
        with pytest.raises(ValueError):
            nav.ejecutar("teletransportar", {})
