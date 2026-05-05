import type { NecessaryWordStatus } from '@/types/vocabulary'

export const EXCLUDED_SOURCE_IDS = new Set<number>(
  [
    ...Array.from({ length: 39 }, (_, index) => index + 1),
    ...Array.from({ length: 78 }, (_, index) => index + 582),
    ...Array.from({ length: 160 }, (_, index) => index + 660),
    267,
    298,
    318,
    335,
    392,
    404,
    545,
    572,
    782,
    819,
  ]
)

export const TRANSLATION_SUFFIX_PATTERNS: RegExp[] = [
  /\s+(Артикли|Союзы|Наречия|Местоимения|Самый важный глагол)\b.*$/u,
  /\s+(предметах\)|знаю кого\?\)|чьё\?\)|их \(чьё\?\)|её \(знаю кого\?\)|мне Местоимения).*$/u,
]

export const TRANSLATION_REPLACEMENTS: Record<number, string> = {
  39: 'онлайн-мошенник',
  45: 'или',
  48: 'поэтому',
  71: 'несмотря на',
  76: 'где',
  134: 'мне, меня',
  136: 'её',
}

export const ENGLISH_REPLACEMENTS: Record<number, string> = {
  41: 'A / an',
  128: 'You',
}

export const REVIEW_SOURCE_IDS = new Set<number>([41, 131, 132, 135, 136])

export function initialStatusForWord(id: number): NecessaryWordStatus {
  if (EXCLUDED_SOURCE_IDS.has(id)) return 'excluded'
  if (REVIEW_SOURCE_IDS.has(id)) return 'needsReview'
  return 'active'
}

export function normalizeEnglishText(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+\)/g, ')')
    .trim()
}

export function normalizeTranslationText(id: number, value: string): string {
  const explicit = TRANSLATION_REPLACEMENTS[id]
  if (explicit) return explicit

  let result = value
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .trim()

  for (const pattern of TRANSLATION_SUFFIX_PATTERNS) {
    result = result.replace(pattern, '').trim()
  }

  return result
}
