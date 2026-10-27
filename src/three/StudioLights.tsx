import { studioLightColors, studioLighting } from './studioMaterials'

export function StudioLights() {
  return <>
    <ambientLight intensity={studioLighting.ambient} />
    <directionalLight position={[3, 5, 6]} intensity={studioLighting.key} color={studioLightColors.key} />
    <directionalLight position={[-5, 2, 3]} intensity={studioLighting.fill} color={studioLightColors.fill} />
    <directionalLight position={[1, 3, -4]} intensity={studioLighting.rim} color={studioLightColors.rim} />
  </>
}
