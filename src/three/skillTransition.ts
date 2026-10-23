export type SkillTransition = { displayed: string; from: string; to: string; progress: number; phase: 'idle' | 'out' | 'hold' | 'in' }

export function createSkillTransition(technology: string): SkillTransition {
  return { displayed: technology, from: technology, to: technology, progress: 1, phase: 'idle' }
}

/** One visible solid at a time. Retargeting mirrors the dissolve envelope,
 * preserving opacity; the halfway hold waits for incoming emblem geometry. */
export function advanceSkillTransition(state: SkillTransition, requested: string, delta: number, animate: boolean, ready: boolean) {
  if (!animate) {
    Object.assign(state, createSkillTransition(requested))
    return
  }
  if (state.phase === 'idle' && requested !== state.displayed) {
    state.from = state.displayed; state.to = requested; state.progress = 0; state.phase = 'out'
  }
  if (state.phase === 'in' && requested !== state.displayed) {
    state.from = state.displayed; state.to = requested; state.progress = 1 - state.progress; state.phase = 'out'
  }
  if (state.phase === 'out') {
    state.to = requested
    if (requested === state.displayed) { state.progress = 1 - state.progress; state.phase = 'in' }
    else {
      state.progress = Math.min(0.5, state.progress + Math.min(delta, 0.05) / 1.2)
      if (state.progress === 0.5) { state.displayed = state.to; state.phase = 'hold' }
      return
    }
  }
  if (state.phase === 'hold') {
    if (requested !== state.displayed) { state.to = requested; state.displayed = requested; return }
    if (!ready) return
    state.phase = 'in'
  }
  if (state.phase === 'in') {
    state.progress = Math.min(1, state.progress + Math.min(delta, 0.05) / 1.2)
    if (state.progress === 1) { state.phase = 'idle'; state.from = state.displayed; state.to = state.displayed }
  }
}

export function skillDissolve(state: SkillTransition) {
  return state.phase === 'idle' ? 0 : Math.sin(state.progress * Math.PI) ** 2
}
