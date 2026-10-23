import { studioLighting } from './studioMaterials'

export function StudioLights() {
  return <>
    <ambientLight intensity={studioLighting.ambient} />
    <directionalLight position={[3, 5, 6]} intensity={studioLighting.key} color="#f2f0e5" />
    <directionalLight position={[-5, 2, 3]} intensity={studioLighting.fill} color="#d4e4d9" />
    <directionalLight position={[1, 3, -4]} intensity={studioLighting.rim} color="#bed1cc" />
  </>
}
