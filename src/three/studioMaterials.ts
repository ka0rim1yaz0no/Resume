import { Color, Material, MeshStandardMaterial } from 'three'
import type { ModelId } from '../data/assets'

export const studioFinish = { roughness: 0.88, metalness: 0.3, envMapIntensity: 0.55, normalStrength: 0.28 }
export const studioLighting = { environment: 0.8, ambient: 0.5, key: 2.9, fill: 0.75, rim: 1.9 }
export const studioGold = { brass: '#c5a05e', edge: '#a37b3d', graphite: '#2b2419', champagne: '#efd5a0', dust: '#80521d' }
const gold = new Color(studioGold.brass)
const goldLuminance = gold.r * 0.2126 + gold.g * 0.7152 + gold.b * 0.0722

/** Keep the original light/dark structure, including lettering and recesses. */
export function goldEnamelColor(source: Color) {
  const light = source.r * 0.2126 + source.g * 0.7152 + source.b * 0.0722
  return new Color().setScalar(light).lerp(gold.clone().multiplyScalar(light / goldLuminance), 0.86)
}

const laptopColors: Record<string, string> = {
  'Satin aluminum': '#98784b', 'Machined edges': '#d1b16f', 'Graphite bezel': '#211c16',
  'Sculpted keycaps': '#30291f', 'Glass trackpad': '#76603e', 'Circuit substrate': '#3b3222',
  'Copper connections': '#c4a05a', 'Thermal components': '#463b2a', 'Battery modules': '#2d271e',
  Fasteners: '#d4b77e', 'Indicator glass': '#e3c68d',
}

// Recolour the sampled albedo before lighting, leaving alpha, texture detail,
// normals and geometry intact. This adds no texture, pass or per-frame work.
const goldAlbedo = `
  float studioLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  diffuseColor.rgb = mix(vec3(studioLuma), vec3(${gold.toArray().join(',')}) * (studioLuma / ${goldLuminance}), 0.86);
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
      material.customProgramCacheKey = () => 'studio-gold-albedo-v1'
    }
  }
  return material
}
