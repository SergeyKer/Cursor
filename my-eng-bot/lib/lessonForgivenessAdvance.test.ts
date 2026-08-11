import { describe, expect, it, vi } from 'vitest'
import {
  shouldDeferLessonSuccessAdvance,
  stashLessonSuccessAdvance,
  takeStashedLessonAdvance,
} from '@/lib/lessonForgivenessAdvance'

describe('lessonForgivenessAdvance', () => {
  it('defers only while ack blocks advance', () => {
    expect(shouldDeferLessonSuccessAdvance(true)).toBe(true)
    expect(shouldDeferLessonSuccessAdvance(false)).toBe(false)
  })

  it('stash keeps the latest advance callback', () => {
    const first = { kind: 'step' as const, onAdvance: vi.fn() }
    const second = { kind: 'variant' as const, onAdvance: vi.fn() }
    expect(stashLessonSuccessAdvance(first, second)).toBe(second)
  })

  it('take clears stash and returns runNow', () => {
    const stashed = { kind: 'finale' as const, onAdvance: vi.fn() }
    expect(takeStashedLessonAdvance(stashed)).toEqual({ next: null, runNow: stashed })
    expect(takeStashedLessonAdvance(null)).toEqual({ next: null, runNow: null })
  })
})
