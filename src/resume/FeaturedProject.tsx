import { useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { project } from '../data/profile'
import { projectLayers } from '../data/projectLayers'
import { Icon } from '../components/Icon'
import { SceneWindow } from '../components/SceneWindow'
import { scrollToChapter } from '../hooks/useMotion'

export function FeaturedProject({ openDetails }: { openDetails: () => void }) {
  const root = useRef<HTMLElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [selected, setSelected] = useState(0)
  const layer = projectLayers[selected]
  useEffect(() => { window.dispatchEvent(new Event('model-explore')) }, [expanded])
  useGSAP(() => {
    if (expanded && !root.current?.closest('.motion-paused') && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) gsap.fromTo('.project-layer-details', { y: 6, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' })
  }, { scope: root, dependencies: [expanded, selected], revertOnUpdate: true })
  const close = () => { setExpanded(false); toggle.current?.focus({ preventScroll: true }) }
  const toggleModel = () => {
    setExpanded(value => !value)
    if (expanded || !toggle.current) return
    const card = toggle.current.parentElement!, header = innerWidth <= 650 ? 76 : innerWidth <= 980 ? 84 : 100
    const paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches || !!root.current?.closest('.motion-paused')
    scrollToChapter(Math.max(0, scrollY + card.getBoundingClientRect().top - header - 20), paused)
  }
  return <section ref={root} id="project" className="section work-section" aria-labelledby="project-title"><div className="container">
    <div className="section-heading" data-reveal><div><p className="section-label">Featured project</p><h2 id="project-title">A learning platform.<br />A connected foundation.</h2></div><p className="section-intro">Backend logic, structured data, and collaboration across the application.</p></div>
    <article className="resume-project">
      <div className="resume-project-art architecture-project content-stage" data-project-exploded={expanded ? '1' : '0'}>
        <span className="work-label">{project.label} · 2025</span>
        <SceneWindow id="project-laptop" chapter="project" className="section-scene project-scene" />
        <button ref={toggle} className="project-model-toggle" onClick={toggleModel} aria-label={expanded ? 'Reassemble project laptop' : 'Separate laptop to explore how the project was built'} aria-expanded={expanded} aria-controls="project-layer-details"><span className="work-open" aria-hidden="true">{expanded ? '↺' : '+'}</span></button>
        <span className="visual-footnote">{expanded ? 'Exploded assembly · Select a component' : 'Click to disassemble · Explore the build'}</span>
      </div>
        <div className="project-annotations" hidden={!expanded}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{projectLayers.map((part, index) => <g key={part.label} data-selected={selected === index}><path data-project-leader={index} /><circle data-project-dot={index} r="0.8" /></g>)}</svg>
          <div role="group" aria-label="Project architecture layers" onKeyDown={event => {
            if (event.key === 'Escape') { close(); return }
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : ['ArrowRight', 'ArrowDown'].includes(event.key) ? (selected + 1) % 3 : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? (selected + 2) % 3 : -1
            if (next < 0) return
            event.preventDefault(); setSelected(next)
            event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-project-select]')[next]?.focus({ preventScroll: true })
          }}>{projectLayers.map((part, index) => <button key={part.label} id={`project-part-${index}`} className={`project-part project-part-${index}`} data-project-select={index} aria-pressed={selected === index} aria-controls="project-layer-details" tabIndex={selected === index ? 0 : -1} onClick={() => setSelected(index)}><span aria-hidden="true">{index + 1}</span>{part.label}</button>)}</div>
        </div>
      <div className="resume-project-copy" data-reveal>
        <div id="project-layer-details" className="project-layer-details" role="region" aria-labelledby={`project-part-${selected}`} aria-live="polite" hidden={!expanded}>
          <p className="project-layer-caption">{selected + 1} / 3 · {layer.component}</p><h3>{layer.title}</h3>
          <div className="tags">{layer.stack.map(technology => <span key={technology}>{technology}</span>)}</div><p>{layer.description}</p><span className="project-analogy">A physical assembly illustrating the project’s software layers.</span>
        </div>
        <p className="section-label">{project.period}</p><h3>{project.title}</h3>{!expanded && <p>{project.description}</p>}
        {!expanded && <><div className="tags">{project.technology.map(item => <span key={item}>{item}</span>)}</div><div className="contribution-summary"><p><Icon name="check" />Server-side logic & API endpoints</p><p><Icon name="check" />Authentication & data processing</p><p><Icon name="check" />PostgreSQL schema & queries</p><p><Icon name="check" />Frontend / backend integration</p></div></>}
        <button className="text-link" onClick={openDetails}>Explore my contribution <Icon name="arrow" /></button>
      </div>
    </article>
  </div></section>
}
