import { createBrowserRouter, Navigate, useParams } from 'react-router'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { StopPage } from './pages/StopPage'
import { TrackPage } from './pages/TrackPage'
import { STOPS } from './catalog'

/** Enlaces antiguos de los sitios originales (/leccion/<slug>): se resuelven a su nueva línea. */
function LegacyLesson() {
  const { slug } = useParams()
  const hit = STOPS.find((s) => s.slug === slug && s.track === 'google') ?? STOPS.find((s) => s.slug === slug)
  return hit ? <Navigate to={hit.path} replace /> : <NotFoundPage />
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'comparar', lazy: async () => ({ Component: (await import('./pages/ComparePage')).ComparePage }) },
      { path: 'referencias', lazy: async () => ({ Component: (await import('./pages/ReferencesPage')).ReferencesPage }) },
      { path: 'leccion/:slug', element: <LegacyLesson /> },
      { path: ':track', element: <TrackPage /> },
      { path: ':track/:slug', element: <StopPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
