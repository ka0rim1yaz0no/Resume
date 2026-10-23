import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'

export default function Effects() {
  return <EffectComposer multisampling={0}><Bloom intensity={0.12} luminanceThreshold={1.5} mipmapBlur /><Vignette eskil={false} offset={0.3} darkness={0.25} /></EffectComposer>
}
