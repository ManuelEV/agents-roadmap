import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <div className="lesson notfound-page">
      <div className="eyebrow">404 · fuera del mapa</div>
      <h1>Esta parada no existe</h1>
      <p className="muted">Puede que la lección haya cambiado de nombre o de línea. Usa el buscador (Ctrl K) o vuelve al mapa.</p>
      <Link className="btn btn-primary" to="/">
        Volver al mapa
      </Link>
    </div>
  )
}
