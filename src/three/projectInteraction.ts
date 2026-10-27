export const projectPickRequest = 'project-pick'
export const projectPickSelected = 'project-part-selected'
export type ProjectPickPoint = { clientX: number; clientY: number; pointerType: string }
type PointerSample = ProjectPickPoint & { pointerId: number; button: number; isPrimary: boolean }

/** Observe taps without capturing pointers or cancelling native scrolling. */
export function createProjectTap() {
  let start: (PointerSample & { scroll: number }) | null = null
  return {
    begin(event: PointerSample, scroll: number) {
      start = event.isPrimary && event.button === 0 ? { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, pointerType: event.pointerType, button: event.button, isPrimary: event.isPrimary, scroll } : null
    },
    move(event: Pick<PointerSample, 'pointerId' | 'clientX' | 'clientY'>) {
      if (start?.pointerId === event.pointerId && Math.hypot(event.clientX - start.clientX, event.clientY - start.clientY) > 8) start = null
    },
    end(event: PointerSample, scroll: number): ProjectPickPoint | null {
      const initial = start
      start = null
      if (!initial || initial.pointerId !== event.pointerId || !event.isPrimary || Math.abs(initial.scroll - scroll) > 4 || Math.hypot(event.clientX - initial.clientX, event.clientY - initial.clientY) > 8) return null
      return { clientX: event.clientX, clientY: event.clientY, pointerType: event.pointerType }
    },
    cancel() { start = null },
  }
}
