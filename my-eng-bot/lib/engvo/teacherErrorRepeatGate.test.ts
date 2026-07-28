import { describe, expect, it } from 'vitest'
import {
  applyTeacherErrorRepeatGate,
  createTeacherErrorRepeatGateState,
  noteErrorRepeatCompleteDrill,
  noteErrorRepeatUserTry,
  resetTeacherErrorRepeatGate,
  stripTeacherErrorRepeatMarkers,
} from '@/lib/engvo/teacherErrorRepeatGate'

describe('teacherErrorRepeatGate', () => {
  it('arms on first Скажи', () => {
    const state = createTeacherErrorRepeatGateState()
    const r = applyTeacherErrorRepeatGate(
      state,
      'Почти — так: sea — не так: the sea.\nСкажи: I go to the sea.'
    )
    expect(r.armed).toBe(true)
    expect(r.blocked).toBe(false)
    expect(r.shouldAntiLoopReclaim).toBe(false)
    expect(r.state.pendingTarget).toBe('i go to the sea')
    expect(r.state.awaitingUserTry).toBe(true)
  })

  it('arms on Say and You meant', () => {
    const a = applyTeacherErrorRepeatGate(
      createTeacherErrorRepeatGateState(),
      'Close — so: at — not: nothing.\nSay: I work at a school.'
    )
    expect(a.armed).toBe(true)
    expect(a.state.pendingTarget).toContain('work at a school')

    const b = applyTeacherErrorRepeatGate(
      createTeacherErrorRepeatGateState(),
      'You meant: "We are going to school."'
    )
    expect(b.armed).toBe(true)
    expect(b.state.pendingTarget).toContain('we are going to school')
  })

  it('honest EN try consumes; second same target strips + reclaim', () => {
    let state = createTeacherErrorRepeatGateState()
    state = applyTeacherErrorRepeatGate(
      state,
      'Скажи: I go to the sea.'
    ).state
    state = noteErrorRepeatUserTry(state, 'I go sea')
    expect(state.repeatConsumed).toBe(true)

    const r = applyTeacherErrorRepeatGate(state, 'Ещё раз.\nСкажи: I go to the sea.')
    expect(r.blocked).toBe(true)
    expect(r.shouldAntiLoopReclaim).toBe(true)
    expect(r.displayText).not.toMatch(/Скажи:/i)
    expect(r.displayText).toMatch(/Ещё раз/)
  })

  it('meta/refuse does not consume', () => {
    let state = createTeacherErrorRepeatGateState()
    state = applyTeacherErrorRepeatGate(state, 'Скажи: I go to the sea.').state
    state = noteErrorRepeatUserTry(state, 'не знаю')
    expect(state.repeatConsumed).toBe(false)
    expect(state.awaitingUserTry).toBe(true)

    const r = applyTeacherErrorRepeatGate(state, 'Скажи: I go to the sea.')
    expect(r.blocked).toBe(false)
    expect(r.shouldAntiLoopReclaim).toBe(false)
  })

  it('normalize treats contractions as same target', () => {
    let state = createTeacherErrorRepeatGateState()
    state = applyTeacherErrorRepeatGate(state, 'Say: I am fine.').state
    state = noteErrorRepeatUserTry(state, "I'm okay")
    const r = applyTeacherErrorRepeatGate(state, 'Say: I\'m fine.')
    expect(r.blocked).toBe(true)
    expect(r.shouldAntiLoopReclaim).toBe(true)
  })

  it('complete drill resets gate', () => {
    let state = createTeacherErrorRepeatGateState()
    state = applyTeacherErrorRepeatGate(state, 'Скажи: I go.').state
    state = noteErrorRepeatUserTry(state, 'I go')
    state = noteErrorRepeatCompleteDrill(state)
    expect(state.pendingTarget).toBeNull()
    expect(resetTeacherErrorRepeatGate().pendingTarget).toBeNull()
  })

  it('strip marker-only leaves empty string', () => {
    expect(stripTeacherErrorRepeatMarkers('Скажи: I go to the sea.')).toBe('')
  })
})
