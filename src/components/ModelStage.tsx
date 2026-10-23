import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { modelRegistry, type ModelId } from '../data/assets'

const ModelScene = lazy(() => import('../three/ModelScene'))

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onError() }
  render() { return this.state.failed ? null : this.props.children }
}

function StaticSculpture() {
  return <svg className="static-sculpture" viewBox="0 0 600 520" fill="none" aria-hidden="true">
    <defs><linearGradient id="panel" x1="170" y1="80" x2="430" y2="400" gradientUnits="userSpaceOnUse"><stop stopColor="#e8e7db" /><stop offset="1" stopColor="#7c8880" /></linearGradient></defs>
    <path d="m90 370 220-100 210 105-220 105z" fill="#29342e" stroke="#8aa696" />
    <path d="m130 165 220-75 115 70-220 80z" fill="#dae4d8" /><path d="m130 165 115 75v150l-115-72z" fill="#8a9c90" /><path d="m245 240 220-80v150l-220 80z" fill="url(#panel)" />
    <path d="m270 260 165-60m-165 84 105-38m-105 62 165-60" stroke="#4e7060" strokeWidth="6" />
    <path d="m155 115 145-52 67 38-145 53z" fill="#bde3c6" /><path d="m155 115 67 39v63l-67-40z" fill="#799787" /><path d="m222 154 145-53v63l-145 53z" fill="#a4c5b0" />
  </svg>
}

export function ModelStage({ id, activeMotion, turn = 0, reset = 0, scrollProgress }: { id: ModelId; activeMotion: boolean; turn?: number; reset?: number; scrollProgress?: { current: number } }) {
  const host = useRef<HTMLDivElement>(null)
  const [intersects, setIntersects] = useState(true)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [webgl] = useState(() => {
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('webgl') === 'off') return false
    try { const canvas = document.createElement('canvas'); const context = canvas.getContext('webgl2'); if (!context) return false; context.getExtension('WEBGL_lose_context')?.loseContext(); return true } catch { return false }
  })
  useEffect(() => {
    if (!host.current) return
    const observer = new IntersectionObserver(([entry]) => setIntersects(entry.isIntersecting), { rootMargin: '80px' })
    observer.observe(host.current)
    return () => observer.disconnect()
  }, [])
  const loaded = useCallback(() => setReady(true), [])
  const error = useCallback(() => setFailed(true), [])
  const retry = async () => {
    const { useGLTF } = await import('@react-three/drei')
    useGLTF.clear(modelRegistry[id].url)
    setFailed(false); setReady(false); setAttempt(value => value + 1)
  }
  return <div className={`model-stage ${ready && !failed ? 'is-ready' : ''}`} ref={host} data-testid="model-stage" data-ready={ready && !failed} aria-label={`Interactive 3D: ${modelRegistry[id].label}`} role="group">
    {(!ready || failed || !webgl) && <div className="model-fallback"><StaticSculpture /></div>}
    {webgl && !failed && <SceneBoundary key={`${id}-${attempt}`} onError={error}><Suspense fallback={null}><ModelScene id={id} active={intersects && !document.hidden} motion={activeMotion} turn={turn} reset={reset} onReady={loaded} onContextLost={error} scrollProgress={scrollProgress} /></Suspense></SceneBoundary>}
    {!ready && !failed && webgl && <span className="model-loading" role="status">Preparing the studio object…</span>}
    {(failed || !webgl) && <div className="model-error" role="status">{webgl ? <>The 3D view couldn’t load. <button onClick={() => void retry()}>Try again</button></> : 'Static view · 3D is unavailable in this browser.'}</div>}
  </div>
}
