import { useState } from 'react'
import { credentials } from '../data/profile'
import { Icon } from '../components/Icon'
import { RecognitionTimeline } from '../components/ResumeVisuals'

export function Credentials() {
  const [selected, setSelected] = useState(0)
  return <section id="credentials" className="section credentials-section" aria-labelledby="credentials-title"><div className="container">
    <div className="section-heading" data-reveal><div><p className="section-label">Learning & participation</p><h2 id="credentials-title">Certifications<br />& Recognition</h2></div><p className="section-intro">A record of continued learning, practical participation, and recognition.</p></div>
    <div className="credential-layout"><div className="credential-preview"><RecognitionTimeline year={credentials[selected].year} /><div className="credential-selected" role="status"><span>{credentials[selected].year}</span><h3>{credentials[selected].title}</h3><p>Learning & participation <span aria-hidden="true">·</span> {String(selected + 1).padStart(2, '0')} / {credentials.length}</p></div></div><div className="credential-list" data-reveal>{credentials.map((credential, i) => <button key={credential.title} aria-pressed={selected === i} onClick={() => setSelected(i)}><span className="credential-title">{credential.title}</span><span className="credential-year">{credential.year}<Icon name="arrow" /></span></button>)}</div></div>
  </div></section>
}
