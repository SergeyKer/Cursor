import {
  hasExplicitTutorIntent,
  normalizeTutorQuery,
  TUTOR_QUESTION_RE,
} from '@/lib/tutor/tutorIntent'

/**
 * Build Explain-ready tutor prefill from reference hub miss query.
 * Explicit questions / intent stay as-is; short fragments get a RU wrap for triage A.
 */
export function buildReferenceMissTutorPrefill(rawQuery: string): string {
  const q = normalizeTutorQuery(rawQuery)
  if (!q) return ''

  if (hasExplicitTutorIntent(q) || TUTOR_QUESTION_RE.test(q) || q.includes('?') || q.includes('？')) {
    return q
  }

  return `Когда говорят «${q}» и что это значит?`
}
