import type { LessonFeedback, LessonStatus } from '@/hooks/useLessonEngine'
import type { PracticeFlowState } from '@/hooks/usePracticeSession'

/** Длительность янтарной подсветки неверного чипа (как в уроке). */
export const CHOICE_REOPEN_DELAY_MS = 900

/** Янтарная подсветка неверного чипа - только с карточкой feedback, не во время checking. */
export function shouldHighlightWrongLessonChoice(
  status: LessonStatus,
  feedbackType: LessonFeedback['type'] | undefined,
): boolean {
  return status === 'feedback' && feedbackType === 'error'
}

/** Подсветка неверного чипа в практике choice-коррекции. */
export function shouldHighlightWrongPracticeChoice(
  state: PracticeFlowState,
  feedbackType: 'success' | 'error' | undefined,
): boolean {
  return state === 'correction' && feedbackType === 'error'
}

/** Подсветка неверного чипа в quick test (feedback без correction). */
export function shouldHighlightWrongQuickTestChoice(
  state: PracticeFlowState,
  feedbackType: 'success' | 'error' | undefined,
): boolean {
  return state === 'feedback' && feedbackType === 'error'
}
