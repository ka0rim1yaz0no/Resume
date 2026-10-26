import { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/manrope'
import 'lenis/dist/lenis.css'
import './styles.css'
import './refinements.css'
import App from './resume/Resume'

const Preview = import.meta.env.DEV ? lazy(() => import('./dev/ModelPreview')) : null
createRoot(document.getElementById('root')!).render(
  <Suspense fallback={<p className="app-loading">Opening Vincent’s portfolio…</p>}>
    {Preview && window.location.pathname === '/__render' ? <Preview /> : <App />}
  </Suspense>,
)
