import { describe, expect, it } from 'vitest'
import { followScroll } from '../three/motionRail'

describe('3D motion rail', () => {
  it('follows wheel and touch input without overshooting and settles exactly', () => {
    let position: number | null = 0
    for (let i = 0; i < 120; i++) {
      position = followScroll(position, 700, 1 / 60, 844, true)
      expect(position).toBeGreaterThanOrEqual(0)
      expect(position).toBeLessThanOrEqual(700)
    }
    expect(position).toBe(700)
    expect(followScroll(position, 0, 1 / 60, 844, true)).toBeLessThan(700)
  })
  it('keeps the same travel at different refresh rates', () => {
    const simulate = (hz: number) => {
      let position: number | null = 0
      for (let i = 0; i < hz / 2; i++) position = followScroll(position, 700, 1 / hz, 844, true)
      return position!
    }
    expect(simulate(30)).toBeCloseTo(simulate(60), 6)
    expect(simulate(120)).toBeCloseTo(simulate(60), 6)
  })
  it('opens deep links immediately and bypasses animation when paused', () => {
    expect(followScroll(null, 6000, 1 / 60, 844, true)).toBe(6000)
    expect(followScroll(0, 6000, 1 / 60, 844, true)).toBe(6000)
    expect(followScroll(100, 300, 1 / 60, 844, false)).toBe(300)
  })
})
