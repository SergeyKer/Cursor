import { describe, expect, it } from 'vitest'

import { estimateLessonComposerMinHeight } from '@/lib/lessonComposerLayout'

/** Логика merge lock внутри одного шага (как в useLessonComposerHeightLock). */
function mergeComposerHeightLockWithinStep(
  current: number | undefined,
  incoming: number
): number | undefined {
  const next = incoming > 0 ? incoming : undefined
  if (next == null) return undefined
  if (current == null) return next
  return Math.max(current, next)
}

/** Сброс lock при смене transitionKey (как в useLessonComposerHeightLock). */
function resetComposerHeightLockOnTransition(incoming: number): number | undefined {
  return incoming > 0 ? incoming : undefined
}

describe('useLessonComposerHeightLock merge behavior', () => {
  const step1Options = ["I'm happy.", "I'm from Russia.", "I am a student."]
  const step2Options = ['a', 'an', 'the']

  it('starts with count-based incoming before width is measured', () => {
    const incoming = estimateLessonComposerMinHeight({
      panelKind: 'choice',
      optionCount: 3,
      choiceOptions: step1Options,
      compact: true,
    })
    expect(incoming).toBe(56)
    expect(mergeComposerHeightLockWithinStep(undefined, incoming)).toBe(56)
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
    expect(mergeComposerHeightLockWithinStep(56, countBased)).toBe(56)
    expect(mergeComposerHeightLockWithinStep(56, widthAware)).toBe(98)
  })

  it('never shrinks lock mid-step when incoming decreases', () => {
    expect(mergeComposerHeightLockWithinStep(98, 56)).toBe(98)
  })

  it('resets lock on step transition when next step needs fewer rows', () => {
    const step1Lock = estimateLessonComposerMinHeight({
      panelKind: 'choice',
      optionCount: 3,
      choiceOptions: step1Options,
      containerWidthPx: 360,
      compact: true,
    })
    const step2Incoming = estimateLessonComposerMinHeight({
      panelKind: 'choice',
      optionCount: 3,
      choiceOptions: step2Options,
      containerWidthPx: 360,
      compact: true,
    })

    expect(step1Lock).toBe(98)
    expect(step2Incoming).toBe(56)
    expect(resetComposerHeightLockOnTransition(step2Incoming)).toBe(56)
    expect(resetComposerHeightLockOnTransition(step2Incoming)).not.toBe(step1Lock)
  })
})
