import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useTexture } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Group, Material, Mesh, SRGBColorSpace } from 'three'
import { organizations } from '../data/organizations'
import { contentPose, type ContentRoute } from './contentChoreography'
import { organizationPose } from './experienceChoreography'
import { assistlyRibbon, knowlesGlobe, syntaxGear } from './organizationGeometry'
import { sampleSurface, type SurfaceTargets } from './surfaceCloud'
import { studioFinish, studioGold } from './studioMaterials'

export type IdentityScore = { active: boolean; elapsed: number; content: ContentRoute; organizationFocus: number; organizationDissolve: number; dissolve: number; organizationExploration: { yaw: number; pitch: number; zoom: number }[] }
const finish = { roughness: studioFinish.roughness, metalness: studioFinish.metalness, envMapIntensity: studioFinish.envMapIntensity, transparent: true }

function SyntaxFace({ geometry }: { geometry: ReturnType<typeof syntaxGear>['face'] }) {
  const source = useTexture(organizations[2].logo)
  const texture = useMemo(() => {
    const t = source.clone(); t.colorSpace = SRGBColorSpace
    t.repeat.set(0.72, 0.72); t.offset.set(0.14, 0.14); t.needsUpdate = true
    return t
  }, [source])
  useEffect(() => () => texture.dispose(), [texture])
  return <>
    <mesh geometry={geometry} position={[0, 0, 0.112]}><meshStandardMaterial {...finish} map={texture} /></mesh>
    <mesh geometry={geometry} position={[0, 0, -0.112]} rotation={[0, Math.PI, 0]}><meshStandardMaterial {...finish} map={texture} /></mesh>
  </>
}

function Identity({ index, score, targets, motion, compact }: { index: number; score: IdentityScore; targets: SurfaceTargets; motion: boolean; compact: boolean }) {
  const root = useRef<Group>(null)
  const geometry = useMemo(() => index === 0 ? { ribbons: assistlyRibbon() } : index === 1 ? knowlesGlobe() : syntaxGear(), [index])
  useEffect(() => {
    if (root.current) targets.set(7 + index, sampleSurface(root.current, root.current, targets.pointCount))
    return () => {
      targets.delete(7 + index)
      Object.values(geometry).flat().forEach(value => value.dispose())
    }
  }, [index, geometry, targets])
  useFrame(() => {
    if (!root.current || !score.active) return
    const route = score.content
    const stage = contentPose(route, 4, compact)
    const chapter = stage.weight * route.amount
    const inExperience = route.from === 'experience' || route.to === 'experience'
    const pose = organizationPose(score.organizationFocus, index)
    const weight = inExperience ? chapter * pose.weight : 0
    const solid = weight * (1 - score.dissolve) * (1 - score.organizationDissolve)
    const exploration = score.organizationExploration[index]
    root.current.visible = weight > 0.001
    root.current.position.set(stage.x + pose.x, stage.y + pose.y + (motion ? Math.sin(score.elapsed * 0.45 + index) * 0.018 : 0), stage.z + pose.z)
    root.current.rotation.set(stage.rx + pose.rx + exploration.pitch, stage.ry + pose.ry + exploration.yaw, stage.rz + pose.rz)
    root.current.scale.setScalar(stage.scale * pose.scale * (1 + exploration.zoom * 0.16))
    root.current.traverse(object => {
      if (!(object instanceof Mesh)) return
      const apply = (material: Material) => { material.opacity = solid; material.depthWrite = solid > 0.995 }
      if (Array.isArray(object.material)) object.material.forEach(apply); else apply(object.material)
    })
  }, -0.1)
  return <group ref={root} visible={false}>
    {'ribbons' in geometry && geometry.ribbons?.map((ribbon, i) => <mesh geometry={ribbon} key={i}>
      <meshStandardMaterial attach="material-0" {...finish} color="#703ab6" />
      <meshStandardMaterial attach="material-1" {...finish} color={studioGold.edge} />
    </mesh>)}
    {'panels' in geometry && <>
      <mesh geometry={geometry.core}><meshStandardMaterial {...finish} color={studioGold.champagne} /></mesh>
      <mesh geometry={geometry.panels}><meshStandardMaterial {...finish} color="#6095b7" /></mesh>
    </>}
    {'ring' in geometry && <>
      <mesh geometry={geometry.ring}><meshStandardMaterial attach="material-0" {...finish} color={studioGold.brass} /><meshStandardMaterial attach="material-1" {...finish} color={studioGold.edge} /></mesh>
      <mesh geometry={geometry.body}><meshStandardMaterial {...finish} color={studioGold.graphite} /></mesh>
      <Suspense fallback={null}><SyntaxFace geometry={geometry.face} /></Suspense>
    </>}
  </group>
}

export function ExperienceIdentities({ score, targets, motion, compact }: { score: IdentityScore; targets: SurfaceTargets; motion: boolean; compact: boolean }) {
  const { gl } = useThree()
  useFrame(() => {
    gl.domElement.dataset.organization = organizations[Math.round(score.organizationFocus)].id
    gl.domElement.dataset.organizationFocus = score.organizationFocus.toFixed(3)
    const exploration = score.organizationExploration[Math.round(score.organizationFocus)]
    gl.domElement.dataset.organizationExploration = [exploration.yaw, exploration.pitch, exploration.zoom].map(value => value.toFixed(3)).join(',')
  })
  return <>{organizations.map((org, index) => <Identity key={org.id} index={index} score={score} targets={targets} motion={motion} compact={compact} />)}</>
}
