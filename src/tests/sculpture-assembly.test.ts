import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, Vector3 } from 'three'
import { assemblyPieceCount, assemblyPose, assemblyTurn, bindSculptureAssembly, magneticShake, openingCompanion, openingPhase } from '../three/sculptureAssembly'
import { openingCamera } from '../three/choreography'
import { createSceneFramer } from '../three/cameraFraming'
import mobileModels from '../data/mobileModels.json'
import { bindProjectAssembly } from '../three/projectAssembly'

describe('Sculpture assembly', () => {
  it('leaves another model’s cut surfaces under their own rig’s control', () => {
    const root = new Group(), geometry = new BoxGeometry(), material = new MeshBasicMaterial(), cap = new Mesh(geometry, material)
    geometry.userData.assemblyCap = true; root.add(cap)
    bindSculptureAssembly(root).update(0, false)
    bindProjectAssembly(root).update(0, false)
    expect(cap.visible).toBe(true)
    geometry.dispose(); material.dispose()
  })
  it('ships seven independently pivoted cuts in both asset profiles', () => {
    for (const file of ['public/models/systems-sculpture.glb', `public/models/mobile/${mobileModels['systems-sculpture']}`]) {
      const glb = readFileSync(file)
      const json = JSON.parse(glb.toString('utf8', 20, 20 + glb.readUInt32LE(12)))
      const pieces = json.nodes.filter((node: { extras?: { assemblyPiece?: number } }) => node.extras?.assemblyPiece !== undefined)
      expect(pieces.map((node: { extras: { assemblyPiece: number } }) => node.extras.assemblyPiece).sort()).toEqual([0, 1, 2, 3, 4, 5, 6])
      expect(pieces.every((node: { mesh?: number; translation?: number[] }) => node.mesh !== undefined && node.translation?.length === 3)).toBe(true)
    }
  })

  it('locks the base before the display and returns every cut to its exact original pose', () => {
    expect(assemblyPose(0, 0.6, false).assembled).toBe(1)
    expect(assemblyPose(6, 0.6, false).assembled).toBeLessThan(0.82)
    for (let index = 0; index < assemblyPieceCount; index++) {
      expect(assemblyPose(index, 0, false)).toEqual({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, assembled: 1 })
      let prior = 0
      for (let step = 0; step <= 100; step++) {
        const pose = assemblyPose(index, 1 - step / 100, false)
        expect(Object.values(pose).every(Number.isFinite)).toBe(true)
        expect(pose.assembled).toBeGreaterThanOrEqual(prior)
        prior = pose.assembled
      }
    }
    expect(assemblyTurn(0)).toEqual({ rx: 0, ry: 0, rz: 0 })
    expect(openingCompanion(1)).toBe(0)
    expect(openingCompanion(0.3)).toBe(0)
    expect(openingCompanion(0)).toBe(1)
  })

  it('updates owned clone pivots without accumulating movement or modifying the cached asset', () => {
    const original = new Group()
    for (let index = 0; index < assemblyPieceCount; index++) {
      const piece = new Group(); piece.userData.assemblyPiece = index; piece.position.set(index * 0.1, index * 0.2, 0)
      original.add(piece)
    }
    const clone = original.clone(true), rig = bindSculptureAssembly(clone)
    expect(rig.count).toBe(7)
    for (const progress of [1, 0.5, 0.8, 1, 0.2, 0]) rig.update(progress, false)
    clone.children.forEach((piece, i) => {
      expect(piece.position.equals(original.children[i].position)).toBe(true)
      expect(piece.rotation.toArray()).toEqual([0, 0, 0, 'XYZ'])
    })
    expect(original.children[6].position.y).toBeCloseTo(1.2)
  })

  it('catches an incoming piece near its joint before the final magnetic connection', () => {
    const caught = assemblyPose(6, 0.5, false)
    expect(caught.assembled).toBeCloseTo(0.82)
    expect(assemblyPose(6, 0.46, false)).toEqual(caught)
    expect(assemblyPose(6, 0.4, false).assembled).toBeGreaterThan(caught.assembled)
    expect(assemblyPose(6, 0.27, false)).toEqual({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, assembled: 1 })
  })

  it('receives fragments from every screen edge and settles the magnetic impact before docking', () => {
    expect(assemblyPose(0, 1, false).y).toBeLessThan(-4)
    expect(assemblyPose(1, 1, false).x).toBeLessThan(-6)
    expect(assemblyPose(2, 1, false).y).toBeGreaterThan(4)
    expect(assemblyPose(3, 1, false).x).toBeGreaterThan(6)
    for (const p of [0, 0.1, 0.25, 0.4, 0.8, 1]) expect(magneticShake(p, false)).toEqual({ x: 0, y: 0 })
    expect(Math.abs(magneticShake(0.345, false).x)).toBeGreaterThan(0.01)
    for (let step = 0; step <= 100; step++) {
      const shake = magneticShake(step / 100, false)
      expect(Math.hypot(shake.x, shake.y)).toBeLessThan(0.028)
    }
  })

  it('finishes all magnetic connections before the camera and viewport leave the centre', () => {
    for (const compact of [false, true]) {
      for (let index = 0; index < assemblyPieceCount; index++) {
        expect(assemblyPose(index, 0.25, compact)).toEqual({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, assembled: 1 })
      }
      expect(magneticShake(0.25, compact)).toEqual({ x: 0, y: 0 })
    }
    expect(openingPhase(0.8)).toBe('gathering')
    expect(openingPhase(0.35)).toBe('magnetizing')
    expect(openingPhase(0.25)).toBe('assembled')
    expect(openingPhase(0.1)).toBe('landing')
  })

  it('fits the complete sculpture after the impact and throughout its hero handoff', () => {
    const root = new Group(), material = new MeshBasicMaterial(), geometry = new BoxGeometry(0.9, 0.38, 1.3)
    for (let index = 0; index < assemblyPieceCount; index++) {
      const piece = new Mesh(geometry, material); piece.userData.assemblyPiece = index
      piece.position.set(index > 3 ? 0 : (index - 1.5) * 0.6, -1.2 + index * 0.37, 0); root.add(piece)
    }
    const rig = bindSculptureAssembly(root), fit = createSceneFramer()
    for (const aspect of [0.75, 960 / 760, 1.6]) {
      const camera = new PerspectiveCamera(35, aspect, 0.1, 40)
      for (let step = 0; step <= 30; step++) {
        const opening = 0.23 * (1 - step / 30), shot = openingCamera(opening, aspect < 1)
        rig.update(opening, aspect < 1)
        camera.position.set(shot.x, shot.y, shot.z); camera.fov = shot.fov; camera.lookAt(shot.lookX, shot.lookY, 0); camera.updateProjectionMatrix()
        fit(root, camera, aspect, 1 / 60)
        for (const piece of root.children) for (let corner = 0; corner < 8; corner++) {
          const box = geometry.boundingBox!
          const p = new Vector3(corner & 1 ? box.max.x : box.min.x, corner & 2 ? box.max.y : box.min.y, corner & 4 ? box.max.z : box.min.z).applyMatrix4(piece.matrixWorld).project(camera)
          expect(Math.abs(p.x)).toBeLessThanOrEqual(0.931)
          expect(Math.abs(p.y)).toBeLessThanOrEqual(0.931)
        }
      }
    }
    geometry.dispose(); material.dispose()
  })
})
