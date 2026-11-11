import { Component, lazy, Suspense, useCallback, useEffect, useState, type ReactNode, type RefObject } from 'react'
import { modelRegistry, modelUrl, type ModelId } from '../data/assets'

const CinematicCanvas = lazy(() => import('../three/CinematicCanvas'))

class CanvasBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onError() }
  render() { return this.state.failed ? null : this.props.children }
}

type SceneProps = {
  root: RefObject<HTMLDivElement | null>
  model: ModelId
  turn: number
  reset: number
  motion: boolean
  running: boolean
}

export function ScrollExperience(props: SceneProps) {
  const { root } = props
  const [enabled, setEnabled] = useState(() => !['#credentials', '#contact'].includes(window.location.hash))

  useEffect(() => {
    if (enabled) return
    let observer: IntersectionObserver | undefined
    let disposed = false
    // The initial anchor is restored after the fonts settle. Observe the real
    // scene windows afterward so a text-only entry does not initialize WebGL.
    void document.fonts.ready.then(() => {
      if (disposed || !root.current) return
      observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return
        observer?.disconnect()
        setEnabled(true)
      }, { rootMargin: '300px 0px' })
      root.current.querySelectorAll('[data-scene]').forEach(scene => observer?.observe(scene))
    })
    return () => {
      disposed = true
      observer?.disconnect()
    }
  }, [enabled, root])

  return enabled ? <SceneExperience {...props} /> : null
}

function SceneExperience({ root, model, turn, reset, motion, running }: SceneProps) {
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [mobile] = useState(() => window.matchMedia('(max-width: 980px), (pointer: coarse)').matches)
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
  useEffect(() => {
    if (!supported) return
    const links = [...new Set<ModelId>([model, 'react-js'])].map(id => {
      const link = document.createElement('link')
      link.rel = 'preload'; link.as = 'fetch'; link.crossOrigin = 'anonymous'
      link.href = modelUrl(id, mobile); link.fetchPriority = id === model ? 'high' : 'low'
      document.head.append(link)
      return link
    })
    return () => links.forEach(link => link.remove())
  }, [model, mobile, supported])
  const retry = async () => {
    const { useGLTF } = await import('@react-three/drei')
    Object.keys(modelRegistry).forEach(id => useGLTF.clear(modelUrl(id as ModelId, mobile)))
    setFailed(false); setAttempt(value => value + 1)
  }
  return <>
    <div className="cinematic-canvas" aria-hidden="true" data-testid="cinematic-canvas" data-scene-status={!supported ? 'static' : failed ? 'error' : 'active'}>
      {supported && !failed && <CanvasBoundary key={attempt} onError={error}><Suspense fallback={null}><CinematicCanvas root={root} model={model} turn={turn} reset={reset} motion={motion} running={running} mobile={mobile} onError={error} /></Suspense></CanvasBoundary>}
    </div>
    {failed && <div className="scene-retry" role="status">3D is unavailable. Static illustrations are shown. <button onClick={() => void retry()}>Retry 3D</button></div>}
  </>
}
