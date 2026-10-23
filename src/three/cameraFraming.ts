import { MathUtils, Mesh, PerspectiveCamera, Vector3, type Box3, type Matrix4, type Object3D } from 'three'

const corner = new Vector3()
/** Back away along the existing cinematic shot until every bounds corner fits.
 * This preserves the authored lens, aim and movement, including user rotation. */
export function cameraRetreat(camera: PerspectiveCamera, bounds: Box3, aspect: number, padding = 0.035, world?: Matrix4) {
  if (bounds.isEmpty()) return 0
  camera.updateMatrixWorld()
  const vertical = Math.tan(MathUtils.degToRad(camera.fov * 0.5)) * (1 - padding * 2)
  const horizontal = vertical * Math.max(0.1, aspect)
  let retreat = 0
  for (let i = 0; i < 8; i++) {
    corner.set(i & 1 ? bounds.max.x : bounds.min.x, i & 2 ? bounds.max.y : bounds.min.y, i & 4 ? bounds.max.z : bounds.min.z)
    if (world) corner.applyMatrix4(world)
    corner.applyMatrix4(camera.matrixWorldInverse)
    retreat = Math.max(retreat, Math.abs(corner.x) / horizontal + corner.z, Math.abs(corner.y) / vertical + corner.z)
  }
  return retreat
}

export function createSceneFramer() {
  const direction = new Vector3()
  let distance = 0
  return (scene: Object3D, camera: PerspectiveCamera, aspect: number, delta: number) => {
    let required = 0
    scene.updateMatrixWorld()
    const visit = (object: Object3D) => {
      if (!object.visible) return
      const authoredBounds = object.userData.openingFrameBounds as Box3 | undefined
      if (authoredBounds) {
        // Incoming opening fragments intentionally begin beyond the frame.
        // Fit their assembled destination, keeping the central subject large.
        required = Math.max(required, cameraRetreat(camera, authoredBounds, aspect, 0.035, object.matrixWorld))
        return
      }
      if (object instanceof Mesh) {
        const geometry = object.geometry
        if (!geometry.boundingBox) geometry.computeBoundingBox()
        // Fit each oriented mesh, avoiding empty corners around compositions.
        if (geometry.boundingBox) required = Math.max(required, cameraRetreat(camera, geometry.boundingBox, aspect, 0.035, object.matrixWorld))
      }
      object.children.forEach(visit)
    }
    visit(scene)
    // Grow the safe distance immediately; ease back in as the composition
    // becomes smaller. A fast drag can never outrun the frame's safe bounds.
    distance = Math.max(required, MathUtils.damp(distance, required, 9, Math.min(delta, 0.05)))
    camera.getWorldDirection(direction)
    camera.position.addScaledVector(direction, -distance)
    camera.updateMatrixWorld()
    return distance
  }
}
