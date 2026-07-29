import { cheatsheetVisibilityForAnswerKind } from '@/lib/tutor/cheatsheetEligibility'
import {
  TUTOR_EXPLAIN_ADULT_MAX_EXAMPLES,
  TUTOR_EXPLAIN_ADULT_MAX_PARAGRAPHS,
  TUTOR_EXPLAIN_ADULT_MIN_PARAGRAPHS,
  TUTOR_EXPLAIN_CHILD_MAX_EXAMPLES,
  TUTOR_EXPLAIN_CHILD_MAX_PARAGRAPHS,
  TUTOR_EXPLAIN_CHILD_MIN_EXAMPLES,
  TUTOR_EXPLAIN_CHILD_MIN_PARAGRAPHS,
  type TutorAnswerKind,
  type TutorAudience,
  type TutorExplainAnswer,
  type TutorExplainResult,
  type TutorTopicAnchor,
} from '@/lib/tutor/types'
import { asRecord, compactList, compactParagraph, compactText } from '@/lib/tutor/text'

const ANSWER_KINDS: readonly TutorAnswerKind[] = [
  'grammar',
  'contrast',
  'form',
  'translate',
  'how_to_say',
  'orthography',
  'other',
] as const

function normalizeAnswerKind(value: unknown): TutorAnswerKind {
  if (typeof value === 'string' && (ANSWER_KINDS as readonly string[]).includes(value)) {
    return value as TutorAnswerKind
  }
  return 'other'
}

function slugifyKey(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/['"`]/g, '')
    .replace(/[^a-zа-яё0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
  return slug || 'topic'
}

function normalizeParagraphs(value: unknown, max: number): string[] {
  if (typeof value === 'string') {
    const one = compactParagraph(value)
    return one ? [one] : []
  }
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const item of value) {
    const p = compactParagraph(item)
    if (!p) continue
    out.push(p)
    if (out.length >= max) break
  }
  return out
}

function normalizeContrastPair(value: unknown): [string, string] | undefined {
  if (!Array.isArray(value) || value.length < 2) return undefined
  const left = compactText(value[0], 80)
  const right = compactText(value[1], 80)
  return left && right ? [left, right] : undefined
}

function normalizeTopicAnchor(value: unknown, fallbackTitle: string): TutorTopicAnchor | null {
  const row = asRecord(value)
  const title = compactText(row?.title ?? fallbackTitle, 120)
  if (!title) return null
  const canonicalKey = compactText(row?.canonicalKey ?? row?.key, 120) || slugifyKey(title)
  const lessonIdHintRaw = row?.lessonIdHint ?? row?.lessonId
  const lessonIdHint =
    lessonIdHintRaw === null || lessonIdHintRaw === undefined
      ? null
      : compactText(lessonIdHintRaw, 80) || null
  const skillTagIds = compactList(row?.skillTagIds, 6, 64)
  return {
    title,
    canonicalKey,
    ...(lessonIdHint !== undefined ? { lessonIdHint } : {}),
    ...(skillTagIds.length > 0 ? { skillTagIds } : {}),
  }
}

export type NormalizeTutorExplainOptions = {
  audience?: TutorAudience | null
}

function normalizeInScopeAnswer(
  row: Record<string, unknown>,
  options: NormalizeTutorExplainOptions
): TutorExplainAnswer | null {
  const audience: TutorAudience = options.audience === 'child' ? 'child' : 'adult'
  const maxParagraphs =
    audience === 'child' ? TUTOR_EXPLAIN_CHILD_MAX_PARAGRAPHS : TUTOR_EXPLAIN_ADULT_MAX_PARAGRAPHS
  const minParagraphs =
    audience === 'child' ? TUTOR_EXPLAIN_CHILD_MIN_PARAGRAPHS : TUTOR_EXPLAIN_ADULT_MIN_PARAGRAPHS
  const maxExamples =
    audience === 'child' ? TUTOR_EXPLAIN_CHILD_MAX_EXAMPLES : TUTOR_EXPLAIN_ADULT_MAX_EXAMPLES
  const minExamples = audience === 'child' ? TUTOR_EXPLAIN_CHILD_MIN_EXAMPLES : 0

  const answerKind = normalizeAnswerKind(row.answerKind ?? row.kind)
  const title = compactText(row.title, 120)
  const paragraphs = normalizeParagraphs(row.paragraphs ?? row.body ?? row.text, maxParagraphs)
  const examplesEn = compactList(row.examplesEn ?? row.examples, maxExamples, 160)
  const rememberRu = compactText(row.rememberRu ?? row.remember, 200) || undefined
  const contrastPair = normalizeContrastPair(row.contrastPair)
  const topicAnchor = normalizeTopicAnchor(row.topicAnchor ?? row.anchor, title)

  if (!title || !topicAnchor) return null
  if (paragraphs.length < minParagraphs) return null
  if (examplesEn.length < minExamples) return null

  return {
    answerKind,
    title,
    paragraphs,
    examplesEn,
    ...(rememberRu ? { rememberRu } : {}),
    ...(contrastPair ? { contrastPair } : {}),
    topicAnchor,
    cheatsheetVisibility: cheatsheetVisibilityForAnswerKind(answerKind),
  }
}

/**
 * Normalize Explain API/model JSON into scoped result.
 * Missing scope + valid answer → in_scope (backcompat).
 */
export function normalizeTutorExplainResult(
  input: unknown,
  options: NormalizeTutorExplainOptions = {}
): TutorExplainResult | null {
  const row = asRecord(input)
  if (!row) return null

  const scopeRaw = compactText(row.scope, 32).toLowerCase()
  if (scopeRaw === 'out_of_scope' || scopeRaw === 'out-of-scope' || scopeRaw === 'outofscope') {
    const messageRu =
      compactText(row.messageRu ?? row.message ?? row.rejectReasonRu, 280) ||
      'Это не про английский. Спроси правило, перевод или как сказать фразу.'
    return { scope: 'out_of_scope', messageRu }
  }

  const answer = normalizeInScopeAnswer(row, options)
  if (!answer) return null
  return { scope: 'in_scope', answer }
}

/**
 * @deprecated Prefer normalizeTutorExplainResult. Returns answer only for in_scope.
 */
export function normalizeTutorExplain(
  input: unknown,
  options: NormalizeTutorExplainOptions = {}
): TutorExplainAnswer | null {
  const result = normalizeTutorExplainResult(input, options)
  return result?.scope === 'in_scope' ? result.answer : null
}
