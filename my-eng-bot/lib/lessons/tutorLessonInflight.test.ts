import { describe, expect, it } from 'vitest'
import { shouldFinalizeTutorLessonOpen } from '@/lib/lessons/tutorLessonInflight'

describe('shouldFinalizeTutorLessonOpen', () => {
  it('returns true when request id matches current', () => {
    expect(shouldFinalizeTutorLessonOpen(3, 3)).toBe(true)
  })

  it('returns false when a newer lesson open superseded this request', () => {
    expect(shouldFinalizeTutorLessonOpen(3, 4)).toBe(false)
  })
})
