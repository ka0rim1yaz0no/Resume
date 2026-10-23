import { schools } from '../data/schools'
import { useModelExploration } from '../hooks/useModelExploration'
import { Icon } from './Icon'

const resetView = () => {}

export function EducationExplorer({ index, active }: { index: number; active: boolean }) {
  const school = schools[index]
  const exploration = useModelExploration(school.id, resetView)
  const help = `explore-${school.id}-help`
  return <div className="education-exploration" hidden={!active}>
    <div ref={exploration.ref} className="school-explorer" data-school-explorer={index}
      role="group" tabIndex={0} aria-label={`Explore ${school.shortName} 3D emblem`} aria-describedby={help}
      onPointerDown={exploration.onPointerDown} onPointerMove={exploration.onPointerMove}
      onPointerUp={exploration.onPointerUp} onPointerCancel={exploration.onPointerCancel}
      onLostPointerCapture={exploration.onLostPointerCapture} onKeyDown={exploration.onKeyDown} />
    <span id={help} className="sr-only">Drag to rotate and tilt. On touch screens, swipe horizontally to rotate and vertically to scroll. Arrow keys rotate, plus and minus zoom, and R resets the view.</span>
    <div className="company-explorer-controls" role="group" aria-label={`${school.shortName} emblem controls`}>
      <span>Drag to explore</span><div>
        <button className="icon-button" onClick={() => exploration.rotate(-1)} aria-label={`Rotate ${school.shortName} emblem left`}><span aria-hidden="true">↶</span></button>
        <button className="icon-button" onClick={() => exploration.rotate(1)} aria-label={`Rotate ${school.shortName} emblem right`}><span aria-hidden="true">↷</span></button>
        <button className="icon-button" onClick={exploration.reset} aria-label={`Reset ${school.shortName} emblem view`}><Icon name="reset" /></button>
      </div>
    </div>
  </div>
}
