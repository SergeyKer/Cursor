import { describe, expect, it } from 'vitest'
import {
  isPracticeComposerCollapsed,
  isPracticeComposerLocked,
  PRACTICE_ANSWER_REVEAL_MS,
  PRACTICE_CHECKING_MESSAGE,
  PRACTICE_CHECKING_MS,
  PRACTICE_FEEDBACK_MS,
  shouldHideCurrentPracticeQuestionBubbles,
} from '@/lib/practice/practiceAnswerPanelLock'

describe('practiceAnswerPanelLock', () => {
  it('uses 500ms answer reveal and 2s checking/feedback pauses', () => {
    expect(PRACTICE_ANSWER_REVEAL_MS).toBe(500)
    expect(PRACTICE_CHECKING_MS).toBe(2000)
    expect(PRACTICE_FEEDBACK_MS).toBe(2000)
    expect(PRACTICE_CHECKING_MESSAGE).toBe('Engvo проверяет ответ...')
  })

  it('locks composer on transition states', () => {
    expect(isPracticeComposerLocked('submitting')).toBe(true)
    expect(isPracticeComposerLocked('checking')).toBe(true)
    expect(isPracticeComposerLocked('feedback')).toBe(true)
    expect(isPracticeComposerLocked('generating_next')).toBe(true)
    expect(isPracticeComposerLocked('active')).toBe(false)
    expect(isPracticeComposerLocked('correction')).toBe(false)
  })

  it('hides current question bubble only on feedback and generating_next', () => {
    expect(
      shouldHideCurrentPracticeQuestionBubbles({ state: 'feedback', questionIndex: 2, currentIndex: 2 })
    ).toBe(true)
    expect(
      shouldHideCurrentPracticeQuestionBubbles({ state: 'generating_next', questionIndex: 2, currentIndex: 2 })
    ).toBe(true)
    expect(
      shouldHideCurrentPracticeQuestionBubbles({ state: 'checking', questionIndex: 2, currentIndex: 2 })
    ).toBe(false)
    expect(
      shouldHideCurrentPracticeQuestionBubbles({ state: 'feedback', questionIndex: 1, currentIndex: 2 })
    ).toBe(false)
  })

  it('collapses composer shell for briefing and locked states', () => {
    expect(isPracticeComposerCollapsed('briefing')).toBe(true)
    expect(isPracticeComposerCollapsed('feedback')).toBe(true)
    expect(isPracticeComposerCollapsed('active')).toBe(false)
  })
})
