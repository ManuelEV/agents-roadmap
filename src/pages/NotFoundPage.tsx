import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <div className="lesson notfound-page">
      <div className="eyebrow">404</div>
      <h1>Esta página no existe</h1>
      <p className="muted">Puede que la lección haya cambiado de nombre o de sección. Usa el buscador (Ctrl K) o vuelve al inicio.</p>
      <Link className="btn btn-primary" to="/">
        Volver al inicio
      </Link>
    </div>
  )
}
