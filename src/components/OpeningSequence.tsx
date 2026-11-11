import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { openingContacts, openingDockStart, openingDuration, openingPhase } from '../three/sculptureAssembly'
import { resetOpeningScroll } from '../hooks/useMotion'
import { Icon } from './Icon'

export function OpeningSequence({ disabled }: { disabled: boolean }) {
  const overlay = useRef<HTMLElement>(null)
  const played = useRef(false)
  useGSAP((_, contextSafe) => {
    const curtain = overlay.current
    const root = curtain?.closest<HTMLElement>('.personal-resume')
    const scene = root?.querySelector<HTMLElement>('[data-scene="intro"]')
    const renderer = root?.querySelector<HTMLElement>('[data-scene-status]')
    if (!root || !scene || !curtain || disabled || played.current || window.location.hash || renderer?.dataset.sceneStatus === 'static') return
    const heroCopy = root.querySelectorAll('.hero-enter')
    const contacts = curtain.querySelectorAll('.opening-meter span')
    const button = curtain.querySelector('button')!
    const began = performance.now()
    let settled = false, fontsReady = false
    let reveal: gsap.core.Timeline | undefined
    resetOpeningScroll()
    root.classList.add('intro-opening')
    scene.dataset.sceneOpening = '1'
    curtain.dataset.sceneReady = scene.dataset.sceneReady || 'false'
    gsap.set(curtain, { autoAlpha: 1 })
    gsap.set(heroCopy, { opacity: 0, y: 14 })
    const settle = () => {
      if (settled) return
      settled = true
      played.current = true
      observer.disconnect()
      readyCall.kill()
      timeout.kill()
      button.removeEventListener('click', skip)
      window.removeEventListener('wheel', skip)
      window.removeEventListener('touchmove', skip)
      window.removeEventListener('keydown', key)
      root.classList.remove('intro-opening')
      delete scene.dataset.sceneOpening
      delete curtain.dataset.phase
      gsap.set(heroCopy, { clearProps: 'opacity,transform' })
      gsap.set(curtain, { autoAlpha: 0 })
    }
    const start = () => {
      if (settled || reveal) return
      // Synchronize Lenis after fonts and scroll restoration have settled.
      resetOpeningScroll()
      const shot = { progress: 1 }
      const compact = window.innerWidth <= 650
      const duration = openingDuration(compact)
      const copyStart = compact ? 0.885 : 0.833
      const copyStagger = compact ? 0.025 : 0.037
      const finalContact = openingContacts[openingContacts.length - 1]
      reveal = gsap.timeline({ onComplete: settle })
        .to(shot, { progress: 0, duration, ease: 'none', onUpdate: () => {
          scene.dataset.sceneOpening = String(shot.progress)
          const phase = openingPhase(shot.progress)
          if (curtain.dataset.phase !== phase) curtain.dataset.phase = phase
        } }, 0)
        .fromTo('.opening-guides', { opacity: 0.15, scale: 1 }, { opacity: 0.82, scale: 0.87, duration: duration * 0.47, ease: 'sine.inOut' }, 0)
        .to('.opening-guides', { opacity: 0.24, scale: 0.78, duration: duration * 0.25, ease: 'sine.inOut' }, duration * 0.47)
        .fromTo('.opening-impact', { scale: 0.94, opacity: 0 }, { scale: 1, opacity: 0.92, duration: 0.12, ease: 'power2.out' }, duration * finalContact)
        .to('.opening-impact', { scale: 1.15, opacity: 0, duration: 0.33, ease: 'power2.out' }, duration * finalContact + 0.12)
        .to('.opening-deck', { y: 8, opacity: 0, duration: duration * 0.14, ease: 'sine.in' }, duration * openingDockStart)
        .to(curtain, { opacity: 0, duration: duration * (1 - openingDockStart), ease: 'sine.inOut' }, duration * openingDockStart)
        .to(heroCopy, { y: 0, opacity: 1, duration: duration * (1 - copyStart - copyStagger), stagger: { amount: duration * copyStagger }, ease: 'power2.out' }, duration * copyStart)
      for (const [index, time] of openingContacts.entries()) {
        reveal.to(contacts[index], { opacity: 1, duration: 0.13, ease: 'power2.out' }, duration * time)
      }
    }
    const skip = () => { reveal?.kill(); settle() }
    const readyCall = gsap.delayedCall(0.05, contextSafe ? contextSafe(start) : start).pause()
    const schedule = () => {
      if (renderer?.dataset.sceneStatus === 'error') { skip(); return }
      curtain.dataset.sceneReady = scene.dataset.sceneReady || 'false'
      if (!settled && !reveal && fontsReady && scene.dataset.sceneReady === 'true') {
        readyCall.delay(Math.max(0.05, 0.24 - (performance.now() - began) / 1000)).restart(true)
      }
    }
    const observer = new MutationObserver(schedule)
    observer.observe(scene, { attributes: true, attributeFilter: ['data-scene-ready'] })
    if (renderer) observer.observe(renderer, { attributes: true, attributeFilter: ['data-scene-status'] })
    void document.fonts.ready.then(() => { if (!settled) { fontsReady = true; schedule() } })
    // A slow or unavailable WebGL device can continue to the hero.
    const timeout = gsap.delayedCall(6, () => { if (!reveal) skip() })
    const key = (event: KeyboardEvent) => { if (['Escape', 'Tab', 'PageDown', 'ArrowDown'].includes(event.key)) skip() }
    button.addEventListener('click', skip)
    window.addEventListener('wheel', skip, { passive: true, once: true })
    window.addEventListener('touchmove', skip, { passive: true, once: true })
    window.addEventListener('keydown', key)
    return skip
  }, { scope: overlay, dependencies: [disabled], revertOnUpdate: true })
  return <section ref={overlay} className="opening-sequence" aria-label="Opening animation">
    <div className="opening-stage" data-opening-stage aria-hidden="true">
      <div className="opening-guides"><i /><i /><i /><i /></div>
      <div className="stage-brackets opening-target" />
      <div className="stage-brackets opening-impact" />
    </div>
    <div className="opening-deck">
      <div className="opening-caption">
        <strong>Systems sculpture</strong>
        <div className="opening-status" aria-hidden="true">
          <span data-status="preparing">Preparing model</span>
          <span data-status="gathering">Gathering pieces</span>
          <span data-status="magnetizing">Locking pieces</span>
          <span data-status="assembled">Assembled</span>
        </div>
      </div>
      <div className="opening-meter" aria-hidden="true">{openingContacts.map(time => <span key={time} />)}</div>
      <button type="button">Skip intro <Icon name="arrow" /></button>
    </div>
  </section>
}
