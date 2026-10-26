import type { Euler, Mesh, Object3D, Vector3 } from 'three'
import { clamp } from './choreography'

const ease = (value: number) => { const t = clamp(value); return t ** 3 * (t * (t * 6 - 15) + 10) }
const paths = [
  { offset: [-0.10, 0.95, -0.36], rotation: [-0.12, -0.08, -0.02], delay: 0 },
  { offset: [0.10, 0.32, 0.28], rotation: [0.10, 0.035, 0.015], delay: 0.08 },
  { offset: [-0.06, -0.48, 0.06], rotation: [0.025, -0.025, -0.01], delay: 0.14 },
] as const

export function projectPartPose(index: number, expansion: number, compact: boolean) {
  const path = paths[index], progress = ease((expansion - path.delay) / (1 - path.delay)), travel = compact ? 0.88 : 1
  if (progress === 0) return { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 }
  return { x: path.offset[0] * progress * travel, y: path.offset[1] * progress * travel, z: path.offset[2] * progress * travel,
    rx: path.rotation[0] * progress, ry: path.rotation[1] * progress, rz: path.rotation[2] * progress }
}

export function projectPresence(from: string, to: string, mix: number, amount: number) {
  if (amount <= 0) return 0
  if (from === 'project' && to === 'project') return 1
  if (to === 'project') return clamp(mix) * amount
  return from === 'project' ? 1 - clamp(mix) : 0
}

export function bindProjectAssembly(root: Object3D) {
  const parts: { object: Object3D; position: Vector3; rotation: Euler; anchor: Vector3; index: number }[] = [], caps: Object3D[] = []
  root.traverse(object => {
    if ((object as Mesh).geometry?.userData.assemblyCap) caps.push(object)
    const index = object.userData.projectPiece
    if (Number.isInteger(index) && index >= 0 && index < paths.length) {
      const anchor = object.position.clone().set(0, 0, 0)
      if (Array.isArray(object.userData.projectAnchor)) anchor.fromArray(object.userData.projectAnchor)
      parts.push({ object, position: object.position.clone(), rotation: object.rotation.clone(), anchor, index })
    }
  })
  let previous = -1, previousCompact = false
  return {
    parts,
    update(expansion: number, compact: boolean) {
      if (!parts.length) return
      if (expansion === previous && compact === previousCompact) return
      previous = expansion; previousCompact = compact
      caps.forEach(cap => { cap.visible = expansion > 0.001 })
      for (const part of parts) {
        const pose = projectPartPose(part.index, expansion, compact)
        part.object.position.set(part.position.x + pose.x, part.position.y + pose.y, part.position.z + pose.z)
        part.object.rotation.set(part.rotation.x + pose.rx, part.rotation.y + pose.ry, part.rotation.z + pose.rz)
        part.object.updateMatrix()
      }
    },
  }
}
