import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
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
      const panel = screen.getByRole('region', { name: layer.label })
      expect(container.querySelector('[data-project-selected]')).toHaveAttribute('data-project-selected', String(projectLayers.indexOf(layer)))
      expect(within(panel).getByRole('heading', { name: layer.title })).toBeInTheDocument()
      for (const other of projectLayers.filter(value => value !== layer)) expect(within(panel).queryByRole('heading', { name: other.title })).not.toBeInTheDocument()
      expect(panel).toHaveTextContent(layer.title)
      expect(panel).toHaveTextContent(layer.description)
      layer.stack.forEach(technology => { expect(project.technology).toContain(technology); expect(panel).toHaveTextContent(technology) })
    }
    fireEvent.click(screen.getByRole('button', { name: 'Explore my contribution' }))
    expect(openDetails).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Reassemble project laptop' }))
    expect(screen.queryByRole('region', { name: /^(API layer|Backend|Database)$/ })).not.toBeInTheDocument()
    expect(container.querySelector('[data-project-exploded]')).toHaveAttribute('data-project-exploded', '0')
  })

  it('supports keyboard layer selection and Escape returns focus to the laptop', () => {
    render(<FeaturedProject openDetails={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Separate laptop/ }))
    const tab = screen.getByRole('button', { name: 'API layer' })
    fireEvent.keyDown(tab, { key: 'ArrowRight' })
    expect(screen.getByRole('button', { name: 'Backend' })).toHaveFocus()
    expect(screen.getByRole('region', { name: 'Backend' })).toHaveTextContent('Node.js')
    fireEvent.keyDown(screen.getByRole('button', { name: 'Backend' }), { key: 'End' })
    expect(screen.getByRole('region', { name: 'Database' })).toHaveTextContent('PostgreSQL')
    fireEvent.keyDown(screen.getByRole('button', { name: 'Database' }), { key: 'Escape' })
    expect(screen.getByRole('button', { name: /Separate laptop/ })).toHaveFocus()
  })

  it('preserves normal laptop poses outside the featured project and restores every pivot exactly', () => {
    expect(projectPresence('project', 'project', 0, 1)).toBe(1)
    expect(projectPresence('project', 'experience', 1, 1)).toBe(0)
    expect(projectPresence('film', 'film', 0, 0)).toBe(0)
    const root = new Group()
    for (let i = 0; i < 3; i++) { const part = new Group(); part.userData.projectPiece = i; part.position.set(i, i + 0.5, 0); part.rotation.set(i === 0 ? -0.2 : 0, 0, 0); part.userData.projectAnchor = [0, 1, 0]; root.add(part) }
    const before = root.children.map(part => part.position.clone()), rig = bindProjectAssembly(root)
    for (const progress of [1, 0.4, 0.8, 0]) rig.update(progress, false)
    root.children.forEach((part, i) => { expect(part.position.equals(before[i])).toBe(true); expect(part.rotation.toArray()).toEqual([i === 0 ? -0.2 : 0, 0, 0, 'XYZ']); expect(rig.parts[i].anchor.toArray()).toEqual([0, 1, 0]) })
    for (let i = 0; i < 3; i++) {
      expect(projectPartPose(i, -1, false)).toEqual(projectPartPose(i, 0, false))
      expect(Object.values(projectPartPose(i, 1, false)).every(Number.isFinite)).toBe(true)
    }
  })

  it('ships complete physical components with hinge origins and no clipping caps on both profiles', () => {
    for (const file of ['public/models/project-laptop.glb', `public/models/mobile/${mobileModels['project-laptop']}`]) {
      const glb = readFileSync(file), json = JSON.parse(glb.toString('utf8', 20, 20 + glb.readUInt32LE(12)))
      const pieces = json.nodes.filter((node: { extras?: { projectPiece?: number } }) => node.extras?.projectPiece !== undefined)
      expect(json.scenes[0].extras.physicalAssembly).toBe(true)
      expect(pieces.every((node: { mesh?: number; children?: number[]; extras: { projectAnchor?: number[]; physicalComponent?: string } }) => node.mesh === undefined && node.children?.length === 1 && node.extras.projectAnchor?.length === 3 && !!node.extras.physicalComponent)).toBe(true)
      expect(pieces[0].rotation[0]).not.toBe(0)
      expect(json.materials.some((material: { name: string }) => /Cut/.test(material.name))).toBe(false)
      expect(glb.byteLength).toBeLessThan(file.includes('/mobile/') ? 220000 : 450000)
      expect(pieces.map((node: { extras: { projectPiece: number } }) => node.extras.projectPiece).sort()).toEqual([0, 1, 2])
    }
  })
})
