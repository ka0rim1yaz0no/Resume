import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, weld, simplify, meshopt, textureCompress, prune } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

// Derive phone assets from the existing web exports. Original and desktop
// models stay untouched; hashed filenames make long-lived CDN caching safe.
sharp.concurrency(1)
sharp.cache(false)
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready])
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })
const folder = 'public/models/mobile'
await mkdir(folder, { recursive: true })
await mkdir('artifacts/performance', { recursive: true })
// The laptop has its own lower-detail constructed geometry, rather than a
// simplification pass that could collapse the keys, hinge or shell openings.
const manifest = JSON.parse(await readFile('src/data/mobileModels.json', 'utf8')), report = []
for (const id of ['systems-sculpture', 'workflow-board', 'react-js']) {
  const input = await readFile(`public/models/${id}.glb`)
  const doc = await io.readBinary(input)
  const triangles = () => doc.getRoot().listMeshes().flatMap(m => m.listPrimitives()).reduce((sum, p) => sum + (p.getIndices()?.getCount() || 0) / 3, 0)
  const before = triangles()
  // The studio finish supplies its own matte metallic/roughness values.
  doc.getRoot().listMaterials().forEach(material => material.setMetallicRoughnessTexture(null))
  await doc.transform(dedup(), weld(), simplify({ simplifier: MeshoptSimplifier, ratio: id === 'react-js' ? 0.33 : 0.27, error: 0.001, lockBorder: true }), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 86 }), prune(), meshopt({ encoder: MeshoptEncoder, level: 'high' }))
  const output = await io.writeBinary(doc)
  const hash = createHash('sha256').update(output).digest('hex').slice(0, 10)
  const filename = `${id}-${hash}.glb`
  await writeFile(`${folder}/${filename}`, output)
  manifest[id] = filename
  const result = { id, desktopBytes: input.byteLength, mobileBytes: output.byteLength, desktopTriangles: before, mobileTriangles: triangles(), textures: doc.getRoot().listTextures().map(texture => texture.getSize()) }
  report.push(result)
  console.log(JSON.stringify(result))
}
await writeFile('src/data/mobileModels.json', JSON.stringify(manifest, null, 2) + '\n')
await writeFile('artifacts/performance/mobile-models.json', JSON.stringify(report, null, 2) + '\n')
