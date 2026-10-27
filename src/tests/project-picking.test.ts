import { describe, expect, it } from 'vitest'
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, Vector3 } from 'three'
import { createProjectPicker } from '../three/projectPicking'
import { createProjectTap } from '../three/projectInteraction'

const viewport = { left: 60, top: 90, width: 320, height: 240 }
function fixture() {
  const camera = new PerspectiveCamera(35, viewport.width / viewport.height, 0.1, 40)
  camera.position.set(0, 0, 6); camera.lookAt(0, 0, 0); camera.updateMatrixWorld()
  const geometry = new BoxGeometry(0.7, 0.4, 0.3), material = new MeshBasicMaterial()
  const root = new Group()
  const parts = [0, 1, 2].map(index => {
    const object = new Group(); object.position.set((index - 1) * 1.2, (1 - index) * 0.8, 0)
    object.add(new Mesh(geometry, material)); root.add(object)
    return { object, index }
  })
  const project = (point: Vector3) => {
    const p = point.clone().project(camera)
    return { clientX: viewport.left + (p.x + 1) * viewport.width / 2, clientY: viewport.top + (1 - p.y) * viewport.height / 2, pointerType: 'mouse' }
  }
  return { camera, geometry, parts, root, material, project, dispose() { geometry.dispose(); material.dispose() } }
}

describe('Direct laptop component picking', () => {
  it('maps actual nested meshes to their part across an offset viewport without moving the camera', () => {
    const f = fixture(), pick = createProjectPicker(f.parts), position = f.camera.position.clone(), projection = f.camera.projectionMatrix.clone()
    f.root.rotation.y = 0.15; f.root.scale.setScalar(0.9); f.root.updateMatrixWorld(true)
    for (const part of f.parts) expect(pick(f.project(part.object.getWorldPosition(new Vector3())), viewport, f.camera)).toBe(part.index)
    expect(f.camera.position).toEqual(position); expect(f.camera.projectionMatrix).toEqual(projection)
    expect(pick({ clientX: 61, clientY: 91, pointerType: 'mouse' }, viewport, f.camera)).toBeNull()
    expect(pick({ clientX: 59, clientY: 210, pointerType: 'mouse' }, viewport, f.camera)).toBeNull()
    f.dispose()
  })

  it('selects the front surface when components overlap, independently of array order', () => {
    const f = fixture()
    f.parts[0].object.position.set(0, 0, 1); f.parts[1].object.position.set(3, 0, 0); f.parts[2].object.position.set(0, 0, 0)
    f.root.updateMatrixWorld(true)
    const pick = createProjectPicker([...f.parts].reverse())
    expect(pick(f.project(new Vector3()), viewport, f.camera)).toBe(0)
    f.dispose()
  })

  it('gives touch a small allowance on real surfaces while leaving distant background unselected', () => {
    const f = fixture()
    f.parts[0].object.position.set(-3, 0, 0); f.parts[2].object.position.set(3, 0, 0)
    f.parts[1].object.scale.y = 0.2
    const pick = createProjectPicker(f.parts), point = f.project(new Vector3())
    point.clientY -= 7
    expect(pick(point, viewport, f.camera)).toBeNull()
    expect(pick({ ...point, pointerType: 'touch' }, viewport, f.camera)).toBe(1)
    expect(pick({ ...point, clientY: point.clientY - 40, pointerType: 'touch' }, viewport, f.camera)).toBeNull()
    f.dispose()
  })
})

const pointer = { pointerId: 1, clientX: 100, clientY: 100, button: 0, isPrimary: true, pointerType: 'touch' }
describe('Tap and scroll separation', () => {
  it('accepts a deliberate tap but rejects drags, scrolling and cancelled gestures', () => {
    const tap = createProjectTap()
    tap.begin(pointer, 200)
    expect(tap.end({ ...pointer, clientX: 103 }, 200)).toEqual({ clientX: 103, clientY: 100, pointerType: 'touch' })
    tap.begin(pointer, 200); tap.move({ ...pointer, clientY: 120 }); tap.move(pointer)
    expect(tap.end(pointer, 200)).toBeNull()
    tap.begin(pointer, 200)
    expect(tap.end(pointer, 210)).toBeNull()
    tap.begin(pointer, 200); tap.cancel()
    expect(tap.end(pointer, 200)).toBeNull()
  })

  it('rejects secondary clicks and multiple fingers', () => {
    const tap = createProjectTap()
    tap.begin({ ...pointer, button: 2 }, 0)
    expect(tap.end({ ...pointer, button: 2 }, 0)).toBeNull()
    tap.begin(pointer, 0); tap.begin({ ...pointer, pointerId: 2, isPrimary: false }, 0)
    expect(tap.end(pointer, 0)).toBeNull()
  })
})
