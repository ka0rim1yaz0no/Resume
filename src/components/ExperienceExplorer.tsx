import { organizations } from '../data/organizations'
import { useModelExploration } from '../hooks/useModelExploration'
import { Icon } from './Icon'

const resetView = () => {}

export function ExperienceExplorer({ index, active }: { index: number; active: boolean }) {
  const org = organizations[index]
  const exploration = useModelExploration(org.id, resetView)
  const help = `explore-${org.id}-help`
  return <div className="experience-exploration" hidden={!active}>
    <div ref={exploration.ref} className="company-explorer" data-organization-explorer={index}
      role="group" tabIndex={0} aria-label={`Explore ${org.shortName} 3D logo`} aria-describedby={help}
      onPointerDown={exploration.onPointerDown} onPointerMove={exploration.onPointerMove}
      onPointerUp={exploration.onPointerUp} onPointerCancel={exploration.onPointerCancel}
      onLostPointerCapture={exploration.onLostPointerCapture} onKeyDown={exploration.onKeyDown} />
    <span id={help} className="sr-only">Drag to rotate and tilt. On touch screens, swipe horizontally to rotate and vertically to scroll. Arrow keys rotate, plus and minus zoom, and R resets the view.</span>
    <div className="company-explorer-controls" role="group" aria-label={`${org.shortName} logo controls`}>
      <span>Drag to explore</span>
      <div>
        <button className="icon-button" onClick={() => exploration.rotate(-1)} aria-label={`Rotate ${org.shortName} logo left`}><span aria-hidden="true">↶</span></button>
        <button className="icon-button" onClick={() => exploration.rotate(1)} aria-label={`Rotate ${org.shortName} logo right`}><span aria-hidden="true">↷</span></button>
        <button className="icon-button" onClick={exploration.reset} aria-label={`Reset ${org.shortName} logo view`}><Icon name="reset" /></button>
      </div>
    </div>
  </div>
}
