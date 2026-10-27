import { useState, type CSSProperties } from 'react'
import { competencies, skillGroups } from '../data/profile'
import { SceneWindow } from '../components/SceneWindow'
import { Icon } from '../components/Icon'
import { technologyIcon, technologyVisuals } from '../data/technologies'

const toolkit = skillGroups.flatMap(group => group.skills)

export function Capabilities() {
  const [selected, setSelected] = useState('React.js')
  const category = skillGroups.find(group => group.skills.includes(selected))!.label
  const visual = technologyVisuals[selected]
  return <section id="skills" className="section capabilities-section" aria-labelledby="skills-title" style={{ '--asset-accent': visual.accent } as CSSProperties}><div className="container">
    <div className="section-heading" data-reveal><div><p className="section-label">Technical capabilities</p><h2 id="skills-title">A connected<br />toolkit.</h2></div><p className="section-intro">Interfaces, application logic, and the tools behind the work. Select a skill to explore its 3D identity.</p></div>
    <div className="skills-layout">
      <div className="skill-preview content-stage">
        <div className="stage-index" aria-hidden="true"><span>Tool in focus</span><span>{String(toolkit.indexOf(selected) + 1).padStart(2, '0')} / {toolkit.length}</span></div>
        <SceneWindow id="react-js" chapter="skills" technology={selected} className="section-scene" />
        <div className="skill-selection" role="status" aria-live="polite"><span>{category}</span><strong>{selected}</strong><p>{visual.description}</p></div>
        <span className="skill-preview-note">Select a skill to change the object.</span>
      </div>
      <div className="skill-groups" data-reveal>{skillGroups.map(group => <div className="skill-group" key={group.label}>
        <h3>{group.label}<span className="skill-group-count" aria-hidden="true">{String(group.skills.length).padStart(2, '0')}</span></h3>
        <div className="skill-buttons">{group.skills.map(skill => <button key={skill} aria-pressed={selected === skill} onClick={() => setSelected(skill)}>
          <span className="skill-icon-frame" aria-hidden="true"><img className="skill-icon" src={technologyIcon(skill)} alt="" width="20" height="20" loading="lazy" /></span>
          <span className="skill-name">{skill}</span><span className="skill-selected-mark" aria-hidden="true"><Icon name="check" /></span>
        </button>)}</div>
      </div>)}</div>
    </div>
    <div className="competency-grid">{competencies.map(group => <div key={group.label} data-reveal><h3>{group.label}</h3><ul>{group.items.map(item => <li key={item}>{item}</li>)}</ul></div>)}</div>
  </div></section>
}
