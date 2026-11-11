import { describe, expect, it } from 'vitest'
import { openingViewport } from '../three/openingLayout'
import { openingCamera } from '../three/choreography'

describe('opening framing', () => {
  const desktop = { frame: { left: 24, top: 24, width: 1232, height: 681 }, hero: { left: 560, top: 205, width: 648, height: 440 } }
  const phone = { frame: { left: 12, top: 12, width: 366, height: 742 }, hero: { left: 24, top: 477, width: 342, height: 398 } }

  it.each([desktop, phone])('matches the assembly and hero viewport edges at both ends of the glide', ({ frame, hero }) => {
    expect(openingViewport(hero, frame, 1)).toEqual(frame)
    expect(openingViewport(hero, frame, 0)).toEqual(hero)
    expect(openingViewport(hero, frame, 0.5)).toEqual(frame)
    const docking = openingViewport(hero, frame, 0.105)
    expect(docking.width).toBeCloseTo((hero.width + frame.width) / 2)
    expect(docking.top).toBeLessThan((hero.top + frame.top) / 2)
    for (const [progress, end] of [[0.0001, hero], [0.2099, frame]] as const) {
      const near = openingViewport(hero, frame, progress)
      for (const axis of ['top', 'left', 'width', 'height'] as const) expect(near[axis]).toBeCloseTo(end[axis], 4)
    }
  })

  it('holds the completed sculpture in the central stage before the hero handoff', () => {
    const { frame: stage, hero } = desktop
    for (const p of [0.35, 0.28, 0.23, 0.21]) expect(openingViewport(hero, stage, p)).toEqual(stage)
    expect(openingViewport(hero, stage, 0.1).left).toBeGreaterThan(stage.left)
    expect(openingCamera(0.28, false).x).toBeGreaterThan(0.5)
    expect(openingCamera(0.28, false).z).toBe(6.7)
  })

  it('moves from an elevated establishing shot to the exact hero camera without a velocity jump', () => {
    const start = openingCamera(1, false)
    const end = openingCamera(0, false)
    expect(end).toEqual({ x: 0, y: 0.15, z: 6.7, lookX: 0, lookY: 0, fov: 35 })
    expect(start.x).toBeLessThan(-1)
    expect(start.y).toBeGreaterThan(end.y)
    expect(openingCamera(0.5, false).z).toBe(start.z)
    expect(openingCamera(0.5, false).fov).toBe(start.fov)
    expect(Math.abs(openingCamera(0.5, true).x)).toBeLessThan(Math.abs(openingCamera(0.5, false).x))
    for (const endpoint of [0, 1]) {
      const near = openingCamera(endpoint === 0 ? 0.0001 : 0.9999, false)
      const pose = openingCamera(endpoint, false)
      for (const key of ['x', 'y', 'z', 'fov'] as const) expect(Math.abs(near[key] - pose[key])).toBeLessThan(0.000001)
    }
  })
})
