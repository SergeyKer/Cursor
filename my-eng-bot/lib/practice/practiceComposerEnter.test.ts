import { describe, expect, it } from 'vitest'
import {
  getPracticeComposerEnterClass,
  resolvePracticeComposerEnterClassOnce,
  shouldSuppressPracticeComposerEnterAnimation,
} from '@/lib/practice/practiceComposerEnter'
import {
  isPracticeVoicePrimaryComposerType,
  PRACTICE_VOICE_PRIMARY_COMPOSER_TYPES,
} from '@/lib/practice/practiceCorrectionFamily'
import {
  getPracticeExerciseTypeCatalogNumber,
  PRACTICE_EXERCISE_TYPES_CATALOG_ORDER,
} from '@/lib/practice/practiceExerciseTypeCatalog'

const primaryEnterBase = {
  isChoiceVoiceCorrection: false,
  isVoiceRepeatCorrection: false,
  correctionMode: false,
  prefersReducedMotion: false,
  suppressEnterAnimation: false,
}

describe('isPracticeVoicePrimaryComposerType', () => {
  it('is true for voice-primary types (mic + textarea on primary)', () => {
    for (const type of PRACTICE_VOICE_PRIMARY_COMPOSER_TYPES) {
      expect(isPracticeVoicePrimaryComposerType(type)).toBe(true)
    }
  })

  it('is false for dropdown, word-bank, and choice-chip types', () => {
    expect(isPracticeVoicePrimaryComposerType('dropdown-fill')).toBe(false)
    expect(isPracticeVoicePrimaryComposerType('sentence-surgery')).toBe(false)
    expect(isPracticeVoicePrimaryComposerType('word-builder-pro')).toBe(false)
    expect(isPracticeVoicePrimaryComposerType('choice')).toBe(false)
    expect(isPracticeVoicePrimaryComposerType('listening-select')).toBe(false)
    expect(isPracticeVoicePrimaryComposerType('speed-round')).toBe(false)
    expect(isPracticeVoicePrimaryComposerType('context-clue')).toBe(false)
  })

  it('maps voice-shadow to catalog type 2', () => {
    expect(getPracticeExerciseTypeCatalogNumber('voice-shadow')).toBe(2)
  })
})

describe('shouldSuppressPracticeComposerEnterAnimation', () => {
  it('suppresses on step 1 for voice-primary types', () => {
    for (const type of PRACTICE_VOICE_PRIMARY_COMPOSER_TYPES) {
      expect(
        shouldSuppressPracticeComposerEnterAnimation({ questionType: type, questionIndex: 0 })
      ).toBe(true)
    }
  })

  it('does not suppress on step 2+ for voice-primary types', () => {
    expect(
      shouldSuppressPracticeComposerEnterAnimation({ questionType: 'voice-shadow', questionIndex: 1 })
    ).toBe(false)
    expect(
      shouldSuppressPracticeComposerEnterAnimation({ questionType: 'dictation', questionIndex: 3 })
    ).toBe(false)
  })

  it('does not suppress on step 1 for non-voice-primary types', () => {
    expect(
      shouldSuppressPracticeComposerEnterAnimation({ questionType: 'choice', questionIndex: 0 })
    ).toBe(false)
    expect(
      shouldSuppressPracticeComposerEnterAnimation({ questionType: 'dropdown-fill', questionIndex: 0 })
    ).toBe(false)
  })
})

describe('getPracticeComposerEnterClass', () => {
  it('returns empty string when suppressEnterAnimation on step 1 voice-primary', () => {
    expect(
      getPracticeComposerEnterClass({ ...primaryEnterBase, suppressEnterAnimation: true })
    ).toBe('')
  })

  it('returns lesson-text-soft-enter for voice-shadow correction (before suppress)', () => {
    expect(
      getPracticeComposerEnterClass({
        ...primaryEnterBase,
        isVoiceRepeatCorrection: true,
        suppressEnterAnimation: true,
      })
    ).toBe('lesson-text-soft-enter')
  })

  it('returns lesson-text-soft-enter for choice voice correction', () => {
    expect(
      getPracticeComposerEnterClass({
        ...primaryEnterBase,
        isChoiceVoiceCorrection: true,
      })
    ).toBe('lesson-text-soft-enter')
  })

  it('returns lesson-enter for primary mount without suppress', () => {
    expect(getPracticeComposerEnterClass(primaryEnterBase)).toBe('lesson-enter')
  })

  it('returns empty string when prefersReducedMotion', () => {
    expect(
      getPracticeComposerEnterClass({ ...primaryEnterBase, prefersReducedMotion: true })
    ).toBe('')
  })

  it('only voice-primary types suppress on catalog step 1; others keep lesson-enter', () => {
    for (const type of PRACTICE_EXERCISE_TYPES_CATALOG_ORDER) {
      const suppress = shouldSuppressPracticeComposerEnterAnimation({
        questionType: type,
        questionIndex: 0,
      })
      const enterClass = getPracticeComposerEnterClass({
        ...primaryEnterBase,
        suppressEnterAnimation: suppress,
      })
      if (isPracticeVoicePrimaryComposerType(type)) {
        expect(enterClass).toBe('')
      } else {
        expect(enterClass).toBe('lesson-enter')
      }
    }
  })
})

describe('resolvePracticeComposerEnterClassOnce', () => {
  const base = {
    isChoiceVoiceCorrection: false,
    isVoiceRepeatCorrection: false,
    correctionMode: false,
    prefersReducedMotion: false,
    suppressEnterAnimation: false,
  }

  it('skips enter after suppress lifts (freeze then unfreeze)', () => {
    let state = { questionId: '', consumed: false }
    const afterFreeze = resolvePracticeComposerEnterClassOnce(state, 'q2', {
      ...base,
      suppressEnterAnimation: true,
    })
    state = afterFreeze.next
    expect(afterFreeze.enterClass).toBe('')

    const afterUnfreeze = resolvePracticeComposerEnterClassOnce(state, 'q2', base)
    expect(afterUnfreeze.enterClass).toBe('')
    expect(afterUnfreeze.next.consumed).toBe(true)
  })

  it('plays enter once when never suppressed for the question', () => {
    let state = { questionId: '', consumed: false }
    const first = resolvePracticeComposerEnterClassOnce(state, 'q1', base)
    state = first.next
    expect(first.enterClass).toBe('lesson-enter')

    const second = resolvePracticeComposerEnterClassOnce(state, 'q1', base)
    expect(second.enterClass).toBe('')
  })

  it('resets consumed state when question id changes', () => {
    let state = { questionId: '', consumed: false }
    const q1 = resolvePracticeComposerEnterClassOnce(state, 'q1', base)
    state = q1.next

    const q2Suppressed = resolvePracticeComposerEnterClassOnce(state, 'q2', {
      ...base,
      suppressEnterAnimation: true,
    })
    state = q2Suppressed.next
    expect(q2Suppressed.next.questionId).toBe('q2')
    expect(q2Suppressed.next.consumed).toBe(true)

    const q2Unfreeze = resolvePracticeComposerEnterClassOnce(state, 'q2', base)
    expect(q2Unfreeze.enterClass).toBe('')
  })
})
