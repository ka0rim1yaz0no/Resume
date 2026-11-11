import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, Color, Float32BufferAttribute, Matrix4, Points, ShaderMaterial } from 'three'
import { surfacePointCount, type SurfaceTarget, type SurfaceTargets } from './surfaceCloud'
import { studioPalette } from './studioMaterials'
import type { ContentRoute } from './contentChoreography'
import { schoolSurfaceIndex } from './educationChoreography'
import { openingDust, silkHeight, transferEnergy } from './waveMotion'
import type { StageRect } from './choreography'

type DissolveScore = { active: boolean; exitOpacity: number; opening: number; handoff: number; wavePhase: number; viewport: StageRect; weights: number[]; flux: number; elapsed: number; dissolve: number; content: ContentRoute; dockDissolve: number; particleFrom: number; particleTo: number; particleMix: number; skillFlux: number; skillMix: number; skillFrom: number; skillTo: number; organizationFlux: number; organizationDissolve: number; organizationFrom: number; organizationTo: number; organizationMix: number; educationFlux: number; educationDissolve: number; educationMix: number }

function dissolvePair(score: DissolveScore) {
  if (score.opening > 0) return { from: 0, to: 0, flux: openingDust(score.opening), mix: 1 - score.opening, dissolve: 0, docking: 1 }
  if (score.content.from !== score.content.to) return { from: score.particleFrom, to: score.particleTo, flux: score.flux, mix: score.particleMix, dissolve: score.dockDissolve, docking: 1 }
  if (score.educationFlux > 0.001) return { from: schoolSurfaceIndex, to: schoolSurfaceIndex + 1, flux: score.educationFlux, mix: score.educationMix, dissolve: score.educationDissolve, docking: 1 }
  if (score.organizationFlux > 0.001) return { from: score.organizationFrom, to: score.organizationTo, flux: score.organizationFlux, mix: score.organizationMix, dissolve: 0, docking: 0 }
  if (score.skillFlux > 0) return { from: score.skillFrom, to: score.skillTo, flux: score.skillFlux, mix: score.skillMix, dissolve: score.skillFlux, docking: 0 }
  if (score.handoff > 0 && score.handoff < 1 && score.flux < 0.008) {
    const subject = score.weights.indexOf(Math.max(...score.weights))
    return { from: subject, to: 0, flux: 0.35 * transferEnergy(score.handoff), mix: score.handoff, dissolve: 0, docking: 1 }
  }
  return { from: score.particleFrom, to: score.particleTo, flux: score.flux, mix: score.particleMix, dissolve: score.flux * 0.78, docking: 0 }
}

export function TravelParticles({ score, targets, motion }: { score: DissolveScore; targets: SurfaceTargets; motion: boolean }) {
  const points = useRef<Points>(null)
  const material = useRef<ShaderMaterial>(null)
  const pair = useRef<{ from: SurfaceTarget; to: SurfaceTarget } | null>(null)
  const pointCount = targets.pointCount || surfacePointCount
  const geometry = useMemo(() => {
    const seeds = Float32Array.from({ length: pointCount }, (_, i) => (i * 0.61803398875) % 1)
    return new BufferGeometry()
      .setAttribute('position', new Float32BufferAttribute(new Float32Array(pointCount * 3), 3))
      .setAttribute('aTarget', new Float32BufferAttribute(new Float32Array(pointCount * 3), 3))
      .setAttribute('aSeed', new Float32BufferAttribute(seeds, 1))
  }, [pointCount])
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uFlux: { value: 0 }, uMix: { value: 0 }, uDpr: { value: 1 }, uOpacity: { value: 1 }, uDock: { value: 0 }, uAssembly: { value: 0 }, uWavePhase: { value: 0 }, uAspect: { value: 1 }, uFrom: { value: new Matrix4() }, uTo: { value: new Matrix4() }, uViolet: { value: new Color(studioPalette.dust) }, uLavender: { value: new Color(studioPalette.amethyst) }, uPearl: { value: new Color(studioPalette.pearl) }, uSignal: { value: new Color(studioPalette.signal) } }), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  // Missing surfaces retain the solid transition instead of leaving a gap.
  useFrame(() => {
    const pair = dissolvePair(score)
    const ready = targets.has(pair.from) && targets.has(pair.to)
    score.organizationDissolve = motion && ready && !pair.docking ? score.organizationFlux * 0.38 : 0
    score.dissolve = motion && ready ? pair.dissolve : 0
  }, -2)
  useFrame(({ gl }) => {
    if (!points.current || !material.current) return
    const transition = dissolvePair(score)
    const from = targets.get(transition.from), to = targets.get(transition.to)
    const inContent = score.content.amount > 0
    const opacity = score.exitOpacity * (inContent ? 0.48 : 1)
    const active = motion && score.active && transition.flux * opacity > 0.008 && !!from && !!to
    const heroHandoff = score.handoff > 0 && score.handoff < 1
    const density = score.opening > 0 || heroHandoff || inContent ? 0.38 : 1
    const drawCount = Math.floor(pointCount * density)
    points.current.visible = active
    gl.domElement.dataset.dissolvePoints = active ? String(drawCount) : '0'
    gl.domElement.dataset.dustPalette = 'orchid-lavender-pearl'
    if (!active || !from || !to) return
    if (pair.current?.from !== from || pair.current?.to !== to) {
      const origin = geometry.attributes.position as Float32BufferAttribute
      const destination = geometry.attributes.aTarget as Float32BufferAttribute
      origin.copyArray(from.points); origin.needsUpdate = true
      destination.copyArray(to.points); destination.needsUpdate = true
      pair.current = { from, to }
    }
    geometry.setDrawRange(0, drawCount)
    from.root.updateWorldMatrix(true, false); to.root.updateWorldMatrix(true, false)
    const shader = material.current.uniforms
    shader.uFrom.value.copy(from.root.matrixWorld); shader.uTo.value.copy(to.root.matrixWorld)
    shader.uTime.value = score.elapsed; shader.uFlux.value = transition.flux
    shader.uMix.value = transition.mix; shader.uDpr.value = gl.getPixelRatio()
    shader.uOpacity.value = opacity; shader.uDock.value = transition.docking
    shader.uAssembly.value = score.opening
    shader.uWavePhase.value = score.wavePhase
    shader.uAspect.value = score.viewport.width / Math.max(1, score.viewport.height)
  }, 0.5)
  return <points ref={points} geometry={geometry} frustumCulled={false} renderOrder={4}>
    <shaderMaterial ref={material} uniforms={uniforms} transparent depthWrite={false}
      vertexShader={`attribute vec3 aTarget; attribute float aSeed;
        uniform float uTime, uFlux, uMix, uDpr, uDock, uAssembly, uWavePhase, uAspect; uniform mat4 uFrom, uTo;
        varying float vLight;
        ${silkHeight}
        void main() {
          vec3 a = (uFrom * vec4(position, 1.0)).xyz;
          vec3 b = (uTo * vec4(aTarget, 1.0)).xyz;
          float travel = smoothstep(0.08, 0.92, uMix);
          float angle = aSeed * 62.83185 + uTime * 0.09;
          vec3 scatter = vec3(cos(angle), sin(angle * 1.7), sin(angle * 0.7));
          // A rising curved ribbon links both silhouettes, then settles onto
          // the destination. The same path reverses with the scroll playhead.
          float arc = sin(travel * 3.14159);
          vec3 drift = vec3(arc * (aSeed - 0.5) * 0.45, arc * 0.24, 0.0) + scatter * (0.18 + aSeed * 0.48);
          vec3 guided = scatter * vec3(0.23 + aSeed * 0.33, 0.13, 0.12) + vec3(0.0, arc * 0.14, 0.0);
          vec3 p = mix(a, b, travel) + mix(drift, guided, uDock) * uFlux;
          vec4 view = modelViewMatrix * vec4(p, 1.0);
          vec4 clip = projectionMatrix * view;
          vec2 screen = clip.xy / clip.w;
          if (uAssembly > 0.0) {
            // Dust leaves the edges and converges on the sculpture's sampled surface.
            vec2 direction = vec2(cos(aSeed * 181.3), sin(aSeed * 181.3));
            vec2 edge = direction / max(abs(direction.x), abs(direction.y)) * (0.96 + aSeed * 0.31);
            float catchUp = smoothstep(0.025, 0.74, 1.0 - uAssembly - aSeed * 0.12);
            screen = mix(edge, screen, catchUp);
            float crest = silkHeight(screen.x * 0.5 + 0.5, uWavePhase, mod(floor(aSeed * 27.0), 3.0), uAspect);
            screen.y = mix(screen.y, crest * 2.0 - 1.0, 0.38 * sin(catchUp * 3.14159));
            clip.z = mix(clip.w * 0.9985, clip.z, catchUp);
          } else {
            float crest = silkHeight(screen.x * 0.5 + 0.5, uWavePhase, 1.0, uAspect);
            float stream = uFlux * (0.06 + aSeed * 0.13);
            screen.y = mix(screen.y, crest * 2.0 - 1.0, stream);
            screen.x += sin(screen.y * 4.3 - uWavePhase) * uFlux * (0.02 + 0.06 * aSeed);
          }
          clip.xy = screen * clip.w;
          gl_Position = clip;
          gl_PointSize = clamp((1.05 + aSeed) * 10.0 / -view.z, 1.15, 2.8) * uDpr;
          vLight = aSeed;
        }`}
      fragmentShader={`uniform float uFlux, uOpacity, uDock; uniform vec3 uViolet, uLavender, uPearl, uSignal; varying float vLight;
        void main() {
          float radius = length(gl_PointCoord - 0.5);
          float disc = 1.0 - smoothstep(0.2, 0.5, radius);
          vec3 colour = mix(uViolet, uLavender, smoothstep(0.12, 0.92, vLight));
          colour = mix(colour, uPearl, (1.0 - smoothstep(0.0, 0.13, radius)) * step(0.8, vLight));
          colour = mix(colour, uSignal, step(mix(0.95, 0.91, uDock), vLight) * 0.78);
          gl_FragColor = vec4(colour, disc * uFlux * uOpacity * 0.96);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`} />
  </points>
}
