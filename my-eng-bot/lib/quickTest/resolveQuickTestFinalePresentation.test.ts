import { describe, expect, it } from 'vitest'
import { resolveQuickTestFinalePresentation } from '@/lib/quickTest/resolveQuickTestFinalePresentation'
import { QUICK_TEST_COPY } from '@/lib/uiCopy/quickTest'

const BANNED = 'Нормальный старт'

describe('resolveQuickTestFinalePresentation', () => {
  it('returns zero title for 0 correct with answers', () => {
    const result = resolveQuickTestFinalePresentation({ correct: 0, answerCount: 5 })
    expect(result.title).toBe(QUICK_TEST_COPY.finaleTitleZero)
    expect(result.footerTitle).toBe(QUICK_TEST_COPY.footerFinaleZero)
    expect(result.mode).toBe('analysis')
    expect(result.showAnalysisCard).toBe(true)
    expect(result.title).not.toContain(BANNED)
  })

  it('returns weak title for 1-2 correct', () => {
    const one = resolveQuickTestFinalePresentation({ correct: 1, answerCount: 5 })
    const two = resolveQuickTestFinalePresentation({ correct: 2, answerCount: 5 })
    expect(one.title).toBe(QUICK_TEST_COPY.finaleTitleWeak)
    expect(two.title).toBe(QUICK_TEST_COPY.finaleTitleWeak)
    expect(one.title).not.toContain(BANNED)
  })

  it('returns strong band for 3-4', () => {
    const result = resolveQuickTestFinalePresentation({ correct: 4, answerCount: 5 })
    expect(result.band).toBe('strong')
    expect(result.title).toBe(QUICK_TEST_COPY.finaleTitleStrong)
    expect(result.showcaseLimit).toBe(2)
  })

  it('returns perfect without analysis card', () => {
    const result = resolveQuickTestFinalePresentation({ correct: 5, answerCount: 5 })
    expect(result.band).toBe('perfect')
    expect(result.mode).toBe('perfect')
    expect(result.showAnalysisCard).toBe(false)
    expect(result.showMedalGhost).toBe(true)
  })

  it('returns empty run mode without fake analysis', () => {
    const result = resolveQuickTestFinalePresentation({ correct: 0, answerCount: 0 })
    expect(result.mode).toBe('emptyRun')
    expect(result.emptyRunMessage).toBe(QUICK_TEST_COPY.finaleEmptyRunMessage)
    expect(result.footerTitle).toBe(QUICK_TEST_COPY.footerFinaleEmptyRun)
    expect(result.title).not.toContain(BANNED)
  })

  it('limits showcase on compact viewport', () => {
    const result = resolveQuickTestFinalePresentation({
      correct: 1,
      answerCount: 5,
      compactViewport: true,
    })
    expect(result.showcaseLimit).toBe(1)
  })
})
