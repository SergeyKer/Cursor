import { describe, expect, it } from 'vitest'

import { estimateLessonComposerMinHeight } from '@/lib/lessonComposerLayout'
import {
  mergeComposerHeightLockOnParamChange,
  resolveComposerHeightLockSync,
} from '@/lib/lessonComposerHeightLockLogic'

/** Сброс lock при смене transitionKey (как в useLessonComposerHeightLock). */
function resetComposerHeightLockOnTransition(incoming: number): number | undefined {
  return incoming > 0 ? incoming : undefined
}

describe('mergeComposerHeightLockOnParamChange', () => {
  const step1Options = ["I'm happy.", "I'm from Russia.", "I am a student."]
  const step2Options = ['a', 'an', 'the']

  it('starts with fallback width-aware incoming before width is measured', () => {
    const incoming = estimateLessonComposerMinHeight({
      panelKind: 'choice',
      optionCount: 3,
      choiceOptions: step1Options,
      compact: true,
    })
    expect(incoming).toBe(98)
    expect(mergeComposerHeightLockOnParamChange(undefined, incoming, 0)).toBe(98)
  })

  it('keeps lock when measured width matches fallback estimate on the same step', () => {
    const fallbackIncoming = estimateLessonComposerMinHeight({
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
    expect(mergeComposerHeightLockOnParamChange(98, fallbackIncoming, 98)).toBe(98)
    expect(mergeComposerHeightLockOnParamChange(98, widthAware, 98)).toBe(98)
  })

  it('shrinks lock when incoming decreases and DOM fits the smaller estimate', () => {
    expect(mergeComposerHeightLockOnParamChange(98, 56, 56)).toBe(56)
  })

  it('never shrinks lock mid-step when incoming decreases but DOM is still taller', () => {
    expect(mergeComposerHeightLockOnParamChange(98, 56, 90)).toBe(98)
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

describe('resolveComposerHeightLockSync', () => {
  const step1Options = ["I'm happy.", "I'm from Russia.", "I am a student."]

  it('shrinks choice lock to measured height when estimate reserved two rows', () => {
    const incoming = estimateLessonComposerMinHeight({
      panelKind: 'choice',
      optionCount: 3,
      choiceOptions: step1Options,
      containerWidthPx: 360,
      compact: true,
    })
    const measuredOneRow = estimateLessonComposerMinHeight({
      panelKind: 'choice',
      optionCount: 3,
      choiceOptions: ['a', 'an', 'the'],
      containerWidthPx: 360,
      compact: true,
    })

    expect(incoming).toBe(98)
    expect(measuredOneRow).toBe(56)
    expect(
      resolveComposerHeightLockSync({
        panelKind: 'choice',
        measuredContent: measuredOneRow,
        incoming,
        current: incoming,
      })
    ).toBe(measuredOneRow)
  })

  it('keeps non-choice sync behavior using baseline', () => {
    expect(
      resolveComposerHeightLockSync({
        panelKind: 'puzzle',
        measuredContent: 120,
        incoming: 100,
        current: 110,
      })
    ).toBe(120)
    expect(
      resolveComposerHeightLockSync({
        panelKind: 'puzzle',
        measuredContent: 90,
        incoming: 100,
        current: 110,
      })
    ).toBe(110)
  })
})
