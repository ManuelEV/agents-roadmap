"""Módulo 05 · Documentos: el modelo lee un PDF (texto + imagen de cada página), sin OCR aparte.

    pip install -e ".[navegador]"        (Playwright se usa aquí solo para generar el PDF de ejemplo)
    python 05_computer_use/documentos.py

Dos usos distintos del mismo PDF (runs/factura_4821.pdf, dos páginas):
1. Extracción a un esquema (salida estructurada) + validación aritmética EN CÓDIGO: que el JSON cumpla
   el esquema no significa que los números estén bien leídos.
2. Preguntas con citas: cada afirmación vuelve con el texto exacto y la página de donde salió.
   Citas y salida estructurada no se pueden combinar en una misma llamada (la API responde 400).
"""
import base64
import sys
from pathlib import Path

from pydantic import BaseModel

from andes.llm import MODEL, Uso, cliente, crear

PDF = Path(__file__).resolve().parent.parent / "runs" / "factura_4821.pdf"

HTML = """<html><body style="font:14px sans-serif;margin:40px">
<h1>Andes Market SpA</h1><p>RUT 76.123.456-7 · Av. Apoquindo 4500, Las Condes</p>
<h2>Factura electrónica N.º 0018842</h2>
<p>Fecha de emisión: 30 de octubre de 2026<br>Cliente: Camila Rojas · RUT 17.654.321-8<br>Pedido asociado: 4821</p>
<table border="1" cellpadding="8" style="border-collapse:collapse;width:100%">
<tr><th>Descripción</th><th>Cantidad</th><th>Precio unitario neto</th><th>Subtotal neto</th></tr>
<tr><td>Zapatillas Trail Andes talla 40</td><td>1</td><td>$37.807</td><td>$37.807</td></tr>
<tr><td>Calcetines técnicos (pack de 3)</td><td>1</td><td>$8.403</td><td>$8.403</td></tr>
</table>
<p style="text-align:right">Neto: $46.210<br>IVA (19%): $8.780<br><b>Total: $54.990</b></p>
<p>Medio de pago: tarjeta de crédito, 3 cuotas sin interés.</p>
<div style="page-break-before:always"></div>
<h2>Condiciones de venta</h2>
<p>1. Garantía. Las zapatillas tienen 3 meses de garantía sobre suela y costuras. Los demás productos tienen
6 meses de garantía legal por fallas de fabricación.</p>
<p>2. Devoluciones. El cliente puede devolver los productos dentro de 30 días corridos desde la entrega,
sin uso y con sus etiquetas. Los calcetines no tienen devolución por razones de higiene, salvo falla de fábrica.</p>
<p>3. Reembolsos. Se realizan al mismo medio de pago y demoran entre 5 y 10 días hábiles desde la recepción
del producto en bodega.</p>
</body></html>"""


class Item(BaseModel):
    descripcion: str
    cantidad: int
    precio_unitario_neto: int


class Factura(BaseModel):
    numero: str
    fecha_emision: str
    cliente: str
    pedido: str
    items: list[Item]
    neto: int
    iva: int
    total: int


def generar_pdf() -> None:
    from playwright.sync_api import sync_playwright

    PDF.parent.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        try:
            navegador = pw.chromium.launch(channel="chrome")
        except Exception:
            navegador = pw.chromium.launch()
        pagina = navegador.new_page()
        pagina.set_content(HTML)
        pagina.pdf(path=str(PDF), format="A4")
        navegador.close()


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    if not PDF.exists():
        generar_pdf()
    client, uso = cliente(), Uso()
    fuente = {"type": "base64", "media_type": "application/pdf", "data": base64.standard_b64encode(PDF.read_bytes()).decode()}

    # 1) Extracción estructurada. El documento va ANTES del texto de la pregunta.
    resp = client.messages.parse(
        model=MODEL, max_tokens=4000, output_format=Factura,
        messages=[{"role": "user", "content": [
            {"type": "document", "source": fuente},
            {"type": "text", "text": "Extrae los datos de esta factura. Montos en pesos, como enteros sin puntos."},
        ]}],
    )
    uso.sumar(resp.model, resp.usage, 0)
    factura = resp.parsed_output
    if factura is None:
        sys.exit(f"Sin extracción (stop_reason={resp.stop_reason})")
    print(factura.model_dump_json(indent=2))
    suma = sum(i.cantidad * i.precio_unitario_neto for i in factura.items)
    print(f"\nValidación en código: Σ ítems = {suma} {'✓' if suma == factura.neto else '✗'} neto {factura.neto} · "
          f"neto + IVA = {factura.neto + factura.iva} {'✓' if factura.neto + factura.iva == factura.total else '✗'} total {factura.total}")

    # 2) Pregunta con citas.
    resp = crear(client, uso=uso, model=MODEL, max_tokens=4000, messages=[{"role": "user", "content": [
        {"type": "document", "source": fuente, "title": "Factura 0018842", "citations": {"enabled": True}},
        {"type": "text", "text": "¿Puede la clienta devolver los calcetines? ¿Y cuánta garantía tienen las zapatillas?"},
    ]}])
    print("\n── Respuesta con citas ──")
    for bloque in resp.content:
        if bloque.type != "text":
            continue
        print(bloque.text, end="")
        for cita in bloque.citations or []:
            print(f"\n    ↳ pág. {getattr(cita, 'start_page_number', '?')}: «{cita.cited_text.strip()[:140]}»", end="")
    print(f"\n\n{uso.resumen()}")


if __name__ == "__main__":
    main()
