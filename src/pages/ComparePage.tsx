import { useEffect, useState, type CSSProperties } from 'react'
import { Link, useSearchParams } from 'react-router'
import { motion } from 'motion/react'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { Code } from '@/components/Code'
import { SPRING } from '@/components/Layout'
import { getTrack } from '@/catalog'
import { ECOS, type Eco } from '@/catalog/compare'
import { COMPARE_ROWS, COMPARE_VERIFIED } from '@/catalog/compare-data'

const STATUS_CLASS = { GA: 'gbadge-ga', preview: 'gbadge-preview', beta: 'gbadge-preview', tú: '' } as const
const STATUS_LABEL = { GA: 'GA', preview: 'preview', beta: 'beta', tú: 'lo traes tú' } as const

/** Comparador: eliges un concepto y ves la pieza equivalente en cada ecosistema, lado a lado. */
export function ComparePage() {
  const [params, setParams] = useSearchParams()
  const rowId = params.get('pieza') ?? COMPARE_ROWS[0]?.id
  const row = COMPARE_ROWS.find((r) => r.id === rowId) ?? COMPARE_ROWS[0]
  const [on, setOn] = useState<Eco[]>(['google', 'aws'])

  useEffect(() => {
    document.title = 'Comparar ecosistemas · Agents Roadmap'
  }, [])

  const toggle = (e: Eco) =>
    setOn((cur) => {
      if (cur.includes(e)) return cur.length > 1 ? cur.filter((x) => x !== e) : cur
      return ECOS.filter((x) => x === e || cur.includes(x))
    })
  const pick = (id: string) => setParams({ pieza: id }, { replace: true, preventScrollReset: true })

  if (!row) return null

  return (
    <div className="home cmp-page">
      <section className="track-hero">
        <div className="eyebrow track-kicker">Herramienta · verificado en {COMPARE_VERIFIED}</div>
        <h1>La misma pieza, en cada nube</h1>
        <p className="lead">
          Todo agente en producción necesita lo mismo: un framework, un modelo, herramientas, memoria, un lugar donde correr, identidad, guardrails y forma
          de evaluarlo. Lo que cambia es el nombre del producto y cuánto te resuelve. Elige una pieza y compárala lado a lado.
        </p>
      </section>

      <div className="cmp-layout">
        <div className="cmp-concepts" role="tablist" aria-label="Piezas">
          {COMPARE_ROWS.map((r) => (
            <button key={r.id} role="tab" aria-selected={r.id === row.id} className={r.id === row.id ? 'is-active' : ''} onClick={() => pick(r.id)}>
              {r.id === row.id && <motion.span layoutId="cmp-pill" className="cmp-concept-pill" transition={SPRING} />}
              <span className="c">{r.concept}</span>
              <span className="q">{r.question}</span>
            </button>
          ))}
        </div>

        <div>
          <div className="cmp-head">
            <h2>{row.concept}</h2>
            <p>{row.intro}</p>
          </div>
          <div className="cmp-ecos" role="group" aria-label="Ecosistemas a comparar">
            {ECOS.map((e) => (
              <button key={e} aria-pressed={on.includes(e)} className={on.includes(e) ? 'is-on' : ''} onClick={() => toggle(e)} style={{ '--line': `var(--line-${e})` } as CSSProperties}>
                <span className="line-dot" />
                {getTrack(e)?.short}
              </button>
            ))}
          </div>

          <div className="cmp-cells" style={{ '--cols': Math.min(on.length, 2) } as CSSProperties} key={row.id}>
            {on.map((e, i) => {
              const cell = row.cells[e]
              return (
                <motion.div
                  key={e}
                  className="cmp-cell"
                  style={{ '--line': `var(--line-${e})` } as CSSProperties}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: i * 0.04 }}
                >
                  <div className="cmp-cell-head">
                    <div className="cmp-cell-eco">
                      <span className="line-dot" />
                      {getTrack(e)?.title}
                      {cell.status && <span className={`gbadge ${STATUS_CLASS[cell.status]}`}>{STATUS_LABEL[cell.status]}</span>}
                    </div>
                    <div className="cmp-cell-name">{cell.name}</div>
                  </div>
                  <div className="cmp-cell-body">
                    <p>{cell.note}</p>
                    {cell.code && <Code code={cell.code.code} lang={cell.code.lang} title={cell.code.title} maxHeight={320} />}
                    {(cell.lesson || cell.docs) && (
                      <div className="cmp-cell-links">
                        {cell.lesson && (
                          <Link to={cell.lesson}>
                            Verlo en su sección <ArrowRight size={13} />
                          </Link>
                        )}
                        {cell.docs && (
                          <a href={cell.docs} target="_blank" rel="noreferrer">
                            Documentación <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>

      <section className="cmp-matrix">
        <h2>Tabla completa</h2>
        <p>Todos los nombres de un vistazo. Haz clic en una fila para abrirla arriba.</p>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Pieza</th>
                {ECOS.map((e) => (
                  <th key={e} style={{ '--line': `var(--line-${e})` } as CSSProperties}>
                    {getTrack(e)?.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((r) => (
                <tr key={r.id} className={r.id === row.id ? 'is-hl' : ''}>
                  <td>
                    <button
                      onClick={() => {
                        pick(r.id)
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                    >
                      {r.concept}
                    </button>
                  </td>
                  {ECOS.map((e) => (
                    <td key={e}>{r.cells[e].name}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
