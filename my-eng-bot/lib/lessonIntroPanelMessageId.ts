import type { LessonFeedMessage } from '@/lib/buildLessonFeedMessages'

export type ParsedLessonFeedMessageId = {
  stepNumber: number
  stepIndex: number
  entryIndex: number | null
  scope: 'current' | 'history'
}

type LessonFeedMessageBaseEntry = {
  isCurrent: boolean
  step: { stepNumber: number; stepIndex?: number }
}

/** Стабильный id: current не зависит от позиции в timeline (не прыгает при success feedback). */
export function buildLessonFeedMessageBaseId(
  entry: LessonFeedMessageBaseEntry,
  entryIndex: number,
  stepIndex: number
): string {
  const stepPart = `${entry.step.stepNumber}-${stepIndex}`
  if (entry.isCurrent) {
    return `${stepPart}-current`
  }
  return `${stepPart}-${entryIndex}-history`
}

export function parseLessonFeedMessageId(id: string): ParsedLessonFeedMessageId | null {
  const stableCurrentMatch = id.match(/^lesson-(\d+)-(\d+)-current$/)
  if (stableCurrentMatch) {
    return {
      stepNumber: Number(stableCurrentMatch[1]),
      stepIndex: Number(stableCurrentMatch[2]),
      entryIndex: null,
      scope: 'current',
    }
  }

  const legacyMatch = id.match(/^lesson-(\d+)-(\d+)-(\d+)-(current|history)$/)
  if (!legacyMatch) return null

  return {
    stepNumber: Number(legacyMatch[1]),
    stepIndex: Number(legacyMatch[2]),
    entryIndex: Number(legacyMatch[3]),
    scope: legacyMatch[4] as 'current' | 'history',
  }
}

export function toHistoricalLessonFeedMessageId(currentLessonMessageId: string): string {
  const parsed = parseLessonFeedMessageId(currentLessonMessageId)
  if (parsed?.scope === 'current' && parsed.entryIndex === null) {
    return `lesson-${parsed.stepNumber}-${parsed.stepIndex}-0-history`
  }
  return currentLessonMessageId.replace(/-current$/, '-history')
}

/** Куда перенести openPanel, когда current lesson message сменил id (retry / шаг / вариант). */
export function resolveHistoricalLessonMessageIdForDepartingCurrent(
  departingCurrentLessonMessageId: string,
  lessonMessages: LessonFeedMessage[]
): string | null {
  const parsed = parseLessonFeedMessageId(departingCurrentLessonMessageId)
  if (!parsed || parsed.scope !== 'current') return null

  const sameEntryHistoryId = toHistoricalLessonFeedMessageId(departingCurrentLessonMessageId)
  if (lessonMessages.some((message) => message.kind === 'lesson' && message.id === sameEntryHistoryId)) {
    return sameEntryHistoryId
  }

  for (let index = lessonMessages.length - 1; index >= 0; index -= 1) {
    const message = lessonMessages[index]
    if (message.kind !== 'lesson' || !message.isHistorical) continue

    const historyParsed = parseLessonFeedMessageId(message.id)
    if (
      historyParsed &&
      historyParsed.stepNumber === parsed.stepNumber &&
      historyParsed.stepIndex === parsed.stepIndex
    ) {
      return message.id
    }
  }

  return null
}
