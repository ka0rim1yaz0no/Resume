import { documents, interests, languages, profile, assetUrl } from '../data/profile'
import { Icon } from '../components/Icon'
import { Education } from './Education'

export function About() {
  return <section id="about" className="section container about-section" aria-labelledby="about-title">
    <div className="about-layout"><div className="about-copy" data-reveal><p className="section-label">A little about me</p><h2 id="about-title">Curious by nature.<br />Structured by approach.</h2><p>{profile.summary}</p><p>{profile.about}</p><div className="about-languages"><h3>Languages</h3>{languages.map(language => <p key={language.name}><strong>{language.name}</strong><span>{language.level}</span></p>)}</div></div><div><Education /><div className="interests"><h3>Interests & direction</h3><div className="tags">{interests.map(interest => <span key={interest}>{interest}</span>)}</div></div></div></div>
    <div className="document-row" data-reveal><div><h3>Prefer a document?</h3><p>The résumé and CV downloads will appear here when the original PDFs are supplied.</p></div><div>{documents.map(document => document.url ? <a className="button document-button" key={document.label} href={assetUrl(document.url)} download>{document.label}<Icon name="down" /></a> : <button className="button document-button" disabled key={document.label}>{document.label}<span>Not supplied</span></button>)}</div></div>
  </section>
}
