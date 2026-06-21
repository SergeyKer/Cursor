import type { LessonFeedback, LessonStatus } from '@/hooks/useLessonEngine'

/** Янтарная подсветка неверного чипа - только с карточкой feedback, не во время checking. */
export function shouldHighlightWrongLessonChoice(
  status: LessonStatus,
  feedbackType: LessonFeedback['type'] | undefined,
): boolean {
  return status === 'feedback' && feedbackType === 'error'
}
