import { featureFlags } from '@/lib/featureFlags'
import { canOpenLocalReferenceLesson } from '@/lib/reference/canOpenLocalReference'
import { resolveReviewChipTopic } from '@/lib/languageNote/resolveReviewChipTopic'
import {
  clearTutorReturnContext,
  stashTutorReturnContext,
  type TutorReturnContextSnapshot,
} from '@/lib/tutor/tutorReturnContext'
import type { TutorExplainAnswer } from '@/lib/tutor/types'
import { TUTOR_CHAT_COPY } from '@/lib/uiCopy/tutorChat'

export type TutorCheatsheetResult =
  | { kind: 'opened' }
  | { kind: 'missing'; message: string }
  | { kind: 'unavailable'; message: string }
  | { kind: 'needs_generate'; query: string }

/**
 * Sync local resolve. Caller may then generate when kind === needs_generate.
 */
export function resolveTutorCheatsheetOpen(params: {
  answer: TutorExplainAnswer
  snapshot: Omit<TutorReturnContextSnapshot, 'savedAt'>
  openLocalReference: (lessonId: string) => void
}): TutorCheatsheetResult {
  if (!featureFlags.referenceV1) {
    return { kind: 'unavailable', message: TUTOR_CHAT_COPY.cheatsheetUnavailable }
  }
  if (params.answer.cheatsheetVisibility === 'hidden') {
    return { kind: 'missing', message: TUTOR_CHAT_COPY.cheatsheetMissing }
  }

  const tryOpen = (lessonId: string): TutorCheatsheetResult | null => {
    if (!canOpenLocalReferenceLesson(lessonId)) return null
    stashTutorReturnContext(params.snapshot)
    params.openLocalReference(lessonId)
    return { kind: 'opened' }
  }

  const hint = params.answer.topicAnchor.lessonIdHint?.trim() || null
  if (hint) {
    const opened = tryOpen(hint)
    if (opened) return opened
  }

  const chipTitle =
    params.answer.topicAnchor.title ||
    params.answer.title ||
    params.answer.topicAnchor.canonicalKey
  const resolved = resolveReviewChipTopic({
    chipTitle,
    noteLessonId: hint,
  })

  if (resolved.kind === 'local') {
    const opened = tryOpen(resolved.lessonId)
    if (opened) return opened
  }

  if (featureFlags.referenceGenerate) {
    const query =
      params.answer.topicAnchor.title ||
      params.answer.title ||
      params.answer.topicAnchor.canonicalKey ||
      ''
    if (query.trim()) {
      stashTutorReturnContext(params.snapshot)
      return { kind: 'needs_generate', query: query.trim() }
    }
  }

  return { kind: 'missing', message: TUTOR_CHAT_COPY.cheatsheetMissing }
}

export function abandonCheatsheetGenerate(): void {
  clearTutorReturnContext()
}
