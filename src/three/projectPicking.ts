import { Raycaster, Vector2, type Camera, type Intersection, type Object3D } from 'three'
import type { StageRect } from './choreography'
import type { ProjectPickPoint } from './projectInteraction'

/** A tap uses the same scissored viewport and final camera as the renderer. */
export function createProjectPicker(parts: { object: Object3D; index: number }[]) {
  const raycaster = new Raycaster(), pointer = new Vector2(), hits: Intersection[] = []
  const roots = parts.map(part => part.object), indices = new Map(parts.map(part => [part.object, part.index]))
  const touchOffsets = [[0, -5], [0, 5], [-5, 0], [5, 0]] as const
  return (point: ProjectPickPoint, viewport: StageRect, camera: Camera): number | null => {
    const inside = (x: number, y: number) => x >= viewport.left && x <= viewport.left + viewport.width && y >= viewport.top && y <= viewport.top + viewport.height
    if (viewport.width <= 0 || viewport.height <= 0 || !Number.isFinite(point.clientX) || !Number.isFinite(point.clientY) || !inside(point.clientX, point.clientY)) return null
    camera.updateMatrixWorld()
    roots.forEach(root => root.updateWorldMatrix(true, true))
    const cast = (x: number, y: number) => {
      if (!inside(x, y)) return null
      pointer.set((x - viewport.left) / viewport.width * 2 - 1, 1 - (y - viewport.top) / viewport.height * 2)
      raycaster.setFromCamera(pointer, camera)
      hits.length = 0
      raycaster.intersectObjects(roots, true, hits)
      for (const hit of hits) {
        for (let node: Object3D | null = hit.object; node; node = node.parent) {
          const index = indices.get(node)
          if (index !== undefined) return index
        }
      }
      return null
    }
    const direct = cast(point.clientX, point.clientY)
    if (direct !== null || !['touch', 'pen'].includes(point.pointerType)) return direct
    // A small touch allowance still tests real surfaces; empty background
    // never becomes a rectangular component hotspot.
    for (const [x, y] of touchOffsets) {
      const index = cast(point.clientX + x, point.clientY + y)
      if (index !== null) return index
    }
    return null
  }
}
