import type { LessonFeedback, LessonStatus, LessonTimelineEntry } from '@/hooks/useLessonEngine'
import { resolveLessonTaskPromptForEntry } from '@/lib/lessonFeedBubbles'

export function hasHistoricalAttemptsForCurrentStep(
  timeline: LessonTimelineEntry[],
  entry: LessonTimelineEntry,
): boolean {
  if (!entry.isCurrent) return false
  return timeline.some(
    (timelineEntry) =>
      !timelineEntry.isCurrent &&
      timelineEntry.stepIndex === entry.stepIndex &&
      Boolean(timelineEntry.step.exercise),
  )
}

/** Есть ли в истории попытка с тем же текстом задания (retry), а не другой вариант. */
export function hasSameTaskPromptHistoryForCurrentStep(
  timeline: LessonTimelineEntry[],
  entry: LessonTimelineEntry,
): boolean {
  if (!entry.isCurrent) return false
  const currentPrompt = resolveLessonTaskPromptForEntry(entry)
  if (!currentPrompt) return false
  return timeline.some(
    (timelineEntry) =>
      !timelineEntry.isCurrent &&
      timelineEntry.stepIndex === entry.stepIndex &&
      Boolean(timelineEntry.step.exercise) &&
      resolveLessonTaskPromptForEntry(timelineEntry) === currentPrompt,
  )
}

/** На 2+ попытке не дублируем блок задания, если вопрос тот же (retry). Новый вариант — показываем. */
export function shouldSkipRepeatHistoryLessonBubble(params: {
  isPuzzleStep: boolean
  isCurrent: boolean
  historyAttemptOrdinal: number
  taskPrompt: string | null
  previousHistoryTaskPrompt: string | null
}): boolean {
  if (params.isPuzzleStep || params.isCurrent) return false
  if (params.historyAttemptOrdinal <= 1) return false
  if (!params.taskPrompt || !params.previousHistoryTaskPrompt) return true
  return params.taskPrompt === params.previousHistoryTaskPrompt
}

export function shouldHideCurrentLessonBubbles(params: {
  isPuzzleStep: boolean
  isCurrent: boolean
  status: LessonStatus
  latestFeedbackType: LessonFeedback['type'] | undefined
  hasSameTaskPromptHistory: boolean
}): boolean {
  if (params.isPuzzleStep || !params.isCurrent) {
    return false
  }
  if (params.status === 'checking' && params.hasSameTaskPromptHistory) {
    return true
  }
  if (params.status !== 'feedback') {
    return false
  }
  if (params.latestFeedbackType === 'success') return true
  return params.hasSameTaskPromptHistory && params.latestFeedbackType === 'error'
}
