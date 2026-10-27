import { Color, Material, MathUtils, MeshStandardMaterial } from 'three'
import type { ModelId } from '../data/assets'

export const studioFinish = { roughness: 0.88, metalness: 0.3, envMapIntensity: 0.55, normalStrength: 0.28 }
export const studioLighting = { environment: 0.8, ambient: 0.5, key: 2.9, fill: 0.75, rim: 1.9 }
export const studioGold = { brass: '#d2bd85', edge: '#bda46b', graphite: '#252b2e', champagne: '#f0e7d0', dust: '#9a7d44' }
const gold = new Color(studioGold.brass)
const goldLuminance = gold.r * 0.2126 + gold.g * 0.7152 + gold.b * 0.0722

/** Keep the original light/dark structure, including lettering and recesses. */
export function goldEnamelColor(source: Color) {
  const light = source.r * 0.2126 + source.g * 0.7152 + source.b * 0.0722
  return new Color().setScalar(light).lerp(gold.clone().multiplyScalar(light / goldLuminance), 0.08 + MathUtils.smoothstep(light, 0.03, 0.3) * 0.6)
}

const laptopColors: Record<string, string> = {
  'Satin aluminum': '#899397', 'Machined edges': '#ccb884', 'Graphite bezel': '#1c2428',
  'Sculpted keycaps': '#232b2e', 'Glass trackpad': '#657175', 'Circuit substrate': '#2a3437',
  'Copper connections': '#c4ac72', 'Thermal components': '#3e4b4d', 'Battery modules': '#20272b',
  Fasteners: '#d2bd85', 'Indicator glass': '#e5d5ad',
}

// Recolour the sampled albedo before lighting, leaving alpha, texture detail,
// normals and geometry intact. This adds no texture, pass or per-frame work.
const goldAlbedo = `
  float studioLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  diffuseColor.rgb = mix(vec3(studioLuma), vec3(${gold.toArray().map(n => n.toFixed(6)).join(',')}) * (studioLuma / ${goldLuminance.toFixed(6)}), 0.08 + smoothstep(0.03, 0.3, studioLuma) * 0.6);
`

// Customize owned clones. Packed-map channels must not multiply the satin
// roughness back down. Authored colour maps and cached materials stay intact.
export function cloneStudioMaterial(source: Material, asset?: ModelId) {
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
    if (asset === 'project-laptop') {
      // The display and key legends stay authored and readable.
      if (laptopColors[source.name]) material.color.set(laptopColors[source.name])
    } else if (asset) {
      const compile = material.onBeforeCompile
      material.onBeforeCompile = function (shader, renderer) {
        compile.call(this, shader, renderer)
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>\n${goldAlbedo}`)
      }
      material.customProgramCacheKey = () => 'studio-platinum-gold-albedo-v2'
    }
  }
  return material
}
