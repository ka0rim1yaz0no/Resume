import { useCallback, useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function useModelExploration(model: string, resetView: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const view = useRef({ yaw: 0, pitch: 0, zoom: 0 })
  const drag = useRef({ id: -1, x: 0, y: 0, claimed: false })
  const publish = useCallback(() => {
    if (!ref.current) return
    ref.current.dataset.yaw = String(view.current.yaw)
    ref.current.dataset.pitch = String(view.current.pitch)
    ref.current.dataset.zoom = String(view.current.zoom)
    window.dispatchEvent(new Event('model-explore'))
  }, [])
  const resetLocal = useCallback(() => { view.current = { yaw: 0, pitch: 0, zoom: 0 }; publish() }, [publish])
  useEffect(resetLocal, [model, resetLocal])
  const reset = () => { resetLocal(); resetView() }
  const rotate = (direction: number) => { view.current.yaw += direction * 0.35; publish() }
  const zoom = (direction: number) => { view.current.zoom = clamp(view.current.zoom + direction * 0.25, -0.75, 1.1); publish() }
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !event.isPrimary) return
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, claimed: event.pointerType !== 'touch' }
    if (drag.current.claimed) { event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.dataset.dragging = 'true' }
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = drag.current
    if (gesture.id !== event.pointerId) return
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y
    if (!gesture.claimed) {
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy) * 1.2) return
      gesture.claimed = true; event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.dataset.dragging = 'true'
    }
    event.preventDefault()
    view.current.yaw += dx * 0.008
    view.current.pitch = clamp(view.current.pitch + dy * 0.006, -1.25, 1.25)
    gesture.x = event.clientX; gesture.y = event.clientY
    publish()
  }
  const release = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current.id !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    drag.current.id = -1; delete event.currentTarget.dataset.dragging
  }
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'r', 'R', 'Home'].includes(event.key)) return
    event.preventDefault()
    if (['r', 'R', 'Home'].includes(event.key)) { reset(); return }
    if (event.key === '+' || event.key === '=') { zoom(1); return }
    if (event.key === '-') { zoom(-1); return }
    if (event.key === 'ArrowLeft') view.current.yaw -= 0.2
    if (event.key === 'ArrowRight') view.current.yaw += 0.2
    if (event.key === 'ArrowUp') view.current.pitch = clamp(view.current.pitch - 0.15, -1.25, 1.25)
    if (event.key === 'ArrowDown') view.current.pitch = clamp(view.current.pitch + 0.15, -1.25, 1.25)
    publish()
  }
  return { ref, onPointerDown, onPointerMove, onPointerUp: release, onPointerCancel: release, onLostPointerCapture: release, onKeyDown, reset, zoom, rotate }
}
