import { experience } from '../data/profile'
import { SceneWindow } from '../components/SceneWindow'

export function Experience() {
  return <section id="experience" className="section container" aria-labelledby="experience-title">
    <div className="section-heading" data-reveal><div><p className="section-label">Experience</p><h2 id="experience-title">The systems.<br />And the people behind them.</h2></div><p className="section-intro">Technical work, administrative precision, and collaboration across different environments.</p></div>
    <div className="experience-layout"><div className="experience-aside"><figure className="experience-visual content-stage"><SceneWindow id="workflow-board" chapter="experience" className="section-scene" /><figcaption>Structure behind the work.<span>Workflow · Visual study</span></figcaption></figure><div className="internship-stat"><span className="fact-number" data-counter="486" aria-hidden="true">486</span><p><strong><span className="sr-only">486 </span>Internship hours completed</strong><span>Knowles Training Institute · 2026</span></p></div></div>
    <div className="experience-timeline"><span className="timeline-progress-fill" aria-hidden="true" />{experience.map(item => <article className={`experience-entry${item.current ? ' experience-current' : ''}`} key={item.organization} data-reveal>{item.current && <span className="employment-status"><span className="status-dot" />Current employment</span>}<div className="experience-meta"><span>{item.startDate ? <><time dateTime={item.startDate}>July 15, 2026</time>–Present</> : item.period}</span><span>{item.location}</span></div><h3>{item.organization}</h3><p className="experience-role">{item.role}</p>{item.description && <p className="experience-description">{item.description}</p>}{item.responsibilities.length > 0 && <ul>{item.responsibilities.map(task => <li key={task}>{task}</li>)}</ul>}</article>)}</div></div>
  </section>
}
