import type { ModelId } from '../data/assets'
import { assetUrl } from '../data/profile'
import { technologyIcon } from '../data/technologies'
import { organizations } from '../data/organizations'

// Ordinary DOM owns the layout and the fallback. One shared canvas renders
// into these windows; the canvas never captures a link, button, or touch scroll.
export function SceneWindow({ id, chapter, className = '', technology = 'React.js', organization }: { id: ModelId; chapter: string; className?: string; technology?: string; organization?: number }) {
  return <div className={`scene-window ${className}`} data-scene={chapter} data-scene-model={organization !== undefined ? 'organization' : id} data-technology={id === 'react-js' ? technology : undefined} aria-hidden="true">
    {organization !== undefined ? <div className="scene-poster organization-static"><img src={organizations[organization].logo} alt="" width="260" height="260" loading="lazy" /></div> : id === 'react-js' ? <div className="scene-poster react-static"><img src={technologyIcon(technology)} alt="" width="128" height="128" /></div> : <img className="scene-poster" src={assetUrl(`posters/${id}.jpg`)} alt="" width="960" height="760" loading={chapter === 'intro' ? 'eager' : 'lazy'} />}
    <span className="scene-window-glow" />
  </div>
}
