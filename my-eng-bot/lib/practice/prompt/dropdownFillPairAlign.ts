import { extractGapFillParts } from '@/lib/practice/prompt/dropdownFillPromptFormat'

/** Collocations aligned with lesson 1 its-time-to step3Object / step3Verb. */
const OBJECT_TO_VERB: Record<string, string> = {
  tea: 'drink',
  water: 'drink',
  lunch: 'eat',
  umbrella: 'take',
}

const RU_VERB_HINTS: Array<{ pattern: RegExp; verb: string }> = [
  { pattern: /\bпить\b/iu, verb: 'drink' },
  { pattern: /\bесть\b/iu, verb: 'eat' },
  { pattern: /\b(?:брать|взять)\b/iu, verb: 'take' },
  { pattern: /\bспать\b/iu, verb: 'sleep' },
  { pattern: /\bидти\b/iu, verb: 'go' },
]

function normalizeWord(value: string): string {
  return value.trim().toLowerCase().replace(/[.,!?;:]/g, '')
}

function normalizeObjectKey(objectRaw: string): string {
  return objectRaw
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:]+$/g, '')
    .replace(/^(?:an?|the)\s+/i, '')
    .trim()
}

/** Extract noun/object after `time to ___` in the English gap frame. */
export function extractTimeToGapObject(gapFrameEn: string): string | null {
  const match = /\btime\s+to\s+___\s+(.+)$/i.exec(gapFrameEn.trim())
  if (!match?.[1]) return null
  const object = normalizeObjectKey(match[1])
  return object || null
}

function verbFromObject(object: string | null): string | null {
  if (!object) return null
  return OBJECT_TO_VERB[object] ?? null
}

function verbFromRuPhrase(ruPhrase: string): string | null {
  for (const hint of RU_VERB_HINTS) {
    if (hint.pattern.test(ruPhrase)) return hint.verb
  }
  return null
}

/**
 * Infer expected gap verb for time-to frames.
 * EN object after ___ wins over RU hints (covers vague RU + concrete object).
 */
export function inferTimeToGapVerb(prompt: string): string | null {
  const parts = extractGapFillParts(prompt.trim())
  if (!parts) return null
  if (!/\btime\s+to\s+___/i.test(parts.gapFrameEn)) return null

  const fromObject = verbFromObject(extractTimeToGapObject(parts.gapFrameEn))
  if (fromObject) return fromObject
  return verbFromRuPhrase(parts.ruPhrase)
}

export function isDropdownFillPairAligned(prompt: string, targetAnswer: string): boolean {
  const expected = inferTimeToGapVerb(prompt)
  if (!expected) return true
  return normalizeWord(targetAnswer) === normalizeWord(expected)
}

/**
 * When the pair is misaligned for a time-to gap, return the verb that fits the frame/RU.
 * Returns null when this MVP cannot resolve (caller should rebuild from etalon or drop).
 */
export function resolveAlignedDropdownTarget(
  prompt: string,
  _fallbackTarget: string
): string | null {
  return inferTimeToGapVerb(prompt)
}
