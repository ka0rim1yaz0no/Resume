import type { Mesh, Object3D, Vector3 } from 'three'
import { blend, clamp } from './choreography'

const ease = (start: number, end: number, value: number) => {
  const t = clamp((value - start) / (end - start))
  return t * t * t * (t * (t * 6 - 15) + 10)
}

// The foundation locks first, followed by the three data volumes, the core,
// the connecting bridge and the display. Each cut has its own weight and path.
const pieces = [
  { offset: [0, -5, -1.1], rotation: [0.32, -0.28, -0.12], start: 0, end: 0.34 },
  { offset: [-7, 0.4, 0.5], rotation: [0.5, -0.8, -0.25], start: 0.04, end: 0.50 },
  { offset: [0.35, 5.5, 0.7], rotation: [-0.3, 0.5, 0.18], start: 0.10, end: 0.56 },
  { offset: [7, -0.45, -1], rotation: [-0.4, 0.7, 0.28], start: 0.07, end: 0.53 },
  { offset: [-5, 4.2, -0.8], rotation: [0.32, -0.6, -0.4], start: 0.17, end: 0.65 },
  { offset: [5, -3.5, 0.2], rotation: [-0.32, 0.6, 0.3], start: 0.22, end: 0.72 },
  { offset: [4.6, 4.8, -1.2], rotation: [0.35, -0.5, -0.2], start: 0.27, end: 0.80 },
] as const

export const assemblyPieceCount = pieces.length
export const openingDuration = (compact: boolean) => compact ? 4.2 : 4.8

export function assemblyPose(index: number, opening: number, compact: boolean) {
  const piece = pieces[index]
  const t = (1 - clamp(opening)) / 0.8
  const arrive = ease(piece.start, piece.end, t)
  const remaining = 1 - arrive
  const contact = (t - piece.end) / 0.1
  const snap = contact > 0 && contact < 1 ? Math.sin(contact * Math.PI * 5) * (1 - contact) ** 3 * 0.035 : 0
  if (remaining === 0 && snap === 0) return { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, assembled: 1 }
  const arc = arrive === 0 || arrive === 1 ? 0 : Math.sin(arrive * Math.PI)
  const travelX = compact ? 0.42 : 1, travelY = compact ? 1.15 : 1
  return {
    x: (piece.offset[0] * remaining + arc * (index % 2 ? -0.22 : 0.22)) * travelX + snap,
    y: (piece.offset[1] * remaining + arc * 0.16) * travelY - snap * 0.6,
    z: (piece.offset[2] * remaining + arc * 0.22) * (compact ? 0.65 : 1),
    rx: piece.rotation[0] * remaining, ry: piece.rotation[1] * remaining + snap * 0.4, rz: piece.rotation[2] * remaining + snap * 0.2,
    assembled: arrive,
  }
}

/** A short damped impact follows the last connection, before the hero handoff. */
export function magneticShake(opening: number, compact: boolean) {
  const impact = (1 - clamp(opening) - 0.64) / 0.10
  if (impact <= 0 || impact >= 1) return { x: 0, y: 0 }
  const amplitude = (compact ? 0.022 : 0.035) * (1 - impact) ** 2
  return { x: Math.sin(impact * Math.PI * 9) * amplitude, y: Math.sin(impact * Math.PI * 7) * amplitude * 0.65 }
}

export function assemblyTurn(opening: number) {
  if (opening <= 0) return { rx: 0, ry: 0, rz: 0 }
  const t = 1 - clamp(opening)
  return { rx: -0.065 * (1 - ease(0, 0.8, t)), ry: blend(-0.48, 0.16, ease(0, 0.52, t)) * (1 - ease(0.52, 1, t)), rz: -0.025 * (1 - ease(0, 0.8, t)) }
}

/** Keep the stage steady for the assembly, then carry it into the hero. */
export const openingDock = (opening: number) => 1 - ease(0.73, 1, 1 - clamp(opening))
export const openingCompanion = (opening: number) => ease(0.79, 0.99, 1 - clamp(opening))

/** Only owned scene nodes move. Cached GLTF geometry and materials stay shared. */
export function bindSculptureAssembly(root: Object3D) {
  const bound: { object: Object3D; position: Vector3; index: number }[] = []
  const caps: Object3D[] = []
  root.traverse(object => {
    if ((object as Mesh).geometry?.userData.assemblyCap) caps.push(object)
    const index = object.userData.assemblyPiece
    if (Number.isInteger(index) && index >= 0 && index < assemblyPieceCount) bound.push({ object, position: object.position.clone(), index })
  })
  let previous = -1, previousCompact = false
  return {
    count: bound.length,
    update(opening: number, compact: boolean) {
      if (!bound.length) return
      if (opening === previous && compact === previousCompact) return
      previous = opening; previousCompact = compact
      caps.forEach(cap => { cap.visible = opening > 0 })
      for (const piece of bound) {
        const pose = assemblyPose(piece.index, opening, compact)
        piece.object.position.set(piece.position.x + pose.x, piece.position.y + pose.y, piece.position.z + pose.z)
        piece.object.rotation.set(pose.rx, pose.ry, pose.rz)
        piece.object.updateMatrix()
      }
    },
  }
}
