import { describe, expect, it } from 'vitest'
import { shouldHighlightWrongLessonChoice } from '@/lib/lessonChoiceHighlight'

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
