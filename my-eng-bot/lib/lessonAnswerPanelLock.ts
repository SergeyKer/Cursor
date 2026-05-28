import type { LessonStatus } from '@/hooks/useLessonEngine'

export type LessonAnswerFeedbackType = 'success' | 'error'

/** Держим снимок чипсов после смены шага/варианта, пока лента показывает новый task. */
export const LESSON_CHOICE_ADVANCE_HOLD_MS = 450

/** Блокировка ввода: проверка + пауза после верного ответа. */
export function isLessonAnswerPanelLocked(
  status: LessonStatus,
  feedbackType: LessonAnswerFeedbackType | undefined
): boolean {
  return status === 'checking' || (status === 'feedback' && feedbackType === 'success')
}

/** Визуальный freeze чипсов только после верного ответа (не на checking при ошибке). */
export function isLessonChoicePanelFrozen(
  status: LessonStatus,
  feedbackType: LessonAnswerFeedbackType | undefined,
  holdAfterAdvance: boolean
): boolean {
  return (status === 'feedback' && feedbackType === 'success') || holdAfterAdvance
}

/** Нельзя нажать чип: проверка или freeze/hold. */
export function isLessonChoiceInteractionDisabled(
  status: LessonStatus,
  feedbackType: LessonAnswerFeedbackType | undefined,
  holdAfterAdvance: boolean
): boolean {
  return status === 'checking' || isLessonChoicePanelFrozen(status, feedbackType, holdAfterAdvance)
}
