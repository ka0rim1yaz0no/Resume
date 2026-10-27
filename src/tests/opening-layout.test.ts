import { describe, expect, it } from 'vitest'
import { openingFrame, openingViewport } from '../three/openingLayout'
import { openingCamera } from '../three/choreography'

describe('opening framing', () => {
  it.each([[1916, 916, 100], [1440, 1000, 100], [768, 1024, 84], [558, 672, 76], [390, 844, 76], [360, 568, 76]])('centres the assembly within %i × %i without covering navigation', (width, height, header) => {
    const frame = openingFrame(width, height, header)
    expect(frame.left + frame.width / 2).toBe(width / 2)
    expect(frame.left).toBeGreaterThanOrEqual(0)
    expect(frame.left + frame.width).toBeLessThanOrEqual(width)
    expect(frame.top).toBeGreaterThanOrEqual(header)
    expect(frame.top + frame.height).toBeLessThanOrEqual(height - 100)
  })

  it('joins the poster and hero at exact viewport endpoints', () => {
    const poster = openingFrame(1440, 1000, 100)
    const hero = { left: 750, top: 190, width: 600, height: 620 }
    expect(openingViewport(hero, poster, 1)).toEqual(poster)
    expect(openingViewport(hero, poster, 0)).toEqual(hero)
    expect(openingViewport(hero, poster, 0.5)).toEqual(poster)
    const docking = openingViewport(hero, poster, 0.105)
    expect(docking.width).toBeCloseTo((hero.width + poster.width) / 2)
  })

  it('holds the completed sculpture in the central stage before the hero handoff', () => {
    const stage = openingFrame(1280, 800, 100), hero = { left: 660, top: 180, width: 550, height: 530 }
    for (const p of [0.35, 0.28, 0.23, 0.21]) expect(openingViewport(hero, stage, p)).toEqual(stage)
    expect(openingViewport(hero, stage, 0.1).left).toBeGreaterThan(stage.left)
    expect(openingCamera(0.28, false).x).toBeGreaterThan(0.5)
    expect(openingCamera(0.28, false).z).toBeLessThan(6.4)
  })

  it('moves from an elevated establishing shot to the exact hero camera without a velocity jump', () => {
    const start = openingCamera(1, false)
    const end = openingCamera(0, false)
    expect(end).toEqual({ x: 0, y: 0.15, z: 6.7, lookX: 0, lookY: 0, fov: 35 })
    expect(start.x).toBeLessThan(-1)
    expect(start.y).toBeGreaterThan(end.y)
    expect(openingCamera(0.5, false).z).toBeLessThan(start.z)
    expect(Math.abs(openingCamera(0.5, true).x)).toBeLessThan(Math.abs(openingCamera(0.5, false).x))
    for (const endpoint of [0, 1]) {
      const near = openingCamera(endpoint === 0 ? 0.0001 : 0.9999, false)
      const pose = openingCamera(endpoint, false)
      for (const key of ['x', 'y', 'z', 'fov'] as const) expect(Math.abs(near[key] - pose[key])).toBeLessThan(0.000001)
    }
  })
})
