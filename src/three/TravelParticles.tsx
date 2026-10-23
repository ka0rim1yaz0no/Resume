import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, Float32BufferAttribute, Matrix4, Points, ShaderMaterial } from 'three'
import { surfacePointCount, type SurfaceTarget, type SurfaceTargets } from './surfaceCloud'

type DissolveScore = { active: boolean; flux: number; elapsed: number; dissolve: number; particleFrom: number; particleTo: number; particleMix: number; skillFlux: number; skillMix: number; skillFrom: number; skillTo: number; organizationFlux: number; organizationDissolve: number; organizationFrom: number; organizationTo: number; organizationMix: number }

function dissolvePair(score: DissolveScore) {
  return score.organizationFlux > 0.001
    ? { from: score.organizationFrom, to: score.organizationTo, flux: score.organizationFlux, mix: score.organizationMix, attenuation: 1 }
    : score.skillFlux > 0
    ? { from: score.skillFrom, to: score.skillTo, flux: score.skillFlux, mix: score.skillMix, attenuation: 1 }
    : { from: score.particleFrom, to: score.particleTo, flux: score.flux, mix: score.particleMix, attenuation: 0.88 }
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
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uFlux: { value: 0 }, uMix: { value: 0 }, uDpr: { value: 1 }, uFrom: { value: new Matrix4() }, uTo: { value: new Matrix4() } }), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  // Missing surfaces retain the solid transition instead of leaving a gap.
  useFrame(() => {
    const pair = dissolvePair(score)
    const ready = targets.has(pair.from) && targets.has(pair.to)
    score.organizationDissolve = motion && ready ? score.organizationFlux : 0
    score.dissolve = score.organizationFlux > 0.001 ? 0 : motion && ready ? pair.flux * pair.attenuation : 0
  }, -2)
  useFrame(({ gl }) => {
    if (!points.current || !material.current) return
    const transition = dissolvePair(score)
    const from = targets.get(transition.from), to = targets.get(transition.to)
    const active = motion && score.active && transition.flux > 0.008 && !!from && !!to
    points.current.visible = active
    gl.domElement.dataset.dissolvePoints = active ? String(pointCount) : '0'
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
  }, 0.5)
  return <points ref={points} geometry={geometry} frustumCulled={false} renderOrder={4}>
    <shaderMaterial ref={material} uniforms={uniforms} transparent depthWrite={false}
      vertexShader={`attribute vec3 aTarget; attribute float aSeed;
        uniform float uTime, uFlux, uMix, uDpr; uniform mat4 uFrom, uTo;
        varying float vLight;
        void main() {
          vec3 a = (uFrom * vec4(position, 1.0)).xyz;
          vec3 b = (uTo * vec4(aTarget, 1.0)).xyz;
          float travel = smoothstep(0.12, 0.88, uMix);
          float angle = aSeed * 62.83185 + uTime * 0.09;
          vec3 scatter = vec3(cos(angle), sin(angle * 1.7), sin(angle * 0.7));
          vec3 p = mix(a, b, travel) + scatter * uFlux * (0.25 + aSeed * 0.55);
          vec4 view = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * view;
          gl_PointSize = clamp((1.2 + aSeed) * 12.0 / -view.z, 1.4, 4.2) * uDpr;
          vLight = aSeed;
        }`}
      fragmentShader={`uniform float uFlux; varying float vLight;
        void main() {
          float disc = 1.0 - smoothstep(0.18, 0.5, length(gl_PointCoord - 0.5));
          vec3 colour = mix(vec3(0.47, 0.68, 0.56), vec3(0.87, 0.9, 0.78), vLight);
          gl_FragColor = vec4(colour, disc * uFlux * 0.88);
        }`} />
  </points>
}
