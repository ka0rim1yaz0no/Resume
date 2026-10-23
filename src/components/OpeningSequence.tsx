import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { assetUrl, profile } from '../data/profile'
import { openingFrame } from '../three/openingLayout'

export function OpeningSequence({ disabled }: { disabled: boolean }) {
  const overlay = useRef<HTMLDivElement>(null)
  const played = useRef(false)
  useGSAP((_, contextSafe) => {
    const root = overlay.current?.closest('.personal-resume') as HTMLElement | null
    const scene = root?.querySelector<HTMLElement>('[data-scene="intro"]')
    const curtain = overlay.current
    const stage = curtain?.querySelector<HTMLElement>('[data-opening-stage]')
    if (!root || !scene || !curtain || !stage || disabled || played.current || window.location.hash || root.querySelector('[data-scene-status="static"]')) return
    const compact = window.innerWidth <= 650
    const header = compact ? 76 : window.innerWidth <= 980 ? 84 : 100
    const frame = openingFrame(window.innerWidth, window.innerHeight, header)
    const heroCopy = root.querySelectorAll('.hero-enter')
    const began = performance.now()
    let disposed = false, finished = false, fontsReady = false
    let reveal: gsap.core.Timeline | undefined
    root.classList.add('intro-opening')
    scene.dataset.sceneOpening = '1'
    curtain.dataset.sceneReady = scene.dataset.sceneReady || 'false'
    gsap.set(stage, { left: frame.left, top: frame.top, width: frame.width, height: frame.height })
    gsap.set(curtain, { autoAlpha: 1 })
    gsap.set(heroCopy, { opacity: 0, y: 18 })
    gsap.from('.opening-word', { yPercent: 110, duration: 0.7, stagger: 0.08, ease: 'power3.out' })
    gsap.from('.opening-line span', { scaleX: 0, duration: 1, ease: 'power2.inOut' })
    gsap.fromTo('.opening-orbit circle', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' })
    const settle = () => {
      root.classList.remove('intro-opening')
      delete scene.dataset.sceneOpening
      gsap.set(heroCopy, { clearProps: 'opacity,transform' })
      gsap.set(curtain, { autoAlpha: 0 })
    }
    const finish = (instant = false) => {
      if (finished || disposed) return
      finished = true; played.current = true; observer.disconnect(); readyCall.pause()
      if (instant) { settle(); return }
      const shot = { progress: 1 }
      const copyStart = compact ? 1.3 : 0.85
      reveal = gsap.timeline({ onComplete: settle })
        .to(shot, { progress: 0, duration: 1.8, ease: 'sine.inOut', onUpdate: () => { scene.dataset.sceneOpening = String(shot.progress) } }, 0)
        .to('.opening-word', { yPercent: -110, opacity: 0, duration: 0.42, stagger: 0.035, ease: 'power2.in' }, 0)
        .to('.opening-note, .opening-orbit, .opening-bottom, .opening-line', { opacity: 0, duration: 0.45 }, 0.12)
        .to(curtain, { opacity: 0, duration: 0.8, ease: 'sine.inOut' }, copyStart)
        .to(heroCopy, { y: 0, opacity: 1, duration: 0.75, stagger: 0.045, ease: 'power2.out' }, copyStart)
    }
    const readyCall = gsap.delayedCall(1, () => finish()).pause()
    const schedule = () => {
      curtain.dataset.sceneReady = scene.dataset.sceneReady || 'false'
      if (!finished && fontsReady && scene.dataset.sceneReady === 'true') {
        readyCall.delay(Math.max(0.25, 1.05 - (performance.now() - began) / 1000)).restart(true)
      }
    }
    const observer = new MutationObserver(schedule)
    observer.observe(scene, { attributes: true, attributeFilter: ['data-scene-ready'] })
    const afterFonts = () => { if (!disposed) { fontsReady = true; schedule() } }
    void document.fonts.ready.then(contextSafe ? contextSafe(afterFonts) : afterFonts)
    const timeout = gsap.delayedCall(4, () => finish())
    const skip = () => finish(true)
    const key = (event: KeyboardEvent) => { if (['Escape', 'Tab', 'PageDown', 'ArrowDown'].includes(event.key)) skip() }
    const button = curtain.querySelector('button')!
    button.addEventListener('click', skip)
    window.addEventListener('wheel', skip, { passive: true, once: true })
    window.addEventListener('touchstart', skip, { passive: true, once: true })
    window.addEventListener('keydown', key)
    window.addEventListener('resize', skip, { once: true })
    return () => {
      disposed = true; played.current = true
      observer.disconnect(); readyCall.kill(); timeout.kill(); reveal?.kill(); settle()
      button.removeEventListener('click', skip)
      window.removeEventListener('wheel', skip); window.removeEventListener('touchstart', skip)
      window.removeEventListener('keydown', key); window.removeEventListener('resize', skip)
    }
  }, { scope: overlay, dependencies: [disabled], revertOnUpdate: true })
  return <div ref={overlay} className="opening-sequence" aria-hidden="true">
    <div className="opening-stage" data-opening-stage>
      <img className="opening-poster" src={assetUrl('posters/systems-sculpture.jpg')} width="960" height="760" alt="" fetchPriority="high" />
      <svg className="opening-orbit" viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="48" pathLength="1" stroke="currentColor" strokeWidth="0.18" strokeDasharray="1" /></svg>
    </div>
    <p className="opening-note">A portfolio by {profile.fullName}</p>
    <div className="opening-type"><span><span className="opening-word">Interfaces.</span></span><span><span className="opening-word">Logic.</span></span><span><span className="opening-word">Data.</span></span></div>
    <div className="opening-bottom"><span>Connected with purpose.</span><button tabIndex={-1}>Skip intro ↗</button></div>
    <div className="opening-line"><span /></div>
  </div>
}
