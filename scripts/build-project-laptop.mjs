import { Document, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS, KHRMaterialsUnlit } from '@gltf-transform/extensions'
import { dedup, weld, prune, meshopt } from '@gltf-transform/functions'
import { MeshoptEncoder } from 'meshoptimizer'
import { BoxGeometry, CylinderGeometry, Euler, ExtrudeGeometry, Matrix4, PlaneGeometry, Quaternion, Shape, Vector3 } from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdir } from 'node:fs/promises'

// A constructed assembly: no plane cuts or fragments of the scanned mesh.
// Each manufactured component has its own complete surfaces and hinge origin.
await MeshoptEncoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder })
const manifest = JSON.parse(await readFile('src/data/mobileModels.json', 'utf8'))
const rows = [
  [['Esc', 1], ...Array.from({ length: 12 }, (_, i) => [`F${i + 1}`, 1]), ['Del', 1]],
  [['`', 1], ...'1234567890-='.split('').map(s => [s, 1]), ['Back', 1.7]],
  [['Tab', 1.45], ...'QWERTYUIOP[]'.split('').map(s => [s, 1]), ['\\', 1.25]],
  [['Caps', 1.7], ..."ASDFGHJKL;'".split('').map(s => [s, 1]), ['Enter', 1.85]],
  [['Shift', 2.1], ...'ZXCVBNM,./'.split('').map(s => [s, 1]), ['Shift', 2.35]],
  [['Ctrl', 1.2], ['Fn', 1], ['Alt', 1.2], ['Space', 6.6], ['Alt', 1.2], ['Left', 1], ['Up', 1], ['Down', 1], ['Right', 1]],
]
const glyphs = [...new Set(rows.flatMap(row => row.map(([label]) => label)))].filter(label => label !== 'Space')
const xml = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const atlas = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="512" viewBox="0 0 1024 512"><g fill="#d8e5db" font-family="Arial,sans-serif" font-size="21" text-anchor="middle">${glyphs.map((glyph, i) => `<text x="${(i % 16) * 64 + 32}" y="${Math.floor(i / 16) * 64 + 39}" font-size="${glyph.length > 2 ? 13 : 21}">${xml(glyph)}</text>`).join('')}</g></svg>`
const screen = `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="810" viewBox="0 0 1440 810">
  <rect width="1440" height="810" fill="#101b16"/>
  <g font-family="Arial,sans-serif"><path d="M62 112H1378" stroke="#344a3d" stroke-width="2"/>
  <circle cx="70" cy="64" r="8" fill="#c4e7cb"/><text x="98" y="74" fill="#e5eee4" font-size="28">Sta. Lucia LMS</text><text x="1378" y="72" text-anchor="end" fill="#a5b8a9" font-size="21">Project architecture</text>
  <text x="70" y="213" fill="#e5eee4" font-size="63" letter-spacing="-2">Connected by design.</text>
  <text x="72" y="262" fill="#afc2b3" font-size="25">An interface. Server-side logic. A structured foundation.</text>
  <g stroke="#789c84" stroke-width="3" fill="none"><path d="M395 446H525M915 446H1045"/><path d="m511 438 14 8-14 8m520-16 14 8-14 8"/></g>
  <g fill="#1a2b20" stroke="#4b6853" stroke-width="2"><rect x="70" y="340" width="325" height="235" rx="19"/><rect x="525" y="340" width="390" height="235" rx="19"/><rect x="1045" y="340" width="325" height="235" rx="19"/></g>
  <g fill="#c4e7cb" font-size="20"><text x="100" y="383">Interface</text><text x="555" y="383">Application</text><text x="1075" y="383">Database</text></g>
  <g fill="#e6eee3" font-size="38"><text x="100" y="457">React.js</text><text x="555" y="457">Node.js + Express</text><text x="1075" y="457">PostgreSQL</text></g>
  <g fill="#a9bcad" font-size="22"><text x="100" y="520">JavaScript / Daisy UI</text><text x="555" y="520">API / authentication / processing</text><text x="1075" y="520">Schema / queries / records</text></g>
  <path d="M70 660H1370" stroke="#344a3d" stroke-width="2"/><text x="72" y="710" fill="#9eb3a3" font-size="22">Conceptual architecture overview</text><text x="1370" y="710" text-anchor="end" fill="#c7dbcd" font-size="22">Vincent Del Rosario</text>
  </g></svg>`

function outline(width, depth, radius, cx = 0, cz = 0) {
  const x = cx - width / 2, z = cz - depth / 2, shape = new Shape()
  shape.moveTo(x + radius, z); shape.lineTo(x + width - radius, z); shape.quadraticCurveTo(x + width, z, x + width, z + radius)
  shape.lineTo(x + width, z + depth - radius); shape.quadraticCurveTo(x + width, z + depth, x + width - radius, z + depth)
  shape.lineTo(x + radius, z + depth); shape.quadraticCurveTo(x, z + depth, x, z + depth - radius)
  shape.lineTo(x, z + radius); shape.quadraticCurveTo(x, z, x + radius, z)
  return shape
}

for (const mobile of [false, true]) {
  const doc = new Document(), buffer = doc.createBuffer(), unlit = doc.createExtension(KHRMaterialsUnlit)
  const scene = doc.createScene('Project laptop'), collections = [new Map(), new Map(), new Map()]
  const materials = new Map()
  const material = (name, color, metalness = 0.2, roughness = 0.8) => {
    const m = doc.createMaterial(name).setBaseColorFactor(color).setMetallicFactor(metalness).setRoughnessFactor(roughness)
    materials.set(name, m); return name
  }
  const aluminum = material('Satin aluminum', [0.065, 0.09, 0.075, 1], 0.5)
  const edge = material('Machined edges', [0.18, 0.24, 0.20, 1], 0.65, 0.68)
  const bezel = material('Graphite bezel', [0.008, 0.014, 0.010, 1], 0.12)
  const keys = material('Sculpted keycaps', [0.014, 0.025, 0.018, 1], 0.05)
  const trackpad = material('Glass trackpad', [0.045, 0.065, 0.052, 1], 0.2)
  const pcb = material('Circuit substrate', [0.015, 0.055, 0.031, 1], 0.12)
  const traces = material('Copper connections', [0.56, 0.43, 0.22, 1], 0.65)
  const thermal = material('Thermal components', [0.033, 0.05, 0.039, 1], 0.5)
  const battery = material('Battery modules', [0.011, 0.020, 0.014, 1], 0.02)
  const screw = material('Fasteners', [0.24, 0.29, 0.26, 1], 0.7)
  const led = material('Indicator glass', [0.36, 0.66, 0.48, 1], 0.15)
  const screenBytes = await sharp(Buffer.from(screen)).resize(mobile ? 960 : 1440).png({ palette: true }).toBuffer()
  const glyphBytes = await sharp(Buffer.from(atlas)).resize(mobile ? 768 : 1024).png({ palette: true }).toBuffer()
  const displayTexture = doc.createTexture('Project architecture').setImage(screenBytes).setMimeType('image/png')
  const glyphTexture = doc.createTexture('Keyboard legends').setImage(glyphBytes).setMimeType('image/png')
  material('Display pixels', [1, 1, 1, 1]); materials.get('Display pixels').setBaseColorTexture(displayTexture).setExtension('KHR_materials_unlit', unlit.createUnlit())
  material('Key legends', [1, 1, 1, 1]); materials.get('Key legends').setBaseColorTexture(glyphTexture).setAlphaMode('MASK').setAlphaCutoff(0.3).setExtension('KHR_materials_unlit', unlit.createUnlit())
  const add = (part, name, geometry, position = [0, 0, 0], rotation = [0, 0, 0]) => {
    geometry.applyMatrix4(new Matrix4().compose(new Vector3(...position), new Quaternion().setFromEuler(new Euler(...rotation)), new Vector3(1, 1, 1)))
    geometry.clearGroups()
    if (geometry.index) { const expanded = geometry.toNonIndexed(); geometry.dispose(); geometry = expanded }
    if (!collections[part].has(name)) collections[part].set(name, [])
    collections[part].get(name).push(geometry)
  }
  const box = (part, name, dims, position, radius = 0.025) => add(part, name, new RoundedBoxGeometry(...dims, mobile ? 1 : 2, Math.min(radius, Math.min(...dims) * 0.45)), position)
  const cylinder = (part, name, radius, height, position, rotation = [0, 0, 0], sides = 20) => add(part, name, new CylinderGeometry(radius, radius, height, mobile ? Math.max(8, sides / 2) : sides), position, rotation)
  const extrude = (shape, depth) => new ExtrudeGeometry(shape, { depth, steps: 1, bevelEnabled: true, bevelSegments: mobile ? 1 : 2, bevelSize: 0.007, bevelThickness: 0.004, curveSegments: mobile ? 4 : 8 }).rotateX(Math.PI / 2)

  // Display is complete and pivots about its actual hinge, never a cut plane.
  box(0, aluminum, [3.58, 2.12, 0.085], [0, 1.06, -0.015], 0.065)
  box(0, bezel, [3.45, 1.99, 0.03], [0, 1.07, 0.034], 0.055)
  add(0, 'Display pixels', new PlaneGeometry(3.22, 1.811), [0, 1.073, 0.051])
  cylinder(0, bezel, 0.024, 0.009, [0, 2.045, 0.053], [Math.PI / 2, 0, 0], 20)
  cylinder(0, led, 0.012, 0.01, [0, 2.045, 0.059], [Math.PI / 2, 0, 0], 16)
  for (const x of [-1.22, 1.22]) box(0, edge, [0.42, 0.105, 0.10], [x, 0.015, -0.01])

  // The upper case has real openings for the keyboard well and trackpad.
  const deck = outline(3.6, 2.36, 0.13)
  deck.holes.push(outline(3.02, 1.24, 0.065, 0, -0.39), outline(1.25, 0.67, 0.055, 0, 0.78))
  add(1, aluminum, extrude(deck, 0.055))
  box(1, bezel, [3.015, 0.018, 1.235], [0, -0.018, -0.39], 0.055)
  box(1, trackpad, [1.20, 0.018, 0.62], [0, 0.002, 0.78], 0.045)
  rows.forEach((row, rowIndex) => {
    const unit = 2.88 / row.reduce((sum, [, width]) => sum + width, 0)
    let x = -1.44
    for (const [label, width] of row) {
      const keyWidth = unit * width - 0.023, z = -0.9 + rowIndex * 0.20
      box(1, keys, [keyWidth, 0.035, rowIndex === 0 ? 0.115 : 0.155], [x + unit * width / 2, 0.012, z], 0.018)
      const glyphIndex = glyphs.indexOf(label)
      if (glyphIndex >= 0) {
        const plane = new PlaneGeometry(Math.min(0.12, keyWidth * 0.8), 0.10), uv = plane.attributes.uv
        const col = glyphIndex % 16, line = Math.floor(glyphIndex / 16)
        for (let i = 0; i < uv.count; i++) uv.setXY(i, (col + uv.getX(i)) / 16, 1 - (line + 1 - uv.getY(i)) / 8)
        add(1, 'Key legends', plane, [x + unit * width / 2, 0.0305, z], [-Math.PI / 2, 0, 0])
      }
      x += unit * width
    }
  })
  for (const x of [-1.61, 1.61]) for (let slot = 0; slot < 18; slot++) box(1, bezel, [0.065, 0.006, 0.018], [x, 0.002, -0.86 + slot * 0.061], 0.007)
  cylinder(1, bezel, 0.05, 0.01, [1.61, 0.007, -1.04])
  cylinder(1, led, 0.017, 0.012, [1.61, 0.01, -1.04], [0, 0, 0], 16)

  // The lower case is a hollow tray. Internals are revealed when the deck lifts.
  box(2, aluminum, [3.6, 0.045, 2.36], [0, 0, 0], 0.075)
  const tray = outline(3.6, 2.36, 0.13); tray.holes.push(outline(3.43, 2.19, 0.10))
  add(2, aluminum, extrude(tray, 0.13), [0, 0.13, 0])
  for (const x of [-1.22, 1.22]) cylinder(2, edge, 0.065, 0.48, [x, 0.14, -1.03], [0, 0, Math.PI / 2])
  for (const x of [-1.57, 1.57]) for (const z of [-0.94, 0.94]) {
    cylinder(2, screw, 0.026, 0.009, [x, -0.027, z], [0, 0, 0], 12)
    box(2, bezel, [0.33, 0.024, 0.09], [x * 0.90, -0.039, z], 0.035)
  }
  for (let i = 0; i < 15; i++) box(2, bezel, [0.055, 0.006, 0.28], [-0.9 + i * 0.13, -0.024, -0.6], 0.012)
  box(2, pcb, [3.15, 0.025, 1.05], [0, 0.06, -0.45], 0.06)
  box(2, thermal, [0.46, 0.045, 0.42], [0.05, 0.095, -0.5], 0.015)
  box(2, edge, [0.34, 0.012, 0.30], [0.05, 0.124, -0.5], 0.012)
  for (let ram = 0; ram < 2; ram++) {
    box(2, pcb, [0.68, 0.018, 0.17], [0.78, 0.09, -0.70 + ram * 0.28], 0.008)
    for (let chip = 0; chip < 4; chip++) box(2, bezel, [0.115, 0.024, 0.12], [0.54 + chip * 0.16, 0.112, -0.70 + ram * 0.28], 0.006)
  }
  box(2, pcb, [0.68, 0.022, 0.18], [0.65, 0.09, -0.12], 0.015)
  box(2, bezel, [0.27, 0.025, 0.13], [0.62, 0.113, -0.12], 0.008)
  cylinder(2, screw, 0.025, 0.01, [0.95, 0.11, -0.12], [0, 0, 0], 12)
  cylinder(2, thermal, 0.35, 0.07, [-1.0, 0.105, -0.53], [0, 0, 0], 32)
  cylinder(2, bezel, 0.29, 0.075, [-1.0, 0.11, -0.53], [0, 0, 0], 28)
  cylinder(2, edge, 0.072, 0.08, [-1.0, 0.115, -0.53])
  for (let blade = 0; blade < 11; blade++) {
    const angle = blade / 11 * Math.PI * 2
    add(2, thermal, new BoxGeometry(0.24, 0.022, 0.046), [-1 + Math.cos(angle) * 0.16, 0.15, -0.53 + Math.sin(angle) * 0.16], [0, -angle + 0.5, 0])
  }
  box(2, traces, [0.63, 0.025, 0.065], [-0.46, 0.12, -0.52], 0.025)
  for (let fin = 0; fin < 13; fin++) box(2, thermal, [0.035, 0.05, 0.28], [-0.65 + fin * 0.08, 0.13, -0.88], 0.005)
  for (let cell = 0; cell < 3; cell++) {
    box(2, battery, [0.98, 0.067, 0.83], [-1.03 + cell * 1.03, 0.07, 0.66], 0.035)
    box(2, thermal, [0.76, 0.006, 0.025], [-1.03 + cell * 1.03, 0.106, 0.66], 0.008)
  }
  for (let line = 0; line < 7; line++) {
    box(2, traces, [0.32, 0.003, 0.009], [-0.22 + line * 0.027, 0.078, -0.20 + line * 0.025], 0.001)
  }
  for (const x of [-1.805, 1.805]) {
    box(2, bezel, [0.012, 0.051, 0.20], [x, 0.074, -0.55], 0.018)
    box(2, bezel, [0.012, 0.059, 0.29], [x, 0.074, -0.06], 0.014)
    box(2, edge, [0.013, 0.008, 0.20], [x * 1.002, 0.06, -0.06], 0.001)
  }

  const components = [
    { name: 'Display assembly', position: [0, -0.62, -0.84], rotation: [-0.20, 0, 0], anchor: [0, 1.1, 0.052] },
    { name: 'Keyboard and trackpad deck', position: [0, -0.62, 0.2], rotation: [0, 0, 0], anchor: [0, 0.035, -0.4] },
    { name: 'Lower chassis and internals', position: [0, -0.82, 0.2], rotation: [0, 0, 0], anchor: [0.25, 0.10, 0.2] },
  ]
  let triangles = 0
  components.forEach((component, part) => {
    const mesh = doc.createMesh(component.name)
    for (const [name, geometries] of collections[part]) {
      const geometry = mergeGeometries(geometries, false)
      const primitive = doc.createPrimitive().setMaterial(materials.get(name))
      for (const [semantic, key] of [['POSITION', 'position'], ['NORMAL', 'normal'], ['TEXCOORD_0', 'uv']]) {
        const attribute = geometry.attributes[key]
        const values = new Float32Array(attribute.array)
        if (key === 'uv') for (let i = 1; i < values.length; i += 2) values[i] = 1 - values[i]
        primitive.setAttribute(semantic, doc.createAccessor(`${component.name} ${key}`).setType(key === 'uv' ? 'VEC2' : 'VEC3').setArray(values).setBuffer(buffer))
      }
      triangles += geometry.attributes.position.count / 3
      mesh.addPrimitive(primitive); geometry.dispose(); geometries.forEach(g => g.dispose())
    }
    const q = new Quaternion().setFromEuler(new Euler(...component.rotation))
    const pivot = doc.createNode(component.name).setTranslation(component.position).setRotation(q.toArray()).setExtras({ projectPiece: part, projectAnchor: component.anchor, physicalComponent: component.name })
    pivot.addChild(doc.createNode(`${component.name} surfaces`).setMesh(mesh))
    scene.addChild(pivot)
  })
  scene.setExtras({ physicalAssembly: true, components: components.map(c => c.name) })
  await doc.transform(weld(), dedup(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'high' }))
  const bytes = await io.writeBinary(doc), hash = createHash('sha256').update(bytes).digest('hex').slice(0, 10)
  const filename = mobile ? `project-laptop-${hash}.glb` : 'project-laptop.glb'
  await writeFile(`public/models/${mobile ? 'mobile/' : ''}${filename}`, bytes)
  if (mobile) manifest['project-laptop'] = filename
  if (!mobile) {
    const registry = JSON.parse(await readFile('public/models/report.json', 'utf8'))
    const entry = registry.find(item => item.id === 'project-laptop')
    delete entry.sourceBytes; delete entry.sourceTriangles
    Object.assign(entry, { source: 'Constructed physical assembly', webBytes: bytes.byteLength, webTriangles: triangles, nodes: components.map(component => component.name), animations: [], textures: doc.getRoot().listTextures().map(texture => ({ size: texture.getSize(), mime: texture.getMimeType() })) })
    await writeFile('public/models/report.json', JSON.stringify(registry, null, 2) + '\n')
  }
  const report = { profile: mobile ? 'mobile' : 'desktop', bytes: bytes.byteLength, triangles, components: components.map(c => c.name) }
  await mkdir('artifacts/laptop', { recursive: true }); await writeFile(`artifacts/laptop/${report.profile}.json`, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
}
await writeFile('src/data/mobileModels.json', JSON.stringify(manifest, null, 2) + '\n')
