import { useEffect, useRef } from 'react'
import { useMediaQuery } from '../hooks/usePreferences'
import './silk-cursor.css'

const mouseQuery = '(min-width: 651px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)'
const modelControls = '.model-explorer, .company-explorer, .school-explorer, .project-part-picker'
const actions = 'a[href], button:not(:disabled), [role="button"]:not([aria-disabled="true"])'

export function SilkCursor({ disabled }: { disabled: boolean }) {
  const enabled = useMediaQuery(mouseQuery) && !disabled
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const halo = ref.current
    const root = halo?.parentElement
    if (!enabled || !halo || !root) return

    let x = 0, y = 0, targetX = 0, targetY = 0
    let frame: number | null = null
    let lastFrame = 0
    let lastTarget: Element | null = null

    const paint = () => { halo.style.transform = `translate3d(${x}px, ${y}px, 0)` }
    const follow = (time: number) => {
      const delta = lastFrame ? Math.min(time - lastFrame, 50) : 16
      const remainingX = targetX - x, remainingY = targetY - y
      if (Math.abs(remainingX) + Math.abs(remainingY) < 0.4) {
        x = targetX
        y = targetY
        frame = null
        lastFrame = 0
      } else {
        const ease = 1 - Math.exp(-delta / 33)
        x += remainingX * ease
        y += remainingY * ease
        lastFrame = time
        frame = requestAnimationFrame(follow)
      }
      paint()
    }
    const hide = () => {
      delete halo.dataset.visible
      delete halo.dataset.pressed
      lastTarget = null
      if (frame !== null) cancelAnimationFrame(frame)
      frame = null
      lastFrame = 0
    }
    const track = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || !(event.target instanceof Element)) {
        hide()
        return
      }
      const target = event.target
      targetX = event.clientX
      targetY = event.clientY
      if (target !== lastTarget) {
        halo.dataset.mode = target.closest(modelControls) ? 'model' : target.closest(actions) ? 'action' : 'rest'
        lastTarget = target
      }
      const pressed = (event.buttons & 1) !== 0 ? 'true' : 'false'
      if (halo.dataset.pressed !== pressed) halo.dataset.pressed = pressed
      if (!halo.dataset.visible) {
        x = targetX
        y = targetY
        paint()
        halo.dataset.visible = 'true'
      } else if (frame === null && (x !== targetX || y !== targetY)) {
        frame = requestAnimationFrame(follow)
      }
    }
    const leave = (event: PointerEvent) => {
      if (!(event.relatedTarget instanceof Node) || !root.contains(event.relatedTarget)) hide()
    }
    const pointerEvents = ['pointerover', 'pointermove', 'pointerdown', 'pointerup'] as const
    pointerEvents.forEach(type => root.addEventListener(type, track, { passive: true }))
    root.addEventListener('pointerout', leave, { passive: true })
    root.addEventListener('pointercancel', hide)
    window.addEventListener('blur', hide)
    window.addEventListener('keydown', hide)
    document.addEventListener('visibilitychange', hide)

    return () => {
      pointerEvents.forEach(type => root.removeEventListener(type, track))
      root.removeEventListener('pointerout', leave)
      root.removeEventListener('pointercancel', hide)
      window.removeEventListener('blur', hide)
      window.removeEventListener('keydown', hide)
      document.removeEventListener('visibilitychange', hide)
      hide()
    }
  }, [enabled])

  return enabled ? <div ref={ref} className="silk-cursor" aria-hidden="true" /> : null
}
