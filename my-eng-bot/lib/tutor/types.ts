/**
 * Tutor chat v1 contracts (Phase 0).
 * Explain ≠ Micro ≠ Curiosity ≠ MyPlan Now. No UI here.
 */

export type TutorAudience = 'child' | 'adult'

/** A = ready Explain; B = goal chips; C = angle chips; D = clarify. */
export type TutorTriageKind = 'A' | 'B' | 'C' | 'D'

export type TutorComposerChip = {
  id: string
  labelRu: string
  /** If set, chip action uses this instead of labelRu (e.g. follow-up without «Например:»). */
  submitText?: string
  /** Per-chip unavailable (e.g. шпаргалка без канона). Busy uses chipsDisabled separately. */
  disabled?: boolean
  /** Optional hint when disabled. */
  disabledTitle?: string
}

export type TutorTriageResult =
  | { kind: 'A'; query: string }
  | { kind: 'B'; topicHint: string; chips: TutorComposerChip[] }
  | { kind: 'C'; broadTerm: string; chips: TutorComposerChip[] }
  | { kind: 'D'; clarifyPromptRu: string }

/**
 * Drives post-Explain chips (esp. шпаргалка).
 * grammar/contrast/form → primary cheatsheet; translate → hidden;
 * how_to_say/orthography → hidden (Wave0).
 */
export type TutorAnswerKind =
  | 'grammar'
  | 'contrast'
  | 'form'
  | 'translate'
  | 'how_to_say'
  | 'orthography'
  | 'other'

export type TutorCheatsheetChipVisibility = 'primary' | 'secondary' | 'hidden'

export type TutorTopicAnchor = {
  title: string
  canonicalKey: string
  lessonIdHint?: string | null
  skillTagIds?: string[]
}

export type TutorExplainAnswer = {
  answerKind: TutorAnswerKind
  title: string
  /** RU teacher text as paragraphs (no Hook/Rule/Formula cards). */
  paragraphs: string[]
  /** Short EN examples shown under the text. */
  examplesEn: string[]
  rememberRu?: string
  contrastPair?: [string, string]
  topicAnchor: TutorTopicAnchor
  cheatsheetVisibility: TutorCheatsheetChipVisibility
}

export type TutorExplainScope = 'in_scope' | 'out_of_scope'

export type TutorExplainResult =
  | { scope: 'in_scope'; answer: TutorExplainAnswer }
  | { scope: 'out_of_scope'; messageRu: string }

export type TutorTopicContextTurn = {
  role: 'user' | 'assistant'
  text: string
}

export type TutorTopicContext = {
  anchor: {
    title: string
    canonicalKey: string
    rememberRu?: string
  }
  recentTurns: TutorTopicContextTurn[]
}

export type TutorMicroScoreBand = 'strong' | 'mid' | 'weak'

/** Fraction correct: strong ≥ 0.8, mid ≥ 0.4, else weak. */
export const TUTOR_MICRO_STRONG_MIN = 0.8
export const TUTOR_MICRO_MID_MIN = 0.4
export const TUTOR_TOPIC_CONTEXT_MAX_TURNS = 2

export type TutorMicroItemKind =
  | 'pick_side'
  | 'best_fit'
  | 'fix_one'
  | 'signal_spot'
  | 'job_of_bit'
  | 'choice'

export type TutorMicroItem = {
  id: string
  kind: TutorMicroItemKind
  promptRu: string
  options: string[]
  correctIndex: number
  skillTagId?: string
}

export type TutorMicroPack = {
  items: TutorMicroItem[]
  summaryRu: string
}

/** Curiosity is NOT an error signal — separate store from AttentionZones. */
export type TutorCuriosityEntry = {
  id: string
  topicTitle: string
  questionRu: string
  canonicalKey?: string
  createdAtIso: string
  answeredAtIso?: string
}

export type TutorCardSource = 'error_prompt' | 'curiosity'

/** Stub view-model for MyPlan «Репетитор» card (UI wiring — Phase 4). */
export type TutorCardViewModel = {
  title: string
  reason: string
  buttonLabel: string
  prefill: string
  source: TutorCardSource
  skillTagId?: string
}

export const TUTOR_EXPLAIN_CHILD_MIN_PARAGRAPHS = 2
export const TUTOR_EXPLAIN_CHILD_MAX_PARAGRAPHS = 5
export const TUTOR_EXPLAIN_ADULT_MIN_PARAGRAPHS = 1
export const TUTOR_EXPLAIN_ADULT_MAX_PARAGRAPHS = 5
export const TUTOR_EXPLAIN_CHILD_MIN_EXAMPLES = 1
export const TUTOR_EXPLAIN_CHILD_MAX_EXAMPLES = 2
export const TUTOR_EXPLAIN_ADULT_MAX_EXAMPLES = 3

export const TUTOR_MICRO_MIN_ITEMS = 2
export const TUTOR_MICRO_MAX_ITEMS = 5
export const TUTOR_MICRO_MIN_OPTIONS = 2
export const TUTOR_MICRO_MAX_OPTIONS = 4

export const TUTOR_TRIAGE_MAX_CHIPS = 4
