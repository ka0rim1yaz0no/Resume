import { project } from '../data/profile'
import { Icon } from '../components/Icon'
import { SceneWindow } from '../components/SceneWindow'

export function FeaturedProject({ openDetails }: { openDetails: () => void }) {
  return <section id="project" className="section work-section" aria-labelledby="project-title"><div className="container">
    <div className="section-heading" data-reveal><div><p className="section-label">Featured project</p><h2 id="project-title">A learning platform.<br />A connected foundation.</h2></div><p className="section-intro">Backend logic, structured data, and collaboration across the application.</p></div>
    <article className="resume-project">
      <button className="resume-project-art architecture-project content-stage" onClick={openDetails} aria-label="Explore the learning management system case study"><span className="work-label">{project.label} · 2025</span><SceneWindow id="project-laptop" chapter="project" className="section-scene project-scene" /><span className="visual-footnote">Conceptual architecture · Explore the project</span><span className="work-open"><Icon name="arrow" /></span></button>
      <div className="resume-project-copy" data-reveal><p className="section-label">{project.period}</p><h3>{project.title}</h3><p>{project.description}</p><div className="tags">{project.technology.map(item => <span key={item}>{item}</span>)}</div><div className="contribution-summary"><p><Icon name="check" />Server-side logic & API endpoints</p><p><Icon name="check" />Authentication & data processing</p><p><Icon name="check" />PostgreSQL schema & queries</p><p><Icon name="check" />Frontend / backend integration</p></div><button className="text-link" onClick={openDetails}>Explore my contribution <Icon name="arrow" /></button></div>
    </article>
  </div></section>
}
