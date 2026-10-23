import { Matrix4, Mesh, Object3D, Vector3 } from 'three'

export const surfacePointCount = 6200
export type SurfaceTarget = { root: Object3D; points: Float32Array }
export type SurfaceTargets = Map<number, SurfaceTarget>

// Barycentric samples are prepared once per GLB. Interpolation and scatter
// happen in the vertex shader, following each rig's actual world transform.
export function sampleSurface(root: Object3D, asset: Object3D): SurfaceTarget {
  root.updateWorldMatrix(true, true)
  const inverse = root.matrixWorld.clone().invert()
  const meshes: { mesh: Mesh; triangles: number; matrix: Matrix4 }[] = []
  let total = 0
  asset.traverse(object => {
    if (!(object instanceof Mesh) || !object.geometry.attributes.position) return
    const triangles = Math.floor((object.geometry.index?.count || object.geometry.attributes.position.count) / 3)
    meshes.push({ mesh: object, triangles, matrix: inverse.clone().multiply(object.matrixWorld) })
    total += triangles
  })
  const points = new Float32Array(surfacePointCount * 3)
  let seed = 82971
  const random = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647 }
  const a = new Vector3(), b = new Vector3(), c = new Vector3()
  if (!total) return { root, points }
  for (let i = 0; i < surfacePointCount; i++) {
    let triangle = Math.floor(random() * total)
    const selected = meshes.find(entry => {
      if (triangle < entry.triangles) return true
      triangle -= entry.triangles
      return false
    })!
    const { geometry } = selected.mesh
    const position = geometry.attributes.position
    const vertex = (corner: number) => geometry.index ? geometry.index.getX(triangle * 3 + corner) : triangle * 3 + corner
    a.fromBufferAttribute(position, vertex(0)); b.fromBufferAttribute(position, vertex(1)); c.fromBufferAttribute(position, vertex(2))
    const u = Math.sqrt(random()), v = random()
    a.multiplyScalar(1 - u).addScaledVector(b, u * (1 - v)).addScaledVector(c, u * v).applyMatrix4(selected.matrix)
    a.toArray(points, i * 3)
  }
  return { root, points }
}
