/**
 * xAI TTS `replace` map for vocab words that system/Grok otherwise misread.
 * Keys matched case-insensitively; values may be IPA (e.g. /aɪ/).
 */

const VOCAB_PRONUNCIATION_REPLACE: Record<string, string> = {
  eye: '/aɪ/',
}

/** Build xAI `replace` object for phrases that contain known vocab lemmas. */
export function buildVocabPronunciationReplace(text: string): Record<string, string> | undefined {
  const normalized = text.trim()
  if (!normalized) return undefined

  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(VOCAB_PRONUNCIATION_REPLACE)) {
    const re = new RegExp(`\\b${escapeRegExp(key)}\\b`, 'i')
    if (re.test(normalized)) {
      // Preserve first orthographic match casing for xAI key (whole-word, case-insensitive match).
      const match = normalized.match(re)
      const spokenKey = match?.[0] ?? key
      out[spokenKey] = value
    }
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
