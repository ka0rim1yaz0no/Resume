import { useState } from 'react'
import { competencies, skillGroups } from '../data/profile'
import { SceneWindow } from '../components/SceneWindow'

export function Capabilities() {
  const [selected, setSelected] = useState('React.js')
  const category = skillGroups.find(group => group.skills.includes(selected))!.label
  return <section id="skills" className="section capabilities-section" aria-labelledby="skills-title"><div className="container">
    <div className="section-heading" data-reveal><div><p className="section-label">Technical capabilities</p><h2 id="skills-title">Interfaces to databases.<br />And everything between.</h2></div><p className="section-intro">The technologies and working practices I bring to a project. Select a technology to explore the toolkit.</p></div>
    <div className="skills-layout"><div className="skill-preview content-stage"><SceneWindow id="react-js" chapter="skills" technology={selected} className="section-scene" /><span className="model-context">{selected} · From my toolkit</span><div className="skill-selection" role="status" aria-live="polite"><span>{category}</span><strong>{selected}</strong></div><p>Select a technology to explore.</p></div><div className="skill-groups" data-reveal>{skillGroups.map(group => <div className="skill-group" key={group.label}><h3>{group.label}</h3><div className="skill-buttons">{group.skills.map(skill => <button key={skill} aria-pressed={selected === skill} onClick={() => setSelected(skill)}><span className="skill-name">{skill}</span><span className="skill-arrow" aria-hidden="true">↗</span></button>)}</div></div>)}</div></div>
    <div className="competency-grid">{competencies.map(group => <div key={group.label} data-reveal><h3>{group.label}</h3><ul>{group.items.map(item => <li key={item}>{item}</li>)}</ul></div>)}</div>
  </div></section>
}
