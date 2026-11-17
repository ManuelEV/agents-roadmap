/* Captura páginas con Chrome headless (puppeteer-core) para revisar la UX.

   pnpm visual                      → todas las páginas (claro y oscuro, escritorio y móvil)
   pnpm visual aws                  → la sección AWS completa
   pnpm visual aws/primer-agente    → una lección
   pnpm visual home comparar        → páginas sueltas
   Opciones: --no-mobile · --light (solo tema claro) · --click (pulsa los "play" antes de capturar)

   Las capturas quedan en scripts/shots/<nombre>-<tema>-<ancho>.png. También reporta
   desbordes horizontales, errores de consola y excepciones de página.
   Necesita el servidor de desarrollo (pnpm dev) y Chrome (CHROME_PATH si no está en la ruta por defecto). */

import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import puppeteer from 'puppeteer-core'
import { BASE, CHROME, resolveTargets } from './_targets.mjs'

const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const targets = resolveTargets(args.filter((a) => !a.startsWith('--')))
const outDir = join(process.cwd(), 'scripts', 'shots')
mkdirSync(outDir, { recursive: true })

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] })
const widths = flag('no-mobile') ? [1280] : [1280, 390]
const themes = flag('light') ? ['light'] : ['dark', 'light']
let problems = 0

for (const t of targets) {
  for (const theme of themes) {
    for (const width of widths) {
      const page = await browser.newPage()
      const errors = []
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text())
      })
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
      await page.setViewport({ width, height: 900, deviceScaleFactor: 1 })
      await page.evaluateOnNewDocument((th) => localStorage.setItem('theme', th), theme)
      try {
        await page.goto(`${BASE}${t.path}`, { waitUntil: 'networkidle0', timeout: 45000 })
        await new Promise((r) => setTimeout(r, 700))
        if (flag('click')) {
          await page.$$eval('button[aria-label="Reproducir"]', (bs) => bs.forEach((b) => b.click()))
          await new Promise((r) => setTimeout(r, 1500))
        }
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        await page.screenshot({ path: join(outDir, `${t.name}-${theme}-${width}.png`), fullPage: true })
        const broken = await page.evaluate(() => /Esta página no existe|falló al renderizar|No se pudo renderizar/.test(document.body.innerText))
        const status = [overflow > 0 ? `DESBORDE ${overflow}px` : '', broken ? 'NO ENCONTRADA / ERROR DE RENDER' : '', ...errors].filter(Boolean)
        if (status.length) problems++
        console.log(`${status.length ? '✗' : '✓'} ${t.path} ${theme} ${width}px ${status.join(' · ')}`)
      } catch (e) {
        problems++
        console.log(`✗ ${t.path} ${theme} ${width}px: ${e.message}`)
      }
      await page.close()
    }
  }
}
await browser.close()
console.log(problems ? `\n${problems} capturas con problemas` : '\nTodo OK')
process.exit(problems ? 1 : 0)
