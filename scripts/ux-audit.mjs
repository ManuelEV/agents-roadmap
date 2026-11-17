/* Auditoría de UX: busca problemas que las capturas no muestran.

   pnpm ux                      → todas las páginas, en teléfono (390×844)
   pnpm ux aws google/datos     → una sección o una lección
   Opciones: --desktop (1280×800) · --json <archivo>

   Qué revisa en cada página:
     A. Respuesta fuera de pantalla: toca los controles de cada lab y cuenta cuántas
        veces lo que cambió quedó fuera de vista (aparece el aviso «Ver lo que cambió»)
        o se abrió la hoja inferior de detalle.
     B. Objetivos táctiles pequeños (< 28 px en algún lado).
     C. Texto diminuto (< 11 px).
     D. Zonas con scroll horizontal propio que no son código, tablas ni diagramas.
     E. Desborde horizontal de la página.
   Necesita el servidor de desarrollo (pnpm dev) y Chrome. */

import { writeFileSync } from 'node:fs'
import puppeteer from 'puppeteer-core'
import { BASE, CHROME, resolveTargets } from './_targets.mjs'

const args = process.argv.slice(2)
const desktop = args.includes('--desktop')
const jsonAt = args.indexOf('--json')
const jsonFile = jsonAt >= 0 ? args[jsonAt + 1] : null
const targets = resolveTargets(args.filter((a, i) => !a.startsWith('--') && (jsonAt < 0 || i !== jsonAt + 1)))
const vp = desktop ? { width: 1280, height: 800, deviceScaleFactor: 1 } : { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
const report = []

for (const t of targets) {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setViewport(vp)
  try {
    await page.goto(`${BASE}${t.path}`, { waitUntil: 'networkidle0', timeout: 45000 })
    await new Promise((r) => setTimeout(r, 700))

    const stat = await page.evaluate(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
      const vis = (el) => {
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'
      }
      const cls = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`
      const main = document.querySelector('main')

      // B. objetivos táctiles
      const small = {}
      for (const el of main.querySelectorAll('button, [role="tab"], [role="button"], input[type="range"], input[type="checkbox"], select, .is-clickable')) {
        if (!vis(el)) continue
        const r = el.getBoundingClientRect()
        if (r.width < 28 || r.height < 28) {
          const k = cls(el)
          small[k] = small[k] || { n: 0, w: Math.round(r.width), h: Math.round(r.height) }
          small[k].n++
        }
      }
      // C. texto diminuto
      const tiny = {}
      const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT)
      while (walker.nextNode()) {
        const node = walker.currentNode
        if (!node.nodeValue.trim()) continue
        const el = node.parentElement
        if (!el || !vis(el) || el.closest('svg')) continue
        const fs = parseFloat(getComputedStyle(el).fontSize)
        if (fs < 11) {
          const k = `${cls(el)} ${fs}px`
          tiny[k] = (tiny[k] || 0) + 1
        }
      }
      // texto diminuto dentro de SVG (tamaño efectivo en pantalla)
      for (const tx of main.querySelectorAll('svg text')) {
        if (!vis(tx) || !tx.textContent.trim()) continue
        const svg = tx.ownerSVGElement
        const vb = svg.viewBox?.baseVal
        const k = vb && vb.width ? svg.getBoundingClientRect().width / vb.width : 1
        const eff = parseFloat(getComputedStyle(tx).fontSize) * k
        if (eff < 9.5) {
          const key = `svg text.${tx.getAttribute('class') || ''} ~${eff.toFixed(1)}px (${cls(svg)})`
          tiny[key] = (tiny[key] || 0) + 1
        }
      }
      // D. scroll horizontal propio
      const scrollers = {}
      for (const el of main.querySelectorAll('*')) {
        if (el.scrollWidth - el.clientWidth > 12) {
          const ox = getComputedStyle(el).overflowX
          if (ox !== 'auto' && ox !== 'scroll') continue
          if (!vis(el)) continue
          if (el.matches('pre, .flow-scroll, .table-wrap, .gc-table-wrap, .term-body, .tabs-list, .planner-needs, .cmp-concepts, .shiki') || el.closest('.code, .codeblock, .term')) continue
          const k = cls(el)
          scrollers[k] = (scrollers[k] || 0) + 1
        }
      }
      // E. desborde de página
      const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth

      // A. respuesta fuera de pantalla
      const labs = []
      const skip = /Paso anterior|Paso siguiente|Reproducir|Pausar|Reiniciar|Copiar|Seguir el paso|Cerrar|Mostrar todo/
      for (const lab of main.querySelectorAll('.lab')) {
        const title = lab.querySelector('.lab-title')?.textContent?.trim() ?? '(sin título)'
        const controls = [...lab.querySelectorAll('button, [role="tab"]')].filter((b) => vis(b) && !b.disabled && !skip.test(b.getAttribute('aria-label') || '') && !skip.test(b.title || '') && !b.closest('.player, .term-ctl, .code-head, .flow-wrap > button'))
        // como mucho 3 por grupo (mismo padre) y 9 por lab
        const perParent = new Map()
        const pick = []
        for (const c of controls) {
          const n = perParent.get(c.parentElement) || 0
          if (n >= 3) continue
          perParent.set(c.parentElement, n + 1)
          pick.push(c)
          if (pick.length >= 9) break
        }
        let off = 0
        let sheet = 0
        const offLabels = []
        const chains = []
        for (const c of pick) {
          if (!c.isConnected) continue
          c.scrollIntoView({ block: 'center' })
          await sleep(120)
          c.click()
          await sleep(650)
          if (document.querySelector('[data-detail-sheet]')) {
            sheet++
            document.querySelector('[data-detail-sheet] button[aria-label="Cerrar detalle"]')?.click()
            await sleep(350)
          } else if (document.querySelector('.change-hint')) {
            off++
            if (offLabels.length < 3) offLabels.push((c.textContent || c.getAttribute('aria-label') || '').trim().slice(0, 28))
            const chain = document.querySelector('.change-hint')?.getAttribute('data-chain')
            if (chain && !chains.includes(chain)) chains.push(chain)
          }
        }
        // paso a paso: ¿la narración queda visible tras avanzar?
        let stepOff = 0
        const next = lab.querySelector('button[aria-label="Paso siguiente"]')
        if (next && !next.disabled) {
          next.scrollIntoView({ block: 'start' })
          window.scrollBy(0, -100)
          await sleep(150)
          next.click()
          await sleep(650)
          if (document.querySelector('.change-hint')) stepOff = 1
        }
        if (pick.length || next) labs.push({ title, tested: pick.length, off, sheet, stepOff, offLabels, chains })
      }
      return { small, tiny, scrollers, overflow, labs }
    })
    report.push({ path: t.path, errors, ...stat })
    const bad = stat.labs.filter((l) => l.off || l.stepOff)
    console.log(`${bad.length || stat.overflow > 0 ? '•' : '✓'} ${t.path}  labs con respuesta fuera de pantalla: ${bad.length}/${stat.labs.length}${stat.overflow > 0 ? `  DESBORDE ${stat.overflow}px` : ''}${errors.length ? '  ERRORES ' + errors[0] : ''}`)
    for (const l of bad) {
      console.log(`     – «${l.title}»: ${l.off}/${l.tested} controles${l.stepOff ? ' + paso a paso' : ''}  ${l.offLabels.join(' | ')}`)
      for (const c of l.chains.slice(0, 3)) console.log(`         ↳ ${c}`)
    }
  } catch (e) {
    console.log(`✗ ${t.path}: ${e.message}`)
  }
  await page.close()
}
await browser.close()

// resumen agregado
const agg = (key) => {
  const m = {}
  for (const r of report) for (const [k, v] of Object.entries(r[key] || {})) m[k] = (m[k] || 0) + (typeof v === 'number' ? v : v.n)
  return Object.entries(m).sort((a, b) => b[1] - a[1])
}
const labsAll = report.flatMap((r) => r.labs.map((l) => ({ ...l, path: r.path })))
console.log(`\n== Resumen (${desktop ? 'escritorio 1280×800' : 'teléfono 390×844'}) ==`)
console.log(`Labs revisados: ${labsAll.length} · con respuesta fuera de pantalla: ${labsAll.filter((l) => l.off).length} · que abren hoja de detalle: ${labsAll.filter((l) => l.sheet).length} · paso a paso sin respuesta visible: ${labsAll.filter((l) => l.stepOff).length}`)
console.log('\nObjetivos táctiles < 28 px:')
for (const [k, n] of agg('small').slice(0, 25)) console.log(`  ${String(n).padStart(4)}  ${k}`)
console.log('\nTexto < 11 px:')
for (const [k, n] of agg('tiny').slice(0, 30)) console.log(`  ${String(n).padStart(4)}  ${k}`)
console.log('\nScroll horizontal propio inesperado:')
for (const [k, n] of agg('scrollers').slice(0, 20)) console.log(`  ${String(n).padStart(4)}  ${k}`)
if (jsonFile) writeFileSync(jsonFile, JSON.stringify(report, null, 1))
