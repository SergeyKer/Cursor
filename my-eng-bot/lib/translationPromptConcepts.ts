/** Семейные/социальные концепты для перевода: сопоставление RU↔EN и срезание лишнего в «Повтори». */

export type TranslationConceptId = 'sibling' | 'mother' | 'father' | 'friend'

export type TranslationConcept = {
  id: TranslationConceptId
  ruStems: string[]
  enWords: string[]
  preferredEn: string
  /** Удаляем из EN, если в русском задании нет концепта (модель/пользователь подмешали хвост). */
  enRemoveWhenAbsentFromRu: RegExp[]
}

export const TRANSLATION_CONCEPTS: readonly TranslationConcept[] = [
  {
    id: 'sibling',
    ruStems: ['брат', 'сестр', 'сёстр'],
    enWords: ['sibling', 'siblings', 'brother', 'brothers', 'sister', 'sisters'],
    preferredEn: 'brother or sister',
    enRemoveWhenAbsentFromRu: [
      /\s*,\s*with\s+(?:my\s+)?(?:brother|brothers|sister|sisters|sibling|siblings)\b/gi,
      /\s+with\s+(?:my\s+)?(?:brother|brothers|sister|sisters|sibling|siblings)\b/gi,
      /\s+and\s+(?:my\s+)?(?:brother|brothers|sister|sisters)\b/gi,
    ],
  },
  {
    id: 'mother',
    ruStems: ['мам', 'мат'],
    enWords: ['mom', 'mum', 'mother', 'mummy'],
    preferredEn: 'mom',
    enRemoveWhenAbsentFromRu: [
      /\s*,\s*with\s+(?:my\s+)?(?:mom|mum|mother|mummy)\b/gi,
      /\s+with\s+(?:my\s+)?(?:mom|mum|mother|mummy)\b/gi,
    ],
  },
  {
    id: 'father',
    ruStems: ['пап', 'отц'],
    enWords: ['dad', 'daddy', 'father'],
    preferredEn: 'dad',
    enRemoveWhenAbsentFromRu: [
      /\s*,\s*with\s+(?:my\s+)?(?:dad|daddy|father)\b/gi,
      /\s+with\s+(?:my\s+)?(?:dad|daddy|father)\b/gi,
    ],
  },
  {
    id: 'friend',
    ruStems: ['друг', 'друз', 'подруг'],
    enWords: ['friend', 'friends'],
    preferredEn: 'friend',
    enRemoveWhenAbsentFromRu: [
      /\s*,\s*with\s+(?:my\s+)?(?:friend|friends)\b/gi,
      /\s+with\s+(?:my\s+)?(?:friend|friends)\b/gi,
      /\s+and\s+(?:my\s+)?(?:friend|friends)\b/gi,
    ],
  },
]

function tokenizeEnglishWords(text: string): string[] {
  return (
    text
      .toLowerCase()
      .match(/[a-z']+/g)
      ?.map((token) => token.replace(/^'+|'+$/g, ''))
      .filter(Boolean) ?? []
  )
}

function hasConceptInRuPrompt(ruLower: string, concept: TranslationConcept): boolean {
  const tokens = (ruLower.match(/[а-яё]+/gi) ?? []).map((t) => t.trim()).filter(Boolean)
  return tokens.some((token) => concept.ruStems.some((stem) => token.startsWith(stem)))
}

/**
 * Удаляет из английской строки «Повтори» обороты вроде «with my friends», если в русском задании нет соответствующего концепта.
 */
export function stripEnglishRepeatConceptsNotInRuPrompt(english: string, ruPrompt: string): string {
  const ruLower = ruPrompt.toLowerCase()
  let out = english
  for (const concept of TRANSLATION_CONCEPTS) {
    if (hasConceptInRuPrompt(ruLower, concept)) continue
    for (const re of concept.enRemoveWhenAbsentFromRu) {
      out = out.replace(re, ' ')
    }
  }
  return out
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*\./g, '.')
    .trim()
}

export function extractTranslationConceptIdsFromPrompt(text: string): TranslationConceptId[] {
  const ruTokens = (text.toLowerCase().match(/[а-яё]+/gi) ?? []).map((t) => t.trim()).filter(Boolean)
  const out: TranslationConceptId[] = []
  for (const concept of TRANSLATION_CONCEPTS) {
    const hasConceptToken = ruTokens.some((token) => concept.ruStems.some((stem) => token.startsWith(stem)))
    if (hasConceptToken && !out.includes(concept.id)) out.push(concept.id)
  }
  return out
}

export function extractTranslationConceptIdsFromEnglish(text: string): TranslationConceptId[] {
  const enTokens = tokenizeEnglishWords(text)
  const out: TranslationConceptId[] = []
  for (const concept of TRANSLATION_CONCEPTS) {
    const hasConceptToken = enTokens.some((token) => concept.enWords.includes(token))
    if (hasConceptToken && !out.includes(concept.id)) out.push(concept.id)
  }
  return out
}
