import { blend, type StageRect } from './choreography'
import { openingDock } from './sculptureAssembly'

// The opening owns the screen: fragments arrive from its perimeter and lock
// at the centre before the same viewport glides into the normal hero dock.
export function openingFrame(width: number, height: number, header: number): StageRect {
  const edge = width <= 650 ? 12 : 24
  return { left: edge, top: header + 12, width: width - edge * 2, height: Math.max(100, height - header - 160) }
}

export function openingViewport(hero: StageRect, frame: StageRect, progress: number): StageRect {
  const dock = openingDock(progress)
  return { left: blend(hero.left, frame.left, dock), top: blend(hero.top, frame.top, dock), width: blend(hero.width, frame.width, dock), height: blend(hero.height, frame.height, dock) }
}
