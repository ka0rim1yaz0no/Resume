import { useRef, useState, type CSSProperties } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { experience } from '../data/profile'
import { organizations } from '../data/organizations'
import { SceneWindow } from '../components/SceneWindow'
import { ExperienceExplorer } from '../components/ExperienceExplorer'
import { experienceFocus, experienceReader, experienceScrollTarget } from '../three/experienceChoreography'
import { scrollToChapter } from '../hooks/useMotion'

gsap.registerPlugin(useGSAP, ScrollTrigger)

function flowTop(element: HTMLElement) {
  let top = 0
  for (let node: HTMLElement | null = element; node; node = node.offsetParent as HTMLElement | null) top += node.offsetTop + (node.offsetParent?.clientTop || 0)
  return top
}

export function Experience({ paused = false }: { paused?: boolean }) {
  const section = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)
  useGSAP(() => {
    const root = section.current
    if (!root) return
    const scene = root.querySelector<HTMLElement>('[data-scene="experience"]')!
    const figure = root.querySelector<HTMLElement>('.experience-visual')!
    const entries = [...root.querySelectorAll<HTMLElement>('.experience-entry')]
    const update = () => {
      const compact = innerWidth <= 650, header = compact ? 76 : innerWidth <= 980 ? 84 : 100
      const centers = entries.map(entry => flowTop(entry) + entry.offsetHeight * 0.5)
      const focus = experienceFocus(centers, scrollY + experienceReader(innerHeight, header, figure.offsetHeight, compact))
      scene.dataset.experienceFocus = focus.toFixed(5)
      const index = Math.round(focus)
      setActive(previous => previous === index ? previous : index)
    }
    const trigger = ScrollTrigger.create({ trigger: root, start: 'top bottom', end: 'bottom top', onUpdate: update, onRefresh: update })
    update()
    return () => { trigger.kill() }
  }, { scope: section })
  const focusRole = (index: number) => {
    const root = section.current!
    const entry = root.querySelectorAll<HTMLElement>('.experience-entry')[index]
    const compact = innerWidth <= 650, header = compact ? 76 : innerWidth <= 980 ? 84 : 100
    const sceneHeight = root.querySelector<HTMLElement>('.experience-visual')!.offsetHeight
    scrollToChapter(experienceScrollTarget(flowTop(entry), entry.offsetHeight, innerHeight, header, sceneHeight, compact), paused)
  }
  return <section ref={section} id="experience" className="section container" aria-labelledby="experience-title">
    <div className="section-heading" data-reveal><div><p className="section-label">Experience</p><h2 id="experience-title">The systems.<br />And the people behind them.</h2></div><p className="section-intro">Technical work, administrative precision, and collaboration across different environments.</p></div>
    <div className="experience-layout"><div className="experience-aside"><figure className="experience-visual content-stage"><SceneWindow id="workflow-board" chapter="experience" organization={active} className="section-scene" />{organizations.map((org, index) => <ExperienceExplorer key={org.id} index={index} active={active === index} />)}<figcaption className="experience-scene-caption"><div><span>Structure behind the work</span><strong>{organizations[active].name}</strong></div><span>{String(active + 1).padStart(2, '0')} / 03</span></figcaption><div className="experience-chapters" role="group" aria-label="Explore experience in 3D">{organizations.map((org, index) => <button key={org.id} aria-pressed={active === index} onClick={() => focusRole(index)}><span className="company-indicator" style={{ background: org.accent }} />{org.shortName}</button>)}</div></figure><div className="internship-stat"><span className="fact-number" data-counter="486" aria-hidden="true">486</span><p><strong><span className="sr-only">486 </span>Internship hours completed</strong><span>Knowles Training Institute · 2026</span></p></div></div>
    <div className="experience-timeline"><span className="timeline-progress-fill" aria-hidden="true" />{experience.map((item, index) => <article className={`experience-entry${item.current ? ' experience-current' : ''}`} key={item.organization} id={`experience-${organizations[index].id}`} data-active={active === index} style={{ '--organization-accent': organizations[index].accent } as CSSProperties} data-reveal>{item.current && <span className="employment-status"><span className="status-dot" />Current employment</span>}<div className="experience-meta"><span>{item.startDate ? <><time dateTime={item.startDate}>July 15, 2026</time>–Present</> : item.period}</span><span>{item.location}</span></div><div className="experience-entry-heading"><div className={`experience-logo experience-logo-${organizations[index].id}`}><img src={organizations[index].logo} alt="" loading="lazy" width="96" height="96" /></div><div><h3>{item.organization}</h3><p className="experience-role">{item.role}</p></div></div>{item.description && <p className="experience-description">{item.description}</p>}{item.responsibilities.length > 0 && <ul>{item.responsibilities.map(task => <li key={task}>{task}</li>)}</ul>}</article>)}</div></div>
  </section>
}
