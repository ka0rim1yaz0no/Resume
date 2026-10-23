import { ModelStage } from '../components/ModelStage'
import { allModelIds, type ModelId } from '../data/assets'

export default function ModelPreview() {
  const requested = new URLSearchParams(window.location.search).get('model') as ModelId
  const id = allModelIds.includes(requested) ? requested : 'systems-sculpture'
  return <div className={`poster-preview poster-${id}`}><ModelStage id={id} activeMotion={false} /></div>
}
