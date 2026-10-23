import { useRef, useState, type CSSProperties } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { schools } from '../data/schools'
import { EducationExplorer } from '../components/EducationExplorer'
import { experienceFocus } from '../three/experienceChoreography'
import { educationReader, educationScrollTarget, educationStoryFocus, educationStoryTarget } from '../three/educationChoreography'
import { scrollToChapter } from '../hooks/useMotion'
import { useMediaQuery } from '../hooks/usePreferences'

gsap.registerPlugin(useGSAP, ScrollTrigger)

function flowTop(element: HTMLElement) {
  let top = 0
  for (let node: HTMLElement | null = element; node; node = node.offsetParent as HTMLElement | null) top += node.offsetTop + (node.offsetParent?.clientTop || 0)
  return top
}

export function Education({ paused = false }: { paused?: boolean }) {
  const section = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState(0)
  const compactStory = useMediaQuery('(max-width: 650px) and (min-height: 600px) and (prefers-reduced-motion: no-preference)')
  useGSAP(() => {
    const root = section.current!
    const scene = root.querySelector<HTMLElement>('[data-scene="education"]')!
    const figure = root.querySelector<HTMLElement>('.education-visual')!
    const entries = [...root.querySelectorAll<HTMLElement>('.education-entry')]
    let centers: number[] = [], reader = 0
    let storyStart = 0, storyDistance = 1
    const update = () => {
      const focus = compactStory ? educationStoryFocus(scrollY, storyStart, storyDistance) : experienceFocus(centers, scrollY + reader)
      scene.dataset.educationFocus = focus.toFixed(5)
      const index = Math.round(focus)
      setSelected(previous => previous === index ? previous : index)
    }
    const measure = () => {
      const header = innerWidth <= 650 ? 76 : innerWidth <= 980 ? 84 : 100
      centers = entries.map(entry => flowTop(entry) + entry.offsetHeight * 0.5)
      reader = educationReader(innerHeight, header, figure.offsetHeight, getComputedStyle(figure).position === 'sticky')
      const layout = root.querySelector<HTMLElement>('.education-layout')!
      const stage = root.querySelector<HTMLElement>('.education-stage')!
      storyStart = flowTop(layout) - header
      storyDistance = layout.offsetHeight - stage.offsetHeight
      update()
    }
    const trigger = ScrollTrigger.create({ trigger: root, start: 'top bottom', end: 'bottom top', onUpdate: update, onRefresh: measure })
    measure()
    return () => { trigger.kill() }
  }, { scope: section, dependencies: [compactStory], revertOnUpdate: true })
  const focusSchool = (index: number) => {
    const root = section.current!
    const entry = root.querySelectorAll<HTMLElement>('.education-entry')[index]
    const header = innerWidth <= 650 ? 76 : innerWidth <= 980 ? 84 : 100
    if (compactStory) {
      const layout = root.querySelector<HTMLElement>('.education-layout')!
      const stage = root.querySelector<HTMLElement>('.education-stage')!
      scrollToChapter(educationStoryTarget(index, flowTop(layout) - header, layout.offsetHeight - stage.offsetHeight), paused)
      return
    }
    const figure = root.querySelector<HTMLElement>('.education-visual')!
    scrollToChapter(educationScrollTarget(flowTop(entry), entry.offsetHeight, innerHeight, header, figure.offsetHeight, getComputedStyle(figure).position === 'sticky'), paused)
  }
  const active = schools[selected]
  return <div ref={section} id="education" className="education-list" data-education-layout={compactStory ? 'story' : 'flow'} aria-labelledby="education-title">
    <div className="education-heading"><h3 id="education-title" className="section-label">Education</h3><span>Foundations behind the work</span></div>
    <div className="education-layout">
    <div className="education-stage">
    <figure className="education-visual content-stage">
      <div className="education-selector" role="group" aria-label="Explore education emblems">{schools.map((school, index) => <button key={school.id} aria-pressed={selected === index} onClick={() => focusSchool(index)}><span className="company-indicator" style={{ background: school.accent }} />{school.shortName}</button>)}</div>
      <div className="education-model">
        <div className="scene-window section-scene" data-scene="education" data-scene-model="school" data-school={active.id} aria-hidden="true">
          <div className={`scene-poster school-static school-static-${active.id}`}><img src={active.logo} alt="" width="447" height="447" loading="lazy" /></div>
          <span className="scene-window-glow" />
        </div>
        {schools.map((school, index) => <EducationExplorer key={school.id} index={index} active={selected === index} />)}
      </div>
      <figcaption><span>Scroll between schools</span><span>{String(selected + 1).padStart(2, '0')} / 02</span></figcaption>
    </figure>
    <div className="education-records" aria-live={compactStory ? 'polite' : undefined} aria-atomic={compactStory || undefined}>{schools.map((school, index) => <article className="education-entry" key={school.id} id={`education-${school.id}`} data-active={selected === index} aria-hidden={compactStory && selected !== index || undefined} style={{ '--school-accent': school.accent } as CSSProperties}>
      <div className={`education-logo education-logo-${school.id}`}><img src={school.logo} alt="" width="64" height="64" loading="lazy" /></div>
      <div><p className="education-location">{school.location}</p><h3>{school.institution}</h3><p className="education-course">{school.course}</p>{school.completion && <span className="education-completion">{school.completion}</span>}</div>
    </article>)}</div>
    </div>
    </div>
  </div>
}
