import { describe, expect, it } from 'vitest'
import {
  isPracticeAnswerPanelLocked,
  isPracticeChoiceInteractionDisabled,
  isPracticeChoicePanelFrozen,
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

  it('locks answer panel on submitting, checking and success feedback', () => {
    expect(isPracticeAnswerPanelLocked('submitting', undefined)).toBe(true)
    expect(isPracticeAnswerPanelLocked('checking', undefined)).toBe(true)
    expect(isPracticeAnswerPanelLocked('feedback', 'success')).toBe(true)
    expect(isPracticeAnswerPanelLocked('generating_next', undefined)).toBe(true)
    expect(isPracticeAnswerPanelLocked('feedback', 'error')).toBe(false)
    expect(isPracticeAnswerPanelLocked('correction', 'error')).toBe(false)
    expect(isPracticeAnswerPanelLocked('active', undefined)).toBe(false)
  })

  it('freezes choice panel from submit through check, success feedback and generating_next', () => {
    expect(isPracticeChoicePanelFrozen('submitting', undefined)).toBe(true)
    expect(isPracticeChoicePanelFrozen('checking', undefined)).toBe(true)
    expect(isPracticeChoicePanelFrozen('feedback', 'error')).toBe(false)
    expect(isPracticeChoicePanelFrozen('feedback', 'success')).toBe(true)
    expect(isPracticeChoicePanelFrozen('generating_next', undefined)).toBe(true)
    expect(isPracticeChoicePanelFrozen('active', undefined)).toBe(false)
  })

  it('disables choice interaction on submitting, checking and freeze', () => {
    expect(isPracticeChoiceInteractionDisabled('submitting', undefined)).toBe(true)
    expect(isPracticeChoiceInteractionDisabled('checking', undefined)).toBe(true)
    expect(isPracticeChoiceInteractionDisabled('feedback', 'error')).toBe(false)
    expect(isPracticeChoiceInteractionDisabled('feedback', 'success')).toBe(true)
    expect(isPracticeChoiceInteractionDisabled('active', undefined)).toBe(false)
  })

  it('isPracticeComposerLocked delegates to answer panel lock', () => {
    expect(isPracticeComposerLocked('checking')).toBe(true)
    expect(isPracticeComposerLocked('feedback', 'success')).toBe(true)
    expect(isPracticeComposerLocked('feedback', 'error')).toBe(false)
  })

  it('keeps current question card visible through feedback and generating_next', () => {
    expect(
      shouldHideCurrentPracticeQuestionBubbles({
        state: 'feedback',
        questionIndex: 2,
        currentIndex: 2,
        feedbackType: 'success',
      })
    ).toBe(false)
    expect(
      shouldHideCurrentPracticeQuestionBubbles({
        state: 'generating_next',
        questionIndex: 2,
        currentIndex: 2,
      })
    ).toBe(false)
  })

  it('collapses composer shell only on briefing', () => {
    expect(isPracticeComposerCollapsed('briefing')).toBe(true)
    expect(isPracticeComposerCollapsed('feedback')).toBe(false)
    expect(isPracticeComposerCollapsed('checking')).toBe(false)
    expect(isPracticeComposerCollapsed('active')).toBe(false)
  })
})
