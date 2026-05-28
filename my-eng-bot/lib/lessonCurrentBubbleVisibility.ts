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

export function shouldHideCurrentLessonBubbles(params: {
  isPuzzleStep: boolean
  isCurrent: boolean
  status: LessonStatus
  latestFeedbackType: LessonFeedback['type'] | undefined
  hasHistoricalAttemptsForCurrentStep: boolean
}): boolean {
  if (params.isPuzzleStep || !params.isCurrent || params.status !== 'feedback') {
    return false
  }
  if (params.latestFeedbackType === 'success') return true
  return params.hasHistoricalAttemptsForCurrentStep && params.latestFeedbackType === 'error'
}
