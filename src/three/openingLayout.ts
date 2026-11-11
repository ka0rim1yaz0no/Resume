import { blend, type StageRect } from './choreography'
import { openingDock } from './sculptureAssembly'

export function openingViewport(hero: StageRect, frame: StageRect, progress: number): StageRect {
  const dock = openingDock(progress)
  const lift = Math.sin(Math.PI * dock) ** 2 * Math.min(32, Math.abs(hero.left - frame.left) * 0.065)
  return { left: blend(hero.left, frame.left, dock), top: blend(hero.top, frame.top, dock) - lift, width: blend(hero.width, frame.width, dock), height: blend(hero.height, frame.height, dock) }
}
