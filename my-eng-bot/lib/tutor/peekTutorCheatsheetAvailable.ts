import { featureFlags } from '@/lib/featureFlags'
import {
  materializeReferenceCandidate,
  resolveReferenceOpen,
} from '@/lib/reference/resolveReferenceOpen'
import { tutorTopicSheetChipsEligible } from '@/lib/tutor/tutorTopicSheetChipsEligible'
import type { TutorExplainAnswer } from '@/lib/tutor/types'

/**
 * Dry-run: would topic sheet open, need choose, or grounded generate.
 * No stash / no side effects.
 */
export function peekTutorCheatsheetAvailable(answer: TutorExplainAnswer): boolean {
  if (!featureFlags.referenceV1) return false
  if (!tutorTopicSheetChipsEligible(answer)) return false

  const rawQuery =
    answer.topicAnchor.title || answer.title || answer.topicAnchor.canonicalKey || ''

  const resolved = resolveReferenceOpen({
    rawQuery,
    explain: answer,
    context: {
      title: answer.topicAnchor.title,
      canonicalKey: answer.topicAnchor.canonicalKey,
      lessonIdHint: answer.topicAnchor.lessonIdHint,
      paragraphs: answer.paragraphs,
      answerKind: answer.answerKind,
    },
  })

  if (resolved.kind === 'choose') return true

  if (resolved.kind === 'open') {
    const materialized = materializeReferenceCandidate(resolved.candidate)
    if (materialized.kind === 'open') {
      const openLocal =
        resolved.candidate.openKind === 'local_lesson' && Boolean(resolved.candidate.lessonId)
      if (openLocal || materialized.sheet) return true
      return Boolean(resolved.candidate.lessonId)
    }
    // Generate candidate: tutor grounded path can open without global flag.
    if (materialized.kind === 'generate') return true
  }

  if (resolved.kind === 'needs_llm') return true

  // Grounded generate fallback when no gold/choose.
  return Boolean(rawQuery.trim())
}
