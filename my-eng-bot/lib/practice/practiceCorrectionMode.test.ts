import { describe, expect, it } from 'vitest'
import { isPracticeCorrectionComposerActive } from '@/lib/practice/practiceCorrectionMode'

describe('isPracticeCorrectionComposerActive', () => {
  it('returns false on first-attempt submitting/checking', () => {
    expect(isPracticeCorrectionComposerActive('submitting', 0)).toBe(false)
    expect(isPracticeCorrectionComposerActive('checking', 0)).toBe(false)
  })

  it('returns true in correction after first wrong attempt', () => {
    expect(isPracticeCorrectionComposerActive('correction', 1)).toBe(true)
    expect(isPracticeCorrectionComposerActive('correction', 2)).toBe(true)
  })

  it('returns true on re-submit checking after error', () => {
    expect(isPracticeCorrectionComposerActive('submitting', 1)).toBe(true)
    expect(isPracticeCorrectionComposerActive('checking', 1)).toBe(true)
    expect(isPracticeCorrectionComposerActive('submitting', 2)).toBe(true)
    expect(isPracticeCorrectionComposerActive('checking', 2)).toBe(true)
  })

  it('returns false on success feedback even if wrongAttempts was > 0 before reset', () => {
    expect(isPracticeCorrectionComposerActive('feedback', 0)).toBe(false)
  })

  it('returns false on active and generating states', () => {
    expect(isPracticeCorrectionComposerActive('active', 1)).toBe(false)
    expect(isPracticeCorrectionComposerActive('generating_next', 0)).toBe(false)
  })
})
