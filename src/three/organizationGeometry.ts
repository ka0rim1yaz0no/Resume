import { CircleGeometry, CylinderGeometry, ExtrudeGeometry, Path, Shape, SphereGeometry, type BufferGeometry } from 'three'
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js'

export function assistlyRibbon() {
  const upper = new Shape()
  upper.moveTo(49, 277); upper.lineTo(519, 277)
  upper.bezierCurveTo(660, 277, 760, 350, 789, 495)
  upper.lineTo(550, 495); upper.bezierCurveTo(425, 495, 321, 600, 309, 731)
  upper.bezierCurveTo(179, 723, 97, 616, 90, 468)
  upper.bezierCurveTo(90, 362, 88, 313, 49, 277)
  const lower = new Shape()
  lower.moveTo(790, 497); lower.bezierCurveTo(925, 516, 1000, 649, 1000, 815)
  lower.bezierCurveTo(1000, 880, 1008, 919, 1040, 950)
  lower.lineTo(550, 950); lower.bezierCurveTo(410, 950, 325, 866, 303, 737)
  lower.lineTo(530, 737); lower.bezierCurveTo(681, 737, 777, 645, 790, 497)
  return [upper, lower].map(shape => {
    const g = new ExtrudeGeometry(shape, { depth: 70, steps: 1, bevelEnabled: true, bevelSize: 7, bevelThickness: 10, bevelSegments: 4, curveSegments: 20 })
    g.scale(0.002, 0.002, 0.002); g.rotateX(Math.PI)
    g.translate(-1.089, 1.227, 0.06)
    toCreasedNormals(g, 0.5)
    return g
  })
}

export function knowlesGlobe() {
  const cells: BufferGeometry[] = []
  for (let row = 0; row < 4; row++) for (let column = 0; column < 8; column++) {
    cells.push(new SphereGeometry(0.86, 10, 8, column * Math.PI / 4 + 0.024, Math.PI / 4 - 0.048, row * Math.PI / 4 + 0.024, Math.PI / 4 - 0.048))
  }
  const panels = mergeGeometries(cells)!
  cells.forEach(cell => cell.dispose())
  return { panels, core: new SphereGeometry(0.857, 64, 48) }
}

export function syntaxGear() {
  const shape = new Shape()
  for (let i = 0; i < 40; i++) {
    const a = Math.PI / 2 + i * Math.PI / 20
    const radius = i % 4 === 1 || i % 4 === 2 ? 1.04 : 0.91
    const x = Math.cos(a) * radius, y = Math.sin(a) * radius
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y)
  }
  shape.closePath()
  const hole = new Path(); hole.absarc(0, 0, 0.725, 0, Math.PI * 2, true)
  shape.holes.push(hole)
  const ring = new ExtrudeGeometry(shape, { depth: 0.15, steps: 1, curveSegments: 48, bevelEnabled: true, bevelSize: 0.028, bevelThickness: 0.032, bevelSegments: 4 })
  ring.translate(0, 0, -0.075); toCreasedNormals(ring, 0.5)
  const body = new CylinderGeometry(0.744, 0.744, 0.18, 64)
  body.rotateX(Math.PI / 2)
  return { ring, body, face: new CircleGeometry(0.746, 64) }
}
