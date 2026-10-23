import { clamp } from './choreography'

const ease = (t: number) => t ** 3 * (t * (t * 6 - 15) + 10)

export function experienceFocus(centers: number[], reader: number) {
  if (!centers.length || reader <= centers[0]) return 0
  for (let i = 0; i < centers.length - 1; i++) {
    if (reader <= centers[i + 1]) {
      const t = (reader - centers[i]) / Math.max(1, centers[i + 1] - centers[i])
      return i + ease(clamp((t - 0.25) / 0.5))
    }
  }
  return centers.length - 1
}

export function organizationChapter(focus: number) {
  const p = clamp(focus, 0, 2)
  const from = Math.min(1, Math.floor(p)), to = from + 1, mix = p - from
  return { from, to, mix, flux: Math.sin(mix * Math.PI) ** 2 }
}

export function organizationPose(focus: number, index: number) {
  const { from, to, mix } = organizationChapter(focus)
  const weight = index === from ? 1 - mix : index === to ? mix : 0
  const offset = index === from ? -mix : 1 - mix
  return { weight, x: offset * 0.38, y: offset * 0.14, z: -Math.abs(offset) * 0.45, rx: -0.04, ry: -0.18 + offset * 0.2, rz: -0.035 + offset * 0.06, scale: 1.32 - Math.abs(offset) * 0.08 }
}

export function experienceReader(height: number, header: number, sceneHeight: number, compact: boolean) {
  const top = compact ? header + sceneHeight : header
  return top + Math.max(80, height - top) * 0.46
}

export function experienceScrollTarget(top: number, entryHeight: number, height: number, header: number, sceneHeight: number, compact: boolean) {
  const centered = top + entryHeight * 0.5 - experienceReader(height, header, sceneHeight, compact)
  return compact ? Math.min(centered, top - header - sceneHeight - 16) : centered
}
