import { Color, Material, MathUtils, MeshStandardMaterial } from 'three'
import type { ModelId } from '../data/assets'

export const studioFinish = { roughness: 0.86, metalness: 0.3, envMapIntensity: 0.5, normalStrength: 0.2 }
export const studioLighting = { environment: 0.75, ambient: 0.35, key: 2.8, fill: 0.72, rim: 2.1 }
export const studioLightColors = { key: '#fffaff', fill: '#c7a0ff', rim: '#eee4ff' }
// Screen-door coverage keeps every fading surface in the depth buffer. Complex
// GLBs cannot be triangle-sorted correctly by ordinary translucent blending.
export const studioFade = { transparent: false, alphaHash: true, depthWrite: true }
export const studioPalette = { amethyst: '#b890ff', edge: '#ece4ff', body: '#31134f', pearl: '#fcfaff', dust: '#b87aff' }
const luminance = (color: Color) => color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722
const normalizedTint = (hex: string) => { const color = new Color(hex); return color.multiplyScalar(1 / luminance(color)) }
const amethystTint = normalizedTint(studioPalette.amethyst)
const silverTint = normalizedTint(studioPalette.edge)

/** Keep the original light/dark structure, including lettering and recesses. */
export function studioEnamelColor(source: Color) {
  const light = luminance(source)
  const tint = amethystTint.clone().lerp(silverTint, MathUtils.smoothstep(light, 0.05, 0.72))
  return new Color().setScalar(light).lerp(tint.multiplyScalar(light), 0.78)
}

const laptopColors: Record<string, string> = {
  'Satin aluminum': '#c0b2d4', 'Machined edges': studioPalette.edge, 'Graphite bezel': studioPalette.body,
  'Sculpted keycaps': '#392149', 'Glass trackpad': '#9b85b6', 'Circuit substrate': '#633894',
  'Copper connections': '#b990ec', 'Thermal components': '#837294', 'Battery modules': '#412650',
  Fasteners: studioPalette.edge, 'Indicator glass': studioPalette.pearl,
}

// Recolour the sampled albedo before lighting, leaving alpha, texture detail,
// normals and geometry intact. This adds no texture, pass or per-frame work.
const studioAlbedo = `
  float studioLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  vec3 studioTint = mix(vec3(${amethystTint.toArray().map(n => n.toFixed(6)).join(',')}), vec3(${silverTint.toArray().map(n => n.toFixed(6)).join(',')}), smoothstep(0.05, 0.72, studioLuma));
  diffuseColor.rgb = mix(vec3(studioLuma), studioTint * studioLuma, 0.78);
`

// Customize owned clones. Packed-map channels must not multiply the satin
// roughness back down. Authored colour maps and cached materials stay intact.
export function cloneStudioMaterial(source: Material, asset?: ModelId) {
  const material = source.clone()
  Object.assign(material, studioFade)
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
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>\n${studioAlbedo}`)
      }
      material.customProgramCacheKey = () => 'studio-amethyst-silver-albedo-v1'
    }
  }
  return material
}
