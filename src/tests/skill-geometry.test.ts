import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js'
import { Box3, Mesh, Vector3 } from 'three'
import { technologyVisuals } from '../data/technologies'
import { buildSkillEmblem, createSkillBody } from '../three/skillGeometry'

describe('sculpted skill emblems', () => {
  it('gives every non-React local icon real depth, finite bounds, and bounded geometry', () => {
    for (const [name, { slug, accent }] of Object.entries(technologyVisuals)) {
      if (name === 'React.js') continue
      const data = new SVGLoader().parse(readFileSync(`public/icons/${slug}.svg`, 'utf8'))
      const parts = buildSkillEmblem(data, accent)
      expect(parts.length, name).toBeGreaterThan(0)
      const bounds = new Box3()
      let triangles = 0
      for (const { geometry } of parts) {
        geometry.computeBoundingBox()
        bounds.union(geometry.boundingBox!)
        triangles += (geometry.index?.count || geometry.attributes.position.count) / 3
        expect(Array.from(geometry.attributes.position.array).every(Number.isFinite), name).toBe(true)
        expect(Array.from(geometry.attributes.normal.array).every(Number.isFinite), name).toBe(true)
        expect(geometry.groups.length, `${name} has material groups for rendering`).toBeGreaterThan(0)
      }
      const size = bounds.getSize(new Vector3())
      expect(size.z, name).toBeGreaterThan(0.05)
      expect(Math.max(size.x, size.y), name).toBeLessThan(2.6)
      expect(bounds.min.z, name).toBeGreaterThan(0.25)
      expect(triangles, name).toBeLessThan(90000)
      parts.forEach(({ geometry }) => geometry.dispose())
    }
  })
  it('keeps the continuous badge body below its raised emblem', () => {
    const geometry = createSkillBody()
    const bounds = new Box3().setFromObject(new Mesh(geometry))
    expect(bounds.max.z).toBeCloseTo(0.25)
    expect(bounds.min.z).toBeCloseTo(-0.25)
    expect(bounds.max.x).toBeCloseTo(-bounds.min.x)
    geometry.dispose()
  })
})
