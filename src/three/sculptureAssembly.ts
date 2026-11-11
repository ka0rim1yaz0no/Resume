import type { Mesh, Object3D, Vector3 } from 'three'
import { blend, clamp } from './choreography'

const ease = (start: number, end: number, value: number) => {
  const t = clamp((value - start) / (end - start))
  return clamp(t * t * t * (t * (t * 6 - 15) + 10))
}

// The seven cuts approach from the perimeter at different depths. Lock the
// foundation first, then connect the modules and mount the display.
const pieces = [
  { offset: [0.3, -4.3, 0.15], rotation: [0.62, -0.38, -0.22], bend: [0.45, 0.1, 0.75], start: 0, end: 0.38 },
  { offset: [-6.2, 0.65, 0.8], rotation: [0.5, -1.08, -0.42], bend: [0.24, 0.58, 0.8], start: 0.025, end: 0.47 },
  { offset: [-0.45, 4.4, -0.6], rotation: [-0.55, 0.72, 0.3], bend: [-0.55, 0.1, 0.94], start: 0.06, end: 0.53 },
  { offset: [6.2, -0.65, -0.6], rotation: [-0.5, 0.95, 0.4], bend: [-0.12, -0.52, 1], start: 0.04, end: 0.49 },
  { offset: [-5.2, 3.6, -0.9], rotation: [0.55, -0.8, -0.5], bend: [0.6, 0.3, 1.1], start: 0.095, end: 0.58 },
  { offset: [5.3, -3.4, 0.45], rotation: [-0.48, 0.85, 0.46], bend: [-0.5, -0.25, 0.64], start: 0.12, end: 0.63 },
  { offset: [4.9, 4.15, -0.9], rotation: [0.65, -0.85, -0.42], bend: [-0.74, 0.18, 1.12], start: 0.14, end: 0.68 },
] as const

export const assemblyPieceCount = pieces.length
export const openingContacts = pieces.map(piece => piece.end).sort((a, b) => a - b)
const finalContact = Math.max(...openingContacts)
export const openingDockStart = 0.79
export const openingDuration = (compact: boolean) => compact ? 3.65 : 4.15
export const openingPhase = (opening: number) => {
  const t = 1 - clamp(opening)
  return t < 0.5 ? 'gathering' : t < finalContact ? 'magnetizing' : t < openingDockStart ? 'assembled' : 'landing'
}

export function assemblyPose(index: number, opening: number, compact: boolean, aspect = compact ? 0.72 : 1.75) {
  const piece = pieces[index]
  const t = 1 - clamp(opening)
  // Overlap the long approach with the short magnetic pull so a piece slows
  // near its joint without stopping. Recoil follows the piece's approach.
  const approach = ease(piece.start, piece.end - 0.085, t)
  const lock = ease(piece.end - 0.125, piece.end, t)
  const arrive = 0.86 * approach + 0.14 * lock
  const contact = (t - piece.end) / 0.06
  const recoil = contact > 0 && contact < 1 ? -Math.sin(contact * Math.PI * 2.5) * (1 - contact) ** 3 * 0.008 : 0
  const remaining = 1 - arrive + recoil
  if (remaining === 0) return { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, assembled: 1 }
  const arc = Math.sin(approach * Math.PI) * (1 - lock)
  // Wide windows need more horizontal travel. Tall windows need more vertical
  // travel because fitting the finished sculpture to their width backs away.
  const travelX = Math.max(0.34, aspect / 1.75)
  const travelY = Math.max(1, 0.72 / aspect)
  return {
    x: (piece.offset[0] * remaining + arc * piece.bend[0]) * travelX,
    y: (piece.offset[1] * remaining + arc * piece.bend[1]) * travelY,
    z: (piece.offset[2] * remaining + arc * piece.bend[2]) * (compact ? 0.7 : 1),
    rx: piece.rotation[0] * remaining, ry: piece.rotation[1] * remaining, rz: piece.rotation[2] * remaining,
    assembled: arrive,
  }
}

/** A short damped impact follows the last connection, before the hero handoff. */
export function magneticShake(opening: number, compact: boolean) {
  const impact = (1 - clamp(opening) - finalContact) / 0.085
  if (impact <= 0 || impact >= 1) return { x: 0, y: 0 }
  const amplitude = (compact ? 0.014 : 0.022) * (1 - impact) ** 2
  return { x: Math.sin(impact * Math.PI * 5) * amplitude, y: Math.sin(impact * Math.PI * 4) * amplitude * 0.55 }
}

export function assemblyTurn(opening: number) {
  if (opening <= 0) return { rx: 0, ry: 0, rz: 0 }
  const t = 1 - clamp(opening)
  const swing = ease(0, finalContact, t), centered = openingDock(opening)
  return { rx: blend(-0.16, 0.035, swing) * centered, ry: blend(-0.32, 0.32, swing) * centered, rz: -0.055 * (1 - swing) }
}

/** Keep the stage steady for the assembly, then carry it into the hero. */
export const openingDock = (opening: number) => 1 - ease(openingDockStart, 1, 1 - clamp(opening))
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
  let previous = -1, previousAspect = 0, previousCompact = false
  return {
    count: bound.length,
    update(opening: number, compact: boolean, aspect = compact ? 0.72 : 1.75) {
      if (!bound.length) return
      if (opening === previous && (opening === 0 || (aspect === previousAspect && compact === previousCompact))) return
      previous = opening; previousAspect = aspect; previousCompact = compact
      caps.forEach(cap => { cap.visible = opening > 0 })
      for (const piece of bound) {
        const pose = assemblyPose(piece.index, opening, compact, aspect)
        piece.object.position.set(piece.position.x + pose.x, piece.position.y + pose.y, piece.position.z + pose.z)
        piece.object.rotation.set(pose.rx, pose.ry, pose.rz)
        piece.object.updateMatrix()
      }
    },
  }
}
