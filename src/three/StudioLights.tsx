import { studioLighting } from './studioMaterials'

export function StudioLights() {
  return <>
    <ambientLight intensity={studioLighting.ambient} />
    <directionalLight position={[3, 5, 6]} intensity={studioLighting.key} color="#fffdf7" />
    <directionalLight position={[-5, 2, 3]} intensity={studioLighting.fill} color="#eef3f1" />
    <directionalLight position={[1, 3, -4]} intensity={studioLighting.rim} color="#ecddbb" />
  </>
}
