import type { LessonFeedback, LessonStatus, LessonTimelineEntry } from '@/hooks/useLessonEngine'
import {
  ENGVO_LESSON_ADVANCING_MESSAGE,
  ENGVO_LESSON_ADVANCING_VARIANT_MESSAGE,
} from '@/lib/engvoPersonaCopy'
import { prefixFeedbackMarker, resolveFeedbackMarker } from '@/lib/feedbackMarkers'
import { formatLessonErrorFeedback } from '@/lib/lessonFeedbackMessage'
import {
  hasHistoricalAttemptsForCurrentStep,
  shouldHideCurrentLessonBubbles,
  shouldSkipRepeatHistoryLessonBubble,
} from '@/lib/lessonCurrentBubbleVisibility'
import {
  buildLessonAnswerMessageId,
  resolveLessonAnswerAttemptNumber,
} from '@/lib/lessonFeedAnswerId'
import { injectVariantQuestionIntoTaskBubble } from '@/lib/lessonFeedBubbles'
import { LESSON_CHECKING_MESSAGE } from '@/lib/lessonAnswerPanelLock'
import type { Bubble } from '@/types/lesson'

export type LessonFeedMessage =
  | {
      id: string
      role: 'assistant'
      kind: 'lesson'
      bubbles: Bubble[]
      isHistorical: boolean
    }
  | {
      id: string
      role: 'user'
      kind: 'answer'
      text: string
    }
  | {
      id: string
      role: 'assistant'
      kind: 'status'
      text: string
      tone: 'service' | 'success' | 'error'
    }

export type BuildLessonFeedMessagesParams = {
  timeline: LessonTimelineEntry[]
  status: LessonStatus
  latestFeedbackType?: LessonFeedback['type']
  showCheckingStatusLine: boolean
  showAdvancingStatusLine: boolean
  isAdvancingToNextStep: boolean
  isAdvancingToNextVariant: boolean
}

function buildAttemptOrdinalMaps(timeline: LessonTimelineEntry[]) {
  const seenAttemptCountByStep = new Map<number, number>()
  const attemptOrdinalByEntryIndex = new Map<number, number>()

  timeline.forEach((entry, entryIndex) => {
    if (!entry.step.exercise || entry.isCurrent) return
    const nextAttemptOrdinal = (seenAttemptCountByStep.get(entry.stepIndex) ?? 0) + 1
    seenAttemptCountByStep.set(entry.stepIndex, nextAttemptOrdinal)
    attemptOrdinalByEntryIndex.set(entryIndex, nextAttemptOrdinal)
  })

  return attemptOrdinalByEntryIndex
}

function shouldSkipFinaleTailSuccessFeedback(
  entry: LessonTimelineEntry,
  timeline: LessonTimelineEntry[],
): boolean {
  const finaleActive = timeline.some(
    (timelineEntry) =>
      timelineEntry.isCurrent && timelineEntry.step.stepType === 'completion'
  )
  if (!finaleActive || entry.isCurrent || entry.feedback?.type !== 'success') {
    return false
  }
  if (entry.step.stepType === 'completion') return false

  const maxLearningStepIndex = timeline.reduce((max, timelineEntry) => {
    if (timelineEntry.step.stepType === 'completion') return max
    return Math.max(max, timelineEntry.stepIndex)
  }, -1)

  return entry.stepIndex === maxLearningStepIndex
}

export function buildLessonFeedMessages(params: BuildLessonFeedMessagesParams): LessonFeedMessage[] {
  const {
    timeline,
    status,
    latestFeedbackType,
    showCheckingStatusLine,
    showAdvancingStatusLine,
    isAdvancingToNextStep,
    isAdvancingToNextVariant,
  } = params

  const messages: LessonFeedMessage[] = []
  const deferredPuzzleCurrentMessages: LessonFeedMessage[] = []
  const attemptOrdinalByEntryIndex = buildAttemptOrdinalMaps(timeline)

  timeline.forEach((entry, entryIndex) => {
    const messageBaseId = `${entry.step.stepNumber}-${entry.stepIndex}-${entryIndex}-${entry.isCurrent ? 'current' : 'history'}`
    const isPuzzleStep = entry.step.exercise?.type === 'sentence_puzzle'
    const deferInFlightPuzzleMessages = isPuzzleStep && entry.isCurrent
    const target = deferInFlightPuzzleMessages ? deferredPuzzleCurrentMessages : messages

    const skipPuzzleHistoryLessonBubble = isPuzzleStep && !entry.isCurrent
    const shouldHideCurrentLessonBubblesValue = shouldHideCurrentLessonBubbles({
      isPuzzleStep,
      isCurrent: entry.isCurrent,
      status,
      latestFeedbackType,
      hasHistoricalAttemptsForCurrentStep: hasHistoricalAttemptsForCurrentStep(timeline, entry),
    })
    const baseBubbles = shouldHideCurrentLessonBubblesValue ? [] : entry.step.bubbles
    const bubblesWithVariantQuestion = injectVariantQuestionIntoTaskBubble(baseBubbles, entry.step.exercise)
    const attemptOrdinal = attemptOrdinalByEntryIndex.get(entryIndex) ?? 0
    const bubbles = shouldSkipRepeatHistoryLessonBubble({
      isPuzzleStep,
      isCurrent: entry.isCurrent,
      historyAttemptOrdinal: attemptOrdinal,
    })
      ? []
      : bubblesWithVariantQuestion

    if (bubbles.length > 0 && !skipPuzzleHistoryLessonBubble) {
      messages.push({
        id: `lesson-${messageBaseId}`,
        role: 'assistant',
        kind: 'lesson',
        bubbles,
        isHistorical: !entry.isCurrent,
      })
    }

    if (entry.submittedAnswer?.trim()) {
      const answerAttemptNumber = resolveLessonAnswerAttemptNumber({
        entry,
        historyAttemptOrdinal: attemptOrdinal,
        timeline,
      })
      target.push({
        id: buildLessonAnswerMessageId(entry.step.stepNumber, answerAttemptNumber),
        role: 'user',
        kind: 'answer',
        text: entry.submittedAnswer.trim(),
      })
    }

    if (entry.isCurrent && status === 'checking' && showCheckingStatusLine && entry.step.exercise) {
      target.push({
        id: `checking-${messageBaseId}`,
        role: 'assistant',
        kind: 'status',
        text: LESSON_CHECKING_MESSAGE,
        tone: 'service',
      })
    }

    if (
      entry.feedback &&
      (!entry.isCurrent || status === 'feedback') &&
      !shouldSkipFinaleTailSuccessFeedback(entry, timeline)
    ) {
      const feedbackAttemptNumber = resolveLessonAnswerAttemptNumber({
        entry,
        historyAttemptOrdinal: attemptOrdinal,
        timeline,
      })
      const feedbackTone = entry.feedback.type === 'success' ? 'success' : 'error'
      const feedbackText =
        entry.feedback.type === 'error' &&
        entry.step.exercise &&
        entry.step.exercise.type !== 'sentence_puzzle'
          ? formatLessonErrorFeedback({
              message: entry.feedback.message,
              correctAnswer: entry.step.exercise.correctAnswer,
              attemptNumber: feedbackAttemptNumber,
            })
          : entry.feedback.message
      const marker = resolveFeedbackMarker({
        tone: feedbackTone,
        attemptNumber: feedbackAttemptNumber,
      })
      target.push({
        id: `feedback-${messageBaseId}-${entry.feedback.type}`,
        role: 'assistant',
        kind: 'status',
        text: prefixFeedbackMarker(marker, feedbackText),
        tone: feedbackTone,
      })
    }

    if (
      entry.isCurrent &&
      status === 'feedback' &&
      entry.feedback?.type === 'success' &&
      showAdvancingStatusLine
    ) {
      if (isAdvancingToNextStep) {
        target.push({
          id: `advancing-step-${messageBaseId}`,
          role: 'assistant',
          kind: 'status',
          text: ENGVO_LESSON_ADVANCING_MESSAGE,
          tone: 'service',
        })
      } else if (isAdvancingToNextVariant) {
        target.push({
          id: `advancing-variant-${messageBaseId}`,
          role: 'assistant',
          kind: 'status',
          text: ENGVO_LESSON_ADVANCING_VARIANT_MESSAGE,
          tone: 'service',
        })
      }
    }
  })

  messages.push(...deferredPuzzleCurrentMessages)
  return messages
}
