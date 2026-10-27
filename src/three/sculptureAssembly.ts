import type { Mesh, Object3D, Vector3 } from 'three'
import { blend, clamp } from './choreography'

const ease = (start: number, end: number, value: number) => {
  const t = clamp((value - start) / (end - start))
  return t * t * t * (t * (t * 6 - 15) + 10)
}

// Screen-edge arrivals share a clock, but each physical cut has its own
// approach, depth and magnetic connection. The complete object holds before docking.
const pieces = [
  { offset: [0.3, -4.3, -0.8], rotation: [0.38, -0.36, -0.16], bend: [0.6, 0.1, 0.8], start: 0, end: 0.36 },
  { offset: [-6.2, 0.6, 0.8], rotation: [0.5, -0.95, -0.32], bend: [-0.3, 0.65, 0.8], start: 0.01, end: 0.47 },
  { offset: [0.4, 4.4, -0.6], rotation: [-0.48, 0.65, 0.22], bend: [-0.65, 0.1, 1], start: 0.04, end: 0.51 },
  { offset: [6.2, -0.5, -0.6], rotation: [-0.46, 0.9, 0.32], bend: [0.2, -0.55, 1], start: 0.02, end: 0.49 },
  { offset: [-4.6, 3.5, -1.1], rotation: [0.4, -0.75, -0.42], bend: [0.6, 0.3, 1.2], start: 0.07, end: 0.55 },
  { offset: [4.7, -3.4, 0.5], rotation: [-0.4, 0.75, 0.36], bend: [-0.4, -0.35, 0.7], start: 0.10, end: 0.59 },
  { offset: [4.6, 3.8, -1.2], rotation: [0.5, -0.65, -0.28], bend: [-0.8, 0.15, 1.3], start: 0.12, end: 0.64 },
] as const

export const assemblyPieceCount = pieces.length
export const openingDuration = (compact: boolean) => compact ? 3.8 : 4.4
export const openingPhase = (opening: number) => {
  const t = 1 - clamp(opening)
  return t < 0.58 ? 'gathering' : t < 0.74 ? 'magnetizing' : t < 0.79 ? 'assembled' : 'landing'
}

export function assemblyPose(index: number, opening: number, compact: boolean) {
  const piece = pieces[index]
  const t = 1 - clamp(opening)
  const arrive = ease(piece.start, piece.end, t)
  const remaining = 1 - arrive
  const contact = (t - piece.end) / 0.08
  const snap = contact > 0 && contact < 1 ? Math.sin(contact * Math.PI * 2.5) * (1 - contact) ** 3 * 0.022 : 0
  if (remaining === 0 && snap === 0) return { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, assembled: 1 }
  const arc = arrive === 0 || arrive === 1 ? 0 : Math.sin(arrive * Math.PI)
  const travelX = compact ? 0.38 : 1, travelY = compact ? 1.12 : 1
  return {
    x: (piece.offset[0] * remaining + arc * piece.bend[0]) * travelX + snap,
    y: (piece.offset[1] * remaining + arc * piece.bend[1]) * travelY - snap * 0.6,
    z: (piece.offset[2] * remaining + arc * piece.bend[2]) * (compact ? 0.65 : 1),
    rx: piece.rotation[0] * remaining * 0.7, ry: piece.rotation[1] * remaining * 0.7 + snap * 0.4, rz: piece.rotation[2] * remaining * 0.7 + snap * 0.2,
    assembled: arrive,
  }
}

/** A short damped impact follows the last connection, before the hero handoff. */
export function magneticShake(opening: number, compact: boolean) {
  const impact = (1 - clamp(opening) - 0.64) / 0.10
  if (impact <= 0 || impact >= 1) return { x: 0, y: 0 }
  const amplitude = (compact ? 0.024 : 0.042) * (1 - impact) ** 2
  return { x: Math.sin(impact * Math.PI * 9) * amplitude, y: Math.sin(impact * Math.PI * 7) * amplitude * 0.65 }
}

export function assemblyTurn(opening: number) {
  if (opening <= 0) return { rx: 0, ry: 0, rz: 0 }
  const t = 1 - clamp(opening)
  const dock = ease(0.79, 1, t)
  return { rx: blend(-0.1, 0.015, ease(0, 0.64, t)) * (1 - dock), ry: blend(-0.6, 0.18, ease(0, 0.64, t)) * (1 - dock), rz: -0.035 * (1 - ease(0, 0.64, t)) }
}

/** Keep the stage steady for the assembly, then carry it into the hero. */
export const openingDock = (opening: number) => 1 - ease(0.79, 1, 1 - clamp(opening))
export const openingCompanion = (opening: number) => ease(0.87, 1, 1 - clamp(opening))

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
