import { useEffect, useId, useRef } from 'react'
import { useMediaQuery } from '../hooks/usePreferences'
import './silk-cursor.css'

const mouseQuery = '(min-width: 651px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)'
const dragControls = '.model-explorer, .company-explorer, .school-explorer'
const modelControls = `${dragControls}, .project-part-picker`
const actions = ':is(a[href], button, [role="button"], [role="link"]):not(:disabled):not([aria-disabled="true"])'
const trailLength = 92
const trailCurve = 'M0 18C15 20 26 7 43 12C57 17 64 20 76 13'

export function SilkCursor({ disabled }: { disabled: boolean }) {
  const enabled = useMediaQuery(mouseQuery) && !disabled
  const ref = useRef<HTMLDivElement>(null)
  const trailRef = useRef<SVGSVGElement>(null)
  const pulseRef = useRef<HTMLSpanElement>(null)
  const rippleRef = useRef<HTMLSpanElement>(null)
  const trailColor = useId()
  const trailOutline = `${trailColor}-outline`

  useEffect(() => {
    const halo = ref.current
    const trail = trailRef.current
    const pulse = pulseRef.current
    const ripple = rippleRef.current
    const root = halo?.parentElement
    if (!enabled || !halo || !trail || !pulse || !ripple || !root) return

    let x = 0, y = 0, targetX = 0, targetY = 0
    let tailX = 0, tailY = 0
    let trailOpacity = 0
    let frame: number | null = null
    let lastFrame = 0
    let lastTarget: Element | null = null
    let pulseAnimation: Animation | null = null
    let rippleAnimation: Animation | null = null
    let modelPress: { x: number; y: number; draggable: boolean; lastPulse: number } | null = null

    const paint = () => { halo.style.transform = `translate3d(${x}px, ${y}px, 0)` }
    const playPulse = () => {
      pulseAnimation?.cancel()
      pulseAnimation = pulse.animate?.([
        { transform: 'scale(.86)', opacity: .63 },
        { transform: 'scale(1.38)', opacity: .28, offset: .55 },
        { transform: 'scale(1.63)', opacity: 0 },
      ], { duration: 540, easing: 'cubic-bezier(.2,.65,.35,1)' }) ?? null
    }
    const rippleOnClick = (event: MouseEvent) => {
      if (!halo.dataset.visible || event.button !== 0 || event.detail === 0) return
      if ('pointerType' in event && event.pointerType !== 'mouse') return
      if (!(event.target instanceof Element) || !event.target.closest(actions)) return

      // The ripple stays at the click point as the halo follows the pointer.
      rippleAnimation?.cancel()
      ripple.style.left = `${event.clientX}px`
      ripple.style.top = `${event.clientY}px`
      rippleAnimation = ripple.animate?.([
        { transform: 'scale(.58)', opacity: .68 },
        { transform: 'scale(1.34)', opacity: .34, offset: .46 },
        { transform: 'scale(1.8)', opacity: 0 },
      ], { duration: 500, easing: 'cubic-bezier(.2,.65,.35,1)' }) ?? null
    }
    const follow = (time: number) => {
      const delta = lastFrame ? Math.min(time - lastFrame, 50) : 16
      const remainingX = targetX - x, remainingY = targetY - y
      const gap = Math.hypot(remainingX, remainingY)
      // Keep the rim near the pointer. Let the softer trail carry the lag.
      const ease = Math.max(1 - Math.exp(-delta / 29), 1 - 22 / Math.max(1, gap))
      x += remainingX * ease
      y += remainingY * ease
      const dragging = halo.dataset.dragging === 'true'
      const tailEase = 1 - Math.exp(-delta / (dragging ? 76 : 64))
      tailX += (x - tailX) * tailEase
      tailY += (y - tailY) * tailEase
      const dx = x - tailX, dy = y - tailY
      const distance = Math.hypot(dx, dy)
      if (distance > trailLength) {
        tailX = x - dx * trailLength / distance
        tailY = y - dy * trailLength / distance
      }

      const strength = Math.min(1, Math.max(0, (distance - 2) / (dragging ? 22 : 26)))
      if (strength > 0) {
        const length = Math.min(16 + distance * 1.72, trailLength) / trailLength
        trail.style.transform = `rotate(${Math.atan2(dy, dx)}rad) scaleX(${length})`
      }
      // Let the ribbon fade after the tail catches up to the halo.
      const targetOpacity = strength * (dragging ? .9 : .78)
      const opacityEase = 1 - Math.exp(-delta / (targetOpacity > trailOpacity ? 18 : 72))
      trailOpacity += (targetOpacity - trailOpacity) * opacityEase
      const trailVisible = strength > 0 || trailOpacity > .008
      if (trailVisible) {
        trail.style.opacity = String(trailOpacity)
        if (!halo.dataset.moving) halo.dataset.moving = 'true'
      } else if (halo.dataset.moving) {
        trailOpacity = 0
        trail.style.opacity = '0'
        delete halo.dataset.moving
      }

      if (gap < 0.4 && !trailVisible) {
        x = tailX = targetX
        y = tailY = targetY
        frame = null
        lastFrame = 0
      } else {
        lastFrame = time
        frame = requestAnimationFrame(follow)
      }
      paint()
    }
    const hide = () => {
      delete halo.dataset.visible
      delete halo.dataset.pressed
      delete halo.dataset.moving
      delete halo.dataset.dragging
      trailOpacity = 0
      trail.style.opacity = '0'
      pulseAnimation?.cancel()
      pulseAnimation = null
      rippleAnimation?.cancel()
      rippleAnimation = null
      modelPress = null
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
        halo.dataset.mode = target.closest(actions) ? 'action' : target.closest(modelControls) ? 'model' : 'rest'
        lastTarget = target
      }
      const pressed = (event.buttons & 1) !== 0
      if (halo.dataset.pressed !== String(pressed)) halo.dataset.pressed = String(pressed)
      if (event.type === 'pointerdown' && event.button === 0 && halo.dataset.mode === 'model') {
        modelPress = { x: targetX, y: targetY, draggable: !!target.closest(dragControls), lastPulse: event.timeStamp }
        playPulse()
      } else if (!pressed && modelPress) {
        modelPress = null
        delete halo.dataset.dragging
      } else if (modelPress?.draggable && event.type === 'pointermove' && Math.hypot(targetX - modelPress.x, targetY - modelPress.y) > 4) {
        if (!halo.dataset.dragging) halo.dataset.dragging = 'true'
        if (event.timeStamp - modelPress.lastPulse >= 560) {
          modelPress.lastPulse = event.timeStamp
          playPulse()
        }
      }
      if (!halo.dataset.visible) {
        x = tailX = targetX
        y = tailY = targetY
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
    root.addEventListener('click', rippleOnClick, { capture: true, passive: true })
    root.addEventListener('pointerout', leave, { passive: true })
    root.addEventListener('pointercancel', hide)
    window.addEventListener('blur', hide)
    window.addEventListener('keydown', hide)
    document.addEventListener('visibilitychange', hide)

    return () => {
      pointerEvents.forEach(type => root.removeEventListener(type, track))
      root.removeEventListener('click', rippleOnClick, true)
      root.removeEventListener('pointerout', leave)
      root.removeEventListener('pointercancel', hide)
      window.removeEventListener('blur', hide)
      window.removeEventListener('keydown', hide)
      document.removeEventListener('visibilitychange', hide)
      hide()
    }
  }, [enabled])

  return enabled ? <>
    <div ref={ref} className="silk-cursor" aria-hidden="true">
      <svg ref={trailRef} className="silk-cursor-trail" width={trailLength} height="26" viewBox="0 0 76 26" preserveAspectRatio="none" focusable="false">
        <defs>
          <linearGradient id={trailColor} gradientUnits="userSpaceOnUse" x1="0" x2="76">
            <stop stopColor="#b877ef" stopOpacity="0" />
            <stop offset=".32" stopColor="#c78bf7" stopOpacity=".65" />
            <stop offset=".74" stopColor="#ebc4ff" />
            <stop offset="1" stopColor="#f6d8ff" stopOpacity=".28" />
          </linearGradient>
          <linearGradient id={trailOutline} gradientUnits="userSpaceOnUse" x1="0" x2="76">
            <stop stopColor="#241033" stopOpacity="0" />
            <stop offset=".35" stopColor="#241033" stopOpacity=".6" />
            <stop offset=".77" stopColor="#241033" stopOpacity=".95" />
            <stop offset="1" stopColor="#241033" stopOpacity=".32" />
          </linearGradient>
        </defs>
        <path d={trailCurve} stroke={`url(#${trailOutline})`} strokeWidth="3.8" strokeLinecap="round" fill="none" />
        <path d="M0 18C15 18 26 5 43 10C57 14 64 18 76 13C64 22 56 19 42 15C26 10 15 21 0 18Z" fill={`url(#${trailColor})`} opacity=".65" />
        <path d={trailCurve} stroke={`url(#${trailColor})`} strokeWidth="1.55" fill="none" />
      </svg>
      <span ref={pulseRef} className="silk-cursor-pulse" />
    </div>
    <span ref={rippleRef} className="silk-action-ripple" aria-hidden="true" />
  </> : null
}
