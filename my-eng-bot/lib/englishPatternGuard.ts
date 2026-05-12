export type BrokenEnglishPattern =
  | 'double_to'
  | 'who_like_without_s'
  | 'who_liking'
  | 'its_sleep'
  | 'broken_it_is_to_pattern'
  | 'broken_ing_time_to'

function normalizeForEnglishPatternCheck(value: string): string {
  return value.trim().toLowerCase().replace(/[.,!?;:]/g, '')
}

export function detectBrokenEnglishPattern(text: string): BrokenEnglishPattern | null {
  const normalized = normalizeForEnglishPatternCheck(text)
  if (!normalized) return null
  if (/\bto to\b/.test(normalized)) return 'double_to'
  if (/\bwho like\b/.test(normalized)) return 'who_like_without_s'
  if (/\bwho liking\b/.test(normalized)) return 'who_liking'
  if (/\bit(?:'s| is) sleep\b/.test(normalized)) return 'its_sleep'
  if (/\bit(?:'s| is) (?!time\b)[a-z]+ to\b/.test(normalized)) return 'broken_it_is_to_pattern'
  if (/\b[a-z]+ing time to\b/.test(normalized)) return 'broken_ing_time_to'
  return null
}
