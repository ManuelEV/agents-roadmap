// Resuelve los destinos de los scripts de verificación a partir de los archivos del repo.
//   (sin argumentos) → todas las páginas
//   google           → todas las lecciones de esa sección
//   aws/primer-agente → una lección
//   home | comparar | referencias → páginas sueltas
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const cwd = process.cwd()
const TRACKS = ['fundamentos', 'guia', 'google', 'aws', 'azure', 'vercel']
const dirs = (p) => {
  try {
    return readdirSync(p, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
  } catch {
    return []
  }
}

export function allStops() {
  const labs = TRACKS.filter((t) => t !== 'guia').flatMap((t) => dirs(join(cwd, 'src', 'tracks', t)).map((s) => `${t}/${s}`))
  const guide = readdirSync(join(cwd, 'src', 'guide', 'content'))
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => `guia/${f.replace(/\.mdx$/, '')}`)
  return [...labs, ...guide]
}

/** Devuelve [{ name, path }] */
export function resolveTargets(args) {
  const stops = allStops()
  const pages = ['home', 'comparar', 'referencias', ...TRACKS]
  const wanted = args.length ? args : [...pages, ...stops]
  const out = []
  for (const a of wanted) {
    if (a === 'home') out.push({ name: 'home', path: '/' })
    else if (a === 'comparar' || a === 'referencias') out.push({ name: a, path: `/${a}` })
    else if (a.includes('/')) out.push({ name: a.replace('/', '--'), path: `/${a}` })
    else if (TRACKS.includes(a) && args.length) {
      out.push({ name: a, path: `/${a}` })
      for (const s of stops.filter((x) => x.startsWith(`${a}/`))) out.push({ name: s.replace('/', '--'), path: `/${s}` })
    } else if (TRACKS.includes(a)) out.push({ name: a, path: `/${a}` })
    else console.log(`(destino desconocido: ${a})`)
  }
  return out
}

export const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
export const BASE = process.env.BASE_URL || 'http://localhost:5200'
