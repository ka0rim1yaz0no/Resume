import { useEffect, useRef, useState } from 'react'
import { Hero } from './Hero'
import { FeaturedProject } from './FeaturedProject'
import { Experience } from './Experience'
import { Capabilities } from './Capabilities'
import { About } from './About'
import { Credentials } from './Credentials'
import { Contact } from './Contact'
import { ProjectDialog } from './ProjectDialog'
import { Icon } from '../components/Icon'
import { useMediaQuery, useDocumentVisible } from '../hooks/usePreferences'
import { useMotion } from '../hooks/useMotion'
import { profile } from '../data/profile'
import { ScrollExperience } from '../components/ScrollExperience'
import type { ModelId } from '../data/assets'
import { ModelJourney } from './ModelJourney'
import { OpeningSequence } from '../components/OpeningSequence'

export default function Resume() {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const visible = useDocumentVisible()
  const [paused, setPaused] = useState(false)
  const [menu, setMenu] = useState(false)
  const [projectOpen, setProjectOpen] = useState(false)
  const [model, setModel] = useState<ModelId>('systems-sculpture')
  const [turn, setTurn] = useState(0)
  const [reset, setReset] = useState(0)
  const menuButton = useRef<HTMLButtonElement>(null)
  const root = useMotion(paused || reduced)
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && menu) { setMenu(false); menuButton.current?.focus() } }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [menu])
  return <div ref={root} className={`${paused || reduced ? 'motion-paused' : ''} personal-resume`}>
    <a className="skip-link" href="#main">Skip to content</a>
    <div className="reading-progress" aria-hidden="true" />
    <header className="site-header"><div className="container nav-inner"><a href="#" className="wordmark personal-wordmark" aria-label={`${profile.fullName} home`}><span className="wordmark-full-name">Vincent Layzie C.<span>Del Rosario</span></span></a><nav id="primary-navigation" className={menu ? 'navigation is-open' : 'navigation'} aria-label="Main navigation">{[['Project', 'project'], ['Experience', 'experience'], ['Skills', 'skills'], ['About', 'about'], ['Recognition', 'credentials']].map(([label, id]) => <a href={`#${id}`} key={id} onClick={() => setMenu(false)}>{label}</a>)}<a className="nav-contact" href="#contact" onClick={() => setMenu(false)}>Contact <Icon name="arrow" /></a></nav><button ref={menuButton} className="icon-button menu-toggle" aria-label={menu ? 'Close navigation' : 'Open navigation'} aria-expanded={menu} aria-controls="primary-navigation" onClick={() => setMenu(value => !value)}><Icon name={menu ? 'close' : 'menu'} /></button></div></header>
    <main id="main">
      <Hero model={model} turnLeft={() => setTurn(value => value - 0.35)} turnRight={() => setTurn(value => value + 0.35)} resetView={() => { setTurn(0); setReset(value => value + 1) }} selectModel={id => { setModel(id); setTurn(0) }} paused={paused || reduced} systemReduced={reduced} toggleMotion={() => setPaused(value => !value)} />
      <div className="capability-strip"><div className="container"><p>Interfaces. Logic. Data.</p><div><span>Web development</span><span className="strip-join" aria-hidden="true">+</span><span>Systems thinking</span><span className="strip-join" aria-hidden="true">+</span><span>Project coordination</span></div></div></div>
      <ModelJourney paused={paused || reduced} systemReduced={reduced} toggleMotion={() => setPaused(value => !value)} />
      <FeaturedProject openDetails={() => setProjectOpen(true)} />
      <Experience />
      <Capabilities />
      <About />
      <Credentials />
      <Contact />
    </main>
    <ScrollExperience root={root} model={model} turn={turn} reset={reset} motion={!reduced && !paused} running={visible && !projectOpen && !menu} />
    <OpeningSequence disabled={reduced || paused} />
    <footer className="site-footer container"><a className="footer-personal-name" href="#">{profile.name}<span>Information Technology · Web Development · Project Management</span></a><div><a href={profile.github} target="_blank" rel="noreferrer">GitHub <Icon name="arrow" /></a><button onClick={() => setPaused(value => !value)} disabled={reduced} aria-pressed={paused || reduced}>{reduced ? 'System reduced motion' : `Motion ${paused ? 'off' : 'on'}`}</button><span>© {new Date().getFullYear()} {profile.fullName}</span></div></footer>
    {projectOpen && <ProjectDialog close={() => setProjectOpen(false)} />}
  </div>
}
