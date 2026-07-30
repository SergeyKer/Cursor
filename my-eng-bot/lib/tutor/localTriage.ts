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
import { isPendingAngleReply } from '@/lib/tutor/tutorTurnRouter'
import type { TutorTriageResult } from '@/lib/tutor/types'
import { TUTOR_CHAT_COPY, TUTOR_TRIAGE_CHIP_LABELS } from '@/lib/uiCopy/tutorChat'

const BARE_INTERROGATIVE_RE = /^(почему|зачем|как|что|когда|где|чем)\??$/i
const STUB_INTENT_RE = /^(как\s+сказать|перевед\w*|translate)\??$/i

export type PendingTriageFollowUp =
  | { kind: 'explain'; query: string }
  | { kind: 'fallthrough' }

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

  const words = query.split(/\s+/).length
  const isQuestion = TUTOR_QUESTION_RE.test(query)

  // Bare interrogative → angle chips, not an empty Explain
  if (BARE_INTERROGATIVE_RE.test(query)) {
    return {
      kind: 'C',
      broadTerm: query,
      chips: chipsFromLabels([...TUTOR_TRIAGE_CHIP_LABELS.shortC]),
    }
  }

  // Substantive ask → Explain before bare-topic B (have got in a sentence must not force chips)
  if (isQuestion || words >= 4) {
    return { kind: 'A', query }
  }

  if (TUTOR_NARROW_TOPIC_RE.test(query)) {
    return {
      kind: 'B',
      topicHint: query,
      chips: chipsFromLabels([...TUTOR_TRIAGE_CHIP_LABELS.narrowB]),
    }
  }

  // Bare short word like "cars" → angle chips
  if (words <= 2) {
    return {
      kind: 'C',
      broadTerm: query,
      chips: chipsFromLabels([...TUTOR_TRIAGE_CHIP_LABELS.shortC]),
    }
  }

  return { kind: 'A', query }
}

/**
 * While B/C chips are live: combine with anchor or fall through as a fresh first-hop.
 * Never returns a path that would re-show B/C for the same pending turn.
 */
export function resolvePendingTriageFollowUp(
  anchorQuery: string,
  rawText: string
): PendingTriageFollowUp {
  const anchor = normalizeTutorQuery(anchorQuery)
  const text = normalizeTutorQuery(rawText)
  if (!anchor || !text) return { kind: 'fallthrough' }

  const combined = `${anchor}: ${text}`

  if (isPendingAngleReply(text)) {
    return { kind: 'explain', query: combined }
  }

  // Stub intent without object — keep topic; full "Как сказать hello?" falls through
  if (STUB_INTENT_RE.test(text)) {
    return { kind: 'explain', query: combined }
  }

  const triage = localTutorTriage(text)
  if (triage.kind === 'B' || triage.kind === 'C') {
    return { kind: 'explain', query: combined }
  }

  return { kind: 'fallthrough' }
}
