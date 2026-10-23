import { describe, expect, it } from 'vitest'
import { advanceSkillTransition, createSkillTransition, skillDissolve } from '../three/skillTransition'

describe('capability surface dissolve', () => {
  it('keeps the outgoing logo until fully dissolved, then waits for the incoming visual', () => {
    const state = createSkillTransition('React.js')
    advanceSkillTransition(state, 'JavaScript', 0.05, true, true)
    expect(state.displayed).toBe('React.js')
    expect(skillDissolve(state)).toBeGreaterThan(0)
    while (state.phase === 'out') advanceSkillTransition(state, 'JavaScript', 0.05, true, true)
    expect(state.displayed).toBe('JavaScript')
    expect(state.phase).toBe('hold')
    expect(skillDissolve(state)).toBe(1)
    advanceSkillTransition(state, 'JavaScript', 0.05, true, false)
    expect(state.progress).toBe(0.5)
    for (let i = 0; i < 20; i++) advanceSkillTransition(state, 'JavaScript', 0.05, true, true)
    expect(state.phase).toBe('idle')
    expect(skillDissolve(state)).toBe(0)
  })

  it('returns to the original React GLB through the same hidden midpoint', () => {
    const state = createSkillTransition('JavaScript')
    for (let i = 0; i < 12; i++) advanceSkillTransition(state, 'React.js', 0.05, true, true)
    expect(state.displayed).toBe('React.js')
    expect(skillDissolve(state)).toBeCloseTo(1)
    for (let i = 0; i < 20; i++) advanceSkillTransition(state, 'React.js', 0.05, true, true)
    expect(state).toMatchObject({ displayed: 'React.js', phase: 'idle', progress: 1 })
  })

  it('retargets rapid clicks without exposing an intermediate logo', () => {
    const state = createSkillTransition('React.js')
    advanceSkillTransition(state, 'JavaScript', 0.05, true, true)
    advanceSkillTransition(state, 'HTML', 0.05, true, true)
    advanceSkillTransition(state, 'CSS', 0.05, true, true)
    expect(state.displayed).toBe('React.js')
    for (let i = 0; i < 30; i++) advanceSkillTransition(state, 'CSS', 0.05, true, true)
    expect(state).toMatchObject({ displayed: 'CSS', phase: 'idle' })
  })

  it('preserves opacity when reversing a partially reformed visual', () => {
    const state = createSkillTransition('React.js')
    for (let i = 0; i < 18; i++) advanceSkillTransition(state, 'HTML', 0.05, true, true)
    const opacity = skillDissolve(state)
    advanceSkillTransition(state, 'CSS', 0, true, true)
    expect(skillDissolve(state)).toBeCloseTo(opacity)
    expect(state.displayed).toBe('HTML')
  })

  it('settles immediately when motion is paused or the stage is off screen', () => {
    const state = createSkillTransition('React.js')
    advanceSkillTransition(state, 'JavaScript', 0.05, true, true)
    advanceSkillTransition(state, 'Microsoft Office 365', 0.05, false, false)
    expect(state).toMatchObject({ displayed: 'Microsoft Office 365', phase: 'idle', progress: 1 })
    expect(skillDissolve(state)).toBe(0)
  })
})
