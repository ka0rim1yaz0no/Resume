import type { PerspectiveCamera } from 'three'
import { blend, type StageRect } from './choreography'
import { openingDock } from './sculptureAssembly'

export function openingViewport(hero: StageRect, frame: StageRect, progress: number): StageRect {
  const dock = openingDock(progress)
  const lift = Math.sin(Math.PI * dock) ** 2 * Math.min(32, Math.abs(hero.left - frame.left) * 0.065)
  return { left: blend(hero.left, frame.left, dock), top: blend(hero.top, frame.top, dock) - lift, width: blend(hero.width, frame.width, dock), height: blend(hero.height, frame.height, dock) }
}

/** Keep the hero's pixel scale while showing the wider opening stage around it. */
export function frameOpeningCamera(camera: PerspectiveCamera, viewport: StageRect, hero: StageRect) {
  const width = Math.min(hero.width, viewport.width)
  const height = Math.min(hero.height, viewport.height)
  const view = camera.view
  if (view?.enabled && camera.aspect === width / height && view.fullWidth === width && view.fullHeight === height && view.width === viewport.width && view.height === viewport.height) return
  camera.setViewOffset(width, height, (width - viewport.width) / 2, (height - viewport.height) / 2, viewport.width, viewport.height)
}
