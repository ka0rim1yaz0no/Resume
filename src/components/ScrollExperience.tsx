import { Component, lazy, Suspense, useCallback, useRef, useState, type ReactNode, type RefObject } from 'react'
import { modelRegistry, type ModelId } from '../data/assets'

const CinematicCanvas = lazy(() => import('../three/CinematicCanvas'))

class CanvasBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onError() }
  render() { return this.state.failed ? null : this.props.children }
}

export function ScrollExperience({ root, model, turn, reset, motion, running }: { root: RefObject<HTMLDivElement | null>; model: ModelId; turn: number; reset: number; motion: boolean; running: boolean }) {
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const host = useRef<HTMLDivElement>(null)
  const [supported] = useState(() => {
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('webgl') === 'off') return false
    try {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('webgl2')
      if (!context) return false
      context.getExtension('WEBGL_lose_context')?.loseContext()
      return true
    } catch { return false }
  })
  const error = useCallback(() => {
    setFailed(true)
    root.current?.querySelectorAll<HTMLElement>('[data-scene-ready]').forEach(element => { delete element.dataset.sceneReady })
  }, [root])
  const retry = async () => {
    const { useGLTF } = await import('@react-three/drei')
    Object.values(modelRegistry).forEach(entry => useGLTF.clear(entry.url))
    setFailed(false); setAttempt(value => value + 1)
  }
  return <>
    <div className="cinematic-canvas" ref={host} aria-hidden="true" data-testid="cinematic-canvas" data-scene-status={!supported ? 'static' : failed ? 'error' : 'active'}>
      {supported && !failed && <CanvasBoundary key={attempt} onError={error}><Suspense fallback={null}><CinematicCanvas root={root} model={model} turn={turn} reset={reset} motion={motion} running={running} onError={error} /></Suspense></CanvasBoundary>}
    </div>
    {failed && <div className="scene-retry" role="status">3D is unavailable. Static illustrations are shown. <button onClick={() => void retry()}>Retry 3D</button></div>}
  </>
}
