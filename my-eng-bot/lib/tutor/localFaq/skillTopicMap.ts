import { listAllLocalFaq } from '@/lib/tutor/localFaq/catalog'

/** Explicit no-map / alias overrides before kebab→snake normalize. */
const SKILL_TO_TOPIC_ALIAS: Record<string, string | null> = {
  'present-simple': 'present_simple',
  'reported-speech': 'reported_speech',
  'word-order': 'word_order',
  'special-questions': 'вопросы_и_порядок_слов',
  'subject-questions': 'вопросы_и_порядок_слов',
  'formal-it': null,
  'spoken-fluency': null,
  'translation-errors': null,
  'teacher-errors': null,
  unknown: null,
}

let knownTopicKeysCache: Set<string> | null = null

export function listKnownFaqTopicKeys(): Set<string> {
  if (!knownTopicKeysCache) {
    knownTopicKeysCache = new Set(listAllLocalFaq().map((e) => e.topicKey))
  }
  return knownTopicKeysCache
}

/** Test helper: drop memoized topic set after catalog mocks. */
export function clearKnownFaqTopicKeysCacheForTests(): void {
  knownTopicKeysCache = null
}

function normalizeSkillTagToSnake(skillTagId: string): string {
  return skillTagId.trim().toLowerCase().replace(/-/g, '_')
}

/**
 * Map learning/theory skillTagId → FAQ topicKey when the key exists in the pool.
 * Returns null for unknown / explicitly unmapped ids (no phantom bans).
 */
export function skillTagIdToTopicKey(skillTagId: string | null | undefined): string | null {
  const raw = String(skillTagId ?? '').trim()
  if (!raw) return null

  const known = listKnownFaqTopicKeys()
  if (Object.prototype.hasOwnProperty.call(SKILL_TO_TOPIC_ALIAS, raw)) {
    const aliased = SKILL_TO_TOPIC_ALIAS[raw]
    if (aliased == null) return null
    return known.has(aliased) ? aliased : null
  }

  const snake = normalizeSkillTagToSnake(raw)
  if (known.has(snake)) return snake
  if (known.has(raw)) return raw
  return null
}

export function topicKeysFromSkillTagIds(ids: readonly string[] | null | undefined): string[] {
  if (!ids?.length) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const id of ids) {
    const key = skillTagIdToTopicKey(id)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(key)
  }
  return out
}
