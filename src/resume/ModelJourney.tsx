import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import gsap from 'gsap'
import { SceneWindow } from '../components/SceneWindow'
import { SceneEnvironments } from '../components/SceneEnvironments'
import { Icon } from '../components/Icon'
import { modelIds } from '../data/assets'
import { profile } from '../data/profile'
import { scrollToChapter } from '../hooks/useMotion'
import { journeyCrossfade } from '../three/choreography'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const chapters = [
  { title: 'Systems', label: 'Interfaces. Logic. Data.', copy: 'Understanding how things fit together. Building the connections that make them work.', detail: profile.fullName, note: 'Information Technology', stop: 0.1 },
  { title: 'Interfaces', label: 'Built together. Connected throughout.', copy: 'A learning management system shaped by backend logic, structured data, and collaboration.', detail: 'Learning Management System', note: 'Capstone project · 2025', stop: 0.5 },
  { title: 'Workflow', label: 'Structure behind the work.', copy: 'Website administration, document review, and quality assurance across a global workflow.', detail: '486 internship hours', note: 'Knowles Training Institute · 2026', stop: 0.85 },
]

export function ModelJourney({ paused, systemReduced, toggleMotion }: { paused: boolean; systemReduced: boolean; toggleMotion: () => void }) {
  const section = useRef<HTMLElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const scrollTrigger = useRef<ScrollTrigger>(null)
  const activeChapter = useRef(0)
  const [active, setActive] = useState(0)
  const update = (progress: number) => {
    const element = frame.current
    if (!element) return
    const [interfaces, workflow] = journeyCrossfade(progress)
    element.style.setProperty('--scene-progress', String(progress))
    element.style.setProperty('--scene-interfaces', String(interfaces))
    element.style.setProperty('--scene-workflow', String(workflow))
    const scene = element.querySelector<HTMLElement>('[data-scene="journey"]')
    if (scene) scene.dataset.sceneScore = String(progress)
    const chapter = progress < 0.33 ? 0 : progress < 0.68 ? 1 : 2
    if (chapter !== activeChapter.current) {
      activeChapter.current = chapter
      setActive(chapter)
    }
  }
  const showChapter = (index: number) => {
    const progress = chapters[index].stop
    const trigger = scrollTrigger.current
    if (paused || !trigger) {
      update(progress)
      window.dispatchEvent(new Event('model-explore'))
      return
    }
    scrollToChapter(trigger.start + (trigger.end - trigger.start) * progress, false)
  }
  useGSAP(() => {
    if (paused || systemReduced || !section.current) return
    // The camera, backdrop, and controls use the same scroll progress.
    const trigger = ScrollTrigger.create({
      trigger: section.current,
      start: () => `top top+=${window.innerWidth <= 650 ? 76 : window.innerWidth <= 980 ? 84 : 100}`,
      end: 'bottom bottom',
      onUpdate: self => update(self.progress),
      onRefresh: self => update(self.progress),
    })
    scrollTrigger.current = trigger
    update(trigger.progress)
    return () => { scrollTrigger.current = null; trigger.kill() }
  }, { scope: section, dependencies: [paused, systemReduced], revertOnUpdate: true })

  return <section id="journey" ref={section} className={`model-journey${systemReduced ? ' journey-reduced' : ''}`} aria-labelledby="journey-title">
    <div className="journey-frame" ref={frame} data-journey-chapter={active}>
      <SceneEnvironments />
      <header className="journey-heading">
        <span id="journey-title">Three dimensions of my work</span>
        <a href="#project">Skip to project <Icon name="down" /></a>
      </header>
      <div className="journey-copy">
        {chapters.map((chapter, i) => <div className="journey-panel" data-active={active === i} key={chapter.title} aria-hidden={active !== i}>
          <h2>{chapter.title}.</h2>
          <p className="journey-panel-label">{chapter.label}</p>
          <p className="journey-panel-copy">{chapter.copy}</p>
          <p className="journey-detail"><strong>{chapter.detail}</strong><span>{chapter.note}</span></p>
        </div>)}
      </div>
      <div className="journey-visual"><SceneWindow id={modelIds[active]} chapter="journey" className="journey-scene" /></div>
      <div className="journey-footer">
        <span className="journey-count" aria-hidden="true">0{active + 1} <span>/ 03</span></span>
        <div className="journey-chapters" role="group" aria-label="3D story chapters">
          {chapters.map((chapter, i) => <button type="button" className="journey-stop" key={chapter.title} onClick={() => showChapter(i)} aria-label={`View ${chapter.title} chapter`} aria-pressed={active === i}>{chapter.title}</button>)}
        </div>
        <button type="button" className="journey-motion" onClick={toggleMotion} disabled={systemReduced} aria-pressed={paused} aria-label={systemReduced ? 'System reduced motion' : paused ? 'Enable motion' : 'Pause motion'}>
          <span>{paused ? 'Enable motion' : 'Pause motion'}</span><Icon name={paused ? 'play' : 'pause'} />
        </button>
      </div>
    </div>
  </section>
}
