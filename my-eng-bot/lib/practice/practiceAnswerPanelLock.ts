import type { PracticeFlowState } from '@/hooks/usePracticeSession'
import { ENGVO_CHECKING_MESSAGE } from '@/lib/engvoPersonaCopy'

export const PRACTICE_ANSWER_REVEAL_MS = 500
export const PRACTICE_CHECKING_MS = 2000
export const PRACTICE_FEEDBACK_MS = 2000
export const PRACTICE_CHECKING_MESSAGE = ENGVO_CHECKING_MESSAGE

export type PracticeAnswerFeedbackType = 'success' | 'error'

/** Блокировка ввода: submitting, проверка + пауза после верного ответа (как в уроке). */
export function isPracticeAnswerPanelLocked(
  state: PracticeFlowState,
  feedbackType: PracticeAnswerFeedbackType | undefined,
  isQuestionRevealInProgress = false
): boolean {
  return (
    state === 'submitting' ||
    state === 'checking' ||
    (state === 'feedback' && feedbackType === 'success') ||
    state === 'generating_next' ||
    isQuestionRevealInProgress
  )
}

/** Визуальный freeze чипсов: с момента отправки / проверки до смены шага. */
export function isPracticeChoicePanelFrozen(
  state: PracticeFlowState,
  feedbackType: PracticeAnswerFeedbackType | undefined,
  isQuestionRevealInProgress = false
): boolean {
  return (
    state === 'submitting' ||
    state === 'checking' ||
    (state === 'feedback' && feedbackType === 'success') ||
    state === 'generating_next' ||
    isQuestionRevealInProgress
  )
}

/** Нельзя нажать чип: submitting, проверка или freeze. */
export function isPracticeChoiceInteractionDisabled(
  state: PracticeFlowState,
  feedbackType: PracticeAnswerFeedbackType | undefined,
  isQuestionRevealInProgress = false
): boolean {
  return (
    state === 'submitting' ||
    state === 'checking' ||
    isPracticeChoicePanelFrozen(state, feedbackType, isQuestionRevealInProgress)
  )
}

/** @deprecated Используй isPracticeAnswerPanelLocked - композер больше не скрывается из DOM. */
export function isPracticeComposerLocked(
  state: PracticeFlowState,
  feedbackType?: PracticeAnswerFeedbackType,
  isQuestionRevealInProgress = false
): boolean {
  return isPracticeAnswerPanelLocked(state, feedbackType, isQuestionRevealInProgress)
}

/** Карточка текущего задания остаётся до смены currentIndex (история), чтобы не дёргать скролл. */
export function shouldHideCurrentPracticeQuestionBubbles(params: {
  state: PracticeFlowState
  questionIndex: number
  currentIndex: number
  feedbackType?: PracticeAnswerFeedbackType
}): boolean {
  void params
  return false
}

/** Скрывать оболочку композера только на briefing (не на lock-состояниях). */
export function isPracticeComposerCollapsed(state: PracticeFlowState): boolean {
  return state === 'briefing'
}
