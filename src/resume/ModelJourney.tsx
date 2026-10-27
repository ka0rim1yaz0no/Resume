import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import gsap from 'gsap'
import { SceneWindow } from '../components/SceneWindow'
import { Icon } from '../components/Icon'
import { modelIds } from '../data/assets'
import { profile } from '../data/profile'
import { scrollToChapter } from '../hooks/useMotion'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const chapters = [
  { title: 'Systems.', label: 'Interfaces. Logic. Data.', copy: 'Understanding how things fit together. Building the connections that make them work.', detail: profile.fullName, note: 'Information Technology' },
  { title: 'Interfaces.', label: 'Built together. Connected throughout.', copy: 'A learning management system shaped by backend logic, structured data, and collaboration.', detail: 'Learning Management System', note: 'Capstone project · 2025' },
  { title: 'Workflow.', label: 'Structure behind the work.', copy: 'Website administration, document review, and quality assurance across a global workflow.', detail: '486 internship hours', note: 'Knowles Training Institute · 2026' },
]

export function ModelJourney({ paused, systemReduced, toggleMotion }: { paused: boolean; systemReduced: boolean; toggleMotion: () => void }) {
  const section = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)
  const pausedNow = useRef(paused)
  pausedNow.current = paused
  const showChapter = (index: number) => {
    if (!section.current) return
    const header = window.innerWidth <= 650 ? 76 : window.innerWidth <= 980 ? 84 : 100
    const start = section.current.getBoundingClientRect().top + window.scrollY - header
    const distance = section.current.offsetHeight - window.innerHeight + header
    scrollToChapter(start + distance * [0.1, 0.5, 0.9][index], paused)
  }
  useGSAP(() => {
    const sceneWindow = section.current?.querySelector<HTMLElement>('[data-scene="journey"]')
    const update = (progress: number) => {
      if (pausedNow.current) return
      if (sceneWindow) sceneWindow.dataset.sceneScore = String(progress)
      setActive(progress < 0.33 ? 0 : progress < 0.68 ? 1 : 2)
    }
    if (paused) return
    // Lenis already smooths native scroll. A single progress source keeps the
    // captions and camera together, including deep links and reverse scrolling.
    const trigger = ScrollTrigger.create({
      trigger: section.current,
      start: () => `top top+=${window.innerWidth <= 650 ? 76 : window.innerWidth <= 980 ? 84 : 100}`,
      end: 'bottom bottom', onUpdate: self => update(self.progress), onRefresh: self => update(self.progress),
    })
    update(trigger.progress)
    return () => trigger.kill()
  }, { scope: section, dependencies: [paused], revertOnUpdate: true })
  return <section id="journey" ref={section} className={`model-journey ${systemReduced ? 'journey-reduced' : ''}`} aria-label="Systems, interfaces, and workflow in motion">
    <div className="journey-frame" data-journey-chapter={active}>
      <div className="journey-heading"><div className="journey-heading-links"><span>Three dimensions of my work</span><a href="/">Replay intro <Icon name="play" /></a></div><a href="#project">Skip to résumé <Icon name="down" /></a></div>
      <div className="journey-titles" aria-hidden="true">{chapters.map((chapter, i) => <span key={chapter.title} className={active === i ? 'is-active' : ''}>{chapter.title}</span>)}</div>
      <SceneWindow id={modelIds[active]} chapter="journey" className="journey-scene" />
      <div className="journey-copy">{chapters.map((chapter, i) => <div className={`journey-panel ${active === i ? 'is-active' : ''}`} key={chapter.title} aria-hidden={active !== i}><h2>{chapter.label}</h2><p>{chapter.copy}</p></div>)}</div>
      <div className="journey-detail">{chapters.map((chapter, i) => <div className={active === i ? 'is-active' : ''} key={chapter.title} aria-hidden={active !== i}><strong>{chapter.detail}</strong><span>{chapter.note}</span></div>)}</div>
      <div className="journey-footer"><div className="journey-chapters" aria-label={`Chapter ${active + 1} of 3`}><span>0{active + 1} <i>/ 03</i></span><div>{chapters.map((chapter, i) => <button className="journey-stop" key={chapter.title} onClick={() => showChapter(i)} aria-label={`View ${chapter.title.replace('.', '')} chapter`} aria-pressed={active === i}><b className={active === i ? 'is-active' : ''} /><span>{chapter.title.replace('.', '')}</span></button>)}</div></div><span className="journey-scroll-note">{paused ? 'A still moment' : 'Scroll to move through the story'}</span><button onClick={toggleMotion} disabled={systemReduced} aria-pressed={paused}>{systemReduced ? 'Reduced motion' : paused ? 'Enable motion' : 'Pause motion'}<Icon name={paused ? 'play' : 'pause'} /></button></div>
    </div>
  </section>
}
