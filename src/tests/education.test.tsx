import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Education } from '../resume/Education'
import { education } from '../data/profile'
import { schools } from '../data/schools'
import { educationEmblem } from '../three/educationGeometry'
import { educationChapter, educationPose, educationReader, educationScrollTarget, educationStoryFocus, educationStoryTarget } from '../three/educationChoreography'
import { experienceFocus } from '../three/experienceChoreography'

describe('Education identities', () => {
  let callbacks: ScrollTrigger.Vars
  beforeEach(() => {
    vi.stubGlobal('innerWidth', 1280); vi.stubGlobal('innerHeight', 1000); vi.stubGlobal('scrollY', 0)
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (this: HTMLElement) { return this.id === 'education-sti' ? 1000 : this.id === 'education-marcelo' ? 1400 : 0 })
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) { return this.classList.contains('education-entry') ? 200 : this.classList.contains('education-visual') ? 400 : 0 })
    vi.spyOn(ScrollTrigger, 'create').mockImplementation(vars => { callbacks = vars; return { kill: vi.fn() } as unknown as ScrollTrigger })
    const computedStyle = window.getComputedStyle.bind(window)
    vi.spyOn(window, 'getComputedStyle').mockImplementation(element => {
      const style = computedStyle(element)
      if (element.classList.contains('education-visual')) style.position = 'sticky'
      return style
    })
  })
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
  const scroll = (top: number) => act(() => { vi.stubGlobal('scrollY', top); callbacks.onUpdate?.({} as ScrollTrigger) })

  it('keeps the original education record while the school buttons scroll to their matching entries', () => {
    const { container } = render(<Education />)
    for (const record of education) {
      expect(screen.getByRole('heading', { name: record.institution })).toBeVisible()
      expect(screen.getByText(record.course)).toBeVisible()
    }
    expect(screen.getByText('Graduate, April 2020')).toBeVisible()
    expect(container.querySelectorAll('.education-completion')).toHaveLength(1)
    for (const [index, school] of schools.entries()) {
      fireEvent.click(screen.getByRole('button', { name: school.shortName }))
      const top = educationScrollTarget(index === 0 ? 1000 : 1400, 200, 1000, 100, 400)
      expect(window.scrollTo).toHaveBeenLastCalledWith({ top, behavior: 'smooth' })
      scroll(top)
      expect(container.querySelector('[data-scene="education"]')).toHaveAttribute('data-school', school.id)
      expect(container.querySelector('.scene-poster img')).toHaveAttribute('src', school.logo)
      expect(screen.getByRole('group', { name: `Explore ${school.shortName} 3D emblem` })).toBeVisible()
      expect(screen.getByRole('button', { name: `Reset ${school.shortName} emblem view` })).toBeVisible()
    }
  })
  it('updates the logo, controls, and selected record from scroll alone, including scrolling back', () => {
    const { container } = render(<Education />)
    const scene = container.querySelector('[data-scene="education"]')!
    for (const [top, focus, id] of [[370, '0.00000', 'sti'], [570, '0.50000', 'marcelo'], [770, '1.00000', 'marcelo'], [570, '0.50000', 'marcelo'], [370, '0.00000', 'sti']] as const) {
      scroll(top)
      expect(scene).toHaveAttribute('data-education-focus', focus)
      expect(scene).toHaveAttribute('data-school', id)
      expect(container.querySelector('.education-entry[data-active="true"]')).toHaveAttribute('id', `education-${id}`)
    }
  })
  it('pins the mobile viewer and active school in separate rows and synchronizes the details with scroll', () => {
    vi.stubGlobal('innerWidth', 390); vi.stubGlobal('innerHeight', 844)
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({ matches: query.includes('max-width: 650px'), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
    vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (this: HTMLElement) { return this.classList.contains('education-layout') ? 1000 : 0 })
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('education-layout') ? 1400 : this.classList.contains('education-stage') ? 600 : this.classList.contains('education-visual') ? 400 : 200
    })
    const { container } = render(<Education />)
    expect(container.querySelector('#education')).toHaveAttribute('data-education-layout', 'story')
    const stage = container.querySelector('.education-stage')!
    expect(stage).toContainElement(container.querySelector('.education-visual'))
    expect(stage).toContainElement(container.querySelector('.education-records'))
    for (const [index, school] of schools.entries()) {
      fireEvent.click(screen.getByRole('button', { name: school.shortName }))
      const top = educationStoryTarget(index, 924, 800)
      expect(window.scrollTo).toHaveBeenLastCalledWith({ top, behavior: 'smooth' })
      scroll(top)
      expect(screen.getByRole('heading', { name: school.institution })).toBeVisible()
      expect(screen.queryByRole('heading', { name: schools[1 - index].institution })).not.toBeInTheDocument()
      expect(container.querySelector('.education-entry[data-active="true"]')).not.toHaveAttribute('aria-hidden')
    }
    scroll(1324)
    expect(container.querySelector('[data-scene="education"]')).toHaveAttribute('data-education-focus', '0.50000')
    scroll(1004)
    expect(screen.getByRole('heading', { name: schools[0].institution })).toBeVisible()
  })
  it('holds each mobile school for reading and reverses the dust along the same scroll path', () => {
    const start = 1000, distance = 800
    expect(educationStoryFocus(start - 100, start, distance)).toBe(0)
    expect(educationStoryFocus(start + distance + 100, start, distance)).toBe(1)
    expect(educationStoryFocus(start + distance / 2, start, distance)).toBeCloseTo(0.5)
    for (const index of [0, 1]) expect(educationStoryFocus(educationStoryTarget(index, start, distance), start, distance)).toBe(index)
    const positions = [1000, 1200, 1300, 1400, 1500, 1600, 1800]
    const pose = (position: number) => educationChapter(educationStoryFocus(position, start, distance))
    expect(positions.map(pose)).toEqual([...positions].reverse().map(pose).reverse())
  })
  it('uses a reversible surface dissolve with stable endpoints and keeps school headings below the viewer', () => {
    const centers = [500, 900]
    const positions = [400, 500, 600, 700, 800, 900, 1000]
    const samples = positions.map(top => educationChapter(experienceFocus(centers, top)))
    expect(samples).toEqual([...positions].reverse().map(top => educationChapter(experienceFocus(centers, top))).reverse())
    expect(educationChapter(0).flux).toBe(0)
    expect(educationChapter(0.5).flux).toBe(1)
    expect(educationChapter(1).flux).toBeCloseTo(0)
    for (let p = 0; p <= 1; p += 0.01) expect(educationPose(p, 0).weight + educationPose(p, 1).weight).toBeCloseTo(1)
    for (const [height, header, viewer] of [[844, 76, 410], [1000, 100, 450], [480, 76, 250]]) {
      expect(educationReader(height, header, viewer)).toBeGreaterThan(header + viewer)
      const top = 5000
      expect(top - educationScrollTarget(top, 260, height, header, viewer)).toBeGreaterThanOrEqual(header + viewer + 16)
    }
    expect(educationScrollTarget(5000, 220, 390, 84, 260, false)).toBe(4892)
    expect(educationReader(390, 84, 260, false)).toBeLessThan(300)
  })
  it('gives both school emblems real depth with valid face UVs and inexpensive geometry', () => {
    for (let index = 0; index < schools.length; index++) {
      const geometry = educationEmblem(index)
      geometry.body.computeBoundingBox()
      const box = geometry.body.boundingBox!
      expect(box.max.z - box.min.z).toBeGreaterThan(0.14)
      for (const uv of geometry.face.attributes.uv.array) {
        expect(uv).toBeGreaterThanOrEqual(-0.0001)
        expect(uv).toBeLessThanOrEqual(1.0001)
      }
      const vertices = Object.values(geometry).reduce((sum, value) => sum + value.attributes.position.count, 0)
      expect(vertices).toBeLessThan(6000)
      Object.values(geometry).forEach(value => value.dispose())
    }
  })
})
