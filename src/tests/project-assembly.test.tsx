import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Group } from 'three'
import { FeaturedProject } from '../resume/FeaturedProject'
import { project } from '../data/profile'
import { projectLayers } from '../data/projectLayers'
import mobileModels from '../data/mobileModels.json'
import { bindProjectAssembly, projectPartPose, projectPresence } from '../three/projectAssembly'

vi.mock('../hooks/useMotion', () => ({ scrollToChapter: vi.fn() }))

afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('Explorable project layers', () => {
  it('separates the laptop on click, explains each confirmed layer and retains the full case study', () => {
    const openDetails = vi.fn()
    const { container } = render(<FeaturedProject openDetails={openDetails} />)
    const toggle = screen.getByRole('button', { name: 'Separate laptop to explore how the project was built' })
    fireEvent.click(toggle)
    expect(container.querySelector('[data-project-exploded]')).toHaveAttribute('data-project-exploded', '1')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(openDetails).not.toHaveBeenCalled()
    for (const layer of projectLayers) {
      fireEvent.click(screen.getByRole('button', { name: layer.label }))
      const panel = screen.getByRole('region', { name: /^(Interface|Application|Database)$/ })
      expect(panel).toHaveTextContent(layer.title)
      expect(panel).toHaveTextContent(layer.description)
      layer.stack.forEach(technology => { expect(project.technology).toContain(technology); expect(panel).toHaveTextContent(technology) })
    }
    fireEvent.click(screen.getByRole('button', { name: 'Explore my contribution' }))
    expect(openDetails).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Reassemble project laptop' }))
    expect(screen.queryByRole('region', { name: /^(Interface|Application|Database)$/ })).not.toBeInTheDocument()
    expect(container.querySelector('[data-project-exploded]')).toHaveAttribute('data-project-exploded', '0')
  })

  it('supports keyboard layer selection and Escape returns focus to the laptop', () => {
    render(<FeaturedProject openDetails={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Separate laptop/ }))
    const tab = screen.getByRole('button', { name: 'Interface' })
    fireEvent.keyDown(tab, { key: 'ArrowRight' })
    expect(screen.getByRole('button', { name: 'Application' })).toHaveFocus()
    expect(screen.getByRole('region', { name: /^(Interface|Application|Database)$/ })).toHaveTextContent('Node.js')
    fireEvent.keyDown(screen.getByRole('button', { name: 'Application' }), { key: 'End' })
    expect(screen.getByRole('region', { name: /^(Interface|Application|Database)$/ })).toHaveTextContent('PostgreSQL')
    fireEvent.keyDown(screen.getByRole('button', { name: 'Database' }), { key: 'Escape' })
    expect(screen.getByRole('button', { name: /Separate laptop/ })).toHaveFocus()
  })

  it('preserves normal laptop poses outside the featured project and restores every pivot exactly', () => {
    expect(projectPresence('project', 'project', 0, 1)).toBe(1)
    expect(projectPresence('project', 'experience', 1, 1)).toBe(0)
    expect(projectPresence('film', 'film', 0, 0)).toBe(0)
    const root = new Group()
    for (let i = 0; i < 3; i++) { const part = new Group(); part.userData.projectPiece = i; part.position.set(i, i + 0.5, 0); root.add(part) }
    const before = root.children.map(part => part.position.clone()), rig = bindProjectAssembly(root)
    for (const progress of [1, 0.4, 0.8, 0]) rig.update(progress, false)
    root.children.forEach((part, i) => { expect(part.position.equals(before[i])).toBe(true); expect(part.rotation.toArray()).toEqual([0, 0, 0, 'XYZ']) })
    for (let i = 0; i < 3; i++) {
      expect(projectPartPose(i, -1, false)).toEqual(projectPartPose(i, 0, false))
      expect(Object.values(projectPartPose(i, 1, false)).every(Number.isFinite)).toBe(true)
    }
  })

  it('ships independently pivoted display, application and database geometry on both profiles', () => {
    for (const file of ['public/models/project-laptop.glb', `public/models/mobile/${mobileModels['project-laptop']}`]) {
      const glb = readFileSync(file), json = JSON.parse(glb.toString('utf8', 20, 20 + glb.readUInt32LE(12)))
      const pieces = json.nodes.filter((node: { extras?: { projectPiece?: number } }) => node.extras?.projectPiece !== undefined)
      expect(pieces.map((node: { extras: { projectPiece: number } }) => node.extras.projectPiece).sort()).toEqual([0, 1, 2])
    }
  })
})
