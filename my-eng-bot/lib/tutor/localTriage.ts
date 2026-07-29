import { chipsFromLabels } from '@/lib/tutor/normalizeTriage'
import {
  hasExplicitTutorIntent,
  isShortAsciiToken,
  isTutorMetaTeach,
  isTutorNoise,
  normalizeTutorQuery,
  TUTOR_BROAD_TERM_RE,
  TUTOR_NARROW_TOPIC_RE,
  TUTOR_QUESTION_RE,
} from '@/lib/tutor/tutorIntent'
import { matchTutorGate } from '@/lib/tutor/tutorGate'
import type { TutorTriageResult } from '@/lib/tutor/types'
import { TUTOR_CHAT_COPY, TUTOR_TRIAGE_CHIP_LABELS } from '@/lib/uiCopy/tutorChat'

/**
 * Client-side triage for first-hop / topic-switch.
 * Deterministic, cheap, no network. Gate runs first.
 */
export function localTutorTriage(rawQuery: string): TutorTriageResult {
  const query = normalizeTutorQuery(rawQuery)
  if (!query) {
    return { kind: 'D', clarifyPromptRu: TUTOR_CHAT_COPY.clarifyDefault }
  }

  const gate = matchTutorGate(query)
  if (gate) {
    return { kind: 'D', clarifyPromptRu: gate.messageRu }
  }

  if (isTutorNoise(query)) {
    return { kind: 'D', clarifyPromptRu: TUTOR_CHAT_COPY.clarifyDefault }
  }

  // Bare short EN token (do/go/a) before QUESTION_RE (which matches ^do)
  if (isShortAsciiToken(query)) {
    return {
      kind: 'C',
      broadTerm: query,
      chips: chipsFromLabels([...TUTOR_TRIAGE_CHIP_LABELS.shortC]),
    }
  }

  if (isTutorMetaTeach(query)) {
    return {
      kind: 'C',
      broadTerm: query,
      chips: chipsFromLabels([...TUTOR_TRIAGE_CHIP_LABELS.metaC]),
    }
  }

  if (hasExplicitTutorIntent(query)) {
    return { kind: 'A', query }
  }

  if (TUTOR_BROAD_TERM_RE.test(query)) {
    return {
      kind: 'C',
      broadTerm: query,
      chips: chipsFromLabels([...TUTOR_TRIAGE_CHIP_LABELS.broadC]),
    }
  }

  if (TUTOR_NARROW_TOPIC_RE.test(query) && !TUTOR_QUESTION_RE.test(query)) {
    return {
      kind: 'B',
      topicHint: query,
      chips: chipsFromLabels([...TUTOR_TRIAGE_CHIP_LABELS.narrowB]),
    }
  }

  if (TUTOR_QUESTION_RE.test(query) || query.split(/\s+/).length >= 4) {
    return { kind: 'A', query }
  }

  // Bare short word like "cars" → angle chips
  if (query.split(/\s+/).length <= 2 && !TUTOR_QUESTION_RE.test(query)) {
    return {
      kind: 'C',
      broadTerm: query,
      chips: chipsFromLabels([...TUTOR_TRIAGE_CHIP_LABELS.shortC]),
    }
  }

  return { kind: 'A', query }
}
