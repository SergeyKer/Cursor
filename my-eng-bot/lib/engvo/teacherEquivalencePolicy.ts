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
    ? 'Soft-accepted: SUCCESS silent when all content slots present; no Скажи:/Say:; next drill.'
    : 'Soft-accepted: SUCCESS when all content slots present; optional cleaner line (not Say:/Скажи:); next drill.'

  return [
    TEACHER_EQUIVALENCE_POLICY_MARKER,
    'Fix one canonical English per drill for Скажи:/Say:.',
    'accepted = canonical + same-meaning if grammar intact and all Russian drill content slots are kept.',
    'ERROR iff outside accepted (missing prep, broken verb, or omitted content slot = ERROR).',
    softAccepted,
    'Contractions ≡ expanded.',
    'Meta: 1 contrast → Rhythm lock bridge+cue; no topic restart.',
    contrastRule,
    'Never bare "Неправильно."/"Incorrect." — soft lead-in + reason.',
    'Content coverage: keep every RU drill slot in EN (synonyms OK). Omit slot → ERROR → Say:/Скажи: — never SUCCESS/Natural. E.g. лес без forest → ERROR.',
    'RU школа/больница → at a canonical; in a accepted.',
    'Bank: school at=canonical in=accepted no-prep=ERROR.',
    'Golden: "My sister works school" → ERROR → "My sister works at a school." + Скажи:.',
    'Golden: at vs in → soft SUCCESS; work at a school → works + at/in OK.',
    'RU echo of current drill → ERROR → Say:/Скажи: canonical EN — never SUCCESS/soft/next. Meta (не знаю) ≠ echo. Golden: "Мы идём в школу" echo → Скажи: "We are going to school."',
  ].join(' ')
}
