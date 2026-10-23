import { CircleGeometry, CylinderGeometry, ExtrudeGeometry, Shape, ShapeGeometry, TorusGeometry } from 'three'
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js'

/** Real depth around the supplied artwork; the school marks keep their colors and proportions. */
export function educationEmblem(index: number) {
  if (index === 1) {
    const body = new CylinderGeometry(1.025, 1.025, 0.18, 80)
    body.rotateX(Math.PI / 2)
    return { body, face: new CircleGeometry(0.982, 80), trim: new TorusGeometry(1.008, 0.014, 8, 80) }
  }
  const shape = new Shape()
  const r = 0.16, s = 0.98
  shape.moveTo(-s + r, -s); shape.lineTo(s - r, -s)
  shape.quadraticCurveTo(s, -s, s, -s + r); shape.lineTo(s, s - r)
  shape.quadraticCurveTo(s, s, s - r, s); shape.lineTo(-s + r, s)
  shape.quadraticCurveTo(-s, s, -s, s - r); shape.lineTo(-s, -s + r)
  shape.quadraticCurveTo(-s, -s, -s + r, -s)
  const body = new ExtrudeGeometry(shape, { depth: 0.15, steps: 1, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.026, bevelSegments: 3, curveSegments: 12 })
  body.translate(0, 0, -0.075); toCreasedNormals(body, 0.5)
  const face = new ShapeGeometry(shape, 12)
  const uv = face.attributes.uv, position = face.attributes.position
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (position.getX(i) + s) / (s * 2), (position.getY(i) + s) / (s * 2))
  return { body, face }
}
