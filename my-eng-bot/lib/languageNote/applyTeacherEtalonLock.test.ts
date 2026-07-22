import { describe, expect, it } from 'vitest'
import { applyTeacherEtalonLock } from '@/lib/languageNote/applyTeacherEtalonLock'
import type { LanguageNote } from '@/lib/languageNote/types'

function baseNote(overrides: Partial<LanguageNote> = {}): LanguageNote {
  return {
    status: 'needs_better',
    original: 'She often travel around the year.',
    correct: 'She often travels throughout the year.',
    correctHighlights: ['travels', 'throughout'],
    correctReasons: [
      'После she нужна форма travels, не travel: she travels.',
      'Throughout — более естественное выражение для обозначения времени.',
    ],
    better: 'She often travels all year round.',
    betterHighlights: ['all year round'],
    betterReasons: ['All year round — разговорный вариант, звучит более естественно.'],
    betterAlternatives: [],
    reviewTopics: [{ id: 'travel', title: 'travel — путешествия' }],
    lessonId: null,
    lessonTitle: null,
    ...overrides,
  }
}

describe('applyTeacherEtalonLock', () => {
  it('locks Europe etalon and drops better rewrite', () => {
    const etalon = 'She often travels around Europe.'
    const locked = applyTeacherEtalonLock(baseNote(), etalon)
    expect(locked.correct).toBe(etalon)
    expect(locked.better).toBeNull()
    expect(locked.betterAlternatives).toEqual([])
    expect(locked.teacherEtalon).toBe(true)
    expect(locked.status).toBe('needs_fix')
    expect(locked.correctReasons.length).toBeGreaterThan(0)
    expect(locked.correct).not.toContain('throughout')
    expect(locked.correct).not.toContain('all year round')
  })

  it('locks paint/fence etalon from Say', () => {
    const note = baseNote({
      original: 'I have been paint this fence for 3 hour',
      correct: 'I painted this fence for three hours.',
      better: 'I have been painting the fence for hours.',
      correctReasons: ['Нужна форма painting.', 'Hours во множественном числе.'],
    })
    const etalon = 'I have been painting this fence for 3 hours.'
    const locked = applyTeacherEtalonLock(note, etalon)
    expect(locked.correct).toBe(etalon)
    expect(locked.better).toBeNull()
    expect(locked.teacherEtalon).toBe(true)
  })

  it('is identity when etalon missing — free-like better preserved', () => {
    const note = baseNote()
    const lockedNull = applyTeacherEtalonLock(note, null)
    const lockedEmpty = applyTeacherEtalonLock(note, '  ')
    expect(lockedNull).toBe(note)
    expect(lockedEmpty).toBe(note)
    expect(lockedNull.better).toBe('She often travels all year round.')
    expect(lockedNull.teacherEtalon).toBeUndefined()
  })
})
