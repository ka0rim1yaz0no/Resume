import { describe, expect, it } from 'vitest'
import { contentCamera, contentPose, contentRoute, contentTransitionMix, contentVisibility, viewportVisibility, type ContentDocks, type ContentRoute, type ContentStage } from '../three/contentChoreography'
import { cinematicCamera } from '../three/choreography'

const docks: ContentDocks = {
  film: { rect: { left: 400, top: 180, width: 850, height: 600 }, arrive: 0, leave: 1000 },
  project: { rect: { left: 70, top: 170, width: 600, height: 500 }, arrive: 1700, leave: 2200 },
  experience: { rect: { left: 70, top: 130, width: 550, height: 390 }, arrive: 2800, leave: 4000 },
  skills: { rect: { left: 70, top: 130, width: 480, height: 310 }, arrive: 4700, leave: 5200 },
  education: { rect: { left: 700, top: 190, width: 450, height: 300 }, arrive: 5900, leave: 6200 },
}
const route = (scroll: number) => contentRoute(scroll, docks, 100, 1000)
const weights = (r: ContentRoute) => [0, 1, 2, 3, 4, 5].map(i => contentPose(r, i, false).weight)

describe('Continuous résumé scene rail', () => {
  it('fades partially off-screen mobile windows before they visibly cut through a model', () => {
    const rect = { left: 16, top: 100, width: 288, height: 300 }
    expect(viewportVisibility(rect, 76, 568)).toBe(1)
    expect(viewportVisibility({ ...rect, top: 343 }, 76, 568)).toBeCloseTo(0.5)
    expect(viewportVisibility({ ...rect, top: 403 }, 76, 568)).toBe(0)
    expect(viewportVisibility({ ...rect, top: 1 }, 76, 568)).toBeCloseTo(0.5)
    expect(viewportVisibility({ ...rect, top: -224 }, 76, 568)).toBe(0)
    expect(viewportVisibility({ ...rect, height: 0 }, 76, 568)).toBe(0)
  })
  it('leaves long text passages clear and fades back in when the destination viewer appears', () => {
    const reading = { ...docks, skills: { ...docks.skills, rect: { left: 20, top: -400, width: 320, height: 300 } }, education: { ...docks.education, arrive: 8000, rect: { left: 20, top: 1400, width: 320, height: 300 } } }
    const handoff: ContentRoute = { from: 'skills', to: 'education', amount: 1, mix: 0.5, viewport: docks.skills.rect }
    expect(contentVisibility(handoff, reading, 100, 1000)).toBe(0)
    const entering = { ...reading, education: { ...reading.education, rect: { ...reading.education.rect, top: 910 } } }
    expect(contentVisibility(handoff, entering, 100, 1000)).toBeCloseTo(0.5)
    const arrived = { ...reading, education: { ...reading.education, rect: { ...reading.education.rect, top: 700 } } }
    expect(contentVisibility(handoff, arrived, 100, 1000)).toBe(1)
    expect(contentVisibility({ ...handoff, from: 'education' }, reading, 100, 1000)).toBe(1)
    expect(contentVisibility(handoff, docks, 100, 1000)).toBe(1)
  })
  it('moves directly between docks without expanding the viewport or pushing the camera closer', () => {
    for (const width of [320, 390, 1280]) {
      const height = width < 650 ? 844 : 900, header = width < 650 ? 76 : 100
      const mobileDocks = Object.fromEntries(Object.entries(docks).map(([key, dock]) => [key, { ...dock, rect: { ...dock.rect, left: 20, width: Math.min(width - 40, dock.rect.width) } }])) as ContentDocks
      const start = contentRoute(2200, mobileDocks, header, height, width)
      const middle = contentRoute(2500, mobileDocks, header, height, width)
      const end = contentRoute(2800, mobileDocks, header, height, width)
      expect(start.viewport).toEqual(mobileDocks.project.rect)
      expect(end.viewport).toEqual(mobileDocks.experience.rect)
      expect(middle.viewport.width).toBeLessThanOrEqual(Math.max(start.viewport.width, end.viewport.width))
      expect(middle.viewport.height).toBeLessThanOrEqual(Math.max(start.viewport.height, end.viewport.height))
      expect(middle.viewport.left).toBeGreaterThanOrEqual(0)
      expect(middle.viewport.left + middle.viewport.width).toBeLessThanOrEqual(width)
      expect(middle.viewport.top).toBeGreaterThanOrEqual(header + 16)
      expect(middle.viewport.top + middle.viewport.height).toBeLessThanOrEqual(height - 16)
      expect(contentCamera(middle, width < 650).z).toBe(contentCamera(start, width < 650).z)
      expect(contentCamera(middle, width < 650).fov).toBe(contentCamera(start, width < 650).fov)
      expect(contentCamera(middle, width < 650).z).toBe(cinematicCamera(1, width < 650).z)
      expect(contentCamera(middle, width < 650).fov).toBe(cinematicCamera(1, width < 650).fov)
    }
  })
  it('keeps scale and depth steady while exchanging subjects through dust', () => {
    expect(contentTransitionMix(0.2)).toBe(0)
    expect(contentTransitionMix(0.5)).toBeCloseTo(0.5)
    expect(contentTransitionMix(0.8)).toBe(1)
    const sample = (mix: number) => ({ from: 'project', to: 'skills', amount: 1, mix, viewport: docks.skills.rect }) as ContentRoute
    expect(contentPose(sample(0.2), 1, false).weight).toBe(1)
    expect(contentPose(sample(0.2), 3, false).weight).toBe(0)
    expect(contentPose(sample(0.8), 3, false).weight).toBe(1)
    for (let i = 0; i <= 100; i++) {
      expect(contentPose(sample(i / 100), 1, false).scale).toBe(contentPose(sample(0), 1, false).scale)
      expect(contentPose(sample(i / 100), 1, false).z).toBe(0)
      expect(contentPose(sample(i / 100), 3, false).scale).toBe(contentPose(sample(1), 3, false).scale)
    }
  })
  it('docks the laptop, organization identity, and React model into the actual content stages', () => {
    expect(route(800).amount).toBe(0)
    for (const [scroll, stage, expected] of [[1800, 'project', [0, 1, 0, 0, 0, 0]], [3300, 'experience', [0, 0, 0, 0, 1, 0]], [4800, 'skills', [0, 0, 0, 1, 0, 0]], [6000, 'education', [0, 0, 0, 0, 0, 1]]] as const) {
      expect(route(scroll).to).toBe(stage)
      expect(route(scroll).viewport).toEqual(docks[stage].rect)
      expect(weights(route(scroll))).toEqual(expected)
    }
  })
  it('conserves opacity throughout both content-model handoffs', () => {
    for (const [start, end] of [[2200, 2800], [4000, 4700], [5200, 5900]]) {
      for (let s = start; s <= end; s += 5) {
        const w = weights(route(s))
        expect(w.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 8)
        expect(w.filter(value => value > 0).length).toBeLessThanOrEqual(2)
      }
    }
  })
  it('meets each destination without a viewport, camera, or visible-pose jump', () => {
    for (const s of [1700, 2200, 2800, 4000, 4700, 5200, 5900]) {
      const a = route(s - 0.001), b = route(s + 0.001)
      for (const key of ['left', 'top', 'width', 'height'] as const) expect(Math.abs(a.viewport[key] - b.viewport[key])).toBeLessThan(0.001)
      if (s === 1700) continue // The film camera blends separately into this first arrival.
      const ca = contentCamera(a, false), cb = contentCamera(b, false)
      expect(Math.hypot(ca.x - cb.x, ca.y - cb.y, ca.z - cb.z)).toBeLessThan(0.001)
      for (let i = 0; i < 6; i++) {
        const pa = contentPose(a, i, false), pb = contentPose(b, i, false)
        if (pa.weight > 0.99 && pb.weight > 0.99) expect(Math.hypot(pa.x - pb.x, pa.y - pb.y, pa.z - pb.z)).toBeLessThan(0.001)
      }
    }
  })
  it('keeps a long transition in frame and reverses deterministically', () => {
    const far = { ...docks, project: { ...docks.project, rect: { ...docks.project.rect, top: 2200 } } }
    const middle = contentRoute(1350, far, 100, 1000)
    expect(middle.viewport.top).toBeGreaterThanOrEqual(100)
    expect(middle.viewport.top + middle.viewport.height).toBeLessThanOrEqual(1000)
    const samples = [1200, 1800, 2500, 3500, 4300, 4900]
    expect(samples.map(route)).toEqual([...samples].reverse().map(route).reverse())
  })
  it('reduces mobile lateral motion without changing the subject weights', () => {
    const r = route(4350)
    for (let i = 0; i < 5; i++) {
      const mobile = contentPose(r, i, true), desktop = contentPose(r, i, false)
      expect(mobile.weight).toBe(desktop.weight)
      expect(Math.abs(mobile.x)).toBeLessThanOrEqual(Math.abs(desktop.x))
    }
  })
  it('handles short section distances without invalid geometry', () => {
    const compact = Object.fromEntries(Object.entries(docks).map(([name, value], i) => [name, { ...value, arrive: i * 5, leave: i * 5 + 1 }])) as Record<ContentStage, typeof docks.film>
    for (let s = 0; s <= 25; s++) {
      const r = contentRoute(s, compact, 76, 844)
      expect(Object.values(r.viewport).every(Number.isFinite)).toBe(true)
      expect(r.amount).toBeGreaterThanOrEqual(0)
      expect(r.amount).toBeLessThanOrEqual(1)
    }
  })
})
