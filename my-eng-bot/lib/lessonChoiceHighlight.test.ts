import { describe, expect, it } from 'vitest'
import {
  CHOICE_REOPEN_DELAY_MS,
  shouldHighlightWrongLessonChoice,
  shouldHighlightWrongPracticeChoice,
} from '@/lib/lessonChoiceHighlight'

describe('CHOICE_REOPEN_DELAY_MS', () => {
  it('matches lesson chip highlight duration', () => {
    expect(CHOICE_REOPEN_DELAY_MS).toBe(900)
  })
})

describe('shouldHighlightWrongLessonChoice', () => {
  it('returns false during checking', () => {
    expect(shouldHighlightWrongLessonChoice('checking', undefined)).toBe(false)
  })

  it('returns false on idle', () => {
    expect(shouldHighlightWrongLessonChoice('idle', undefined)).toBe(false)
  })

  it('returns false on success feedback', () => {
    expect(shouldHighlightWrongLessonChoice('feedback', 'success')).toBe(false)
  })

  it('returns true on error feedback', () => {
    expect(shouldHighlightWrongLessonChoice('feedback', 'error')).toBe(true)
  })
})

describe('shouldHighlightWrongPracticeChoice', () => {
  it('returns false during checking', () => {
    expect(shouldHighlightWrongPracticeChoice('checking', 'error')).toBe(false)
  })

  it('returns true on correction error', () => {
    expect(shouldHighlightWrongPracticeChoice('correction', 'error')).toBe(true)
  })

  it('returns false on correction success', () => {
    expect(shouldHighlightWrongPracticeChoice('correction', 'success')).toBe(false)
  })
})
