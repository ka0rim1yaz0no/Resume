import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { PerspectiveCamera, useGLTF } from '@react-three/drei'
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js'
import { ACESFilmicToneMapping, Box3, BufferGeometry, Group, Line, LineBasicMaterial, Material, MathUtils, Mesh, PMREMGenerator, Texture, Vector3 } from 'three'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { modelIds, modelRegistry, modelUrl, type ModelId } from '../data/assets'
import { useMediaQuery } from '../hooks/usePreferences'
import { blend, chapterPose, cinematicCamera, journeyPose, openingCamera, reactCompanionPose, stageHandoff, type StageRect } from './choreography'
import { contentCamera, contentPose, contentRoute, dockVisibility, type ContentDocks, type ContentRoute, type Dock } from './contentChoreography'
import { TravelParticles } from './TravelParticles'
import { SkillToken } from './SkillToken'
import { cloneStudioMaterial, studioLighting } from './studioMaterials'
import { StudioLights } from './StudioLights'
import { sampleSurface, surfacePointCount, type SurfaceTargets } from './surfaceCloud'
import { openingViewport } from './openingLayout'
import { advanceSkillTransition, createSkillTransition, skillDissolve } from './skillTransition'
import { technologyIcon } from '../data/technologies'
import { ExperienceIdentities, type IdentityScore } from './ExperienceIdentities'
import { organizationChapter } from './experienceChoreography'
import { createSceneFramer } from './cameraFraming'
import { EducationIdentities, type EducationScore } from './EducationIdentities'
import { educationChapter } from './educationChoreography'

// Buffer decompression must not compete with touch scrolling on the main thread.
const startDecoderWorkers = MeshoptDecoder.useWorkers
if (typeof Worker !== 'undefined') {
  try { startDecoderWorkers(1) } catch { /* Synchronous decoder remains available. */ }
}

type Anchors = { hero: HTMLElement; openingStage: HTMLElement; journey: HTMLElement; frame: HTMLElement; section: HTMLElement; project: HTMLElement; experience: HTMLElement; skills: HTMLElement; education: HTMLElement }
type Score = EducationScore & { progress: number; handoff: number; heroScroll: number; opening: number; elapsed: number; active: boolean; turn: number; pointerX: number; pointerY: number; weights: number[]; viewport: StageRect; content: ContentRoute; flux: number; dissolve: number; particleFrom: number; particleTo: number; particleMix: number; skillFlux: number; skillMix: number; skillFrom: number; skillTo: number; organizationFocus: number; organizationFlux: number; organizationDissolve: number; organizationFrom: number; organizationTo: number; organizationMix: number; organizationExploration: IdentityScore['organizationExploration']; exitOpacity: number; exploreYaw: number; explorePitch: number; exploreZoom: number }
type OwnedMaterial = { material: Material; opacity: number }

function documentTop(element: HTMLElement) {
  let top = 0
  for (let node: HTMLElement | null = element; node; node = node.offsetParent as HTMLElement | null) top += node.offsetTop + (node.offsetParent?.clientTop || 0)
  return top
}

function measureDock(element: HTMLElement, header: number): Dock {
  const rect = element.getBoundingClientRect()
  const top = documentTop(element)
  const section = element.closest('section')
  const sectionArrival = section ? documentTop(section) - header - 10 : Infinity
  let pin: HTMLElement | null = element
  while (pin && pin.tagName !== 'SECTION' && getComputedStyle(pin).position !== 'sticky') pin = pin.parentElement
  if (pin && getComputedStyle(pin).position === 'sticky') {
    let container = pin.parentElement
    while (container && getComputedStyle(container).display === 'contents') container = container.parentElement
    // offsetTop on a stuck element includes its sticky displacement. All
    // content pins are the first flow item in their row, so derive the fixed
    // timeline position from that row rather than chasing the moving pin.
    const containerStyle = container ? getComputedStyle(container) : null
    const pinStyle = getComputedStyle(pin)
    const naturalTop = container ? documentTop(container) + container.clientTop + (parseFloat(containerStyle?.paddingTop || '0') || 0) + (parseFloat(pinStyle.marginTop) || 0) : top
    const arrive = naturalTop - (parseFloat(pinStyle.top) || header)
    const distance = Math.max(0, (container?.offsetHeight || 0) - pin.offsetHeight)
    return { rect, arrive: Math.min(arrive, sectionArrival), leave: arrive + Math.max(100, distance - 100) }
  }
  const arrive = top - header - 40
  return { rect, arrive: Math.min(arrive, sectionArrival), leave: arrive + Math.max(100, rect.height * 0.4) }
}

function useModelAsset(id: ModelId, mobile: boolean) {
  const entry = modelRegistry[id]
  const { scene } = useGLTF(modelUrl(id, mobile), false, false, loader => loader.setMeshoptDecoder(MeshoptDecoder))
  const normalized = useMemo(() => {
    const clone = scene.clone(true)
    const box = new Box3().setFromObject(clone)
    const center = box.getCenter(new Vector3())
    const size = box.getSize(new Vector3())
    clone.position.sub(center)
    const materials: OwnedMaterial[] = []
    clone.traverse(object => {
      if (!(object instanceof Mesh)) return
      const copy = (source: Material) => {
        const material = cloneStudioMaterial(source)
        material.transparent = true
        materials.push({ material, opacity: source.opacity })
        return material
      }
      object.material = Array.isArray(object.material) ? object.material.map(copy) : copy(object.material)
    })
    return { clone, materials, scale: entry.scale / Math.max(size.x, size.y, size.z) }
  }, [scene, entry.scale])
  useEffect(() => () => normalized.materials.forEach(({ material }) => material.dispose()), [normalized])
  return normalized
}

function ObjectRig({ id, index, score, targets, motion, compact, mobile, onLoaded }: { id: ModelId; index: number; score: Score; targets: SurfaceTargets; motion: boolean; compact: boolean; mobile: boolean; onLoaded: (id: ModelId) => void }) {
  const entry = modelRegistry[id]
  const normalized = useModelAsset(id, mobile)
  const group = useRef<Group>(null)
  useEffect(() => {
    if (group.current) targets.set(index, sampleSurface(group.current, normalized.clone, targets.pointCount))
    onLoaded(id)
    return () => { targets.delete(index) }
  }, [id, index, normalized, targets, onLoaded])
  useFrame(() => {
    if (!group.current || !score.active) return
    const film = journeyPose(score.progress, index, compact)
    const hero = chapterPose(score.heroScroll, true, compact)
    const t = score.handoff
    let weight = blend(score.weights[index], film.weight, t)
    const opening = motion ? score.opening : 0
    const arc = Math.sin(opening * Math.PI)
    const idle = motion ? Math.sin(score.elapsed * 0.32) * 0.018 * (1 - opening) : 0
    // Update hidden poses too: the incoming object is already in place when
    // its weight rises. The scroll score alone controls both pose and opacity.
    group.current.position.set(blend(motion ? hero.x : 0, film.x, t), blend(motion ? hero.y : 0, film.y, t) + idle, blend(motion ? hero.z : 0, film.z, t))
    group.current.rotation.set(
      entry.rotation[0] + blend((motion ? hero.rx : 0) + arc * 0.025, film.rx, t) - score.pointerY * 0.025 * (1 - opening) + score.explorePitch * (1 - t),
      entry.rotation[1] + blend((motion ? hero.ry : 0) - arc * 0.14 + score.turn, film.ry, t) + score.pointerX * 0.045 * (1 - opening) + score.exploreYaw * (1 - t),
      blend(motion ? hero.rz : 0, film.rz, t),
    )
    group.current.scale.setScalar(blend(motion ? hero.scale : 1, film.scale * (compact ? 0.8 : 1), t))
    const amount = score.content.amount
    if (amount > 0) {
      const target = contentPose(score.content, index, compact)
      const object = group.current
      object.position.set(blend(object.position.x, target.x, amount), blend(object.position.y, target.y, amount), blend(object.position.z, target.z, amount))
      object.rotation.set(blend(object.rotation.x, entry.rotation[0] + target.rx, amount), blend(object.rotation.y, entry.rotation[1] + target.ry, amount), blend(object.rotation.z, target.rz, amount))
      object.scale.setScalar(blend(object.scale.x, target.scale, amount))
      weight = blend(weight, target.weight, amount)
    }
    group.current.visible = weight > 0.001
    const solid = weight * (1 - score.dissolve) * score.exitOpacity
    normalized.materials.forEach(({ material, opacity }) => { material.opacity = opacity * solid; material.depthWrite = solid > 0.995 })
  })
  return <group ref={group} rotation={entry.rotation}><group scale={normalized.scale}><primitive object={normalized.clone} dispose={null} /></group></group>
}

function ReactCompanion({ score, targets, motion, compact, mobile, technology, onLoaded }: { score: Score; targets: SurfaceTargets; motion: boolean; compact: boolean; mobile: boolean; technology: string; onLoaded: (id: ModelId) => void }) {
  const normalized = useModelAsset('react-js', mobile)
  const root = useRef<Group>(null)
  const tile = useRef<Group>(null)
  const original = useRef<Group>(null)
  const transition = useRef(createSkillTransition(technology))
  const emblems = useRef(new Set<string>())
  const [displayedTechnology, setDisplayedTechnology] = useState(technology)
  const [visibility] = useState(() => ({ weight: 0 }))
  const wire = useMemo(() => new BufferGeometry().setFromPoints([new Vector3(0.9, 0.65, 0.04), new Vector3(1.23, 0.65, 0.04), new Vector3(1.42, 1.23, 0.04)]), [])
  const connector = useMemo(() => new Line(wire, new LineBasicMaterial({ color: '#b5d7c6', transparent: true, opacity: 0.25, depthWrite: false })), [wire])
  const { gl, invalidate } = useThree()
  const emblemReady = useCallback((name: string, ready: boolean) => { if (ready) emblems.current.add(name); else emblems.current.delete(name); invalidate() }, [invalidate])
  useEffect(() => { useLoader.preload(SVGLoader, technologyIcon(technology)); invalidate(3) }, [technology, invalidate])
  useEffect(() => {
    if (tile.current) targets.set(3, sampleSurface(tile.current, normalized.clone, targets.pointCount))
    onLoaded('react-js')
    return () => { targets.delete(3); wire.dispose(); connector.material.dispose() }
  }, [onLoaded, wire, connector, normalized, targets])
  useFrame((_, delta) => {
    // Focus can scroll a button a few pixels above the exact dock arrival.
    // Treat that near-complete handoff as the same visible skills stage.
    const settled = score.content.to === 'skills' && (score.content.from === 'skills' || score.content.mix > 0.995) && score.content.amount > 0.995
    const state = transition.current
    if ((state.phase === 'idle' || state.phase === 'in') && technology !== state.displayed && targets.has(4)) targets.set(6, targets.get(4)!)
    const geometryIsReady = state.displayed === 'React.js' || emblems.current.has(state.displayed)
    const preparing = state.phase === 'idle' && technology !== state.displayed && technology !== 'React.js' && !emblems.current.has(technology)
    if (!preparing || !motion || !score.active || !settled) advanceSkillTransition(state, technology, delta, motion && score.active && settled, geometryIsReady)
    if (state.displayed !== displayedTechnology) setDisplayedTechnology(state.displayed)
    score.skillFlux = settled ? skillDissolve(state) : 0
    score.skillMix = state.progress
    score.skillFrom = state.from === 'React.js' ? 3 : 6
    score.skillTo = state.to === 'React.js' ? 3 : 5
    gl.domElement.dataset.skillPhase = preparing ? 'preparing' : state.phase
    gl.domElement.dataset.skillProgress = state.progress.toFixed(3)
    gl.domElement.dataset.skillDissolve = score.skillFlux.toFixed(3)
    gl.domElement.dataset.requestedTechnology = technology
    gl.domElement.dataset.skillAnimation = `${motion}:${score.active}:${settled}`
  }, -2.5)
  useFrame(() => {
    if (!root.current || !tile.current || !score.active) return
    const film = journeyPose(score.progress, 0, compact)
    const hero = chapterPose(score.heroScroll, true, compact)
    let weight = blend(score.weights[0], film.weight, score.handoff)
    const opening = motion ? score.opening : 0
    weight *= 1 - opening
    const pose = reactCompanionPose(score.progress, compact, opening)
    const idle = motion ? Math.sin(score.elapsed * 0.32) * 0.018 : 0
    root.current.position.set(blend(motion ? hero.x : 0, film.x, score.handoff), blend(motion ? hero.y : 0, film.y, score.handoff) + idle, blend(motion ? hero.z : 0, film.z, score.handoff))
    root.current.rotation.set(score.explorePitch * (1 - score.handoff), score.exploreYaw * (1 - score.handoff), 0)
    tile.current.position.set(pose.x, pose.y, pose.z)
    tile.current.rotation.set(pose.rx - score.pointerY * 0.025, pose.ry + score.pointerX * 0.045, pose.rz)
    tile.current.scale.setScalar(pose.scale * 1.15 / modelRegistry['react-js'].scale)
    const amount = score.content.amount
    if (amount > 0) {
      const target = contentPose(score.content, 3, compact)
      const object = root.current
      object.position.set(blend(object.position.x + pose.x, target.x, amount), blend(object.position.y + pose.y, target.y, amount), blend(object.position.z + pose.z, target.z, amount))
      tile.current.position.set(0, 0, 0)
      tile.current.rotation.set(blend(tile.current.rotation.x, target.rx, amount), blend(tile.current.rotation.y, target.ry, amount), blend(tile.current.rotation.z, target.rz, amount))
      tile.current.scale.setScalar(blend(tile.current.scale.x, target.scale, amount))
      weight = blend(weight, target.weight, amount)
    }
    root.current.visible = weight > 0.001
    const skillStage = score.content.from === 'skills' || score.content.to === 'skills'
    const alternate = skillStage && transition.current.displayed !== 'React.js' ? 1 : 0
    const solid = weight * (1 - score.dissolve) * score.exitOpacity
    visibility.weight = solid * alternate
    const reactWeight = solid * (1 - alternate)
    if (original.current) original.current.visible = reactWeight > 0.001
    normalized.materials.forEach(({ material, opacity }) => { material.opacity = opacity * reactWeight; material.depthWrite = reactWeight > 0.995 })
    connector.material.opacity = amount > 0 ? 0 : weight * 0.25
    gl.domElement.dataset.companion = 'react-js'
    gl.domElement.dataset.companionWeight = weight.toFixed(3)
    const shownTechnology = skillStage ? transition.current.displayed : 'React.js'
    if (gl.domElement.dataset.technology !== shownTechnology) gl.domElement.dataset.technology = shownTechnology
    gl.domElement.dataset.reactWeight = reactWeight.toFixed(3)
    gl.domElement.dataset.emblemWeight = visibility.weight.toFixed(3)
  }, -0.25)
  return <group ref={root}>
    <group ref={tile}>
      <group ref={original} scale={normalized.scale}><primitive object={normalized.clone} dispose={null} /></group>
      <SkillToken technology={displayedTechnology} requestedTechnology={technology} motion={motion} visibility={visibility} targets={targets} onEmblemReady={emblemReady} />
    </group>
    <primitive object={connector} dispose={null} />
  </group>
}

function Ensemble({ score, model, motion, compact, mobile, warm, technology, environment, onReady, onError }: { score: Score; model: ModelId; motion: boolean; compact: boolean; mobile: boolean; warm: boolean; technology: string; environment: Texture; onReady: (ids: Set<ModelId>) => void; onError: () => void }) {
  const { scene, gl, camera, invalidate } = useThree()
  const [loaded, setLoaded] = useState<Set<ModelId>>(new Set())
  const targets = useMemo<SurfaceTargets>(() => Object.assign(new Map(), { pointCount: mobile ? 2400 : surfacePointCount }), [mobile])
  const markLoaded = useCallback((id: ModelId) => setLoaded(previous => new Set(previous).add(id)), [])
  useEffect(() => {
    scene.environment = environment; scene.environmentIntensity = studioLighting.environment
    gl.domElement.dataset.assetProfile = mobile ? 'mobile' : 'desktop'
    return () => { scene.environment = null }
  }, [scene, environment, mobile, gl])
  useEffect(() => {
    if (!loaded.has(model) || !loaded.has('react-js')) return
    let disposed = false
    // Show the establishing subjects as soon as their assets are available.
    // Hidden chapters prepare in parallel without holding the opening blank.
    onReady(loaded); invalidate()
    gl.domElement.dataset.loadedModels = [...loaded].join(',')
    void gl.compileAsync(scene, camera).then(() => { if (!disposed) invalidate() }).catch(() => { if (!disposed) onError() })
    return () => { disposed = true }
  }, [loaded, model, gl, scene, camera, invalidate, onReady, onError])
  useFrame(state => {
    if (!score.active) return
    const film = cinematicCamera(score.progress, compact)
    const hero = chapterPose(score.heroScroll, true, compact)
    const t = score.handoff
    const opening = motion ? score.opening : 0
    const shot = openingCamera(opening, compact)
    state.camera.position.set(blend(shot.x, film.x, t), blend(shot.y, film.y, t), blend((motion ? hero.cameraZ : 6.7) + shot.z - 6.7, film.z, t))
    let lookX = blend(shot.lookX, film.lookX, t), lookY = blend(shot.lookY, film.lookY, t)
    const lens = state.camera as import('three').PerspectiveCamera
    let fov = blend(shot.fov, film.fov, t)
    if (score.content.amount > 0) {
      const target = contentCamera(score.content, compact), q = score.content.amount
      const p = state.camera.position
      p.set(blend(p.x, target.x, q), blend(p.y, target.y, q), blend(p.z, target.z, q))
      lookX = blend(lookX, target.lookX, q); lookY = blend(lookY, target.lookY, q)
      fov = blend(fov, target.fov, q)
    }
    state.camera.position.z -= Math.max(0, score.exploreZoom) * (1 - score.handoff) * (1 - score.content.amount)
    state.camera.lookAt(lookX, lookY, 0)
    if (Math.abs(lens.fov - fov) > 0.001) { lens.fov = fov; lens.updateProjectionMatrix() }
    gl.domElement.dataset.camera = state.camera.position.toArray().map(value => value.toFixed(3)).join(',')
  }, -1)
  return <>
    <PerspectiveCamera makeDefault position={[0, 0.15, 6.7]} fov={35} near={0.1} far={40} />
    <StudioLights />
    {modelIds.map((id, index) => (warm || id === model || id === 'systems-sculpture') && <Suspense key={id} fallback={null}><ObjectRig id={id} index={index} score={score} targets={targets} motion={motion} compact={compact} mobile={mobile} onLoaded={markLoaded} /></Suspense>)}
    <Suspense fallback={null}><ReactCompanion score={score} targets={targets} motion={motion} compact={compact} mobile={mobile} technology={technology} onLoaded={markLoaded} /></Suspense>
    {warm && <ExperienceIdentities score={score} targets={targets} motion={motion} compact={compact} />}
    {warm && <Suspense fallback={null}><EducationIdentities score={score} targets={targets} motion={motion} compact={compact} /></Suspense>}
    <TravelParticles score={score} targets={targets} motion={motion} />
  </>
}

function Director({ anchors, score, model, turn, reset, motion, reduced, running, ready, pointer, onError, onRendered, children }: { anchors: Anchors; score: Score; model: ModelId; turn: number; reset: number; motion: boolean; reduced: boolean; running: boolean; ready: boolean; pointer: RefObject<{ x: number; y: number }>; onError: () => void; onRendered: () => void; children: (environment: Texture) => React.ReactNode }) {
  const { gl, invalidate } = useThree()
  const [environment, setEnvironment] = useState<Texture | null>(null)
  const dirty = useRef(true)
  const measurements = useRef<{ scroll: number; hero: DOMRect; establishing: DOMRect; journey: DOMRect; frame: DOMRect; section: DOMRect; heroSection: DOMRect; project: DOMRect; experience: DOMRect; skills: DOMRect; education: DOMRect } | null>(null)
  const thresholds = useRef<{ film: number; project: Dock; experience: Dock; skills: Dock; education: Dock } | null>(null)
  const fitScene = useMemo(createSceneFramer, [])
  const nodes = useMemo(() => ({ hero: anchors.hero.parentElement?.querySelector<HTMLElement>('.model-explorer'), companies: [...(anchors.experience.parentElement?.querySelectorAll<HTMLElement>('[data-organization-explorer]') || [])], schools: [...(anchors.education.parentElement?.querySelectorAll<HTMLElement>('[data-school-explorer]') || [])] }), [anchors])
  const diagnostics = useRef({ frames: 0, next: 0 })
  useEffect(() => {
    const generator = new PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const target = generator.fromScene(room, 0.04)
    setEnvironment(target.texture)
    const canvas = gl.domElement
    canvas.setAttribute('aria-hidden', 'true')
    canvas.addEventListener('webglcontextlost', onError)
    // A short render burst lets the resized canvas and the browser's new
    // layout commit before returning to a still frame in demand mode.
    const wake = () => invalidate(3)
    const remeasure = () => { dirty.current = true; wake() }
    const observer = new ResizeObserver(remeasure)
    for (const anchor of [anchors.hero, anchors.journey, anchors.project, anchors.experience, anchors.skills, anchors.education, anchors.hero.closest('.personal-resume')!]) observer.observe(anchor)
    window.addEventListener('scroll', wake, { passive: true })
    window.addEventListener('resize', remeasure, { passive: true })
    window.addEventListener('model-explore', wake)
    return () => {
      canvas.removeEventListener('webglcontextlost', onError)
      window.removeEventListener('scroll', wake); window.removeEventListener('resize', remeasure)
      window.removeEventListener('model-explore', wake)
      observer.disconnect()
      target.dispose(); generator.dispose(); room.dispose()
    }
  }, [gl, invalidate, onError, anchors])
  useEffect(() => { score.elapsed = 0; invalidate() }, [score, reset, invalidate])
  useEffect(() => { invalidate(3) }, [model, turn, motion, running, ready, invalidate])
  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const header = window.innerWidth <= 650 ? 76 : window.innerWidth <= 980 ? 84 : 100
    const scroll = window.scrollY
    // Sticky thresholds only change with layout. Idle rotation does not need
    // repeated style/offset walks; scroll only refreshes the screen rectangles.
    if (dirty.current || !thresholds.current) thresholds.current = {
      film: documentTop(anchors.section) + anchors.section.offsetHeight - window.innerHeight - 60,
      project: measureDock(anchors.project, header), experience: measureDock(anchors.experience, header), skills: measureDock(anchors.skills, header), education: measureDock(anchors.education, header),
    }
    if (dirty.current || !measurements.current || measurements.current.scroll !== scroll) measurements.current = {
      scroll, hero: anchors.hero.getBoundingClientRect(), establishing: anchors.openingStage.getBoundingClientRect(), journey: anchors.journey.getBoundingClientRect(), frame: anchors.frame.getBoundingClientRect(), section: anchors.section.getBoundingClientRect(), heroSection: anchors.hero.closest('section')!.getBoundingClientRect(), project: anchors.project.getBoundingClientRect(), experience: anchors.experience.getBoundingClientRect(), skills: anchors.skills.getBoundingClientRect(), education: anchors.education.getBoundingClientRect(),
    }
    dirty.current = false
    const { hero, establishing, journey, frame, section, heroSection } = measurements.current
    const opening = Number(anchors.hero.dataset.sceneOpening || 0)
    const openingActive = anchors.hero.dataset.sceneOpening !== undefined
    const destination: StageRect = { left: journey.left, top: header + journey.top - frame.top, width: journey.width, height: journey.height }
    const end = section.top + scroll - header
    // On a stacked phone hero, let visitors reach and explore the model
    // before carrying it into the next scene.
    const start = Math.min(end - 1, Math.max(Math.min(end * 0.2, 100), hero.top + scroll - header - 24))
    const transition = stageHandoff({ left: hero.left, top: hero.top + scroll, width: hero.width, height: hero.height }, destination, scroll, start, end)
    const hiddenFilm = journey.width === 0 || journey.height === 0
    const docks: ContentDocks = {
      film: { rect: journey, arrive: 0, leave: thresholds.current.film },
      project: { ...thresholds.current.project, rect: measurements.current.project }, experience: { ...thresholds.current.experience, rect: measurements.current.experience }, skills: { ...thresholds.current.skills, rect: measurements.current.skills }, education: { ...thresholds.current.education, rect: measurements.current.education },
    }
    score.content = reduced || openingActive ? { from: 'film', to: 'film', mix: 0, amount: 0, viewport: journey } : contentRoute(scroll, docks, header, window.innerHeight)
    score.organizationFocus = MathUtils.clamp(Number(anchors.experience.dataset.experienceFocus || 0), 0, 2)
    const organization = organizationChapter(score.organizationFocus)
    const settledExperience = score.content.to === 'experience' && (score.content.from === 'experience' || score.content.mix > 0.995)
    score.organizationFlux = settledExperience ? organization.flux : 0
    score.organizationFrom = 7 + organization.from; score.organizationTo = 7 + organization.to; score.organizationMix = organization.mix
    score.educationFocus = MathUtils.clamp(Number(anchors.education.dataset.educationFocus || 0), 0, 1)
    score.educationDisplayed = Math.round(score.educationFocus)
    const education = educationChapter(score.educationFocus)
    const settledEducation = score.content.to === 'education' && (score.content.from === 'education' || score.content.mix > 0.995)
    score.educationFlux = settledEducation ? education.flux : 0
    score.educationFrom = 10 + education.from; score.educationTo = 10 + education.to; score.educationMix = education.mix
    const introRect = openingActive ? openingViewport(hero, establishing, opening) : hiddenFilm ? hero : transition.progress >= 1 ? journey : transition.rect
    const rect = score.content.amount > 0 ? score.content.viewport : introRect
    score.handoff = openingActive || hiddenFilm ? 0 : transition.progress
    score.opening = opening
    score.heroScroll = MathUtils.clamp(-heroSection.top / Math.max(1, heroSection.height), 0, 1)
    score.progress = Number(anchors.journey.dataset.sceneScore || 0)
    const filmWeights = modelIds.map((_, index) => journeyPose(score.progress, index, false).weight)
    const filmFlux = 2 * (1 - filmWeights.reduce((sum, weight) => sum + weight * weight, 0))
    const contentFlux = score.content.from === score.content.to ? 0 : Math.sin(score.content.mix * Math.PI) ** 2
    score.flux = blend(filmFlux, contentFlux, score.content.amount)
    score.particleFrom = score.progress < 0.5 ? 0 : 1
    score.particleTo = score.progress < 0.5 ? 1 : 2
    score.particleMix = score.progress < 0.5 ? filmWeights[1] : filmWeights[2]
    if (score.content.amount > 0) {
      const subject = { film: 2, project: 1, experience: 7 + Math.round(score.organizationFocus), skills: anchors.skills.dataset.technology === 'React.js' ? 3 : 4, education: 10 + score.educationDisplayed }
      score.particleFrom = subject[score.content.from]; score.particleTo = subject[score.content.to]
      score.particleMix = score.content.mix
    }
    score.exitOpacity = score.content.from === 'education' && score.content.to === 'education' ? dockVisibility(rect, header) : 1
    score.active = running && rect.top + rect.height > header && rect.top < window.innerHeight && rect.width > 0
    score.viewport = rect
    if (score.active && motion) score.elapsed += delta
    const damp = (a: number, b: number) => motion ? MathUtils.damp(a, b, 7, Math.max(delta, 0.001)) : b
    nodes.companies.forEach(element => {
      const view = score.organizationExploration[Number(element.dataset.organizationExplorer)]
      view.yaw = damp(view.yaw, Number(element.dataset.yaw || 0))
      view.pitch = damp(view.pitch, Number(element.dataset.pitch || 0))
      view.zoom = damp(view.zoom, Number(element.dataset.zoom || 0))
    })
    nodes.schools.forEach(element => {
      const view = score.educationExploration[Number(element.dataset.schoolExplorer)]
      view.yaw = damp(view.yaw, Number(element.dataset.yaw || 0))
      view.pitch = damp(view.pitch, Number(element.dataset.pitch || 0))
      view.zoom = damp(view.zoom, Number(element.dataset.zoom || 0))
    })
    score.turn = damp(score.turn, turn)
    const exploration = nodes.hero
    score.exploreYaw = damp(score.exploreYaw, Number(exploration?.dataset.yaw || 0))
    score.explorePitch = damp(score.explorePitch, Number(exploration?.dataset.pitch || 0))
    score.exploreZoom = damp(score.exploreZoom, Number(exploration?.dataset.zoom || 0))
    score.pointerX = damp(score.pointerX, motion ? pointer.current.x : 0)
    score.pointerY = damp(score.pointerY, motion ? pointer.current.y : 0)
    score.weights.forEach((weight, index) => { score.weights[index] = damp(weight, modelIds[index] === model ? 1 : 0) })
    const current = score.handoff > 0.5 ? modelIds[score.progress < 0.33 ? 0 : score.progress < 0.68 ? 1 : 2] : model
    anchors.hero.dataset.sceneCurrent = score.handoff < 0.5 ? model : current
    anchors.journey.dataset.sceneCurrent = current
    anchors.journey.dataset.sceneProgress = score.progress.toFixed(3)
    gl.domElement.dataset.handoff = score.handoff.toFixed(3)
    gl.domElement.dataset.stage = score.content.amount > 0 ? score.content.from === score.content.to ? score.content.to : `${score.content.from}-to-${score.content.to}` : score.handoff > 0.5 ? 'journey' : 'hero'
    gl.domElement.dataset.routeMix = score.content.mix.toFixed(3)
    gl.domElement.dataset.particles = score.flux.toFixed(3)
    gl.domElement.dataset.exitOpacity = score.exitOpacity.toFixed(3)
    gl.domElement.dataset.exploration = [score.exploreYaw, score.explorePitch, score.exploreZoom].map(n => n.toFixed(3)).join(',')
    gl.domElement.dataset.viewport = [rect.left, rect.top, rect.width, rect.height].map(n => n.toFixed(1)).join(',')
    diagnostics.current.frames++
    if (ready && score.active && motion) invalidate()
  }, -3)
  useFrame(({ camera, scene, size, clock }, delta) => {
    gl.setScissorTest(false)
    gl.setViewport(0, 0, size.width, size.height)
    gl.setClearColor(0x000000, 0); gl.clear(true, true, true)
    if (!ready || !score.active) return
    const rect = score.viewport
    const lens = camera as import('three').PerspectiveCamera
    const aspect = rect.width / rect.height
    if (Math.abs(lens.aspect - aspect) > 0.0001) { lens.aspect = aspect; lens.updateProjectionMatrix() }
    const retreat = fitScene(scene, lens, aspect, delta)
    const zoomOut = Math.min(0, score.exploreZoom) * (1 - score.handoff) * (1 - score.content.amount)
    if (zoomOut < 0) { lens.position.z -= zoomOut; lens.updateMatrixWorld() }
    const left = rect.left - size.left
    const bottom = size.height - (rect.top - size.top + rect.height)
    gl.setViewport(left, bottom, rect.width, rect.height)
    gl.setScissor(left, bottom, rect.width, rect.height)
    gl.setScissorTest(true)
    gl.render(scene, camera)
    gl.setScissorTest(false)
    onRendered()
    if (clock.elapsedTime > diagnostics.current.next) {
      diagnostics.current.next = clock.elapsedTime + 0.25
      gl.domElement.dataset.frame = String(diagnostics.current.frames)
      gl.domElement.dataset.cameraFit = retreat.toFixed(3)
      gl.domElement.dataset.triangles = String(gl.info.render.triangles)
      gl.domElement.dataset.textures = String(gl.info.memory.textures)
    }
  }, 1)
  return environment ? children(environment) : null
}

export default function CinematicCanvas({ root, model, turn, reset, motion, running, mobile, onError }: { root: RefObject<HTMLDivElement | null>; model: ModelId; turn: number; reset: number; motion: boolean; running: boolean; mobile: boolean; onError: () => void }) {
  const [anchors, setAnchors] = useState<Anchors | null>(null)
  const [ready, setReady] = useState(false)
  const [technology, setTechnology] = useState('React.js')
  const loadedModels = useRef<Set<ModelId>>(new Set())
  const sceneWindows = useRef<HTMLElement[]>([])
  const [warm, setWarm] = useState(Boolean(window.location.hash && window.location.hash !== '#'))
  const pointer = useRef({ x: 0, y: 0 })
  const compact = useMediaQuery('(max-width: 650px)')
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [score] = useState<Score>(() => ({ progress: 0, handoff: 0, heroScroll: 0, opening: 0, elapsed: 0, active: false, turn: 0, pointerX: 0, pointerY: 0, weights: modelIds.map(id => id === model ? 1 : 0), viewport: { left: 0, top: 0, width: 1, height: 1 }, content: { from: 'film', to: 'film', amount: 0, mix: 0, viewport: { left: 0, top: 0, width: 1, height: 1 } }, flux: 0, dissolve: 0, particleFrom: 0, particleTo: 1, particleMix: 0, skillFlux: 0, skillMix: 1, skillFrom: 3, skillTo: 3, organizationFocus: 0, organizationFlux: 0, organizationDissolve: 0, organizationFrom: 7, organizationTo: 8, organizationMix: 0, organizationExploration: Array.from({ length: 3 }, () => ({ yaw: 0, pitch: 0, zoom: 0 })), educationReady: false, educationFocus: 0, educationFlux: 0, educationDissolve: 0, educationFrom: 10, educationTo: 10, educationMix: 1, educationDisplayed: 0, educationExploration: Array.from({ length: 2 }, () => ({ yaw: 0, pitch: 0, zoom: 0 })), exitOpacity: 1, exploreYaw: 0, explorePitch: 0, exploreZoom: 0 }))
  useEffect(() => {
    if (!root.current) return
    const collect = () => {
      const hero = root.current?.querySelector<HTMLElement>('[data-scene="intro"]')
      const openingStage = root.current?.querySelector<HTMLElement>('[data-opening-stage]')
      const journey = root.current?.querySelector<HTMLElement>('[data-scene="journey"]')
      const frame = journey?.closest<HTMLElement>('.journey-frame')
      const section = journey?.closest('section')
      const project = root.current?.querySelector<HTMLElement>('[data-scene="project"]')
      const experience = root.current?.querySelector<HTMLElement>('[data-scene="experience"]')
      const skills = root.current?.querySelector<HTMLElement>('[data-scene="skills"]')
      const education = root.current?.querySelector<HTMLElement>('[data-scene="education"]')
      sceneWindows.current = [hero, journey, project, experience, skills, education].filter((element): element is HTMLElement => !!element)
      if (skills?.dataset.technology) setTechnology(skills.dataset.technology)
      if (hero && openingStage && journey && frame && section && project && experience && skills && education) setAnchors(previous => previous?.hero === hero && previous?.openingStage === openingStage && previous?.journey === journey && previous?.project === project && previous?.experience === experience && previous?.skills === skills && previous?.education === education ? previous : { hero, openingStage, journey, frame, section, project, experience, skills, education })
    }
    collect()
    const observer = new MutationObserver(collect)
    observer.observe(root.current, { subtree: true, attributes: true, attributeFilter: ['data-technology'] })
    const move = (event: PointerEvent) => { pointer.current.x = event.clientX / window.innerWidth * 2 - 1; pointer.current.y = -(event.clientY / window.innerHeight * 2 - 1) }
    window.addEventListener('pointermove', move, { passive: true })
    return () => { observer.disconnect(); window.removeEventListener('pointermove', move) }
  }, [root])
  const loaded = useCallback((ids: Set<ModelId>) => {
    loadedModels.current = ids
    setReady(true)
  }, [])
  const rendered = useCallback(() => {
    sceneWindows.current.forEach(element => {
      const still = reduced && ['project', 'experience', 'skills', 'education'].includes(element.dataset.scene || '')
      const available = element.dataset.scene === 'education' ? score.educationReady : element.dataset.scene === 'experience' ? warm && ready : loadedModels.current.has(element.dataset.sceneModel as ModelId)
      if (!still && available) {
        if (element.dataset.sceneReady !== 'true') element.dataset.sceneReady = 'true'
      } else if (element.dataset.sceneReady) delete element.dataset.sceneReady
    })
  }, [reduced, warm, ready, score])
  useEffect(() => {
    // Reduced motion uses the section posters even when its hero-only WebGL
    // viewport is off screen and therefore cannot reach the render callback.
    if (reduced) root.current?.querySelectorAll<HTMLElement>('[data-scene="project"], [data-scene="experience"], [data-scene="skills"], [data-scene="education"]').forEach(element => { delete element.dataset.sceneReady })
  }, [root, reduced])
  useEffect(() => {
    if (!anchors || warm) return
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setWarm(true); observer.disconnect() }
    }, { rootMargin: '25% 0px' })
    for (const stage of [anchors.section, anchors.project, anchors.experience, anchors.skills, anchors.education]) observer.observe(stage)
    return () => observer.disconnect()
  }, [anchors, warm])
  useEffect(() => () => { root.current?.querySelectorAll<HTMLElement>('[data-scene-ready]').forEach(element => { delete element.dataset.sceneReady }) }, [root])
  return <>
    <Canvas className="cinematic-renderer" dpr={[1, compact ? 1 : 1.35]} frameloop="demand" gl={{ alpha: true, antialias: true, powerPreference: 'high-performance', toneMapping: ACESFilmicToneMapping }}>
      {anchors && <Director anchors={anchors} score={score} model={model} turn={turn} reset={reset} motion={motion} reduced={reduced} running={running} ready={ready} pointer={pointer} onError={onError} onRendered={rendered}>{environment =>
          <Ensemble score={score} model={model} motion={motion} compact={compact} mobile={mobile} warm={warm && ready} technology={technology} environment={environment} onReady={loaded} onError={onError} />
      }</Director>}
    </Canvas>
  </>
}
