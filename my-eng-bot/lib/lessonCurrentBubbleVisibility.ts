import type { LessonFeedback, LessonStatus, LessonTimelineEntry } from '@/hooks/useLessonEngine'

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

/** На 2+ попытке не дублируем блок задания в истории ленты. */
export function shouldSkipRepeatHistoryLessonBubble(params: {
  isPuzzleStep: boolean
  isCurrent: boolean
  historyAttemptOrdinal: number
}): boolean {
  return !params.isPuzzleStep && !params.isCurrent && params.historyAttemptOrdinal > 1
}

export function shouldHideCurrentLessonBubbles(params: {
  isPuzzleStep: boolean
  isCurrent: boolean
  status: LessonStatus
  latestFeedbackType: LessonFeedback['type'] | undefined
  hasHistoricalAttemptsForCurrentStep: boolean
}): boolean {
  if (params.isPuzzleStep || !params.isCurrent) {
    return false
  }
  if (params.status === 'checking' && params.hasHistoricalAttemptsForCurrentStep) {
    return true
  }
  if (params.status !== 'feedback') {
    return false
  }
  if (params.latestFeedbackType === 'success') return true
  return params.hasHistoricalAttemptsForCurrentStep && params.latestFeedbackType === 'error'
}
