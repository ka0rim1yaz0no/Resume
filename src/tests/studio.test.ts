import { describe, expect, it } from 'vitest'
import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture, Vector3 } from 'three'
import { cloneStudioMaterial } from '../three/studioMaterials'
import { sampleSurface } from '../three/surfaceCloud'
import { dockVisibility } from '../three/contentChoreography'

describe('Consistent studio and surface dissolve', () => {
  it('preserves authored colour and cached material maps while making an owned satin clone', () => {
    const colour = new Texture(), packed = new Texture()
    const source = new MeshStandardMaterial({ map: colour, roughnessMap: packed, metalnessMap: packed, roughness: 0.2, metalness: 1 })
    const owned = cloneStudioMaterial(source) as MeshStandardMaterial
    expect(owned).not.toBe(source)
    expect(owned.map).toBe(colour)
    expect(owned.roughnessMap).toBeNull()
    expect(owned.metalnessMap).toBeNull()
    expect(owned.roughness).toBeGreaterThan(0.9)
    expect(owned.forceSinglePass).toBe(true)
    expect(source.forceSinglePass).toBe(false)
    expect(source.roughnessMap).toBe(packed)
    expect(source.metalnessMap).toBe(packed)
    expect(source.roughness).toBe(0.2)
    owned.dispose(); source.dispose(); colour.dispose(); packed.dispose()
  })
  it('samples normalized surfaces independently of the live camera-stage pose', () => {
    const rig = new Group(), normalized = new Group()
    normalized.scale.setScalar(2)
    const mesh = new Mesh(new BoxGeometry(1, 1, 1))
    normalized.add(mesh); rig.add(normalized)
    const first = sampleSurface(rig, mesh).points
    rig.position.set(5, 3, -2); rig.rotation.y = 0.7; rig.scale.setScalar(0.75)
    const second = sampleSurface(rig, mesh).points
    const bounds = new Box3(), point = new Vector3()
    for (let i = 0; i < first.length; i += 3) {
      expect(second[i]).toBeCloseTo(first[i], 5)
      expect(second[i + 1]).toBeCloseTo(first[i + 1], 5)
      expect(second[i + 2]).toBeCloseTo(first[i + 2], 5)
      point.fromArray(first, i); bounds.expandByPoint(point)
      expect(Math.max(Math.abs(point.x), Math.abs(point.y), Math.abs(point.z))).toBeCloseTo(1, 5)
    }
    expect(bounds.min.x).toBeCloseTo(-1); expect(bounds.max.x).toBeCloseTo(1)
    mesh.geometry.dispose()
  })
  it('fades the skill visual before its geometry cuts through the header', () => {
    const rect = { left: 0, top: 130, width: 400, height: 300 }
    expect(dockVisibility(rect, 100)).toBe(1)
    expect(dockVisibility({ ...rect, top: 70 }, 100)).toBeCloseTo(0.5)
    expect(dockVisibility({ ...rect, top: 40 }, 100)).toBe(0)
    expect(dockVisibility({ ...rect, top: -400 }, 100)).toBe(0)
  })
})
