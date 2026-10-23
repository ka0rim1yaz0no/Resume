import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, weld, simplify, meshopt, textureCompress, prune } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import sharp from 'sharp'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

// Only derived assets in public/models are written. Source files stay untouched.
const source = process.argv[2] || 'C:/Users/hp/Downloads'
const output = resolve('public/models')
await mkdir(output, { recursive: true })
await MeshoptEncoder.ready
await MeshoptSimplifier.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder })
const selected = process.argv.slice(3)
const ids = selected.length ? selected : ['systems-sculpture', 'project-laptop', 'workflow-board', 'react-js']
if (ids.some(id => !['systems-sculpture', 'project-laptop', 'workflow-board', 'react-js'].includes(id))) throw new Error('Unknown model ID')
const report = selected.length ? JSON.parse(await readFile('public/models/report.json', 'utf8')) : []
for (const id of ids) {
  const input = resolve(source, `${id}.glb`)
  const document = await io.read(input)
  const before = document.getRoot().listMeshes().flatMap(m => m.listPrimitives()).reduce((n,p) => n + p.getIndices().getCount() / 3, 0)
  await document.transform(
    dedup(), weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: 0.22, error: 0.0002, lockBorder: true }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [2048, 2048], quality: 88 }),
    prune(), meshopt({ encoder: MeshoptEncoder, level: 'high' }),
  )
  const dest = resolve(output, `${id}.glb`)
  await io.write(dest, document)
  const after = document.getRoot().listMeshes().flatMap(m => m.listPrimitives()).reduce((n,p) => n + p.getIndices().getCount() / 3, 0)
  const result = { id, sourceBytes: (await stat(input)).size, webBytes: (await stat(dest)).size, sourceTriangles: before, webTriangles: after, nodes: document.getRoot().listNodes().map(n => n.getName()), animations: document.getRoot().listAnimations().map(a => a.getName()), textures: document.getRoot().listTextures().map(t => ({ size: t.getSize(), mime: t.getMimeType() })) }
  const existing = report.findIndex(entry => entry.id === id)
  if (existing >= 0) report[existing] = result
  else report.push(result)
  console.log(JSON.stringify(result))
}
await writeFile('public/models/report.json', JSON.stringify(report, null, 2))
