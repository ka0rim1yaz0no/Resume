import { describe, expect, it } from 'vitest'
import { openingFrame, openingViewport } from '../three/openingLayout'
import { openingCamera } from '../three/choreography'

describe('opening framing', () => {
  it.each([[1916, 916, 100], [1440, 1000, 100], [768, 1024, 84], [558, 672, 76], [390, 844, 76], [360, 568, 76]])('keeps the poster frame inside %i × %i', (width, height, header) => {
    const frame = openingFrame(width, height, header)
    expect(frame.width / frame.height).toBeCloseTo(960 / 760)
    expect(frame.left).toBeGreaterThanOrEqual(0)
    expect(frame.left + frame.width).toBeLessThanOrEqual(width)
    expect(frame.top).toBeGreaterThanOrEqual(header)
    expect(frame.top + frame.height).toBeLessThan(height - 100)
    if (width <= 650) expect(frame.top + frame.height).toBeLessThanOrEqual(height * 0.84 - 132 + 0.001)
  })

  it('joins the poster and hero at exact viewport endpoints', () => {
    const poster = openingFrame(1440, 1000, 100)
    const hero = { left: 750, top: 190, width: 600, height: 620 }
    expect(openingViewport(hero, poster, 1)).toEqual(poster)
    expect(openingViewport(hero, poster, 0)).toEqual(hero)
    expect(openingViewport(hero, poster, 0.5).width).toBe((hero.width + poster.width) / 2)
  })

  it('matches the poster camera before the gentle arc and the hero camera after it', () => {
    const start = openingCamera(1, false)
    const end = openingCamera(0, false)
    expect(start).toEqual(end)
    expect(start).toMatchObject({ y: 0.15, z: 6.7, fov: 35 })
    expect(openingCamera(0.5, false).z).toBeLessThan(start.z)
    expect(openingCamera(0.5, true).x).toBeGreaterThan(openingCamera(0.5, false).x)
  })
})
