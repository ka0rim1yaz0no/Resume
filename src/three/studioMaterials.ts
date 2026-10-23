import { Material, MeshStandardMaterial } from 'three'

export const studioFinish = { roughness: 0.96, metalness: 0.1, envMapIntensity: 0.45, normalStrength: 0.35 }
export const studioLighting = { environment: 0.8, ambient: 0.65, key: 2.15, fill: 0.85, rim: 0.8 }

// Customize owned clones. Packed-map channels must not multiply the satin
// roughness back down. Authored colour maps and cached materials stay intact.
export function cloneStudioMaterial(source: Material) {
  const material = source.clone()
  if (material instanceof MeshStandardMaterial) {
    // These solid assets only fade during dust handoffs. Rendering both sides
    // in one pass preserves their surfaces without drawing every triangle twice.
    material.forceSinglePass = true
    material.roughnessMap = null
    material.metalnessMap = null
    material.roughness = studioFinish.roughness
    material.metalness = studioFinish.metalness
    material.envMapIntensity = studioFinish.envMapIntensity
    material.normalScale.setScalar(studioFinish.normalStrength)
  }
  return material
}
