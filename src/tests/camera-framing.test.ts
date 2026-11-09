import { describe, expect, it } from 'vitest'
import { Box3, BoxGeometry, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, Vector3, type Matrix4 } from 'three'
import { cameraRetreat, createSceneFramer } from '../three/cameraFraming'
import { skillFrameBounds } from '../three/skillFraming'

function expectInside(camera: PerspectiveCamera, box: Box3, world?: Matrix4) {
  for (let i = 0; i < 8; i++) {
    const point = new Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z)
    if (world) point.applyMatrix4(world)
    point.project(camera)
    expect(Math.abs(point.x)).toBeLessThanOrEqual(0.931)
    expect(Math.abs(point.y)).toBeLessThanOrEqual(0.931)
    expect(point.z).toBeLessThan(1)
  }
}

describe('Full model framing', () => {
  it('holds one camera frame while skill solids dissolve, change identity, and return', () => {
    const react = new Mesh(new BoxGeometry(3.6, 3.4, 0.8), new MeshBasicMaterial())
    const token = new Mesh(new BoxGeometry(3.36, 3.36, 0.85), new MeshBasicMaterial())
    token.position.z = 0.175
    const tokenTurn = new Group(); tokenTurn.add(token)
    const tile = new Group(); tile.add(react, tokenTurn)
    tile.rotation.set(0.04, 0.1, -0.04); tile.scale.setScalar(1.02)
    react.geometry.computeBoundingBox(); token.geometry.computeBoundingBox()
    tile.userData.frameBounds = skillFrameBounds(react.geometry.boundingBox!)
    for (const aspect of [0.65, 1, 1.8, 2.4]) {
      const camera = new PerspectiveCamera(35, aspect, 0.1, 40), fit = createSceneFramer()
      let previous: Vector3 | undefined
      for (const [reactVisible, tokenVisible, yaw] of [[true, false, 0], [false, false, 0], [false, true, -0.18], [false, true, 0.16], [true, false, 0]] as const) {
        react.visible = reactVisible; tokenTurn.visible = tokenVisible; tokenTurn.rotation.set(0.055, yaw, 0)
        camera.position.set(-0.072, 0.18, 6.9); camera.lookAt(0, 0, 0)
        fit(tile, camera, aspect, 1 / 60)
        if (previous) expect(camera.position.distanceTo(previous)).toBeLessThan(0.000001)
        previous = camera.position.clone()
        if (reactVisible) expectInside(camera, react.geometry.boundingBox!, react.matrixWorld)
        if (tokenVisible) expectInside(camera, token.geometry.boundingBox!, token.matrixWorld)
      }
    }
    react.geometry.dispose(); token.geometry.dispose(); react.material.dispose(); token.material.dispose()
  })
  it('keeps the opening destination large while fragments arrive from off screen, then restores full fitting', () => {
    const root = new Group(), geometry = new BoxGeometry(1, 1, 1), material = new MeshBasicMaterial(), fragment = new Mesh(geometry, material)
    fragment.position.x = 8; root.add(fragment)
    root.userData.openingFrameBounds = new Box3(new Vector3(-1.85, -1.3, -0.8), new Vector3(1.85, 1.3, 0.8))
    const camera = new PerspectiveCamera(35, 1, 0.1, 40), fit = createSceneFramer()
    camera.position.set(0, 0.15, 6.7); camera.lookAt(0, 0, 0)
    expect(fit(root, camera, 1, 1 / 60)).toBeLessThan(2)
    delete root.userData.openingFrameBounds
    camera.position.set(0, 0.15, 6.7); camera.lookAt(0, 0, 0)
    expect(fit(root, camera, 1, 1 / 60)).toBeGreaterThan(10)
    expectInside(camera, geometry.boundingBox!, fragment.matrixWorld)
    geometry.dispose(); material.dispose()
  })
  it('keeps the entire composition inside phone and desktop frames at maximum zoom', () => {
    const bounds = new Box3(new Vector3(-2.1, -1.9, -0.9), new Vector3(2.8, 2.0, 0.8))
    for (const aspect of [0.65, 1, 1.6]) {
      const camera = new PerspectiveCamera(35, aspect, 0.1, 40)
      camera.position.set(0.24, 0.18, 5.6); camera.lookAt(0, 0, 0)
      const required = cameraRetreat(camera, bounds, aspect)
      camera.position.addScaledVector(camera.getWorldDirection(new Vector3()), -required)
      camera.updateMatrixWorld()
      expectInside(camera, bounds)
    }
  })
  it('follows arbitrary user rotation and ignores hidden models from other sections', () => {
    const root = new Group(), visible = new Mesh(new BoxGeometry(3.7, 2.8, 1.5), new MeshBasicMaterial())
    const hidden = new Mesh(new BoxGeometry(100, 100, 100), new MeshBasicMaterial()); hidden.visible = false
    root.add(visible, hidden)
    const fit = createSceneFramer()
    const camera = new PerspectiveCamera(35, 0.9, 0.1, 40)
    for (const yaw of [0, 0.8, 1.7, 3.2]) {
      visible.rotation.set(0.7, yaw, -0.1)
      camera.position.set(0.1, 0.18, 5.6); camera.lookAt(0, 0, 0)
      const distance = fit(root, camera, 0.9, 1 / 60)
      expect(distance).toBeLessThan(10)
      expectInside(camera, visible.geometry.boundingBox!, visible.matrixWorld)
    }
    visible.geometry.dispose(); hidden.geometry.dispose(); visible.material.dispose(); hidden.material.dispose()
  })
})
