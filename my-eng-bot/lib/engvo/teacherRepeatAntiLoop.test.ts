import { describe, expect, it } from 'vitest'
import {
  applyAssistantAntiLoopPolicy,
  createTeacherRepeatAntiLoopState,
  extractTeacherCallRepeatPrompt,
  noteCompleteDrillFromAssistantText,
  noteUserFinal,
  resetTeacherRepeatAntiLoop,
  stripTeacherRepeatMarkers,
} from '@/lib/engvo/teacherRepeatAntiLoop'

describe('teacherRepeatAntiLoop', () => {
  it('arms on first Скажи and blocks second after honest try', () => {
    let state = createTeacherRepeatAntiLoopState()
    const first = applyAssistantAntiLoopPolicy(
      state,
      'Почти — так: I have taken the skewers off the fire. Скажи: I have taken the skewers off the fire.'
    )
    expect(first.armed).toBe(true)
    expect(first.blocked).toBe(false)
    expect(first.state.pendingTarget).toContain('skewers')
    state = first.state

    state = noteUserFinal(state)
    expect(state.repeatConsumed).toBe(true)

    const second = applyAssistantAntiLoopPolicy(
      state,
      'Чуть иначе. Скажи: I have taken the skewers off the fire.'
    )
    expect(second.blocked).toBe(true)
    expect(second.shouldAntiLoopReclaim).toBe(true)
    expect(second.displayText).toMatch(/Чуть иначе/i)
    expect(second.displayText).not.toMatch(/Скажи/i)
    expect(second.displayText).not.toMatch(/skewers/i)
  })

  it('blocks You meant after consumed try', () => {
    let state = createTeacherRepeatAntiLoopState()
    const first = applyAssistantAntiLoopPolicy(
      state,
      'Close — so: I have a cat. You meant: "I have a cat." Try that.'
    )
    state = noteUserFinal(first.state)
    const second = applyAssistantAntiLoopPolicy(
      state,
      'Still off. You meant: "I have a cat." Go ahead.'
    )
    expect(second.blocked).toBe(true)
    expect(second.displayText).not.toMatch(/You meant/i)
  })

  it('arms and blocks on contrast-only ERROR (no You meant)', () => {
    let state = createTeacherRepeatAntiLoopState()
    const first = applyAssistantAntiLoopPolicy(
      state,
      'Close — so: I have a cat — not: I have cat. Try that.'
    )
    expect(first.armed).toBe(true)
    expect(first.state.pendingTarget).toContain('cat')
    const got = extractTeacherCallRepeatPrompt(
      'Close — so: I have a cat — not: I have cat. Try that.'
    )
    expect(got?.repeatText).toBe('I have a cat')
    expect(got?.leadIn).toMatch(/so:\s*I have a cat/i)
    expect(got?.leadIn).not.toMatch(/You meant/i)

    state = noteUserFinal(first.state)
    const second = applyAssistantAntiLoopPolicy(
      state,
      'Still off. so: I have a cat — not: I have cat. Go ahead.'
    )
    expect(second.blocked).toBe(true)
    expect(second.displayText).not.toMatch(/\bso:/i)
    expect(second.displayText).not.toMatch(/I have a cat/i)
  })

  it('allows a new Скажи after complete drill resets', () => {
    let state = createTeacherRepeatAntiLoopState()
    state = applyAssistantAntiLoopPolicy(state, 'Скажи: I have a cat.').state
    state = noteUserFinal(state)
    state = noteCompleteDrillFromAssistantText(
      state,
      'Я кормлю кота каждый день. Переведи на английский.',
      'drill'
    )
    expect(state.pendingTarget).toBeNull()
    const next = applyAssistantAntiLoopPolicy(state, 'Скажи: I feed my cat every day.')
    expect(next.armed).toBe(true)
    expect(next.blocked).toBe(false)
  })

  it('noteUserFinal is a no-op without pending', () => {
    const state = noteUserFinal(createTeacherRepeatAntiLoopState())
    expect(state).toEqual(createTeacherRepeatAntiLoopState())
  })

  it('reset clears all flags', () => {
    let state = applyAssistantAntiLoopPolicy(
      createTeacherRepeatAntiLoopState(),
      'Скажи: Hello.'
    ).state
    state = noteUserFinal(state)
    expect(resetTeacherRepeatAntiLoop()).toEqual(createTeacherRepeatAntiLoopState())
  })

  it('stripTeacherRepeatMarkers keeps Russian lead-in', () => {
    expect(
      stripTeacherRepeatMarkers('Чуть иначе. Скажи: I have taken the skewers off the fire.')
    ).toBe('Чуть иначе.')
  })

  it('extractTeacherCallRepeatPrompt finds mid-line Скажи', () => {
    const got = extractTeacherCallRepeatPrompt(
      'Почти — так: I have a cat — не так: I have cat. Скажи: I have a cat.'
    )
    expect(got?.repeatText).toMatch(/I have a cat/i)
    expect(got?.leadIn).toMatch(/Почти/i)
    expect(got?.leadIn).not.toMatch(/Скажи/i)
  })

  it('normalize treats punctuation variants as same target for arm only once', () => {
    let state = createTeacherRepeatAntiLoopState()
    state = applyAssistantAntiLoopPolicy(state, 'Скажи: I have a cat.').state
    state = noteUserFinal(state)
    const blocked = applyAssistantAntiLoopPolicy(state, 'Скажи: I have a cat!')
    expect(blocked.blocked).toBe(true)
  })
})
