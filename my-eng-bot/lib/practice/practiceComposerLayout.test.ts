import { describe, expect, it } from 'vitest'
import {
  isPracticeChoiceChipsPanel,
  resolvePracticeChoiceComposerLayout,
} from '@/lib/practice/practiceComposerLayout'
import type { PracticeQuestion } from '@/types/practice'

function question(overrides: Partial<PracticeQuestion>): PracticeQuestion {
  return {
    id: 'q1',
    type: 'choice',
    prompt: 'Pick one',
    targetAnswer: 'A',
    options: ['A', 'B', 'C'],
    ...overrides,
  }
}

describe('isPracticeChoiceChipsPanel', () => {
  it('returns true for choice with options', () => {
    expect(isPracticeChoiceChipsPanel(question({ type: 'choice' }), false)).toBe(true)
  })

  it('returns true for listening-select with options', () => {
    expect(isPracticeChoiceChipsPanel(question({ type: 'listening-select' }), false)).toBe(true)
  })

  it('returns false for dropdown-fill (form, not chips)', () => {
    expect(isPracticeChoiceChipsPanel(question({ type: 'dropdown-fill' }), false)).toBe(false)
  })

  it('returns false in correction mode', () => {
    expect(isPracticeChoiceChipsPanel(question({ type: 'choice' }), true)).toBe(false)
  })

  it('returns false without options', () => {
    expect(isPracticeChoiceChipsPanel(question({ options: [] }), false)).toBe(false)
  })

  it('returns false for null question', () => {
    expect(isPracticeChoiceChipsPanel(null, false)).toBe(false)
  })
})

describe('resolvePracticeChoiceComposerLayout', () => {
  const base = {
    isChoicePanel: true,
    deferUntilReveal: true,
    isRevealInProgress: true,
    isRevealInitializedForKey: true,
    isChoiceChipsVisible: false,
    prefersReducedMotion: false,
  }

  it('mounts chips invisibly while reveal in progress', () => {
    expect(resolvePracticeChoiceComposerLayout(base)).toEqual({
      mountChips: true,
      reserveMinHeight: true,
      lockReleased: false,
    })
  })

  it('shows chips after reveal', () => {
    expect(
      resolvePracticeChoiceComposerLayout({
        ...base,
        isRevealInProgress: false,
        isChoiceChipsVisible: true,
      })
    ).toEqual({
      mountChips: true,
      reserveMinHeight: true,
      lockReleased: false,
    })
  })
})
