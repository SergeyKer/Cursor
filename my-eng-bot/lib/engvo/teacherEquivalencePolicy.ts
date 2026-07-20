import type { EngvoCefrLevel } from '@/lib/engvo/constants'

/** Stable marker: free_call instructions must not contain this. */
export const TEACHER_EQUIVALENCE_POLICY_MARKER = 'Teacher equivalence policy:'

/** Max length for the policy block (anti prompt bloat). */
export const TEACHER_EQUIVALENCE_POLICY_MAX_CHARS = 1200

/** Anchors for regression tests (golden cases from the school preposition bug). */
export const TEACHER_EQUIVALENCE_GOLDEN_FRAGMENTS = [
  'My sister works school',
  'My sister works at a school',
  'work at a school',
] as const

function isA1(level: EngvoCefrLevel): boolean {
  return level === 'a1'
}

/**
 * Compact judge rules for Engvo Teacher voice drills: canonical / accepted / meta.
 * Keep under TEACHER_EQUIVALENCE_POLICY_MAX_CHARS; trim bank examples first if needed.
 */
export function buildTeacherEquivalencePolicyBlock(level: EngvoCefrLevel): string {
  const contrastRule = isA1(level)
    ? 'A1: no prep lecture; on meta ≤1 plain contrast → Rhythm lock bridge+cue.'
    : 'A2+: on meta 1 contrast (never "both always the same") → Rhythm lock bridge+cue.'

  const softAccepted = isA1(level)
    ? 'Soft-accepted: SUCCESS silent, no Скажи:/Say:; next drill.'
    : 'Soft-accepted: SUCCESS; optional one-line cleaner form (not a Say:/Скажи: marker); no Скажи:/Say:; next drill.'

  return [
    TEACHER_EQUIVALENCE_POLICY_MARKER,
    'Fix one canonical English per drill for Скажи:/Say:.',
    'accepted = canonical + same-meaning variants only if grammar intact (3sg works not work; tense; type; prep/article from set).',
    'ERROR iff outside accepted (missing prep or broken verb = ERROR).',
    softAccepted,
    'Contractions ≡ expanded.',
    'Meta: 1 contrast → Rhythm lock bridge+cue; judge other errors same reply; no topic restart.',
    contrastRule,
    'Never lead with bare "Неправильно."/"Incorrect." alone — soft lead-in + reason.',
    'RU работает в школе/больнице → workplace; prefer canonical at a school/hospital; in a … accepted.',
    'Bank: school at=canonical in=accepted no-prep=ERROR; at/in school (student)≠at a school (job); time in/on/at; like/love want/would like both OK unless register targeted.',
    'Golden: "My sister works school" → ERROR → "My sister works at a school." + Скажи:.',
    'Golden: "My sister works at a school" vs canonical in → SUCCESS soft, not ERROR.',
    'Golden: "... work at a school. Почему не at?" → at/in OK + fix work→works; never only "both always fine".',
  ].join(' ')
}
