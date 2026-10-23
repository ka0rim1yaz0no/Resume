import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dequantize, dedup, weld, prune, meshopt } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'
import { Box3, Matrix3, Matrix4, ShapeUtils, Vector2, Vector3 } from 'three'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'

// Offline cuts: no browser tessellation, extra downloads or repeated full-model
// clipping passes. Run with a folder containing the two uncut web exports.
const source = resolve(process.argv[2] || 'artifacts/assembly/source')
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready])
const manifest = JSON.parse(await readFile('src/data/mobileModels.json', 'utf8'))
const eps = 1e-7

function clip(polygon, axis, limit, sign) {
  if (!polygon.length) return polygon
  const result = []
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length]
    const da = (a[axis] - limit) * sign, db = (b[axis] - limit) * sign
    if (da >= -eps) result.push(a)
    if ((da > eps && db < -eps) || (da < -eps && db > eps)) {
      const t = da / (da - db)
      const vertex = a.map((value, j) => value + (b[j] - value) * t)
      vertex[axis] = limit
      result.push(vertex)
    }
  }
  return result
}

const area = (a, b, c) => {
  const ab = new Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2])
  return ab.cross(new Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2])).length() * 0.5
}

function capFaces(segments, axis, limit, sign, pivot) {
  const key = p => p.slice(0, 3).map(v => Math.round(v * 1e5)).join(',')
  const points = new Map(), edges = new Map(), adjacent = new Map()
  for (const [a, b] of segments) {
    const ka = key(a), kb = key(b)
    if (ka === kb) continue
    const edge = [ka, kb].sort().join('|')
    if (edges.has(edge)) { edges.delete(edge); continue }
    edges.set(edge, [ka, kb]); points.set(ka, a); points.set(kb, b)
  }
  for (const [edge, pair] of edges) for (const vertex of pair) {
    if (!adjacent.has(vertex)) adjacent.set(vertex, [])
    adjacent.get(vertex).push(edge)
  }
  const axes = axis === 0 ? [1, 2] : [2, 0]
  const loops = []
  while (edges.size) {
    const [first, pair] = edges.entries().next().value
    edges.delete(first)
    const loop = [pair[0]], start = pair[0]
    let current = pair[1]
    while (current !== start) {
      loop.push(current)
      const edge = adjacent.get(current)?.find(candidate => edges.has(candidate))
      if (!edge) break
      const next = edges.get(edge)
      edges.delete(edge); current = next[0] === current ? next[1] : next[0]
    }
    if (current === start && loop.length > 2) {
      const contour = loop.map(k => { const p = points.get(k); return new Vector2(p[axes[0]], p[axes[1]]) })
      if (Math.abs(ShapeUtils.area(contour)) > 1e-8) loops.push({ contour, parent: -1, depth: 0 })
    }
  }
  const contains = (polygon, p) => {
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i], b = polygon[j]
      if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside
    }
    return inside
  }
  loops.sort((a, b) => Math.abs(ShapeUtils.area(b.contour)) - Math.abs(ShapeUtils.area(a.contour)))
  loops.forEach((loop, i) => {
    for (let j = i - 1; j >= 0; j--) if (contains(loops[j].contour, loop.contour[0])) { loop.parent = j; loop.depth = loops[j].depth + 1; break }
  })
  const values = []
  loops.forEach((loop, i) => {
    if (loop.depth % 2) return
    const holes = loops.filter(other => other.parent === i && other.depth % 2).map(other => other.contour)
    const all = [...loop.contour, ...holes.flat()]
    for (const triangle of ShapeUtils.triangulateShape(loop.contour, holes)) {
      const vertices = triangle.map(index => {
        const p = [0, 0, 0]; p[axis] = limit; p[axes[0]] = all[index].x; p[axes[1]] = all[index].y
        return p
      })
      const normal = new Vector3().subVectors(new Vector3(...vertices[1]), new Vector3(...vertices[0])).cross(new Vector3().subVectors(new Vector3(...vertices[2]), new Vector3(...vertices[0])))
      if (normal.getComponent(axis) * -sign < 0) vertices.reverse()
      for (const p of vertices) values.push(p[0] - pivot[0], p[1] - pivot[1], p[2] - pivot[2], axis === 0 ? -sign : 0, axis === 1 ? -sign : 0, 0)
    }
  })
  return values
}

for (const id of ['systems-sculpture', 'project-laptop']) for (const profile of ['desktop', 'mobile']) {
  const sculpture = id === 'systems-sculpture'
  const labels = sculpture ? ['Foundation', 'Data left', 'Data centre', 'Data right', 'Core', 'Bridge', 'Display'] : ['Interface', 'Application', 'Database']
  const input = await readFile(resolve(source, `${sculpture ? '' : 'project-'}${profile}.glb`))
  const doc = await io.readBinary(input)
  if (doc.getRoot().listNodes().some(node => node.getExtras().assemblyPiece !== undefined || node.getExtras().projectPiece !== undefined)) throw new Error('Use an uncut source model')
  await doc.transform(dequantize())
  const bounds = new Box3(), primitives = []
  for (const node of doc.getRoot().listNodes()) {
    const matrix = new Matrix4().fromArray(node.getWorldMatrix()), normalMatrix = new Matrix3().getNormalMatrix(matrix)
    for (const primitive of node.getMesh()?.listPrimitives() || []) {
      const positions = primitive.getAttribute('POSITION'), normals = primitive.getAttribute('NORMAL'), uv = primitive.getAttribute('TEXCOORD_0')
      const vertices = []
      for (let i = 0; i < positions.getCount(); i++) {
        const p = new Vector3(...positions.getElement(i, [])).applyMatrix4(matrix)
        const n = new Vector3(...normals.getElement(i, [])).applyNormalMatrix(normalMatrix)
        bounds.expandByPoint(p); vertices.push([...p.toArray(), ...n.toArray(), ...uv.getElement(i, [])])
      }
      primitives.push({ vertices, indices: primitive.getIndices().getArray(), material: primitive.getMaterial() })
    }
  }
  const center = bounds.getCenter(new Vector3()), size = bounds.getSize(new Vector3()), scale = 3.7 / Math.max(...size.toArray())
  for (const { vertices } of primitives) for (const p of vertices) for (let i = 0; i < 3; i++) p[i] = (p[i] - center.getComponent(i)) * scale
  const minY = -size.y * scale / 2, maxY = -minY, height = maxY - minY
  const y = t => minY + height * t
  const regions = sculpture ? [
    [[1, y(0.10), -1]],
    [[1, y(0.10), 1], [1, y(0.36), -1], [0, -0.52, -1]],
    [[1, y(0.10), 1], [1, y(0.36), -1], [0, -0.52, 1], [0, 0.55, -1]],
    [[1, y(0.10), 1], [1, y(0.36), -1], [0, 0.55, 1]],
    [[1, y(0.36), 1], [1, y(0.54), -1]],
    [[1, y(0.54), 1], [1, y(0.66), -1]],
    [[1, y(0.66), 1]],
  ] : [
    [[1, y(0.11), 1]],
    [[1, y(0.035), 1], [1, y(0.11), -1]],
    [[1, y(0.035), -1]],
  ]
  const scene = doc.getRoot().listScenes()[0]
  for (const node of scene.listChildren()) node.dispose()
  const buffer = doc.getRoot().listBuffers()[0]
  const capMaterial = doc.createMaterial(sculpture ? 'Cut bronze' : 'Cut graphite').setBaseColorFactor(sculpture ? [0.12, 0.095, 0.055, 1] : [0.10, 0.13, 0.12, 1]).setRoughnessFactor(0.96).setMetallicFactor(0.18).setDoubleSided(true)
  const accessor = (name, type, array) => doc.createAccessor(name).setType(type).setArray(new Float32Array(array)).setBuffer(buffer)
  let sourceArea = 0, cutArea = 0, triangles = 0
  for (const { vertices, indices } of primitives) for (let i = 0; i < indices.length; i += 3) sourceArea += area(vertices[indices[i]], vertices[indices[i + 1]], vertices[indices[i + 2]])
  for (let piece = 0; piece < regions.length; piece++) {
    const planes = regions[piece], outputs = [], segments = planes.map(() => []), box = new Box3()
    for (const { vertices, indices, material } of primitives) {
      const output = []
      for (let i = 0; i < indices.length; i += 3) {
        let polygon = [vertices[indices[i]], vertices[indices[i + 1]], vertices[indices[i + 2]]]
        for (const [axis, limit, sign] of planes) polygon = clip(polygon, axis, limit, sign)
        if (polygon.length < 3) continue
        for (const v of polygon) box.expandByPoint(new Vector3(v[0], v[1], v[2]))
        planes.forEach(([axis, limit], plane) => {
          for (let j = 0; j < polygon.length; j++) {
            const a = polygon[j], b = polygon[(j + 1) % polygon.length]
            if (Math.abs(a[axis] - limit) < eps && Math.abs(b[axis] - limit) < eps) segments[plane].push([a, b])
          }
        })
        for (let j = 1; j < polygon.length - 1; j++) {
          const surfaceArea = area(polygon[0], polygon[j], polygon[j + 1])
          if (surfaceArea < 1e-12) continue
          cutArea += surfaceArea; triangles++
          output.push(...polygon[0], ...polygon[j], ...polygon[j + 1])
        }
      }
      if (output.length) outputs.push({ output, material })
    }
    if (box.isEmpty()) throw new Error(`Empty assembly piece: ${labels[piece]}`)
    const pivot = box.getCenter(new Vector3()).toArray(), mesh = doc.createMesh(labels[piece])
    for (const { output, material } of outputs) {
      const positions = [], normals = [], uvs = []
      for (let i = 0; i < output.length; i += 8) {
        positions.push(output[i] - pivot[0], output[i + 1] - pivot[1], output[i + 2] - pivot[2])
        const n = new Vector3(output[i + 3], output[i + 4], output[i + 5]).normalize()
        normals.push(...n.toArray()); uvs.push(output[i + 6], output[i + 7])
      }
      mesh.addPrimitive(doc.createPrimitive().setAttribute('POSITION', accessor('surface', 'VEC3', positions)).setAttribute('NORMAL', accessor('normal', 'VEC3', normals)).setAttribute('TEXCOORD_0', accessor('uv', 'VEC2', uvs)).setMaterial(material))
    }
    const caps = planes.flatMap(([axis, limit, sign], i) => capFaces(segments[i], axis, limit, sign, pivot))
    if (caps.length) {
      const positions = [], normals = []
      for (let i = 0; i < caps.length; i += 6) { positions.push(...caps.slice(i, i + 3)); normals.push(...caps.slice(i + 3, i + 6)) }
      mesh.addPrimitive(doc.createPrimitive().setExtras({ assemblyCap: true }).setAttribute('POSITION', accessor('cut', 'VEC3', positions)).setAttribute('NORMAL', accessor('cut normal', 'VEC3', normals)).setMaterial(capMaterial))
    }
    scene.addChild(doc.createNode(labels[piece]).setMesh(mesh).setTranslation(pivot).setExtras(sculpture ? { assemblyPiece: piece } : { projectPiece: piece }))
  }
  // Every original surface is retained, including triangles crossing a cut.
  if (Math.abs(sourceArea - cutArea) / sourceArea > 0.000001) throw new Error('Assembly cuts lost or duplicated source surface')
  await doc.transform(weld(), dedup(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'high' }))
  const output = await io.writeBinary(doc)
  const filename = profile === 'mobile' ? `${id}-${createHash('sha256').update(output).digest('hex').slice(0, 10)}.glb` : `${id}.glb`
  await writeFile(resolve(profile === 'mobile' ? 'public/models/mobile' : 'public/models', filename), output)
  if (profile === 'mobile') manifest[id] = filename
  const totalTriangles = doc.getRoot().listMeshes().flatMap(mesh => mesh.listPrimitives()).reduce((sum, primitive) => sum + primitive.getIndices().getCount() / 3, 0)
  const report = { id, profile, bytes: output.byteLength, sourceBytes: input.byteLength, pieces: regions.length, triangles, totalTriangles, surfaceAreaError: Math.abs(sourceArea - cutArea) / sourceArea }
  await mkdir('artifacts/assembly', { recursive: true })
  await writeFile(`artifacts/assembly/${id}-${profile}.json`, JSON.stringify(report, null, 2))
  if (profile === 'desktop') {
    const registry = JSON.parse(await readFile('public/models/report.json', 'utf8'))
    const entry = registry.find(entry => entry.id === id)
    Object.assign(entry, { webBytes: output.byteLength, webTriangles: totalTriangles, nodes: doc.getRoot().listNodes().map(node => node.getName()) })
    await writeFile('public/models/report.json', JSON.stringify(registry, null, 2) + '\n')
  }
  console.log(JSON.stringify(report))
}
await writeFile('src/data/mobileModels.json', JSON.stringify(manifest, null, 2) + '\n')
