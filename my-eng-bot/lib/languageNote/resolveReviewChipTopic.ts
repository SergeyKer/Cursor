/**
 * Parse language-note review chip title "EN-anchor — RU gloss".
 * Accepts em dash, en dash, or hyphen as separator.
 */
export function parseReviewTopicTitle(title: string): { topic: string; gloss: string | null } {
  const raw = title.replace(/\s+/g, ' ').trim()
  if (!raw) return { topic: '', gloss: null }
  const sep = raw.match(/\s+[—–-]\s+/)
  if (!sep || sep.index == null) {
    return { topic: raw, gloss: null }
  }
  const topic = raw.slice(0, sep.index).trim()
  const gloss = raw.slice(sep.index + sep[0].length).trim()
  return {
    topic: topic || raw,
    gloss: gloss || null,
  }
}

function normalizeAnchor(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** Curated EN-anchor aliases → catalog lesson id. Prefer generate on doubt. */
const ANCHOR_ALIASES: Array<{ lessonId: '1' | '2' | '3' | '4'; patterns: RegExp[] }> = [
  {
    lessonId: '4',
    patterns: [
      /^i am\b/,
      /^i'm\b/,
      /^i am \/ i am from$/,
      /^i am from$/,
      /^introducing yourself$/,
    ],
  },
  {
    lessonId: '1',
    patterns: [
      /^it'?s\b/,
      /^it is\b/,
      /^it'?s \/ it'?s time to$/,
      /^it'?s time to$/,
      /^it'?s time for$/,
    ],
  },
  {
    lessonId: '2',
    patterns: [/^who\b/, /^who \.\.\.\?$/, /^who likes\b/],
  },
  {
    lessonId: '3',
    patterns: [
      /^i know what\b/,
      /^i know what she likes$/,
      /^do you know what\b/,
      /^tell me where\b/,
      /^embedded questions?$/,
    ],
  },
]

export type ReviewChipResolveResult =
  | { kind: 'local'; lessonId: string; topic: string; gloss: string | null }
  | { kind: 'generate'; topic: string; gloss: string | null }

/**
 * Resolve chip → catalog lesson or generate. Code allowlist only — no fuzzy/AI.
 */
export function resolveReviewChipTopic(params: {
  chipTitle: string
  noteLessonId?: string | null
}): ReviewChipResolveResult {
  const { topic, gloss } = parseReviewTopicTitle(params.chipTitle)
  const normalized = normalizeAnchor(topic)
  if (!normalized) {
    return { kind: 'generate', topic: topic || params.chipTitle.trim(), gloss }
  }

  let matchedId: string | null = null
  for (const entry of ANCHOR_ALIASES) {
    if (entry.patterns.some((re) => re.test(normalized))) {
      matchedId = entry.lessonId
      break
    }
  }

  const hint = params.noteLessonId?.trim() || null
  if (matchedId) {
    if (hint && hint !== matchedId) {
      // Conflicting hint: trust allowlist match on EN-anchor, ignore foreign hint.
    }
    return { kind: 'local', lessonId: matchedId, topic, gloss }
  }

  // Soft hint only when no alias matched AND hint is a known catalog id with
  // exact title-ish agreement — we do NOT use hint alone (too easy to mis-route).
  return { kind: 'generate', topic, gloss }
}
