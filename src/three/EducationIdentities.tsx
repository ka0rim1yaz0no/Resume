import { useEffect, useMemo, useRef } from 'react'
import { useTexture } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Group, Material, Mesh, SRGBColorSpace } from 'three'
import { schools } from '../data/schools'
import { contentPose, type ContentRoute } from './contentChoreography'
import { educationEmblem } from './educationGeometry'
import { sampleSurface, type SurfaceTargets } from './surfaceCloud'
import { studioFade, studioFinish, studioPalette } from './studioMaterials'
import { educationPose } from './educationChoreography'

export type EducationScore = { active: boolean; elapsed: number; content: ContentRoute; dissolve: number; exitOpacity: number; educationReady: boolean; educationFocus: number; educationFlux: number; educationDissolve: number; educationFrom: number; educationTo: number; educationMix: number; educationDisplayed: number; educationExploration: { yaw: number; pitch: number; zoom: number }[] }
const finish = { ...studioFade, roughness: studioFinish.roughness, metalness: studioFinish.metalness, envMapIntensity: studioFinish.envMapIntensity }

function SchoolEmblem({ index, score, targets, motion, compact }: { index: number; score: EducationScore; targets: SurfaceTargets; motion: boolean; compact: boolean }) {
  const root = useRef<Group>(null)
  const source = useTexture(schools[index].logo)
  const texture = useMemo(() => { const t = source.clone(); t.colorSpace = SRGBColorSpace; t.needsUpdate = true; return t }, [source])
  const geometry = useMemo(() => educationEmblem(index), [index])
  useEffect(() => {
    if (root.current) targets.set(10 + index, sampleSurface(root.current, root.current, targets.pointCount))
    return () => { targets.delete(10 + index); texture.dispose(); Object.values(geometry).forEach(value => value.dispose()) }
  }, [index, targets, geometry, texture])
  useFrame(() => {
    if (!root.current || !score.active) return
    const stage = contentPose(score.content, 5, compact)
    const inEducation = score.content.from === 'education' || score.content.to === 'education'
    const pose = educationPose(motion ? score.educationFocus : Math.round(score.educationFocus), index)
    const weight = inEducation ? stage.weight * score.content.amount * pose.weight : 0
    const exploration = score.educationExploration[index]
    // Both poses remain current so the dust always meets the incoming surface.
    root.current.position.set(stage.x + pose.x, stage.y + pose.y + (motion ? Math.sin(score.elapsed * 0.4) * 0.014 : 0), stage.z + pose.z)
    root.current.rotation.set(stage.rx + exploration.pitch, stage.ry + pose.ry + exploration.yaw, stage.rz)
    root.current.scale.setScalar(stage.scale * pose.scale * (1 + exploration.zoom * 0.16))
    root.current.visible = weight > 0.001
    const solid = weight * (1 - score.dissolve) * (1 - score.educationDissolve) * score.exitOpacity
    root.current.traverse(object => {
      if (!(object instanceof Mesh)) return
      const apply = (material: Material) => { material.opacity = solid }
      if (Array.isArray(object.material)) object.material.forEach(apply); else apply(object.material)
    })
  }, -0.1)
  return <group ref={root} visible={false}>
    <mesh geometry={geometry.body}><meshStandardMaterial {...finish} color={studioPalette.edge} /></mesh>
    <mesh geometry={geometry.face} position={[0, 0, 0.104]}><meshBasicMaterial {...studioFade} toneMapped={false} color="#ffffff" map={texture} /></mesh>
    <mesh geometry={geometry.face} position={[0, 0, -0.104]} rotation={[0, Math.PI, 0]}><meshBasicMaterial {...studioFade} toneMapped={false} color="#ffffff" map={texture} /></mesh>
    {'trim' in geometry && <><mesh geometry={geometry.trim} position={[0, 0, 0.075]}><meshStandardMaterial {...finish} color={studioPalette.amethyst} /></mesh><mesh geometry={geometry.trim} position={[0, 0, -0.075]}><meshStandardMaterial {...finish} color={studioPalette.amethyst} /></mesh></>}
  </group>
}

export function EducationIdentities({ score, targets, motion, compact }: { score: EducationScore; targets: SurfaceTargets; motion: boolean; compact: boolean }) {
  const { gl } = useThree()
  useFrame(() => {
    score.educationReady = targets.has(10) && targets.has(11)
    gl.domElement.dataset.school = schools[score.educationDisplayed].id
    gl.domElement.dataset.schoolFocus = score.educationFocus.toFixed(3)
    gl.domElement.dataset.schoolPhase = score.educationFlux > 0.001 ? 'scroll' : 'idle'
    gl.domElement.dataset.schoolDissolve = score.educationFlux.toFixed(3)
    const view = score.educationExploration[score.educationDisplayed]
    gl.domElement.dataset.schoolExploration = [view.yaw, view.pitch, view.zoom].map(value => value.toFixed(3)).join(',')
  }, -2.5)
  return <>{schools.map((item, index) => <SchoolEmblem key={item.id} index={index} score={score} targets={targets} motion={motion} compact={compact} />)}</>
}
