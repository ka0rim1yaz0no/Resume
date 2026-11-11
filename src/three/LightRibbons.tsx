import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Mesh, ShaderMaterial } from 'three'
import { openingWave, ribbonHeight, transferEnergy } from './waveMotion'
import { studioPalette } from './studioMaterials'

type RibbonScore = { active: boolean; exitOpacity: number; opening: number; handoff: number; wavePhase: number; flux: number; skillFlux: number; organizationFlux: number; educationFlux: number }

function ribbonGeometry(mobile: boolean) {
  const columns = mobile ? 28 : 44
  const rows = mobile ? 7 : 10
  const positions: number[] = [], triangles: number[] = []
  for (let band = 0; band < 3; band++) {
    const start = positions.length / 3
    for (let row = 0; row <= rows; row++) {
      for (let col = 0; col <= columns; col++) {
        positions.push(col / columns, 2 * row / rows - 1, band)
        if (row === rows || col === columns) continue
        const a = start + row * (columns + 1) + col
        const b = a + columns + 1
        triangles.push(a, a + 1, b, a + 1, b + 1, b)
      }
    }
  }
  return new BufferGeometry().setAttribute('position', new Float32BufferAttribute(positions, 3)).setIndex(triangles)
}

export function LightRibbons({ score, motion, mobile }: { score: RibbonScore; motion: boolean; mobile: boolean }) {
  const mesh = useRef<Mesh>(null)
  const material = useRef<ShaderMaterial>(null)
  const geometry = useMemo(() => ribbonGeometry(mobile), [mobile])
  const uniforms = useMemo(() => ({
    uPhase: { value: 0 }, uEnergy: { value: 0 }, uCompact: { value: mobile ? 1 : 0 },
    uPlum: { value: new Color('#7025b5') }, uOrchid: { value: new Color(studioPalette.dust) }, uLavender: { value: new Color(studioPalette.pearl) },
  }), [mobile])
  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame(({ gl }) => {
    if (!mesh.current || !material.current) return
    const dust = Math.max(score.flux, score.skillFlux, score.organizationFlux, score.educationFlux, 0.64 * transferEnergy(score.handoff))
    const strength = score.opening > 0 ? openingWave(score.opening) : 0.82 * dust
    const energy = motion && score.active ? strength * score.exitOpacity : 0
    mesh.current.visible = energy > 0.007
    material.current.uniforms.uPhase.value = score.wavePhase
    material.current.uniforms.uEnergy.value = energy
    const diagnostic = energy.toFixed(3)
    if (gl.domElement.dataset.waveStrength !== diagnostic) gl.domElement.dataset.waveStrength = diagnostic
  }, 0.35)

  // Far clip-space depth lets the model occlude the translucent ribbons.
  return <mesh ref={mesh} geometry={geometry} visible={false} frustumCulled={false} renderOrder={-8} userData={{ screenSpace: true }}>
    <shaderMaterial ref={material} uniforms={uniforms} transparent depthWrite={false} side={DoubleSide} forceSinglePass toneMapped={false}
      vertexShader={/* glsl */ `
        uniform float uPhase, uCompact;
        varying vec3 vRibbon;
        varying float vFold;
        ${ribbonHeight}
        void main() {
          float band = position.z;
          float x = position.x * 1.23 - 0.115;
          float edge = position.y;
          float fold = sin(x * 6.6 + uPhase * 0.68 + band * 2.18);
          float breadth = (0.137 + 0.052 * sin(x * 8.4 - uPhase * 0.73 + band)) * mix(1.0, 0.84, uCompact);
          float y = ribbonHeight(x, uPhase, band) + breadth * edge * (0.71 + 0.29 * fold)
            + edge * edge * 0.055 * fold;
          x += edge * 0.059 * sin(x * 5.3 - uPhase * 0.75 + band);
          vRibbon = position;
          vFold = fold;
          gl_Position = vec4(vec2(x, y) * 2.0 - 1.0, 0.999, 1.0);
        }
      `}
      fragmentShader={/* glsl */ `
        uniform float uPhase, uEnergy, uCompact;
        uniform vec3 uPlum, uOrchid, uLavender;
        varying vec3 vRibbon;
        varying float vFold;
        void main() {
          float along = vRibbon.x;
          float across = vRibbon.y;
          float sheet = 1.0 - smoothstep(0.05, 1.0, abs(across));
          float crease = abs(across - 0.48 * vFold);
          float light = 1.0 - smoothstep(0.035, 0.18, crease);
          float glint = 1.0 - smoothstep(0.009, 0.047, crease);
          float lines = smoothstep(0.72, 1.0, sin(across * 23.0 - vFold * 2.0));
          float sweep = 0.47 + 0.53 * smoothstep(-0.8, 0.85, sin(along * 8.1 - uPhase * 0.81 + vRibbon.z * 1.92));
          float ends = smoothstep(0.0, 0.12, along) * (1.0 - smoothstep(0.88, 1.0, along));
          float alpha = ends * sheet * sweep * (0.29 + 0.38 * light + 0.16 * lines + 0.19 * glint) * uEnergy * mix(1.0, 0.80, uCompact);
          vec3 color = mix(uPlum, uOrchid, 0.49 + 0.24 * vFold);
          color = mix(color, uLavender, 0.46 * light + 0.16 * lines + 0.22 * glint);
          gl_FragColor = vec4(color, alpha);
          #include <colorspace_fragment>
        }
      `} />
  </mesh>
}
