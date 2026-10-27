import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { Group, Material, Mesh } from 'three'
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js'
import { technologyIcon, technologyVisuals } from '../data/technologies'
import { sampleSurface, type SurfaceTargets } from './surfaceCloud'
import { buildSkillEmblem, createSkillBody } from './skillGeometry'
import { studioEdgeFinish, studioFade, studioFinish, studioPalette } from './studioMaterials'

gsap.registerPlugin(useGSAP)
const finish = { ...studioFade, roughness: studioFinish.roughness, metalness: studioFinish.metalness, envMapIntensity: studioFinish.envMapIntensity }

function Emblem({ technology, active, targetRoot, targets, onEmblemReady }: { technology: string; active: boolean; targetRoot: React.RefObject<Group | null>; targets: SurfaceTargets; onEmblemReady: (name: string, ready: boolean) => void }) {
  const data = useLoader(SVGLoader, technologyIcon(technology))
  const group = useRef<Group>(null)
  const parts = useMemo(() => buildSkillEmblem(data, technologyVisuals[technology].accent), [data, technology])
  const { gl } = useThree()
  useEffect(() => () => parts.forEach(part => part.geometry.dispose()), [parts])
  useEffect(() => {
    if (!targetRoot.current || !group.current) return
    const surface = sampleSurface(targetRoot.current, group.current, targets.pointCount)
    const body = targetRoot.current.getObjectByName('token-body')
    if (body) {
      const backing = sampleSurface(targetRoot.current, body, targets.pointCount)
      // Keep a quarter of the cloud on the rounded body, and concentrate the
      // rest on the actual raised mark, including the incoming silhouette.
      for (let i = 0; i < surface.points.length; i += 12) surface.points.set(backing.points.subarray(i, i + 3), i)
    }
    targets.set(active ? 4 : 5, surface)
    gl.domElement.dataset.emblemGeometry = 'beveled-extrusion'
    gl.domElement.dataset.emblemTriangles = String(parts.reduce((n, part) => n + (part.geometry.index?.count || part.geometry.attributes.position.count) / 3, 0))
    onEmblemReady(technology, true)
    return () => { onEmblemReady(technology, false) }
  }, [technology, active, targetRoot, targets, parts, gl, onEmblemReady])
  return <group ref={group} position={[0, 0.04, 0]} visible={active}>
    {parts.map((part, index) => <mesh key={index} geometry={part.geometry} name="raised-emblem" renderOrder={2 + index}>
      <meshStandardMaterial attach="material-0" {...finish} color={part.color} />
      <meshStandardMaterial attach="material-1" {...finish} {...studioEdgeFinish} color={part.edge} />
    </mesh>)}
  </group>
}

export function SkillToken({ technology, requestedTechnology, motion, visibility, targets, onEmblemReady }: { technology: string; requestedTechnology: string; motion: boolean; visibility: { weight: number }; targets: SurfaceTargets; onEmblemReady: (name: string, ready: boolean) => void }) {
  const root = useRef<Group>(null)
  const body = useMemo(createSkillBody, [])
  const { invalidate } = useThree()
  useEffect(() => () => body.dispose(), [body])
  useGSAP(() => {
    if (!root.current) return
    if (!motion) { root.current.rotation.y = 0.16; invalidate(); return }
    gsap.fromTo(root.current.rotation, { y: -0.18 }, { y: 0.16, duration: 0.65, ease: 'sine.out', onUpdate: invalidate })
  }, { dependencies: [technology, motion], revertOnUpdate: true })
  useEffect(() => { invalidate() }, [technology, invalidate])
  useEffect(() => {
    if (root.current && !targets.has(4)) targets.set(4, sampleSurface(root.current, root.current, targets.pointCount))
    return () => { targets.delete(4); targets.delete(5); targets.delete(6) }
  }, [targets])
  useFrame(() => {
    if (!root.current) return
    const weight = visibility.weight
    root.current.visible = weight > 0.001
    root.current.traverse(object => {
      if (!(object instanceof Mesh)) return
      const apply = (material: Material) => { material.opacity = weight }
      if (Array.isArray(object.material)) object.material.forEach(apply)
      else apply(object.material)
    })
  })
  return <group ref={root} rotation={[0.055, 0.16, 0]}>
    <mesh name="token-body" geometry={body}>
      <meshStandardMaterial attach="material-0" {...finish} color={studioPalette.body} />
      <meshStandardMaterial attach="material-1" {...finish} {...studioEdgeFinish} color={studioPalette.edge} />
    </mesh>
    {[...new Set([technology, requestedTechnology])].filter(name => name !== 'React.js').map(name => <Suspense key={name} fallback={null}>
      <Emblem technology={name} active={name === technology} targetRoot={root} targets={targets} onEmblemReady={onEmblemReady} />
    </Suspense>)}
  </group>
}
