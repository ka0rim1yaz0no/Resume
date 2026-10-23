import { documents, education, interests, languages, profile, assetUrl } from '../data/profile'
import { Icon } from '../components/Icon'

export function About() {
  return <section id="about" className="section container about-section" aria-labelledby="about-title">
    <div className="about-layout"><div className="about-copy" data-reveal><p className="section-label">A little about me</p><h2 id="about-title">Curious by nature.<br />Structured by approach.</h2><p>{profile.summary}</p><p>{profile.about}</p><div className="about-languages"><h3>Languages</h3>{languages.map(language => <p key={language.name}><strong>{language.name}</strong><span>{language.level}</span></p>)}</div></div><div className="education-list"><p className="section-label">Education</p>{education.map(item => <article className="education-entry" key={item.institution}><span className="timeline-dot" aria-hidden="true" /><p>{item.location}</p><h3>{item.institution}</h3><p className="education-course">{item.course}</p>{item.completion && <span className="education-completion">{item.completion}</span>}</article>)}<div className="interests"><h3>Interests & direction</h3><div className="tags">{interests.map(interest => <span key={interest}>{interest}</span>)}</div></div></div></div>
    <div className="document-row" data-reveal><div><h3>Prefer a document?</h3><p>The résumé and CV downloads will appear here when the original PDFs are supplied.</p></div><div>{documents.map(document => document.url ? <a className="button document-button" key={document.label} href={assetUrl(document.url)} download>{document.label}<Icon name="down" /></a> : <button className="button document-button" disabled key={document.label}>{document.label}<span>Not supplied</span></button>)}</div></div>
  </section>
}
