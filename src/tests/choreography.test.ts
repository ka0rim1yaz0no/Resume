import { describe, expect, it } from 'vitest'
import { chapterPose, cinematicCamera, journeyPose, openingCamera, reactCompanionPose, stageHandoff } from '../three/choreography'

describe('Reversible 3D scroll choreography', () => {
  it('never leaves a blank gap or exceeds full opacity during a model handoff', () => {
    for (let i = 0; i <= 100; i++) {
      const frames = [0, 1, 2].map(index => journeyPose(i / 100, index, false))
      expect(frames.reduce((total, frame) => total + frame.weight, 0)).toBeCloseTo(1, 8)
      frames.forEach(frame => expect(frame.weight).toBeGreaterThanOrEqual(0))
      expect(frames.filter(frame => frame.weight > 0).length).toBeLessThanOrEqual(2)
    }
  })
  it('lands on each supplied model with no residue from the others', () => {
    expect([0, 1, 2].map(index => journeyPose(0, index, false).weight)).toEqual([1, 0, 0])
    expect([0, 1, 2].map(index => journeyPose(0.5, index, false).weight)).toEqual([0, 1, 0])
    expect([0, 1, 2].map(index => journeyPose(1, index, false).weight)).toEqual([0, 0, 1])
  })
  it('returns the same camera and model pose when scrolling back to a position', () => {
    const forward = [0.1, 0.32, 0.5, 0.67, 0.9].map(p => journeyPose(p, 1, false))
    const backward = [0.9, 0.67, 0.5, 0.32, 0.1].map(p => journeyPose(p, 1, false)).reverse()
    expect(backward).toEqual(forward)
  })
  it('reduces lateral travel on small screens without changing chapter timing', () => {
    const desktop = journeyPose(0.3, 1, false)
    const phone = journeyPose(0.3, 1, true)
    expect(Math.abs(phone.x)).toBeLessThan(Math.abs(desktop.x))
    expect(phone.weight).toBe(desktop.weight)
    expect(chapterPose(0.85, false, true).mix).toBe(chapterPose(0.85, false, false).mix)
  })
  it('clamps overscroll to valid end poses', () => {
    expect(journeyPose(-0.5, 0, false)).toEqual(journeyPose(0, 0, false))
    expect(journeyPose(1.5, 2, false)).toEqual(journeyPose(1, 2, false))
    expect(chapterPose(1.1, true, false)).toEqual(chapterPose(1, true, false))
  })
  it('hands the viewport from document flow to the sticky frame without a velocity jump', () => {
    const hero = { left: 760, top: 200, width: 600, height: 540 }
    const target = { left: 300, top: 180, width: 840, height: 700 }
    const sample = (scroll: number) => stageHandoff(hero, target, scroll, 100, 1100)
    expect(sample(50).rect.top).toBe(150)
    expect(sample(100).rect).toEqual({ ...hero, top: 100 })
    expect(sample(1100).rect).toEqual(target)
    expect(sample(1200).rect).toEqual(target)
    const step = 0.01
    expect((sample(100 + step).rect.top - sample(100).rect.top) / step).toBeCloseTo(-1, 4)
    expect((sample(1100).rect.top - sample(1100 - step).rect.top) / step).toBeCloseTo(0, 4)
    for (let scroll = 100; scroll <= 1100; scroll += 10) {
      const { rect, progress } = sample(scroll)
      expect(progress).toBeGreaterThanOrEqual(0)
      expect(progress).toBeLessThanOrEqual(1)
      expect(rect.width).toBeGreaterThanOrEqual(hero.width)
      expect(rect.width).toBeLessThanOrEqual(target.width)
    }
  })
  it('keeps camera motion continuous across both model handoffs and reduces its mobile orbit', () => {
    for (const p of [0.23, 0.33, 0.43, 0.57, 0.68, 0.79]) {
      const before = cinematicCamera(p - 0.0001, false)
      const after = cinematicCamera(p + 0.0001, false)
      expect(Math.hypot(after.x - before.x, after.y - before.y, after.z - before.z)).toBeLessThan(0.002)
      expect(cinematicCamera(p, true).x).toBeCloseTo(cinematicCamera(p, false).x * 0.4)
      expect(cinematicCamera(p, true).z).toBe(cinematicCamera(p, false).z)
    }
    expect(cinematicCamera(-1, false)).toEqual(cinematicCamera(0, false))
    expect(cinematicCamera(2, false)).toEqual(cinematicCamera(1, false))
  })
  it('keeps the scroll lens, camera distance and each subject scale fixed', () => {
    for (let i = 0; i <= 100; i++) {
      const p = i / 100
      expect(cinematicCamera(p, false).z).toBe(cinematicCamera(0, false).z)
      expect(cinematicCamera(p, false).fov).toBe(cinematicCamera(0, false).fov)
      expect(chapterPose(p, true, false).scale).toBe(1)
      for (let index = 0; index < 3; index++) {
        expect(journeyPose(p, index, false).scale).toBe(journeyPose(0, index, false).scale)
        expect(journeyPose(p, index, false).z).toBe(0)
      }
    }
  })
  it('lands the opening camera exactly on the hero and keeps its travel bounded', () => {
    expect(openingCamera(0, false)).toEqual({ x: 0, y: 0.15, z: 6.7, lookX: 0, lookY: 0, fov: 35 })
    for (let i = 0; i <= 100; i++) {
      const shot = openingCamera(i / 100, false)
      expect(shot.z).toBeGreaterThanOrEqual(6.1)
      expect(shot.z).toBeLessThanOrEqual(7.6)
      expect(Math.abs(openingCamera(i / 100, true).x)).toBeLessThanOrEqual(Math.abs(shot.x))
    }
  })
  it('keeps the React companion on a continuous, reversible arc outside the sculpture', () => {
    for (const compact of [false, true]) {
      for (let i = 0; i < 100; i++) {
        const p = i / 100
        const before = reactCompanionPose(p, compact, 0)
        const after = reactCompanionPose(p + 0.01, compact, 0)
        expect(before.x).toBeGreaterThan(0.9)
        expect(before.y).toBeGreaterThan(1.2)
        expect(Math.hypot(after.x - before.x, after.y - before.y, after.z - before.z)).toBeLessThan(0.03)
        expect(reactCompanionPose(p, compact, 0)).toEqual(before)
      }
    }
  })
})
