import { useEffect, useMemo, useRef } from 'react'
import { useTexture } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Group, Material, Mesh, SRGBColorSpace } from 'three'
import { schools } from '../data/schools'
import { contentPose, type ContentRoute } from './contentChoreography'
import { educationEmblem } from './educationGeometry'
import { sampleSurface, type SurfaceTargets } from './surfaceCloud'
import { studioFinish } from './studioMaterials'
import { advanceSkillTransition, createSkillTransition, skillDissolve } from './skillTransition'

export type EducationScore = { active: boolean; elapsed: number; content: ContentRoute; dissolve: number; exitOpacity: number; educationReady: boolean; educationFlux: number; educationDissolve: number; educationFrom: number; educationTo: number; educationMix: number; educationDisplayed: number; educationExploration: { yaw: number; pitch: number; zoom: number }[] }
const finish = { roughness: studioFinish.roughness, metalness: 0.08, envMapIntensity: studioFinish.envMapIntensity, transparent: true }

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
    const selected = score.educationDisplayed === index
    const weight = inEducation ? stage.weight * score.content.amount : 0
    const exploration = score.educationExploration[index]
    // Both poses remain current so the dust always meets the incoming surface.
    root.current.position.set(stage.x, stage.y + (motion ? Math.sin(score.elapsed * 0.4) * 0.014 : 0), stage.z)
    root.current.rotation.set(stage.rx + exploration.pitch, stage.ry + exploration.yaw, stage.rz)
    root.current.scale.setScalar(stage.scale * (1 + exploration.zoom * 0.16))
    root.current.visible = selected && weight > 0.001
    const solid = selected ? weight * (1 - score.dissolve) * (1 - score.educationDissolve) * score.exitOpacity : 0
    root.current.traverse(object => {
      if (!(object instanceof Mesh)) return
      const apply = (material: Material) => { material.opacity = solid; material.depthWrite = solid > 0.995 }
      if (Array.isArray(object.material)) object.material.forEach(apply); else apply(object.material)
    })
  }, -0.1)
  return <group ref={root} visible={false}>
    <mesh geometry={geometry.body}><meshStandardMaterial {...finish} color={index === 0 ? '#4d5140' : '#364c3b'} /></mesh>
    <mesh geometry={geometry.face} position={[0, 0, 0.104]}><meshBasicMaterial transparent toneMapped={false} color="#d9ded7" map={texture} /></mesh>
    <mesh geometry={geometry.face} position={[0, 0, -0.104]} rotation={[0, Math.PI, 0]}><meshBasicMaterial transparent toneMapped={false} color="#d9ded7" map={texture} /></mesh>
    {'trim' in geometry && <><mesh geometry={geometry.trim} position={[0, 0, 0.075]}><meshStandardMaterial {...finish} color="#789480" /></mesh><mesh geometry={geometry.trim} position={[0, 0, -0.075]}><meshStandardMaterial {...finish} color="#789480" /></mesh></>}
  </group>
}

export function EducationIdentities({ score, targets, school, motion, compact }: { score: EducationScore; targets: SurfaceTargets; school: string; motion: boolean; compact: boolean }) {
  const transition = useRef(createSkillTransition(school))
  const { gl } = useThree()
  useFrame((_, delta) => {
    score.educationReady = targets.has(10) && targets.has(11)
    const settled = score.content.to === 'education' && (score.content.from === 'education' || score.content.mix > 0.95)
    const state = transition.current
    const incoming = schools.findIndex(item => item.id === state.displayed)
    advanceSkillTransition(state, school, delta, motion && score.active && settled, targets.has(10 + incoming))
    score.educationDisplayed = schools.findIndex(item => item.id === state.displayed)
    score.educationFrom = 10 + schools.findIndex(item => item.id === state.from)
    score.educationTo = 10 + schools.findIndex(item => item.id === state.to)
    score.educationFlux = settled ? skillDissolve(state) : 0
    score.educationMix = state.progress
    gl.domElement.dataset.school = state.displayed
    gl.domElement.dataset.schoolPhase = state.phase
    gl.domElement.dataset.schoolDissolve = score.educationFlux.toFixed(3)
    const view = score.educationExploration[score.educationDisplayed]
    gl.domElement.dataset.schoolExploration = [view.yaw, view.pitch, view.zoom].map(value => value.toFixed(3)).join(',')
  }, -2.5)
  return <>{schools.map((item, index) => <SchoolEmblem key={item.id} index={index} score={score} targets={targets} motion={motion} compact={compact} />)}</>
}
