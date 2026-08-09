import { featureFlags } from '@/lib/featureFlags'
import {
  materializeReferenceCandidate,
  resolveReferenceOpen,
} from '@/lib/reference/resolveReferenceOpen'
import type { TutorExplainAnswer } from '@/lib/tutor/types'

/**
 * Dry-run: would cheatsheet open or need choose, assuming runtime sheet opener exists
 * (as TutorSessionProvider). No stash / no side effects. needs_generate → false.
 */
export function peekTutorCheatsheetAvailable(answer: TutorExplainAnswer): boolean {
  if (!featureFlags.referenceV1) return false
  if (answer.cheatsheetVisibility === 'hidden') return false

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
    if (materialized.kind !== 'open') return false
    const openLocal =
      resolved.candidate.openKind === 'local_lesson' && Boolean(resolved.candidate.lessonId)
    // Assume runtime sheet opener is available (product path).
    if (openLocal || materialized.sheet) return true
    return Boolean(resolved.candidate.lessonId)
  }

  return false
}
