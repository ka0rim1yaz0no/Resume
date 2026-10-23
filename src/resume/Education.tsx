import { useState, type CSSProperties } from 'react'
import { schools } from '../data/schools'
import { EducationExplorer } from '../components/EducationExplorer'

export function Education() {
  const [selected, setSelected] = useState(0)
  const active = schools[selected]
  return <div id="education" className="education-list" aria-labelledby="education-title">
    <div className="education-heading"><h3 id="education-title" className="section-label">Education</h3><span>Foundations behind the work</span></div>
    <figure className="education-visual content-stage">
      <div className="education-selector" role="group" aria-label="Explore education emblems">{schools.map((school, index) => <button key={school.id} aria-pressed={selected === index} onClick={() => setSelected(index)}><span className="company-indicator" style={{ background: school.accent }} />{school.shortName}</button>)}</div>
      <div className="education-model">
        <div className="scene-window section-scene" data-scene="education" data-scene-model="school" data-school={active.id} aria-hidden="true">
          <div className={`scene-poster school-static school-static-${active.id}`}><img src={active.logo} alt="" width="447" height="447" loading="lazy" /></div>
          <span className="scene-window-glow" />
        </div>
        {schools.map((school, index) => <EducationExplorer key={school.id} index={index} active={selected === index} />)}
      </div>
      <figcaption><span>Learning & formation</span><span>{String(selected + 1).padStart(2, '0')} / 02</span></figcaption>
    </figure>
    <div className="education-records">{schools.map((school, index) => <article className="education-entry" key={school.id} data-active={selected === index} style={{ '--school-accent': school.accent } as CSSProperties}>
      <div className={`education-logo education-logo-${school.id}`}><img src={school.logo} alt="" width="64" height="64" loading="lazy" /></div>
      <div><p className="education-location">{school.location}</p><h3>{school.institution}</h3><p className="education-course">{school.course}</p>{school.completion && <span className="education-completion">{school.completion}</span>}</div>
    </article>)}</div>
  </div>
}
