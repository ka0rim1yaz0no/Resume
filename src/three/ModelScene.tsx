import { lazy, Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Box3, Group, Material, MathUtils, Mesh, Vector3, ACESFilmicToneMapping } from 'three'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { PMREMGenerator } from 'three'
import { modelRegistry, type ModelId } from '../data/assets'
import { cloneStudioMaterial, studioLighting } from './studioMaterials'
import { StudioLights } from './StudioLights'

const Effects = lazy(() => import('./Effects'))
const sceneQuality = { dpr: 1.5, postprocessing: false }

function StudioLight() {
  const { gl, scene, invalidate } = useThree()
  useEffect(() => {
    const generator = new PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const target = generator.fromScene(room, 0.04)
    scene.environment = target.texture
    scene.environmentIntensity = studioLighting.environment
    invalidate()
    return () => { scene.environment = null; target.dispose(); room.dispose(); generator.dispose() }
  }, [gl, scene, invalidate])
  return <StudioLights />
}

function ContextEvents({ onContextLost }: { onContextLost: () => void }) {
  const { gl } = useThree()
  useEffect(() => {
    const canvas = gl.domElement
    canvas.setAttribute('aria-hidden', 'true')
    canvas.addEventListener('webglcontextlost', onContextLost)
    return () => canvas.removeEventListener('webglcontextlost', onContextLost)
  }, [gl, onContextLost])
  return null
}

function Model({ id, active, motion, turn, reset, onReady, scrollProgress }: { id: ModelId; active: boolean; motion: boolean; turn: number; reset: number; onReady: () => void; scrollProgress?: { current: number } }) {
  const entry = modelRegistry[id]
  const { scene } = useGLTF(entry.url, false, false, loader => loader.setMeshoptDecoder(MeshoptDecoder))
  const group = useRef<Group>(null)
  const elapsed = useRef(0)
  const { invalidate, gl } = useThree()
  const normalized = useMemo(() => {
    const clone = scene.clone(true)
    const box = new Box3().setFromObject(clone)
    const center = box.getCenter(new Vector3())
    const size = box.getSize(new Vector3())
    const scale = entry.scale / Math.max(size.x, size.y, size.z)
    clone.position.sub(center)
    const materials: Material[] = []
    clone.traverse(object => {
      if (!(object instanceof Mesh)) return
      const copy = (source: Material) => { const owned = cloneStudioMaterial(source); materials.push(owned); return owned }
      object.material = Array.isArray(object.material) ? object.material.map(copy) : copy(object.material)
    })
    return { clone, scale, materials }
  }, [scene, entry.scale])
  useEffect(() => () => normalized.materials.forEach(material => material.dispose()), [normalized])
  useEffect(() => { onReady(); gl.domElement.dataset.model = id; invalidate() }, [onReady, gl, id, invalidate])
  useEffect(() => { elapsed.current = 0; invalidate() }, [reset, id, invalidate])
  useEffect(() => { invalidate() }, [active, motion, turn, invalidate])
  useFrame((state, delta) => {
    if (!group.current) return
    if (active && motion) elapsed.current += Math.min(delta, 0.05)
    const t = elapsed.current
    const pointer = motion && active ? state.pointer : { x: 0, y: 0 }
    const scroll = motion ? scrollProgress?.current || 0 : 0
    const targetY = entry.rotation[1] + turn + scroll * 0.7 + (motion ? Math.sin(t * 0.28) * 0.11 + pointer.x * 0.12 : 0)
    const targetX = entry.rotation[0] + scroll * 0.06 + (motion ? pointer.y * -0.055 : 0)
    group.current.rotation.y = MathUtils.damp(group.current.rotation.y, targetY, 5, delta)
    group.current.rotation.x = MathUtils.damp(group.current.rotation.x, targetX, 5, delta)
    group.current.position.y = (motion ? Math.sin(t * 0.5) * 0.035 : 0) - scroll * 0.12
    gl.domElement.dataset.triangles = String(gl.info.render.triangles)
    gl.domElement.dataset.scrollProgress = scroll.toFixed(3)
    if (active && (motion || Math.abs(group.current.rotation.y - targetY) > 0.0001 || Math.abs(group.current.rotation.x - targetX) > 0.0001)) invalidate()
  })
  return <group ref={group} rotation={entry.rotation}><group scale={normalized.scale}><primitive object={normalized.clone} dispose={null} /></group></group>
}

export default function ModelScene({ id, active, motion, turn, reset, onReady, onContextLost, scrollProgress }: { id: ModelId; active: boolean; motion: boolean; turn: number; reset: number; onReady: () => void; onContextLost: () => void; scrollProgress?: { current: number } }) {
  return <Canvas
    dpr={[1, sceneQuality.dpr]} frameloop="demand"
    camera={{ position: id === 'project-laptop' ? [0.5, 1.9, 6.7] : [0, 0.15, 6.7], fov: 35, near: 0.1, far: 50 }}
    gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', toneMapping: ACESFilmicToneMapping }}
    style={{ touchAction: 'pan-y' }}
  >
    <StudioLight />
    <ContextEvents onContextLost={onContextLost} />
    <Suspense fallback={null}><Model id={id} active={active} motion={motion} turn={turn} reset={reset} onReady={onReady} scrollProgress={scrollProgress} /></Suspense>
    {sceneQuality.postprocessing && <Suspense fallback={null}><Effects /></Suspense>}
  </Canvas>
}
