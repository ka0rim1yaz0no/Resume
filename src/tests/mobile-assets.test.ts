import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { allModelIds, modelRegistry, modelUrl } from '../data/assets'
import mobileModels from '../data/mobileModels.json'
import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three'
import { sampleSurface } from '../three/surfaceCloud'

describe('Mobile asset delivery', () => {
  it('uses smaller immutable phone files while keeping the original desktop models', () => {
    let desktop = 0, mobile = 0
    for (const id of allModelIds) {
      const file = mobileModels[id]
      const bytes = readFileSync(`public/models/mobile/${file}`)
      const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 10)
      expect(file).toContain(hash)
      expect(bytes.toString('utf8', 0, 4)).toBe('glTF')
      expect(modelUrl(id, true)).toContain(`/models/mobile/${file}`)
      expect(modelUrl(id, false)).toBe(modelRegistry[id].url)
      mobile += bytes.byteLength
      desktop += readFileSync(`public/models/${id}.glb`).byteLength
    }
    expect(mobile).toBeLessThan(desktop * 0.35)
  })
  it('retains the same dust surface samples with a smaller phone buffer', () => {
    const root = new Group(), mesh = new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial())
    root.add(mesh)
    const phone = sampleSurface(root, mesh, 2400), desktop = sampleSurface(root, mesh)
    expect(phone.points.length).toBe(2400 * 3)
    expect(phone.points).toEqual(desktop.points.slice(0, phone.points.length))
    mesh.geometry.dispose(); mesh.material.dispose()
  })
})
