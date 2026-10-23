import { useEffect, useRef, useState } from 'react'
import { profile } from '../data/profile'
import { Icon } from '../components/Icon'
import { ContactSignet } from '../components/ResumeVisuals'

export function Contact() {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email)
      setCopied(true); setError(false)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 3000)
    } catch { setError(true) }
  }
  return <section id="contact" className="contact-section" aria-labelledby="contact-title"><div className="container contact-inner">
    <div data-reveal><p className="section-label">Let’s connect</p><h2 id="contact-title">Good work starts<br />with a conversation.</h2><p>Have a project, a question, or a conversation in mind?<br />You can reach me directly.</p><a className="button button-dark" href={`mailto:${profile.email}`}>Send me an email <Icon name="arrow" /></a></div>
    <div className="contact-detail"><ContactSignet /><p>{profile.name} · {profile.location}</p><a className="contact-email" href={`mailto:${profile.email}`}>{profile.email}</a><button className="copy-button" onClick={() => void copy()}><Icon name={copied ? 'check' : 'copy'} />{copied ? 'Email copied' : 'Copy email'}</button><span className="copy-status" role="status">{error ? 'Copy unavailable. Select the address above or open it in your email app.' : copied ? 'Email address copied to clipboard.' : ''}</span><div className="personal-contact-links"><a href={profile.phoneHref}>{profile.phone}</a><a href={profile.github} target="_blank" rel="noreferrer">GitHub <Icon name="arrow" /></a></div></div>
  </div></section>
}
