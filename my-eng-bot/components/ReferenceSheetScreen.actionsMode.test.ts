import { describe, expect, it, vi } from 'vitest'
import { resolveReferenceActionsMode } from '@/components/ReferenceSheetScreen'
import type { ReferenceSheet } from '@/lib/reference/types'

const sheetWithPractice: ReferenceSheet = {
  id: '4',
  title: 'I am',
  teaser: 't',
  level: 'A1',
  hasPractice: true,
  hook: 'h',
  rule: ['r'],
  formula: ['f'],
  traps: [],
  examples: [],
  selfCheck: null,
  relatedLessonId: '4',
}

const sheetNoPractice: ReferenceSheet = { ...sheetWithPractice, hasPractice: false }

describe('resolveReferenceActionsMode', () => {
  it('keeps menu lesson+practice when callbacks present', () => {
    expect(
      resolveReferenceActionsMode(sheetWithPractice, undefined, vi.fn(), vi.fn())
    ).toBe('lesson+practice')
  })

  it('falls back to lesson CTA when no practice callback', () => {
    expect(resolveReferenceActionsMode(sheetWithPractice, undefined, vi.fn(), undefined)).toBe(
      'lesson'
    )
    expect(resolveReferenceActionsMode(sheetNoPractice, undefined, vi.fn(), undefined)).toBe(
      'lesson'
    )
  })

  it('honours explicit back-only even with callbacks', () => {
    expect(
      resolveReferenceActionsMode(sheetWithPractice, 'back-only', vi.fn(), vi.fn())
    ).toBe('back-only')
  })

  it('defaults to back-only when no lesson callback', () => {
    expect(resolveReferenceActionsMode(sheetWithPractice, undefined, undefined, undefined)).toBe(
      'back-only'
    )
  })
})
