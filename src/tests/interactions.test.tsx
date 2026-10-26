import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ProjectDialog } from '../resume/ProjectDialog'
import { Contact } from '../resume/Contact'
import { Capabilities } from '../resume/Capabilities'
import { Credentials } from '../resume/Credentials'
import { About } from '../resume/About'
import { Experience } from '../resume/Experience'
import { credentials, education, experience, profile, project, skillGroups } from '../data/profile'
import { technologyIcon, technologyVisuals } from '../data/technologies'
import { organizations } from '../data/organizations'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('Source-grounded résumé', () => {
  it('retains the required skills, credentials, internship facts, and unspecified BSIT completion', () => {
    expect(new Set(skillGroups.flatMap(group => group.skills)).size).toBe(17)
    expect(skillGroups.find(group => group.label === 'Tools & productivity')?.skills).toEqual(['GitHub', 'Microsoft Office 365', 'SiteGround', 'Hostinger', 'GoDaddy'])
    expect(credentials).toHaveLength(10)
    const internship = experience.find(item => item.organization === 'Knowles Training Institute')!
    expect(internship.hours).toBe(486)
    expect(internship.period).toBe('February–May 2026')
    expect(education[0].completion).toBeNull()
  })
  it('lists the current Assistly role first with only the five confirmed duties', () => {
    const { container } = render(<Experience />)
    const entries = container.querySelectorAll('.experience-entry')
    expect([...entries].map(entry => entry.querySelector('h3')?.textContent)).toEqual(['Assistly BPO Corporation', 'Knowles Training Institute', 'SYNTAX Organization'])
    expect([...entries].map(entry => entry.querySelector('img')?.getAttribute('src'))).toEqual(organizations.map(org => org.logo))
    expect(container.querySelector('[data-scene="experience"]')).toHaveAttribute('data-scene-model', 'organization')
    expect(container.querySelector('[data-scene="experience"] img')?.getAttribute('src')).not.toContain('workflow-board')
    expect(entries[0]).toHaveTextContent('Current employment')
    expect(entries[0]).toHaveTextContent('Website Developer')
    expect(entries[0]).toHaveTextContent('July 15, 2026–Present')
    expect(entries[0]).toHaveTextContent('Baguio City, Philippines')
    expect(entries[0].querySelector('time')).toHaveAttribute('datetime', '2026-07-15')
    expect([...entries[0].querySelectorAll('li')].map(item => item.textContent)).toEqual([
      'Website development and maintenance.', 'Responsive web interface implementation.',
      'Website functionality testing and troubleshooting.', 'User interface and usability improvements.',
      'Website updates and collaboration on design requirements.',
    ])
    expect(profile.summary).toContain('Website Developer at Assistly BPO Corporation')
  })
  it('presents the real collaborative project and an honest image disclosure', () => {
    render(<ProjectDialog close={vi.fn()} />)
    expect(screen.getByRole('dialog')).toHaveAttribute('open')
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(project.title)
    expect(screen.getByText(/not an actual application screenshot/)).toBeInTheDocument()
    expect(screen.getByText(/Collaborated with front-end developers/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Live demo' })).not.toBeInTheDocument()
  })
  it('updates the selected technology without inventing a proficiency score', () => {
    const { container } = render(<Capabilities />)
    for (const skill of skillGroups.flatMap(group => group.skills)) {
      fireEvent.click(screen.getByRole('button', { name: skill }))
      expect(screen.getByRole('status')).toHaveTextContent(skill)
      expect(screen.getByRole('button', { name: skill })).toHaveAttribute('aria-pressed', 'true')
      const visual = container.querySelector('[data-scene="skills"]')!
      expect(visual).toHaveAttribute('data-technology', skill)
      expect(visual.querySelector('img')).toHaveAttribute('src', technologyIcon(skill))
      expect(screen.getByRole('status')).toHaveTextContent(technologyVisuals[skill].description)
      expect(container.querySelector('#skills')).toHaveStyle({ '--asset-accent': technologyVisuals[skill].accent })
    }
  })
  it('shows the selected credential and its position without suggesting a document preview', () => {
    render(<Credentials />)
    fireEvent.click(screen.getByRole('button', { name: /AI Ready ASEAN/ }))
    expect(screen.getByRole('status')).toHaveTextContent('AI Ready ASEAN: ASEAN Foundation')
    expect(screen.getByRole('status')).toHaveTextContent('02 / 10')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
  it('does not generate broken links for missing résumé documents', () => {
    const { container } = render(<About />)
    expect(container.querySelectorAll('a[download]')).toHaveLength(0)
    expect(screen.getByRole('link', { name: 'Request résumé' })).toHaveAttribute('href', `mailto:${profile.email}?subject=Request%3A%20Professional%20r%C3%A9sum%C3%A9`)
    expect(screen.getByRole('link', { name: 'Request CV' })).toHaveAttribute('href', `mailto:${profile.email}?subject=Request%3A%20Curriculum%20vitae`)
  })
})

describe('Direct contact', () => {
  it('reports clipboard success only after the write resolves', async () => {
    let resolveCopy: () => void = () => {}
    const writeText = vi.fn(() => new Promise<void>(resolve => { resolveCopy = resolve }))
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    render(<Contact />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy email' }))
    expect(screen.queryByText('Email copied')).not.toBeInTheDocument()
    resolveCopy()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Email copied' })).toBeInTheDocument())
    expect(writeText).toHaveBeenCalledWith(profile.email)
    expect(screen.getByRole('link', { name: profile.phone })).toHaveAttribute('href', profile.phoneHref)
  })
  it('offers an honest alternative after clipboard failure', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('Denied')) } })
    render(<Contact />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy email' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Copy unavailable'))
    expect(screen.getByRole('link', { name: profile.email })).toHaveAttribute('href', `mailto:${profile.email}`)
    expect(screen.queryByText('Email copied')).not.toBeInTheDocument()
  })
})
