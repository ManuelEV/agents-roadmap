// Envuelve la ficha de detalle de un lab en <DetailDock> (ver src/components/Reveal.tsx).
//   node scripts/wrap-detail.mjs <archivo.tsx> <texto que identifica la línea de apertura> <expresión de la clave>
// Busca la línea que contiene el texto (debe abrir un elemento JSX), encuentra su cierre por
// indentación e inserta <DetailDock k={clave}> … </DetailDock> alrededor. Agrega el import si falta.
import { readFileSync, writeFileSync } from 'node:fs'

const [file, needle, key] = process.argv.slice(2)
const lines = readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n')
const open = lines.findIndex((l) => l.includes(needle))
if (open < 0) {
  console.log(`✗ ${file}: no se encontró «${needle}»`)
  process.exit(1)
}
if (lines.slice(Math.max(0, open - 2), open).some((l) => l.includes('<DetailDock'))) {
  console.log(`· ${file}: ya está envuelto`)
  process.exit(0)
}
const indent = lines[open].match(/^\s*/)[0]
const tag = lines[open].trim().match(/^<([A-Za-z.]+)/)?.[1]
if (!tag) {
  console.log(`✗ ${file}: la línea no abre un elemento JSX: ${lines[open].trim().slice(0, 60)}`)
  process.exit(1)
}
let close = -1
if (/\/>\s*$/.test(lines[open])) close = open
else
  for (let i = open + 1; i < lines.length; i++) {
    if (lines[i] === `${indent}</${tag}>` || (lines[i].startsWith(`${indent}/>`) && i > open)) {
      close = i
      break
    }
  }
if (close < 0) {
  console.log(`✗ ${file}: no se encontró el cierre de <${tag}>`)
  process.exit(1)
}
for (let i = open; i <= close; i++) lines[i] = `  ${lines[i]}`
lines.splice(close + 1, 0, `${indent}</DetailDock>`)
lines.splice(open, 0, key ? `${indent}<DetailDock k={${key}}>` : `${indent}<DetailDock>`)
let src = lines.join('\n')
if (!/import \{[^}]*\bDetailDock\b[^}]*\} from '@\/components\/ui'/.test(src)) {
  if (/import \{([^}]*)\} from '@\/components\/ui'/.test(src)) src = src.replace(/import \{([^}]*)\} from '@\/components\/ui'/, (m, names) => `import {${names.replace(/\s*$/, '')}, DetailDock } from '@/components/ui'`)
  else src = `import { DetailDock } from '@/components/ui'\n${src}`
}
writeFileSync(file, src)
console.log(`✓ ${file}: <${tag}> (líneas ${open + 1}–${close + 1}) envuelto con k={${key}}`)
