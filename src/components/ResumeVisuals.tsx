import { Icon } from './Icon'
import { useId } from 'react'
import { profile } from '../data/profile'

export function ProjectArchitecture() {
  const id = useId().replaceAll(':', '')
  const grid = `${id}-grid`
  const surface = `${id}-surface`
  return <div className="project-architecture" aria-hidden="true"><svg viewBox="0 0 560 500" fill="none">
    <defs><pattern id={grid} width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0v28" stroke="#e2c9f4" strokeOpacity=".06" /></pattern><linearGradient id={surface} x1="40" y1="100" x2="480" y2="420" gradientUnits="userSpaceOnUse"><stop stopColor="#684482" /><stop offset="1" stopColor="#47295f" /></linearGradient></defs>
    <path fill={`url(#${grid})`} d="M0 0h560v500H0z" />
    <path d="M40 89h480" stroke="#b395c9" strokeOpacity=".5" /><circle cx="44" cy="70" r="3" fill="#efd7ff" /><circle cx="57" cy="70" r="3" fill="#bc94d7" /><circle cx="70" cy="70" r="3" fill="#8c64aa" /><text x="520" y="74" textAnchor="end" className="diagram-meta">LMS / Architecture overview</text>
    <path className="architecture-wire" d="M250 181h28q12 0 12 12v50q0 12 12 12h12M314 288h-12q-12 0-12 12v48q0 12-12 12h-28" stroke="#ddbeef" strokeOpacity=".6" strokeWidth="1.5" /><path d="m307 250 7 5-7 5m-50 95-7 5 7 5" stroke="#ddbeef" strokeWidth="1.5" />
    <rect x="42" y="126" width="208" height="110" rx="8" fill="#53336d" stroke="#af8bc8" /><text x="64" y="153" className="diagram-meta">The interface</text><text x="64" y="187" className="diagram-title">React.js</text><text x="64" y="213" className="diagram-note">JavaScript · Daisy UI</text><path d="M211 147h18v14h-18zm0 4h18" stroke="#d4b2e7" />
    <rect x="314" y="201" width="204" height="121" rx="8" fill={`url(#${surface})`} stroke="#ddbeef" /><text x="336" y="229" className="diagram-meta">Server-side logic</text><text x="336" y="263" className="diagram-title">Node.js / Express</text><text x="336" y="290" className="diagram-note">API · Authentication</text><circle cx="493" cy="224" r="4" fill="#efd7ff" />
    <rect x="42" y="306" width="208" height="110" rx="8" fill={`url(#${surface})`} stroke="#ddbeef" /><text x="64" y="334" className="diagram-meta">Structured data</text><text x="64" y="369" className="diagram-title">PostgreSQL</text><text x="64" y="395" className="diagram-note">Schema · Queries · Processing</text><ellipse cx="221" cy="329" rx="9" ry="4" stroke="#ddbeef" /><path d="M212 329v13c0 5 18 5 18 0v-13" stroke="#ddbeef" />
    <text x="317" y="374" className="diagram-meta">My contribution</text><text x="317" y="400" className="diagram-note">Backend + Database</text><path d="M42 450h476" stroke="#b395c9" strokeOpacity=".4" />
  </svg></div>
}

export function ExperienceWorkflow() {
  const practices = [
    { icon: 'platforms' as const, title: 'Website administration', detail: 'WordPress & corporate operations' },
    { icon: 'copy' as const, title: 'Document review', detail: 'Data organization & attention to detail' },
    { icon: 'check' as const, title: 'Quality assurance', detail: 'Checking, analysis & precision' },
    { icon: 'automation' as const, title: 'Team coordination', detail: 'A remote, global workflow' },
  ]
  return <div className="experience-workflow" aria-hidden="true"><div className="workflow-heading"><span>Knowles internship workflow</span><span className="workflow-heading-line" /></div><div className="workflow-practices">{practices.map(practice => <div className="workflow-practice" key={practice.title}><span className="workflow-node"><Icon name={practice.icon} /></span><div><strong>{practice.title}</strong><span>{practice.detail}</span></div></div>)}</div><div className="workflow-endnote"><span />Connected by careful work.</div></div>
}

export function SkillMap({ category }: { category: string }) {
  const active = category === 'Interfaces & web' ? 0 : category === 'Logic & data' ? 1 : 2
  return <div className="skill-map" aria-hidden="true"><div className="skill-map-line" /><div className="skill-map-layers">{[{ icon: 'platforms' as const, title: 'Interface', note: 'The experience' }, { icon: 'intelligence' as const, title: 'Logic & data', note: 'The foundation' }, { icon: 'automation' as const, title: 'Tools', note: 'The workflow' }].map((layer, index) => <div key={layer.title} className={`skill-map-layer ${active === index ? 'is-active' : ''}`}><Icon name={layer.icon} /><span>{layer.title}<small>{layer.note}</small></span><i /></div>)}</div></div>
}

export function RecognitionTimeline({ year }: { year: string }) {
  const selected = year.startsWith('2024') ? '2024' : year
  return <div className="recognition-visual" aria-hidden="true"><p>A record of learning.</p><div className="recognition-year" key={year}>{year.slice(0, 4)}<span>↗</span></div><div className="recognition-years">{['2023', '2024', '2025', '2026'].map(item => <span key={item} className={selected === item ? 'is-active' : ''}><i />{item}</span>)}</div></div>
}

export function ContactSignet() {
  return <div className="personal-signet" aria-hidden="true"><span>V<i>/</i>DR<span className="signet-dot">.</span></span><div>A conversation.<br />A connection.<span>{profile.fullName}</span></div></div>
}
