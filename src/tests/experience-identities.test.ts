import { describe, expect, it } from 'vitest'
import { Box3, Vector3 } from 'three'
import { assistlyRibbon, knowlesGlobe, syntaxGear } from '../three/organizationGeometry'
import { experienceFocus, experienceReader, experienceScrollTarget, organizationChapter, organizationPose } from '../three/experienceChoreography'

describe('experience identity choreography', () => {
  it('holds each identity around its role and reverses continuously', () => {
    const centers = [500, 1000, 1600]
    expect(experienceFocus(centers, 0)).toBe(0)
    expect(experienceFocus(centers, 600)).toBe(0)
    expect(experienceFocus(centers, 1000)).toBe(1)
    expect(experienceFocus(centers, 2000)).toBe(2)
    const samples = [400, 600, 750, 1000, 1200, 1400, 1600]
    expect(samples.map(s => experienceFocus(centers, s))).toEqual([...samples].reverse().map(s => experienceFocus(centers, s)).reverse())
    for (let p = 0; p <= 2; p += 0.01) {
      const poses = [0, 1, 2].map(i => organizationPose(p, i))
      expect(poses.reduce((sum, pose) => sum + pose.weight, 0)).toBeCloseTo(1)
      expect(poses.filter(pose => pose.weight > 0.001).length).toBeLessThanOrEqual(2)
    }
    expect(organizationChapter(0.5).flux).toBe(1)
    expect(organizationChapter(1).flux).toBe(0)
    expect([0, 1, 2].map(i => organizationPose(0.5, i).weight)).toEqual([0.5, 0.5, 0])
    expect([0, 1, 2].map(i => organizationPose(2, i).weight)).toEqual([0, 0, 1])
  })
  it('places the reading line below the pinned phone scene', () => {
    const reader = experienceReader(844, 76, 350, true)
    expect(reader).toBeGreaterThan(426)
    expect(reader).toBeLessThan(844)
    expect(experienceReader(1000, 100, 500, false)).toBeLessThan(600)
  })
  it('keeps a selected role heading below the phone explorer even when its duties exceed the screen', () => {
    const top = 5200, header = 76, scene = 406
    const scroll = experienceScrollTarget(top, 550, 844, header, scene, true)
    expect(top - scroll).toBeGreaterThanOrEqual(header + scene + 16)
    expect(experienceScrollTarget(top, 400, 1000, 100, 586, false)).toBe(top + 200 - experienceReader(1000, 100, 586, false))
  })
  it('gives all three symbols actual depth and finite, centered geometry', () => {
    const globe = knowlesGlobe(), gear = syntaxGear()
    const groups = [assistlyRibbon(), [globe.panels, globe.core], [gear.ring, gear.body, gear.face]]
    for (const geometries of groups) {
      const bounds = new Box3()
      for (const geometry of geometries) {
        geometry.computeBoundingBox(); bounds.union(geometry.boundingBox!)
        expect(Array.from(geometry.attributes.position.array).every(Number.isFinite)).toBe(true)
      }
      const size = bounds.getSize(new Vector3())
      expect(size.z).toBeGreaterThan(0.1)
      expect(Math.max(size.x, size.y)).toBeLessThan(2.3)
      geometries.forEach(geometry => geometry.dispose())
    }
  })
})
