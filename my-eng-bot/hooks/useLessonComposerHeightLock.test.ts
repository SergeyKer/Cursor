import { describe, expect, it } from 'vitest'

import { estimateLessonComposerMinHeight } from '@/lib/lessonComposerLayout'

/** Логика merge lock при уточнении incoming (как в useLessonComposerHeightLock). */
function mergeComposerHeightLock(
  current: number | undefined,
  lastOutgoing: number,
  incoming: number
): number | undefined {
  const nextLock = Math.max(lastOutgoing, incoming)
  const next = nextLock > 0 ? nextLock : undefined
  if (next == null) return undefined
  if (current == null) return next
  return Math.max(current, next)
}

describe('useLessonComposerHeightLock merge behavior', () => {
  const step1Options = ["I'm happy.", "I'm from Russia.", "I am a student."]

  it('starts with count-based incoming before width is measured', () => {
    const incoming = estimateLessonComposerMinHeight({
      panelKind: 'choice',
      optionCount: 3,
      choiceOptions: step1Options,
      compact: true,
    })
    expect(incoming).toBe(56)
    expect(mergeComposerHeightLock(undefined, 0, incoming)).toBe(56)
  })

  it('grows lock when measured width requires two rows on the same step', () => {
    const countBased = estimateLessonComposerMinHeight({
      panelKind: 'choice',
      optionCount: 3,
      choiceOptions: step1Options,
      compact: true,
    })
    const widthAware = estimateLessonComposerMinHeight({
      panelKind: 'choice',
      optionCount: 3,
      choiceOptions: step1Options,
      containerWidthPx: 360,
      compact: true,
    })
    expect(mergeComposerHeightLock(56, 0, countBased)).toBe(56)
    expect(mergeComposerHeightLock(56, 0, widthAware)).toBe(98)
  })

  it('never shrinks lock mid-step when incoming decreases', () => {
    expect(mergeComposerHeightLock(98, 0, 56)).toBe(98)
  })
})
