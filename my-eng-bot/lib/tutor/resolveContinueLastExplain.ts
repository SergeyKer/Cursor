/**
 * CONTINUE deepen: keep strong lastExplain when model returns a weak satellite answer.
 * Pure: no React, no I/O.
 */

import { isMicroAnswerKindEligible } from '@/lib/tutor/microEligible'
import type { TutorAnswerKind, TutorExplainAnswer } from '@/lib/tutor/types'

const WEAK_KINDS: ReadonlySet<TutorAnswerKind> = new Set([
  'how_to_say',
  'translate',
  'other',
])

export function isWeakContinueAnswerKind(kind: TutorAnswerKind): boolean {
  return WEAK_KINDS.has(kind)
}

/**
 * True when deepen should retain prev for chips / micro / cheatsheet / topicContext.
 * Requires caller to gate on topicContext present.
 */
export function shouldRetainLastExplainOnDeepen(
  prev: TutorExplainAnswer,
  next: TutorExplainAnswer
): boolean {
  return isMicroAnswerKindEligible(prev.answerKind) && isWeakContinueAnswerKind(next.answerKind)
}

/** Which answer becomes lastExplain after a CONTINUE deepen. */
export function resolveContinueLastExplain(
  prev: TutorExplainAnswer,
  next: TutorExplainAnswer
): TutorExplainAnswer {
  return shouldRetainLastExplainOnDeepen(prev, next) ? prev : next
}
