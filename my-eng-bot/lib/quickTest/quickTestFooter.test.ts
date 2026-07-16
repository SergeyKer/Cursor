import { describe, expect, it } from 'vitest'
import { resolveQuickTestFooter } from '@/lib/quickTest/quickTestFooter'
import { QUICK_TEST_COPY } from '@/lib/uiCopy/quickTest'

const BANNED = 'Нормальный старт'

describe('resolveQuickTestFooter finale', () => {
  it('footer for 0 correct with answers', () => {
    const view = resolveQuickTestFooter({
      phase: 'finale',
      correct: 0,
      answerCount: 5,
      scoreBand: 'start',
    })
    expect(view.dynamic).toBe(QUICK_TEST_COPY.footerFinaleZero)
    expect(view.dynamic).not.toBe(BANNED)
    expect(view.progress).toEqual({ current: 5, total: 5 })
  })

  it('footer for 2 correct', () => {
    const view = resolveQuickTestFooter({
      phase: 'finale',
      correct: 2,
      answerCount: 5,
      scoreBand: 'start',
    })
    expect(view.dynamic).toBe(QUICK_TEST_COPY.footerFinaleWeak)
  })

  it('footer for strong', () => {
    const view = resolveQuickTestFooter({
      phase: 'finale',
      correct: 4,
      answerCount: 5,
      scoreBand: 'strong',
    })
    expect(view.dynamic).toBe(QUICK_TEST_COPY.footerFinaleStrong)
    expect(view.tone).toBe('support')
  })

  it('footer for perfect', () => {
    const view = resolveQuickTestFooter({
      phase: 'finale',
      correct: 5,
      answerCount: 5,
      scoreBand: 'perfect',
    })
    expect(view.dynamic).toBe(QUICK_TEST_COPY.footerFinalePerfect)
    expect(view.tone).toBe('celebrate')
  })

  it('footer for empty run', () => {
    const view = resolveQuickTestFooter({
      phase: 'finale',
      correct: 0,
      answerCount: 0,
      scoreBand: 'start',
    })
    expect(view.dynamic).toBe(QUICK_TEST_COPY.footerFinaleEmptyRun)
  })
})
