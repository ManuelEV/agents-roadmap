// Fuzz de interactividad: entra a cada parada, pulsa "Paso siguiente" hasta el final en cada PlayerBar,
// luego hace clic una vez en cada botón visible (salvo navegación) y reporta errores de página/consola.
//   pnpm fuzz              → todas las paradas
//   pnpm fuzz aws          → una línea
//   pnpm fuzz aws/desplegar
import puppeteer from 'puppeteer-core'
import { BASE, CHROME, resolveTargets } from './_targets.mjs'

const targets = resolveTargets(process.argv.slice(2)).filter((t) => t.path.split('/').length === 3)
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
let bad = 0
for (const t of targets) {
  const page = await browser.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message))
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
  await page.setViewport({ width: 1280, height: 900 })
  await page.goto(`${BASE}${t.path}`, { waitUntil: 'networkidle0', timeout: 45000 })
  // 1) avanzar todos los players
  let steps = 0
  for (let i = 0; i < 60; i++) {
    const n = await page.$$eval('button[aria-label="Paso siguiente"]:not([disabled])', (bs) => {
      bs.forEach((b) => b.click())
      return bs.length
    })
    if (!n) break
    steps += n
    await new Promise((r) => setTimeout(r, 120))
  }
  // 2) clic en cada botón (una vez), saltando navegación/tema
  const clicked = await page.evaluate(async () => {
    const skip = /Abrir menú|Cambiar a tema|Reiniciar|Paso anterior|Paso siguiente|Reproducir|Pausar|Mostrar todo|Copiar|Buscar/
    const bs = [...document.querySelectorAll('main button')].filter((b) => !skip.test(b.getAttribute('aria-label') || '') && !skip.test(b.textContent || '') && !b.disabled)
    let c = 0
    for (const b of bs) {
      b.click()
      c++
      await new Promise((r) => setTimeout(r, 15))
    }
    return c
  })
  await new Promise((r) => setTimeout(r, 800))
  if (errs.length) bad++
  console.log(`${errs.length ? `✗ ${errs.slice(0, 3).join(' | ')}` : '✓'} ${t.path}: ${steps} pasos avanzados, ${clicked} botones pulsados`)
  await page.close()
}
await browser.close()
console.log(bad ? `${bad} paradas con errores` : 'Sin errores de interacción')
process.exit(bad ? 1 : 0)
