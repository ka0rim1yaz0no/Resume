import { Camera, Color, DoubleSide, Float32BufferAttribute, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, Scene, ShaderMaterial, Vector2, Vector4, type WebGLRenderer } from 'three'
import type { StageRect } from './choreography'
import { studioPalette } from './studioMaterials'
import { silkHeight } from './waveMotion'

function silkGeometry(mobile: boolean) {
  const columns = mobile ? 32 : 48
  const rows = mobile ? 8 : 11
  const vertices: number[] = [], triangles: number[] = []
  for (let band = 0; band < 3; band++) {
    const start = vertices.length / 3
    for (let row = 0; row <= rows; row++) {
      for (let col = 0; col <= columns; col++) {
        vertices.push(col / columns, 2 * row / rows - 1, band)
        if (row === rows || col === columns) continue
        const a = start + row * (columns + 1) + col
        const b = a + columns + 1
        triangles.push(a, a + 1, b, a + 1, b + 1, b)
      }
    }
  }
  const geometry = new InstancedBufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  geometry.setAttribute('aViewer', new InstancedBufferAttribute(new Float32Array([0, 1]), 1))
  geometry.setIndex(triangles)
  geometry.instanceCount = 1
  return geometry
}

type SilkWindow = { rect: StageRect; energy: number }

/** Draw the light behind the models, in up to two native viewers in one pass. */
export function createSilkLayer(mobile: boolean) {
  const geometry = silkGeometry(mobile)
  const uniforms = {
    uPhase: { value: 0 }, uEnergy: { value: new Vector2() }, uCompact: { value: mobile ? 1 : 0 }, uCanvasAspect: { value: 1 },
    uFirst: { value: new Vector4() }, uNext: { value: new Vector4() },
    uPlum: { value: new Color('#722cb1') }, uOrchid: { value: new Color(studioPalette.dust) }, uLavender: { value: new Color(studioPalette.pearl) },
  }
  const material = new ShaderMaterial({
    uniforms, transparent: true, depthTest: false, depthWrite: false, side: DoubleSide, forceSinglePass: true, toneMapped: false,
    vertexShader: /* glsl */ `
      attribute float aViewer;
      uniform float uPhase, uCanvasAspect;
      uniform vec4 uFirst, uNext;
      uniform vec2 uEnergy;
      varying vec4 vFabric;
      varying vec2 vWindow;
      varying float vEnergy;
      ${silkHeight}
      void main() {
        vec4 viewer = mix(uFirst, uNext, aViewer);
        vEnergy = mix(uEnergy.x, uEnergy.y, aViewer);
        if (vEnergy < 0.003) {
          vFabric = vec4(0.0);
          vWindow = vec2(0.0);
          gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
          return;
        }
        float aspect = uCanvasAspect * viewer.z / max(0.001, viewer.w);
        float band = position.z;
        float along = position.x;
        float across = position.y;
        float x = along * 1.14 - 0.07;
        float fold = sin(x * 8.3 - uPhase * 0.76 + band * 1.73);
        float twist = sin(x * 5.4 - uPhase * 0.96 + band * 1.49);
        float taper = 0.69 + 0.31 * sin(along * 3.14159);
        float width = (0.154 + 0.049 * fold) * taper * (0.86 + 0.14 * step(0.5, band));
        float y = silkHeight(x, uPhase, band, aspect) + across * width * (0.81 + 0.21 * twist)
          + across * across * width * 0.43 * fold;
        x += across * twist * 0.084;
        vFabric = vec4(along, across, band, fold);
        vWindow = vec2(x, y);
        gl_Position = vec4((viewer.xy + vWindow * viewer.zw) * 2.0 - 1.0, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uPhase, uCompact;
      uniform vec3 uPlum, uOrchid, uLavender;
      varying vec4 vFabric;
      varying vec2 vWindow;
      varying float vEnergy;
      void main() {
        vec2 edge = min(vWindow, 1.0 - vWindow);
        if (min(edge.x, edge.y) <= 0.0) discard;
        float along = vFabric.x, across = vFabric.y, band = vFabric.z, fold = vFabric.w;
        float hem = smoothstep(0.0, 0.085, edge.x) * smoothstep(0.0, 0.07, edge.y);
        float body = 1.0 - smoothstep(0.02, 1.0, abs(across));
        float crease = abs(across - 0.31 * fold - 0.11 * sin(along * 4.6 - uPhase * 0.54 + band));
        float sheen = 1.0 - smoothstep(0.035, 0.27, crease);
        float glint = 1.0 - smoothstep(0.012, 0.079, crease);
        float threads = smoothstep(0.55, 1.0, sin(across * 40.0 - fold * 3.1 + uPhase * 0.27));
        float light = 0.81 + 0.19 * sin(along * 6.8 - uPhase * 0.83 + band * 1.67);
        float alpha = hem * body * light * (0.31 + 0.40 * sheen + 0.17 * glint + 0.075 * threads)
          * vEnergy * mix(1.0, 0.83, uCompact);
        vec3 color = mix(uPlum, uOrchid, 0.53 + fold * 0.24);
        color = mix(color, uLavender, sheen * 0.47 + glint * 0.24 + threads * 0.045);
        gl_FragColor = vec4(color, min(alpha, 1.0));
        #include <colorspace_fragment>
      }
    `,
  })
  const mesh = new Mesh(geometry, material)
  mesh.frustumCulled = false
  const scene = new Scene()
  const camera = new Camera()
  scene.add(mesh)
  const place = (uniform: Vector4, rect: StageRect, canvas: StageRect) => uniform.set(
    (rect.left - canvas.left) / canvas.width, 1 - (rect.top - canvas.top + rect.height) / canvas.height,
    rect.width / canvas.width, rect.height / canvas.height,
  )
  return {
    scene, camera,
    draw(gl: WebGLRenderer, canvas: StageRect, phase: number, first: SilkWindow, next: SilkWindow) {
      if (Math.max(first.energy, next.energy) <= 0.003 || canvas.width <= 0 || canvas.height <= 0) return
      uniforms.uCanvasAspect.value = canvas.width / canvas.height
      uniforms.uPhase.value = phase
      uniforms.uEnergy.value.set(first.energy, next.energy)
      place(uniforms.uFirst.value, first.rect, canvas)
      place(uniforms.uNext.value, next.rect, canvas)
      geometry.instanceCount = next.energy > 0.003 ? 2 : 1
      gl.render(scene, camera)
    },
    dispose() { geometry.dispose(); material.dispose() },
  }
}
