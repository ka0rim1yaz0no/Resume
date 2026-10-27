import { Color, MathUtils, Mesh, MeshStandardMaterial, type Object3D } from 'three'
import { studioPalette } from './studioMaterials'

type Surface = {
  index: number; material: MeshStandardMaterial; color: Color; selectedColor: Color
  emissive: Color; intensity: number; emission: Color; selectedEmission: Color
}

/** Reuse owned laptop materials without changing geometry, opacity, display
 * pixels, key legends, or the framing camera. */
export function bindProjectHighlight(root: Object3D) {
  const surfaces: Surface[] = [], weights = [0, 0, 0]
  const signal = new Color(studioPalette.signal)
  root.traverse(part => {
    const index = part.userData.projectPiece
    if (!Number.isInteger(index) || index < 0 || index > 2) return
    part.traverse(object => {
      if (!(object instanceof Mesh)) return
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      for (const material of materials) {
        if (!(material instanceof MeshStandardMaterial) || material.map || material.name === 'Key legends') continue
        const edge = /Machined edges|Graphite bezel|Fasteners|Indicator glass/.test(material.name)
        const emission = material.emissive.clone().multiplyScalar(material.emissiveIntensity)
        surfaces.push({
          index, material, color: material.color.clone(),
          selectedColor: material.color.clone().lerp(signal, edge ? 0.58 : 0.13),
          emissive: material.emissive.clone(), intensity: material.emissiveIntensity, emission,
          selectedEmission: emission.clone().add(signal.clone().multiplyScalar(edge ? 0.55 : 0.1)),
        })
      }
    })
  })
  return {
    weights,
    update(selected: number, amount: number, delta: number, motion: boolean) {
      let changed = false
      for (let index = 0; index < weights.length; index++) {
        const target = index === selected ? MathUtils.clamp(amount, 0, 1) : 0
        let next = motion ? MathUtils.damp(weights[index], target, 12, Math.min(0.05, Math.max(0, delta))) : target
        if (Math.abs(next - target) < 0.0001) next = target
        changed ||= next !== weights[index]
        weights[index] = next
      }
      if (!changed) return
      const total = weights.reduce((sum, weight) => sum + weight, 0)
      for (const surface of surfaces) {
        const { material, index } = surface, weight = weights[index]
        if (total === 0) {
          material.color.copy(surface.color); material.emissive.copy(surface.emissive)
          material.emissiveIntensity = surface.intensity
          continue
        }
        material.color.copy(surface.color).multiplyScalar(1 - 0.15 * (total - weight)).lerp(surface.selectedColor, weight)
        material.emissive.copy(surface.emission).lerp(surface.selectedEmission, weight)
        material.emissiveIntensity = 1
      }
    },
  }
}
