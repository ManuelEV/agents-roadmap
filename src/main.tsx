import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { router } from './router'
import './styles/base.css'
import './styles/platform.css'
import './styles/guide-ported.css'
import './styles/guide.css'
import './styles/app.css'

createRoot(document.getElementById('root')!).render(
  // Sin StrictMode: los <Html> de drei (vista 3D de los diagramas) crean raíces React
  // propias y el doble montaje de desarrollo deja etiquetas sin renderizar.
  <RouterProvider router={router} />,
)
