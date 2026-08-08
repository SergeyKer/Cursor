import { featureFlags } from '@/lib/featureFlags'
import {
  materializeReferenceCandidate,
  resolveReferenceOpen,
  type ReferenceCandidate,
} from '@/lib/reference/resolveReferenceOpen'
import type { ReferenceSheet } from '@/lib/reference/types'
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
  | { kind: 'needs_generate'; query: string; grounded: boolean }
  | { kind: 'needs_choose'; candidates: ReferenceCandidate[] }

/**
 * Sync local resolve via shared reference open.
 * Caller generates (grounded) when needs_generate; may show choose chips.
 */
export function resolveTutorCheatsheetOpen(params: {
  answer: TutorExplainAnswer
  snapshot: Omit<TutorReturnContextSnapshot, 'savedAt'>
  openLocalReference: (lessonId: string) => void
  openRuntimeSheet?: (sheet: ReferenceSheet) => void
}): TutorCheatsheetResult {
  if (!featureFlags.referenceV1) {
    return { kind: 'unavailable', message: TUTOR_CHAT_COPY.cheatsheetUnavailable }
  }
  if (params.answer.cheatsheetVisibility === 'hidden') {
    return { kind: 'missing', message: TUTOR_CHAT_COPY.cheatsheetMissing }
  }

  const rawQuery =
    params.answer.topicAnchor.title ||
    params.answer.title ||
    params.answer.topicAnchor.canonicalKey ||
    ''

  const resolved = resolveReferenceOpen({
    rawQuery,
    explain: params.answer,
    context: {
      title: params.answer.topicAnchor.title,
      canonicalKey: params.answer.topicAnchor.canonicalKey,
      lessonIdHint: params.answer.topicAnchor.lessonIdHint,
      paragraphs: params.answer.paragraphs,
      answerKind: params.answer.answerKind,
    },
  })

  if (resolved.kind === 'open') {
    const materialized = materializeReferenceCandidate(resolved.candidate)
    if (materialized.kind === 'open') {
      const openLocal =
        resolved.candidate.openKind === 'local_lesson' && resolved.candidate.lessonId
      const openRuntime = Boolean(params.openRuntimeSheet) && !openLocal
      const openLocalFallback = Boolean(resolved.candidate.lessonId) && !openLocal && !params.openRuntimeSheet
      if (!openLocal && !openRuntime && !openLocalFallback) {
        return { kind: 'missing', message: TUTOR_CHAT_COPY.cheatsheetMissing }
      }
      stashTutorReturnContext(params.snapshot)
      if (openLocal && resolved.candidate.lessonId) {
        params.openLocalReference(resolved.candidate.lessonId)
      } else if (params.openRuntimeSheet) {
        params.openRuntimeSheet(materialized.sheet)
      } else if (resolved.candidate.lessonId) {
        params.openLocalReference(resolved.candidate.lessonId)
      }
      return { kind: 'opened' }
    }
  }

  if (resolved.kind === 'choose') {
    stashTutorReturnContext(params.snapshot)
    return { kind: 'needs_choose', candidates: resolved.candidates }
  }

  if (resolved.kind === 'needs_llm' && featureFlags.referenceGenerate) {
    stashTutorReturnContext(params.snapshot)
    return { kind: 'needs_generate', query: resolved.query, grounded: true }
  }

  if (featureFlags.referenceGenerate && rawQuery.trim()) {
    stashTutorReturnContext(params.snapshot)
    return { kind: 'needs_generate', query: rawQuery.trim(), grounded: true }
  }

  return { kind: 'missing', message: TUTOR_CHAT_COPY.cheatsheetMissing }
}

export function abandonCheatsheetGenerate(): void {
  clearTutorReturnContext()
}
