import { Box2, Color, Curve, ExtrudeGeometry, MathUtils, Path, Shape, SRGBColorSpace, TubeGeometry, Vector2, Vector3, type BufferGeometry, type ShapePath } from 'three'
import type { SVGResult } from 'three/addons/loaders/SVGLoader.js'
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js'
import { studioEnamelColor, studioPalette } from './studioMaterials'

export type EmblemPart = { geometry: BufferGeometry; color: Color; edge: Color }
type PathStyle = { fill?: string; stroke?: string; strokeWidth?: number; fillOpacity?: number; strokeOpacity?: number }

function enamelColor(source: Color, accent: string) {
  const hsl = source.getHSL({ h: 0, s: 0, l: 0 }, SRGBColorSpace)
  const color = new Color().setHSL(hsl.h, hsl.s * 0.82, MathUtils.clamp(hsl.l * 0.9, 0.055, 0.74), SRGBColorSpace).multiplyScalar(0.85)
  if (hsl.s > 0.1) color.lerp(new Color(accent), 0.12)
  return studioEnamelColor(color)
}

class StrokeCurve extends Curve<Vector3> {
  constructor(private path: Path, private scale: number, private center: Vector2, private z: number) { super() }
  getPoint(t: number, target = new Vector3()) {
    const p = this.path.getPoint(t)
    return target.set((p.x - this.center.x) * this.scale, (this.center.y - p.y) * this.scale, this.z)
  }
}

/** Cached local vectors become real raised surfaces. Resulting geometry is
 * owned by this selection, independent of the loader's cached SVG paths. */
export function buildSkillEmblem(data: SVGResult, accent: string): EmblemPart[] {
  const bounds = new Box2()
  for (const path of data.paths) for (const sub of path.subPaths) for (const p of sub.getPoints(12)) bounds.expandByPoint(p)
  if (bounds.isEmpty()) return []
  const size = bounds.getSize(new Vector2()), center = bounds.getCenter(new Vector2())
  const scale = 2.25 / Math.max(size.x, size.y, 1)
  const parts: EmblemPart[] = []
  data.paths.forEach((path: ShapePath, layer) => {
    const style = path.userData.style as PathStyle
    const z = 0.29 + layer * 0.12 / Math.max(1, data.paths.length - 1)
    if (style.fill !== 'none' && (style.fillOpacity ?? 1) > 0) {
      const shapes = path.toShapes()
      if (shapes.length) {
        const depth = 0.16
        const geometry = new ExtrudeGeometry(shapes, {
          depth: depth / scale, steps: 1, curveSegments: 10,
          bevelEnabled: true, bevelSegments: 3,
          bevelSize: (data.paths.length > 4 ? 0.006 : 0.014) / scale, bevelThickness: 0.024 / scale,
        })
        // Rotate instead of reflecting geometry, preserving face winding.
        geometry.scale(scale, scale, scale)
        geometry.rotateX(Math.PI)
        geometry.translate(-center.x * scale, center.y * scale, z + depth)
        toCreasedNormals(geometry, 0.5)
        const source = style.fill?.startsWith('url(') ? new Color(accent).offsetHSL(0, 0, (layer % 3 - 1) * 0.045) : path.color
        const color = enamelColor(source, accent)
        parts.push({ geometry, color, edge: color.clone().lerp(new Color(studioPalette.edge), 0.5) })
      }
    }
    if (style.stroke && style.stroke !== 'none' && (style.strokeOpacity ?? 1) > 0) {
      const color = enamelColor(new Color(style.stroke), accent)
      for (const sub of path.subPaths) {
        const points = sub.getPoints(12)
        const closed = sub.autoClose || points[0].distanceTo(points.at(-1)!) < 0.00001
        const geometry = new TubeGeometry(new StrokeCurve(sub, scale, center, z + 0.07), Math.min(180, Math.max(32, points.length * 2)), (style.strokeWidth || 1) * scale / 2, 8, closed)
        geometry.addGroup(0, geometry.index!.count, 0)
        parts.push({ geometry, color, edge: color })
      }
    }
  })
  return parts
}

/** A continuous rounded plum body for the raised studio emblems. */
export function createSkillBody() {
  const half = 1.58, radius = 0.4, edge = half - radius
  const shape = new Shape()
  shape.moveTo(-edge, -half)
  shape.lineTo(edge, -half); shape.quadraticCurveTo(half, -half, half, -edge)
  shape.lineTo(half, edge); shape.quadraticCurveTo(half, half, edge, half)
  shape.lineTo(-edge, half); shape.quadraticCurveTo(-half, half, -half, edge)
  shape.lineTo(-half, -edge); shape.quadraticCurveTo(-half, -half, -edge, -half)
  const geometry = new ExtrudeGeometry(shape, { depth: 0.22, steps: 1, curveSegments: 12, bevelEnabled: true, bevelSegments: 5, bevelSize: 0.1, bevelThickness: 0.14 })
  geometry.translate(0, 0, -0.11)
  toCreasedNormals(geometry, 0.5)
  return geometry
}
