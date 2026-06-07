import type { LessonTimelineEntry } from '@/hooks/useLessonEngine'

/** Стабильный id ответа: не меняется при переходе checking → feedback (current → history). */
export function buildLessonAnswerMessageId(stepNumber: number, attemptNumber: number): string {
  return `answer-step-${stepNumber}-try-${attemptNumber}`
}

export function resolveLessonAnswerAttemptNumber(params: {
  entry: LessonTimelineEntry
  historyAttemptOrdinal: number
  timeline: LessonTimelineEntry[]
}): number {
  if (!params.entry.isCurrent) {
    return params.historyAttemptOrdinal > 0 ? params.historyAttemptOrdinal : 1
  }

  const completedAttemptsOnStep = params.timeline.filter(
    (entry) =>
      !entry.isCurrent &&
      entry.stepIndex === params.entry.stepIndex &&
      Boolean(entry.submittedAnswer?.trim())
  ).length

  return completedAttemptsOnStep + 1
}
