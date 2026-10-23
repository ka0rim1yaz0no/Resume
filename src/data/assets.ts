import { assetUrl } from './profile'
import mobileModels from './mobileModels.json'

export const modelRegistry = {
  'systems-sculpture': { label: 'Connected systems', url: assetUrl('models/systems-sculpture.glb'), rotation: [0, -0.25, 0] as [number, number, number], scale: 3.7 },
  'project-laptop': { label: 'Digital experiences', url: assetUrl('models/project-laptop.glb'), rotation: [0.08, -0.3, 0] as [number, number, number], scale: 3.7 },
  'workflow-board': { label: 'Connected workflows', url: assetUrl('models/workflow-board.glb'), rotation: [0, -0.22, 0] as [number, number, number], scale: 3.6 },
  'react-js': { label: 'React.js', url: assetUrl('models/react-js.glb'), rotation: [0.05, -0.15, -0.08] as [number, number, number], scale: 3.6 },
}
export type ModelId = keyof typeof modelRegistry
export function modelUrl(id: ModelId, mobile: boolean) {
  return mobile ? assetUrl(`models/mobile/${mobileModels[id]}`) : modelRegistry[id].url
}
// The established three-shot story keeps its original subjects. React is a
// companion within the Systems scene, rather than a replacement chapter.
export const modelIds: ModelId[] = ['systems-sculpture', 'project-laptop', 'workflow-board']
export const allModelIds = Object.keys(modelRegistry) as ModelId[]
