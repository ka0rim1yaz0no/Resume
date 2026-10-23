import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(useGSAP, ScrollTrigger)
let scrollEngine: Lenis | null = null

export function scrollToChapter(top: number, paused: boolean) {
  if (scrollEngine && !paused) scrollEngine.scrollTo(top, { duration: 2, easing: t => -(Math.cos(Math.PI * t) - 1) / 2 })
  else window.scrollTo({ top, behavior: paused ? 'instant' : 'smooth' })
}

function hashTarget(hash: string) {
  try { return hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null } catch { return null }
}

export function useMotion(paused: boolean) {
  const root = useRef<HTMLDivElement>(null)
  const initialHash = useRef(window.location.hash)
  const restored = useRef(false)
  useEffect(() => {
    if (!paused || restored.current || !initialHash.current) return
    let disposed = false
    void document.fonts.ready.then(() => {
      const target = hashTarget(initialHash.current)
      if (!disposed && target) { target.scrollIntoView({ block: 'start', behavior: 'instant' }); restored.current = true }
    })
    return () => { disposed = true }
  }, [paused])
  useGSAP(() => {
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => {
      if (paused) return
      const lenis = new Lenis({ duration: 0.85, smoothWheel: true, syncTouch: false, anchors: true, autoRaf: false })
      scrollEngine = lenis
      const tick = (time: number) => lenis.raf(time * 1000)
      lenis.on('scroll', ScrollTrigger.update)
      gsap.ticker.add(tick)

      if (!root.current?.classList.contains('intro-opening')) gsap.from('.hero-enter', { y: 28, opacity: 0, duration: 1, stagger: 0.1, ease: 'power3.out', clearProps: 'all' })
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((element) => {
        gsap.from(element, { y: 24, opacity: 0, duration: 0.7, ease: 'power2.out', clearProps: 'all', scrollTrigger: { trigger: element, start: 'top 93%', once: true } })
      })
      gsap.utils.toArray<HTMLElement>('[data-counter]').forEach((element) => {
        const value = { count: 0 }
        const target = Number(element.dataset.counter)
        gsap.to(value, { count: target, duration: 1.2, ease: 'power2.out', onUpdate: () => { element.textContent = Math.round(value.count).toString().padStart(2, '0') }, scrollTrigger: { trigger: element, start: 'top 95%', once: true } })
      })
      gsap.to('.reading-progress', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: 0.25 } })
      gsap.to('.timeline-progress-fill', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.experience-timeline', start: 'top 65%', end: 'bottom 45%', scrub: 0.4 } })
      let disposed = false
      const refresh = () => {
        if (disposed) return
        ScrollTrigger.refresh()
        const target = !restored.current ? hashTarget(initialHash.current) : null
        if (target) { lenis.scrollTo(target, { immediate: true }); restored.current = true }
      }
      void document.fonts.ready.then(refresh)
      return () => {
        disposed = true
        gsap.ticker.remove(tick)
        if (scrollEngine === lenis) scrollEngine = null
        lenis.destroy()
        root.current?.querySelectorAll<HTMLElement>('[data-counter]').forEach(element => { element.textContent = String(element.dataset.counter).padStart(2, '0') })
      }
    })
    return () => media.revert()
  }, { scope: root, dependencies: [paused], revertOnUpdate: true })
  return root
}
