import { Box3, Euler, Matrix4, Vector3 } from 'three'

/** Frame the original React tile and every raised emblem as one composition.
 * The envelope remains present during the completely dissolved midpoint. */
export function skillFrameBounds(reactBounds: Box3) {
  const bounds = reactBounds.clone()
  // The rounded body includes its bevel; all marks are inset inside it.
  // Include the full extrusion depth and both ends of the entrance turn.
  const token = new Box3(new Vector3(-1.68, -1.68, -0.25), new Vector3(1.68, 1.68, 0.6))
  for (const yaw of [-0.18, 0, 0.16]) {
    const matrix = new Matrix4().makeRotationFromEuler(new Euler(0.055, yaw, 0))
    bounds.union(token.clone().applyMatrix4(matrix))
  }
  return bounds
}
