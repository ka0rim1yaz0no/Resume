import { describe, expect, it } from 'vitest'
import { Box3, BoxGeometry, Color, Group, Mesh, MeshStandardMaterial, Texture, Vector3 } from 'three'
import { cloneStudioMaterial, goldEnamelColor } from '../three/studioMaterials'
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
    expect(owned.roughness).toBeGreaterThan(0.85)
    expect(owned.metalness).toBeLessThan(0.4)
    expect(owned.forceSinglePass).toBe(true)
    expect(owned.transparent).toBe(false)
    expect(owned.alphaHash).toBe(true)
    expect(owned.depthWrite).toBe(true)
    expect(source.forceSinglePass).toBe(false)
    expect(source.roughnessMap).toBe(packed)
    expect(source.metalnessMap).toBe(packed)
    expect(source.roughness).toBe(0.2)
    owned.dispose(); source.dispose(); colour.dispose(); packed.dispose()
  })
  it('separates titanium hardware and gold edges without changing display pixels or cached source', () => {
    const hardware = new MeshStandardMaterial({ color: '#3a5945', name: 'Satin aluminum' })
    const display = new MeshStandardMaterial({ color: '#ddffee', name: 'Display pixels', map: new Texture() })
    const brass = cloneStudioMaterial(hardware, 'project-laptop') as MeshStandardMaterial
    const edgeSource = new MeshStandardMaterial({ name: 'Machined edges' })
    const edge = cloneStudioMaterial(edgeSource, 'project-laptop') as MeshStandardMaterial
    const screen = cloneStudioMaterial(display, 'project-laptop') as MeshStandardMaterial
    expect(brass.color.b).toBeGreaterThan(brass.color.r)
    expect(edge.color.r).toBeGreaterThan(edge.color.g)
    expect(edge.color.g).toBeGreaterThan(edge.color.b)
    expect(hardware.color).toEqual(new Color('#3a5945'))
    expect(screen.color).toEqual(display.color)
    expect(screen.map).toBe(display.map)
    brass.dispose(); screen.dispose(); edge.dispose(); edgeSource.dispose(); hardware.dispose(); display.map?.dispose(); display.dispose()
  })
  it('keeps relief and lettering contrast when skill colours become gold', () => {
    const luminance = (c: Color) => c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722
    for (const hex of ['#86bfc5', '#e9dc75', '#c7d6ca', '#262626']) {
      const source = new Color(hex), before = source.clone(), result = goldEnamelColor(source)
      expect(result.r).toBeGreaterThan(result.g)
      expect(result.g).toBeGreaterThan(result.b)
      expect(luminance(result)).toBeCloseTo(luminance(source), 6)
      expect(source).toEqual(before)
    }
    expect(luminance(goldEnamelColor(new Color('#e9dc75')))).toBeGreaterThan(luminance(goldEnamelColor(new Color('#262626'))) * 5)
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
