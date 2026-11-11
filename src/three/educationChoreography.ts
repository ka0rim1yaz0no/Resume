import { clamp, type StageRect } from './choreography'
import { contentDust, dockProgress, dockSlide, dockWeight } from './contentChoreography'
import { experienceFocus, experienceReader, experienceScrollTarget } from './experienceChoreography'

export const schoolSurfaceIndex = 10

export function educationChapter(focus: number) {
  const mix = clamp(focus)
  return { ...contentDust(mix), lock: dockProgress(mix, mix < 0.5) }
}

export function educationPose(focus: number, index: number, compact: boolean, entryProgress = 1) {
  const mix = clamp(focus), leaving = index === 0
  const offset = dockSlide(mix, leaving)
  const entryGlide = (1 - entryProgress) ** 2 * (compact ? 0.42 : 0.62)
  return { weight: dockWeight(mix, leaving), x: offset * (compact ? 0.29 : 0.52) + entryGlide, y: -offset * 0.085, ry: -offset * 0.21 }
}

/** Finish the entrance once the viewer is fully on screen with room below it. */
export function educationEntryProgress(rect: StageRect, header: number, height: number) {
  const room = Math.min(rect.height, height - header)
  return room > 0 ? clamp(((height - rect.top) / room - 0.32) / 1.22) : 1
}

/** Reserve lateral travel for narrow viewers using their size, independent of scroll. */
export const educationFrameScale = (aspect: number) => Math.min(1, aspect / 1.08)

// The education records sit below their viewer at every breakpoint.
export function educationReader(height: number, header: number, sceneHeight: number, pinned = true) {
  return experienceReader(height, header, pinned ? sceneHeight : 0, pinned)
}

export function educationScrollTarget(top: number, entryHeight: number, height: number, header: number, sceneHeight: number, pinned = true) {
  return pinned ? experienceScrollTarget(top, entryHeight, height, header, sceneHeight, true) : top - header - 24
}

/** A mobile story pins the viewer and its details together in separate rows. */
export function educationStoryFocus(scroll: number, start: number, distance: number) {
  return experienceFocus([start, start + Math.max(1, distance)], scroll)
}

export function educationStoryTarget(index: number, start: number, distance: number) {
  return start + Math.max(1, distance) * (index === 0 ? 0.1 : 0.9)
}
