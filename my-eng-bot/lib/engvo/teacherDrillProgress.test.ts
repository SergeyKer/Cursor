import { describe, expect, it } from 'vitest'
import {
  commitTeacherDrillFromAssistant,
  createTeacherDrillProgressState,
  extractTeacherDrillRu,
  looksLikeTeacherEnglishAttempt,
  normalizeTeacherDrillRu,
  noteTeacherDrillUserAttempt,
  resetTeacherDrillProgress,
} from '@/lib/engvo/teacherDrillProgress'

describe('teacherDrillProgress', () => {
  it('normalizeTeacherDrillRu maps ё→е and strips punctuation', () => {
    expect(normalizeTeacherDrillRu('Эта дорога ведёт в город!')).toBe(
      normalizeTeacherDrillRu('эта дорога ведет в город')
    )
  })

  it('extractTeacherDrillRu takes last Cyrillic sentence (A2 praise + drill)', () => {
    expect(
      extractTeacherDrillRu('Да, так и говорят. Эта дорога ведёт в город. Переведи на английский.')
    ).toBe('Эта дорога ведёт в город.')
    expect(
      extractTeacherDrillRu("That's it. Эта дорога ведёт в город. Your turn — in English.")
    ).toBe('Эта дорога ведёт в город.')
  })

  it('looksLikeTeacherEnglishAttempt accepts EN drill answers, rejects meta', () => {
    expect(looksLikeTeacherEnglishAttempt('This road goes to the city.')).toBe(true)
    expect(looksLikeTeacherEnglishAttempt('I go')).toBe(true)
    expect(looksLikeTeacherEnglishAttempt("I don't know")).toBe(false)
    expect(looksLikeTeacherEnglishAttempt('what?')).toBe(false)
    expect(looksLikeTeacherEnglishAttempt('не знаю')).toBe(false)
    expect(looksLikeTeacherEnglishAttempt('')).toBe(false)
  })

  it('first drill commits and awaits answer', () => {
    const state = createTeacherDrillProgressState()
    const r = commitTeacherDrillFromAssistant(
      state,
      'Эта дорога ведёт в город. Your turn — in English.'
    )
    expect(r.action).toBe('commit')
    expect(state.drillAwaitingAnswer).toBe(true)
    expect(state.lastDrillRuNormalized).toBe(normalizeTeacherDrillRu('Эта дорога ведёт в город'))
  })

  it('screenshot loop: SUCCESS same RU after EN attempt → reclaim_duplicate', () => {
    const state = createTeacherDrillProgressState()
    commitTeacherDrillFromAssistant(
      state,
      'Эта дорога ведёт в город. Your turn — in English.'
    )
    noteTeacherDrillUserAttempt(state, 'This road goes to the city.')
    expect(state.drillAwaitingAnswer).toBe(false)

    const r = commitTeacherDrillFromAssistant(
      state,
      "That's it. Эта дорога ведёт в город. Your turn — in English."
    )
    expect(r.action).toBe('reclaim_duplicate')
    expect(r.previousRussian).toBe(state.lastDrillRuNormalized)
    expect(state.drillAwaitingAnswer).toBe(false)
  })

  it('SUCCESS different RU after EN attempt → commit', () => {
    const state = createTeacherDrillProgressState()
    commitTeacherDrillFromAssistant(
      state,
      'Эта дорога ведёт в город. Your turn — in English.'
    )
    noteTeacherDrillUserAttempt(state, 'This road goes to the city.')

    const r = commitTeacherDrillFromAssistant(
      state,
      'Good — you’ve got it. Машина стоит у дома. Go ahead — English.'
    )
    expect(r.action).toBe('commit')
    expect(state.drillAwaitingAnswer).toBe(true)
    expect(state.lastDrillRuNormalized).toBe(normalizeTeacherDrillRu('Машина стоит у дома'))
  })

  it('same RU before attempt is not reclaim', () => {
    const state = createTeacherDrillProgressState()
    commitTeacherDrillFromAssistant(
      state,
      'Эта дорога ведёт в город. Your turn — in English.'
    )
    const r = commitTeacherDrillFromAssistant(
      state,
      'Эта дорога ведёт в город. Your turn — in English.'
    )
    expect(r.action).toBe('commit')
    expect(state.drillAwaitingAnswer).toBe(true)
  })

  it('derail RU meta does not clear awaitingAnswer; same RU stays legal', () => {
    const state = createTeacherDrillProgressState()
    commitTeacherDrillFromAssistant(
      state,
      'Эта дорога ведёт в город. Your turn — in English.'
    )
    noteTeacherDrillUserAttempt(state, 'не знаю')
    expect(state.drillAwaitingAnswer).toBe(true)

    const r = commitTeacherDrillFromAssistant(
      state,
      'Ок — снова. Эта дорога ведёт в город. Переведи.'
    )
    expect(r.action).toBe('commit')
  })

  it('ERROR Say/Скажи is ignore (no duplicate, no commit overwrite)', () => {
    const state = createTeacherDrillProgressState()
    commitTeacherDrillFromAssistant(
      state,
      'Эта дорога ведёт в город. Your turn — in English.'
    )
    const before = state.lastDrillRuNormalized
    const r = commitTeacherDrillFromAssistant(
      state,
      'Close — so: city — not: the city. Say: "This road goes to the city."'
    )
    expect(r.action).toBe('ignore')
    expect(state.lastDrillRuNormalized).toBe(before)
    expect(state.drillAwaitingAnswer).toBe(true)
  })

  it('A2 different praise + same drill RU after EN → reclaim', () => {
    const state = createTeacherDrillProgressState()
    commitTeacherDrillFromAssistant(
      state,
      'Верно — время на месте. Эта дорога ведёт в город. Переведи на английский.'
    )
    noteTeacherDrillUserAttempt(state, 'This road goes to the city.')
    const r = commitTeacherDrillFromAssistant(
      state,
      'Да, так и говорят. Эта дорога ведёт в город. Переведи.'
    )
    expect(r.action).toBe('reclaim_duplicate')
  })

  it('invite-only / no RU → ignore', () => {
    const state = createTeacherDrillProgressState()
    expect(commitTeacherDrillFromAssistant(state, 'Your turn — in English.').action).toBe(
      'ignore'
    )
  })

  it('resetTeacherDrillProgress clears state', () => {
    const state = createTeacherDrillProgressState()
    commitTeacherDrillFromAssistant(
      state,
      'Эта дорога ведёт в город. Your turn — in English.'
    )
    resetTeacherDrillProgress(state)
    expect(state.lastDrillRuNormalized).toBeNull()
    expect(state.drillAwaitingAnswer).toBe(false)
    expect(state.lastWasRussianEcho).toBe(false)
  })

  it('screenshot RU echo then SUCCESS next → reclaim_russian_echo', () => {
    const state = createTeacherDrillProgressState()
    commitTeacherDrillFromAssistant(
      state,
      'Хорошо, по дороге. Мы идём в школу. Переведи на английский.'
    )
    noteTeacherDrillUserAttempt(state, 'Мы идём в школу.')
    expect(state.lastWasRussianEcho).toBe(true)
    expect(state.drillAwaitingAnswer).toBe(true)

    const r = commitTeacherDrillFromAssistant(
      state,
      'Верно, следующий. Мы часто идём в парк. Переведи.'
    )
    expect(r.action).toBe('reclaim_russian_echo')
    expect(r.previousRussian).toBe(normalizeTeacherDrillRu('Мы идём в школу'))
    expect(state.lastDrillRuNormalized).toBe(normalizeTeacherDrillRu('Мы идём в школу'))
  })

  it('ё/е near-echo counts as russian echo', () => {
    const state = createTeacherDrillProgressState()
    commitTeacherDrillFromAssistant(
      state,
      'Мы идём в школу. Переведи.'
    )
    noteTeacherDrillUserAttempt(state, 'Мы идем в школу')
    expect(state.lastWasRussianEcho).toBe(true)
  })

  it('other RU phrase is not echo; SUCCESS next commits', () => {
    const state = createTeacherDrillProgressState()
    commitTeacherDrillFromAssistant(
      state,
      'Мы идём в школу. Переведи.'
    )
    noteTeacherDrillUserAttempt(state, 'Давай про парк')
    expect(state.lastWasRussianEcho).toBe(false)
    const r = commitTeacherDrillFromAssistant(
      state,
      'Ок. Мы часто идём в парк. Переведи.'
    )
    expect(r.action).toBe('commit')
  })

  it('echo + ERROR Скажи → ignore and clears echo flag', () => {
    const state = createTeacherDrillProgressState()
    commitTeacherDrillFromAssistant(
      state,
      'Мы идём в школу. Переведи.'
    )
    noteTeacherDrillUserAttempt(state, 'Мы идём в школу.')
    const r = commitTeacherDrillFromAssistant(
      state,
      'Это по-русски. Скажи: We are going to school.'
    )
    expect(r.action).toBe('ignore')
    expect(state.lastWasRussianEcho).toBe(false)
  })
})
