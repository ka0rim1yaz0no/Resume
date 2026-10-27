import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, Color, Float32BufferAttribute, Matrix4, Points, ShaderMaterial } from 'three'
import { surfacePointCount, type SurfaceTarget, type SurfaceTargets } from './surfaceCloud'
import { studioPalette } from './studioMaterials'

type DissolveScore = { active: boolean; exitOpacity: number; flux: number; elapsed: number; dissolve: number; particleFrom: number; particleTo: number; particleMix: number; skillFlux: number; skillMix: number; skillFrom: number; skillTo: number; organizationFlux: number; organizationDissolve: number; organizationFrom: number; organizationTo: number; organizationMix: number; educationFlux: number; educationDissolve: number; educationFrom: number; educationTo: number; educationMix: number }

function dissolvePair(score: DissolveScore) {
  return score.educationFlux > 0.001
    ? { from: score.educationFrom, to: score.educationTo, flux: score.educationFlux, mix: score.educationMix, attenuation: 1 }
    : score.organizationFlux > 0.001
    ? { from: score.organizationFrom, to: score.organizationTo, flux: score.organizationFlux, mix: score.organizationMix, attenuation: 1 }
    : score.skillFlux > 0
    ? { from: score.skillFrom, to: score.skillTo, flux: score.skillFlux, mix: score.skillMix, attenuation: 1 }
    : { from: score.particleFrom, to: score.particleTo, flux: score.flux, mix: score.particleMix, attenuation: 0.78 }
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
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uFlux: { value: 0 }, uMix: { value: 0 }, uDpr: { value: 1 }, uOpacity: { value: 1 }, uFrom: { value: new Matrix4() }, uTo: { value: new Matrix4() }, uViolet: { value: new Color(studioPalette.dust) }, uLavender: { value: new Color(studioPalette.amethyst) }, uPearl: { value: new Color(studioPalette.pearl) }, uSignal: { value: new Color(studioPalette.signal) } }), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  // Missing surfaces retain the solid transition instead of leaving a gap.
  useFrame(() => {
    const pair = dissolvePair(score)
    const ready = targets.has(pair.from) && targets.has(pair.to)
    score.organizationDissolve = motion && ready ? score.organizationFlux * 0.9 : 0
    score.educationDissolve = motion && ready ? score.educationFlux * 0.9 : 0
    score.dissolve = score.organizationFlux > 0.001 || score.educationFlux > 0.001 ? 0 : motion && ready ? pair.flux * pair.attenuation : 0
  }, -2)
  useFrame(({ gl }) => {
    if (!points.current || !material.current) return
    const transition = dissolvePair(score)
    const from = targets.get(transition.from), to = targets.get(transition.to)
    const active = motion && score.active && transition.flux > 0.008 && !!from && !!to
    points.current.visible = active
    gl.domElement.dataset.dissolvePoints = active ? String(pointCount) : '0'
    gl.domElement.dataset.dustPalette = 'violet-pearl-citron'
    if (!active || !from || !to) return
    if (pair.current?.from !== from || pair.current?.to !== to) {
      const origin = geometry.attributes.position as Float32BufferAttribute
      const destination = geometry.attributes.aTarget as Float32BufferAttribute
      origin.copyArray(from.points); origin.needsUpdate = true
      destination.copyArray(to.points); destination.needsUpdate = true
      pair.current = { from, to }
    }
    geometry.setDrawRange(0, pointCount)
    from.root.updateWorldMatrix(true, false); to.root.updateWorldMatrix(true, false)
    const shader = material.current.uniforms
    shader.uFrom.value.copy(from.root.matrixWorld); shader.uTo.value.copy(to.root.matrixWorld)
    shader.uTime.value = score.elapsed; shader.uFlux.value = transition.flux
    shader.uMix.value = transition.mix; shader.uDpr.value = gl.getPixelRatio()
    shader.uOpacity.value = score.exitOpacity
  }, 0.5)
  return <points ref={points} geometry={geometry} frustumCulled={false} renderOrder={4}>
    <shaderMaterial ref={material} uniforms={uniforms} transparent depthWrite={false}
      vertexShader={`attribute vec3 aTarget; attribute float aSeed;
        uniform float uTime, uFlux, uMix, uDpr; uniform mat4 uFrom, uTo;
        varying float vLight;
        void main() {
          vec3 a = (uFrom * vec4(position, 1.0)).xyz;
          vec3 b = (uTo * vec4(aTarget, 1.0)).xyz;
          float travel = smoothstep(0.08, 0.92, uMix);
          float angle = aSeed * 62.83185 + uTime * 0.09;
          vec3 scatter = vec3(cos(angle), sin(angle * 1.7), sin(angle * 0.7));
          // A rising curved ribbon links both silhouettes, then settles onto
          // the destination. The same path reverses with the scroll playhead.
          vec3 arc = vec3(sin(travel * 3.14159) * (aSeed - 0.5) * 0.45, sin(travel * 3.14159) * 0.24, 0.0);
          vec3 p = mix(a, b, travel) + arc * uFlux + scatter * uFlux * (0.18 + aSeed * 0.48);
          vec4 view = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * view;
          gl_PointSize = clamp((1.05 + aSeed) * 10.0 / -view.z, 1.15, 2.8) * uDpr;
          vLight = aSeed;
        }`}
      fragmentShader={`uniform float uFlux, uOpacity; uniform vec3 uViolet, uLavender, uPearl, uSignal; varying float vLight;
        void main() {
          float radius = length(gl_PointCoord - 0.5);
          float disc = 1.0 - smoothstep(0.2, 0.5, radius);
          vec3 colour = mix(uViolet, uLavender, smoothstep(0.12, 0.92, vLight));
          colour = mix(colour, uPearl, (1.0 - smoothstep(0.0, 0.13, radius)) * step(0.8, vLight));
          colour = mix(colour, uSignal, step(0.95, vLight) * 0.7);
          gl_FragColor = vec4(colour, disc * uFlux * uOpacity * 0.96);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`} />
  </points>
}
