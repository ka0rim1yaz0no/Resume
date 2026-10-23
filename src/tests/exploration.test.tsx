import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useModelExploration } from '../hooks/useModelExploration'
import { ExperienceExplorer } from '../components/ExperienceExplorer'

function Explorer({ reset = () => {} }: { reset?: () => void }) {
  const controls = useModelExploration('systems-sculpture', reset)
  return <div ref={controls.ref} role="group" aria-label="Explore model" onKeyDown={controls.onKeyDown} onPointerDown={controls.onPointerDown} onPointerMove={controls.onPointerMove} onPointerCancel={controls.onPointerCancel} onPointerUp={controls.onPointerUp} />
}

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('Direct model exploration', () => {
  it('keeps company views independent through role changes and resets only the selected logo', () => {
    const renderCompanies = (active: number) => <>{[0, 1, 2].map(index => <ExperienceExplorer key={index} index={index} active={active === index} />)}</>
    const { rerender } = render(renderCompanies(0))
    const assistly = screen.getByRole('group', { name: 'Explore Assistly 3D logo' })
    fireEvent.click(screen.getByRole('button', { name: 'Rotate Assistly logo right' }))
    fireEvent.keyDown(assistly, { key: 'ArrowDown' })
    const savedView = { ...assistly.dataset }
    expect(Number(savedView.yaw)).toBeGreaterThan(0)
    expect(Number(savedView.pitch)).toBeGreaterThan(0)
    rerender(renderCompanies(1))
    expect(screen.queryByRole('group', { name: 'Explore Assistly 3D logo' })).not.toBeInTheDocument()
    const knowles = screen.getByRole('group', { name: 'Explore Knowles 3D logo' })
    expect(knowles.dataset.yaw).toBe('0')
    fireEvent.click(screen.getByRole('button', { name: 'Rotate Knowles logo left' }))
    expect(Number(knowles.dataset.yaw)).toBeLessThan(0)
    rerender(renderCompanies(0))
    expect({ ...assistly.dataset }).toEqual(savedView)
    fireEvent.click(screen.getByRole('button', { name: 'Reset Assistly logo view' }))
    expect([assistly.dataset.yaw, assistly.dataset.pitch, assistly.dataset.zoom]).toEqual(['0', '0', '0'])
    expect(Number(knowles.dataset.yaw)).toBeLessThan(0)
  })
  it('supports bounded keyboard tilt/zoom and restores the whole view on reset', () => {
    const reset = vi.fn()
    render(<Explorer reset={reset} />)
    const viewer = screen.getByRole('group', { name: 'Explore model' })
    fireEvent.keyDown(viewer, { key: 'ArrowRight' })
    expect(Number(viewer.dataset.yaw)).toBeGreaterThan(0)
    for (let i = 0; i < 30; i++) { fireEvent.keyDown(viewer, { key: 'ArrowUp' }); fireEvent.keyDown(viewer, { key: '+' }) }
    expect(Number(viewer.dataset.pitch)).toBeGreaterThanOrEqual(-1.25)
    expect(Number(viewer.dataset.zoom)).toBeLessThanOrEqual(1.1)
    fireEvent.keyDown(viewer, { key: 'r' })
    expect([viewer.dataset.yaw, viewer.dataset.pitch, viewer.dataset.zoom]).toEqual(['0', '0', '0'])
    expect(reset).toHaveBeenCalledOnce()
  })
  it('leaves vertical touch gestures to the page and captures horizontal exploration', () => {
    class Pointer extends MouseEvent {
      pointerId: number; pointerType: string; isPrimary: boolean
      constructor(type: string, options: PointerEventInit = {}) {
        super(type, options); this.pointerId = options.pointerId || 1; this.pointerType = options.pointerType || 'touch'; this.isPrimary = true
      }
    }
    vi.stubGlobal('PointerEvent', Pointer)
    render(<Explorer />)
    const viewer = screen.getByRole('group', { name: 'Explore model' })
    const capture = vi.fn(), release = vi.fn()
    Object.assign(viewer, { setPointerCapture: capture, hasPointerCapture: () => true, releasePointerCapture: release })
    fireEvent.pointerDown(viewer, { pointerId: 1, pointerType: 'touch', clientX: 50, clientY: 50 })
    fireEvent.pointerMove(viewer, { pointerId: 1, pointerType: 'touch', clientX: 51, clientY: 110 })
    expect(capture).not.toHaveBeenCalled()
    expect(viewer.dataset.yaw).toBe('0')
    fireEvent.pointerCancel(viewer, { pointerId: 1 })
    fireEvent.pointerDown(viewer, { pointerId: 2, pointerType: 'touch', clientX: 50, clientY: 50 })
    fireEvent.pointerMove(viewer, { pointerId: 2, pointerType: 'touch', clientX: 150, clientY: 60 })
    expect(capture).toHaveBeenCalledWith(2)
    expect(Number(viewer.dataset.yaw)).toBeGreaterThan(0)
    fireEvent.pointerUp(viewer, { pointerId: 2 })
    expect(viewer).not.toHaveAttribute('data-dragging')
  })
})
