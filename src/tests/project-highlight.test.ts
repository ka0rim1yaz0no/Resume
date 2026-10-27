import { describe, expect, it } from 'vitest'
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from 'three'
import { bindProjectHighlight } from '../three/projectHighlight'

function fixture() {
  const root = new Group(), geometry = new BoxGeometry(), texture = new Texture()
  const source = new MeshStandardMaterial({ color: '#8a7e9f', emissive: '#140e20', emissiveIntensity: 0.2, name: 'Machined edges' })
  const materials = [source.clone(), source.clone(), source.clone()]
  materials.forEach((material, index) => {
    const part = new Group(); part.userData.projectPiece = index; part.position.set(index, index + 0.5, 0)
    part.add(new Mesh(geometry, material)); root.add(part)
  })
  const display = new MeshStandardMaterial({ map: texture, color: '#b7dbef', name: 'Display pixels' })
  const legends = new MeshStandardMaterial({ color: '#ffffff', name: 'Key legends' })
  root.children[0].add(new Mesh(geometry, display)); root.children[1].add(new Mesh(geometry, legends))
  const rig = bindProjectHighlight(root)
  return { root, source, materials, display, legends, rig, dispose() { geometry.dispose(); texture.dispose(); source.dispose(); display.dispose(); legends.dispose(); materials.forEach(value => value.dispose()) } }
}

describe('Project component emphasis', () => {
  it('highlights the matching component without repainting display pixels, legends, or cached source materials', () => {
    const f = fixture(), before = f.source.clone(), screen = f.display.clone(), legends = f.legends.clone()
    const positions = f.root.children.map(part => part.position.clone())
    f.rig.update(1, 1, 0, false)
    expect(f.rig.weights).toEqual([0, 1, 0])
    expect(f.materials[1].color.g).toBeGreaterThan(before.color.g)
    expect(f.materials[1].emissive.g).toBeGreaterThan(f.materials[0].emissive.g)
    expect(f.materials[0].color.g).toBeLessThan(before.color.g)
    expect(f.materials.every(value => value.opacity === 1)).toBe(true)
    expect(f.display.color).toEqual(screen.color); expect(f.display.map).toBe(screen.map)
    expect(f.display.emissive).toEqual(screen.emissive); expect(f.legends.color).toEqual(legends.color)
    expect(f.source.color).toEqual(before.color); expect(f.source.emissive).toEqual(before.emissive)
    f.root.children.forEach((part, index) => { expect(part.position).toEqual(positions[index]) })
    before.dispose(); screen.dispose(); legends.dispose(); f.dispose()
  })

  it('crossfades emphasis and settles on the latest selection after rapid clicks', () => {
    const f = fixture()
    f.rig.update(0, 1, 0, false)
    f.rig.update(1, 1, 1 / 60, true)
    expect(f.rig.weights[0]).toBeGreaterThan(0); expect(f.rig.weights[1]).toBeGreaterThan(0)
    expect(f.rig.weights[1]).toBeLessThan(1)
    for (let frame = 0; frame < 120; frame++) {
      f.rig.update(2, 1, 1 / 60, true)
      expect(f.rig.weights.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 3)
    }
    expect(f.rig.weights).toEqual([0, 0, 1])
    f.dispose()
  })

  it('switches instantly without motion and restores all finishes when the exploded view closes or leaves the project', () => {
    const f = fixture(), original = f.materials.map(value => value.clone())
    for (const selection of [0, 2, 1]) {
      f.rig.update(selection, 1, 0, false)
      expect(f.rig.weights[selection]).toBe(1)
    }
    f.rig.update(1, 0, 0, false)
    expect(f.rig.weights).toEqual([0, 0, 0])
    f.materials.forEach((material, index) => {
      expect(material.color).toEqual(original[index].color)
      expect(material.emissive).toEqual(original[index].emissive)
      expect(material.emissiveIntensity).toBe(original[index].emissiveIntensity)
    })
    original.forEach(value => value.dispose()); f.dispose()
  })
})
