import { featureFlags } from '@/lib/featureFlags'
import type { TutorExplainAnswer } from '@/lib/tutor/types'
import { TUTOR_CHAT_COPY } from '@/lib/uiCopy/tutorChat'

/** Clear English topic label for how_to_say sheet chips (e.g. "I can't come"). */
export function hasClearEnTopicAnchor(answer: TutorExplainAnswer): boolean {
  const title = (answer.topicAnchor.title || answer.title || '').trim()
  if (!title) return false
  return /[A-Za-z]/.test(title)
}

/**
 * Whether tutor may show topic→sheet chip(s) after Explain.
 * Separate from Wave0 `cheatsheetVisibilityForAnswerKind` (micro / legacy nav).
 */
export function tutorTopicSheetChipsEligible(answer: TutorExplainAnswer): boolean {
  if (!featureFlags.referenceV1) return false
  const kind = answer.answerKind
  if (kind === 'grammar' || kind === 'contrast' || kind === 'form') return true
  if (kind === 'how_to_say') return hasClearEnTopicAnchor(answer)
  return false
}

/** Action chip label — always RU CTA; EN anchor stays in eligibility only. */
export function tutorTopicSheetChipLabel(_answer: TutorExplainAnswer): string | null {
  return TUTOR_CHAT_COPY.chipCheatsheet
}