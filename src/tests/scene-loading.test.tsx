import { useRef } from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ScrollExperience } from '../components/ScrollExperience'

function SceneFixture() {
  const root = useRef<HTMLDivElement>(null)
  return (
    <div ref={root}>
      <div data-scene="education" />
      <ScrollExperience root={root} model="systems-sculpture" turn={0} reset={0} motion running />
    </div>
  )
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(document, 'fonts')
  history.replaceState(null, '', location.pathname)
})

describe('Text section entry', () => {
  it.each(['#credentials', '#contact'])('waits for a nearby model before initializing WebGL from %s', async hash => {
    history.replaceState(null, '', hash)
    Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: Promise.resolve() } })
    const observe = vi.fn()
    const disconnect = vi.fn()
    let intersection: IntersectionObserverCallback | undefined
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) { intersection = callback }
      observe = observe
      disconnect = disconnect
    })
    const context = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)

    render(<SceneFixture />)
    await waitFor(() => expect(observe).toHaveBeenCalledOnce())
    expect(context).not.toHaveBeenCalled()
    expect(screen.queryByTestId('cinematic-canvas')).not.toBeInTheDocument()

    act(() => intersection?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver))
    expect(context).toHaveBeenCalledOnce()
    expect(screen.getByTestId('cinematic-canvas')).toHaveAttribute('data-scene-status', 'static')
    expect(disconnect).toHaveBeenCalled()
  })
})
