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
  it('returns true for choice with options in idle phase', () => {
    expect(isPracticeChoiceChipsPanel(question({ type: 'choice' }), 'idle')).toBe(true)
  })

  it('returns true for listening-select with options', () => {
    expect(isPracticeChoiceChipsPanel(question({ type: 'listening-select' }), 'idle')).toBe(true)
  })

  it('returns false for dropdown-fill (form, not chips)', () => {
    expect(isPracticeChoiceChipsPanel(question({ type: 'dropdown-fill' }), 'idle')).toBe(false)
  })

  it('returns false in voiceLocked correction phase', () => {
    expect(isPracticeChoiceChipsPanel(question({ type: 'choice' }), 'voiceLocked')).toBe(false)
  })

  it('returns true in chips correction phase', () => {
    expect(isPracticeChoiceChipsPanel(question({ type: 'choice' }), 'chips')).toBe(true)
  })

  it('returns false in voiceReady correction phase', () => {
    expect(isPracticeChoiceChipsPanel(question({ type: 'choice' }), 'voiceReady')).toBe(false)
  })

  it('returns false without options', () => {
    expect(isPracticeChoiceChipsPanel(question({ options: [] }), 'idle')).toBe(false)
  })

  it('returns false for null question', () => {
    expect(isPracticeChoiceChipsPanel(null, 'idle')).toBe(false)
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
