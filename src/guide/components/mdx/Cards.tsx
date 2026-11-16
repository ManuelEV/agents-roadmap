import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRight, ExternalLink } from 'lucide-react'

export function Cards({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return <div className={`gcards gcards-${cols} not-prose`}>{children}</div>
}

export function Card({ title, href, tag, children }: { title: string; href?: string; tag?: string; children?: ReactNode }) {
  const external = href?.startsWith('http')
  const body = (
    <>
      <div className="gcard-head">
        <span className="gcard-title">{title}</span>
        {tag && <span className="gbadge">{tag}</span>}
      </div>
      {children && <div className="gcard-body">{children}</div>}
      {href && (
        <span className="gcard-cta">
          {external ? (
            <>
              Documentación <ExternalLink size={13} />
            </>
          ) : (
            <>
              Leer <ArrowRight size={13} />
            </>
          )}
        </span>
      )}
    </>
  )
  if (!href) return <div className="gcard">{body}</div>
  if (external)
    return (
      <a className="gcard gcard-link" href={href} target="_blank" rel="noreferrer">
        {body}
      </a>
    )
  return (
    <Link className="gcard gcard-link" to={href}>
      {body}
    </Link>
  )
}
