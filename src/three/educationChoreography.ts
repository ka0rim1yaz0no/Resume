import { clamp } from './choreography'
import { experienceReader, experienceScrollTarget } from './experienceChoreography'

export function educationChapter(focus: number) {
  const mix = clamp(focus)
  return { from: 0, to: 1, mix, flux: Math.sin(mix * Math.PI) ** 2 }
}

export function educationPose(focus: number, index: number) {
  const { mix } = educationChapter(focus)
  const offset = index === 0 ? -mix : 1 - mix
  return { weight: index === 0 ? 1 - mix : mix, x: offset * 0.26, y: offset * 0.1, z: -Math.abs(offset) * 0.35, ry: offset * 0.24, scale: 1 - Math.abs(offset) * 0.05 }
}

// The education records sit below their viewer at every breakpoint.
export function educationReader(height: number, header: number, sceneHeight: number) {
  return experienceReader(height, header, sceneHeight, true)
}

export function educationScrollTarget(top: number, entryHeight: number, height: number, header: number, sceneHeight: number) {
  return experienceScrollTarget(top, entryHeight, height, header, sceneHeight, true)
}
