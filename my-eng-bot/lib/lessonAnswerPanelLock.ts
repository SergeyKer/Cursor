import type { LessonStatus } from '@/hooks/useLessonEngine'
import { ENGVO_CHECKING_MESSAGE } from '@/lib/engvoPersonaCopy'
import {
  PRACTICE_ANSWER_REVEAL_MS,
  PRACTICE_CHECKING_MS,
  PRACTICE_FEEDBACK_MS,
} from '@/lib/practice/practiceAnswerPanelLock'

export type LessonAnswerFeedbackType = 'success' | 'error'

/**
 * Service-строка в ленте урока при проверке ответа (как в практике).
 * Клиентская UX-имитация Engvo; не анти-чит (награды — lessonAntiFarm и сервер).
 */
export const LESSON_CHECKING_MESSAGE = ENGVO_CHECKING_MESSAGE

/** Пауза после верного ответа до auto-advance — как в practice. */
export const LESSON_SUCCESS_HOLD_MS = PRACTICE_FEEDBACK_MS

/**
 * Задержка перед «Engvo проверяет ответ...» — как submitting в практике.
 * Значение = PRACTICE_ANSWER_REVEAL_MS (файлы практики не редактируются).
 */
export const LESSON_CHECKING_REVEAL_MS = PRACTICE_ANSWER_REVEAL_MS

/**
 * Полная пауза до feedback: reveal ответа + фаза checking.
 * Значение = PRACTICE_ANSWER_REVEAL_MS + PRACTICE_CHECKING_MS; UX-пауза, не security.
 */
export const LESSON_VALIDATION_DELAY_MS = PRACTICE_ANSWER_REVEAL_MS + PRACTICE_CHECKING_MS

/** Блокировка ввода: проверка + пауза после верного ответа + reveal задания. */
export function isLessonAnswerPanelLocked(
  status: LessonStatus,
  feedbackType: LessonAnswerFeedbackType | undefined,
  isRevealInProgress = false
): boolean {
  return (
    isRevealInProgress ||
    status === 'checking' ||
    (status === 'feedback' && feedbackType === 'success')
  )
}

/** Визуальный freeze чипсов: проверка ответа, успех, reveal задания. */
export function isLessonChoicePanelFrozen(
  status: LessonStatus,
  feedbackType: LessonAnswerFeedbackType | undefined,
  isRevealInProgress = false
): boolean {
  return (
    isRevealInProgress ||
    status === 'checking' ||
    (status === 'feedback' && feedbackType === 'success')
  )
}

/** Нельзя нажать чип: проверка или freeze. */
export function isLessonChoiceInteractionDisabled(
  status: LessonStatus,
  feedbackType: LessonAnswerFeedbackType | undefined,
  isRevealInProgress = false
): boolean {
  return (
    status === 'checking' ||
    isLessonChoicePanelFrozen(status, feedbackType, isRevealInProgress)
  )
}
