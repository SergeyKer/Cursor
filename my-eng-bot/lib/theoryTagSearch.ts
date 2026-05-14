import { getGrammarCategoryById } from '@/lib/grammarTaxonomy'
import { getAllTheoryTagsForMenu, getTheoryTagsForCategory, type TheoryTag } from '@/lib/lessonTheoryTags'

export interface TheoryTagCandidate {
  tagId: string
  categoryId: string
  /** Строка для списка результатов поиска (RU). */
  title: string
  score: number
  reason: string
}

const TAG_ALIASES: Record<string, string[]> = {
  'present-simple': [
    'present simple',
    'настоящее простое',
    'простое настоящее',
    'i am from',
    'знакомство',
    'present tense',
  ],
  'formal-it': [
    "it's time to",
    'its time to',
    'it is time to',
    'формальный it',
    'it subject',
    'состояние и действие',
    'formal subject it',
  ],
  'special-questions': [
    'who questions',
    'вопросы с who',
    'кто любит',
    'who likes',
    'special question',
    'special questions',
    'wh questions',
  ],
  'subject-questions': [
    'subject question',
    'subject questions',
    'вопрос к подлежащему',
    'who subject',
  ],
  'reported-speech': [
    'reported speech',
    'reported speach',
    'косвенная речь',
    'непрямая речь',
    'indirect speech',
    'i know what',
    'вложенные вопросы',
    'встроенные вопросы',
    'косвенные вопросы',
    'indirect questions',
    'embedded',
  ],
  'word-order': [
    'word order',
    'порядок слов',
    'порядок слов в вопросе',
    'embedded word order',
  ],
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function splitTokens(value: string): string[] {
  return normalize(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 1)
}

function scoreByKey(query: string, key: string): number {
  if (!query || !key) return 0
  if (query === key) return 120
  if (key.includes(query) || query.includes(key)) return 80
  const queryTokens = splitTokens(query)
  const keyTokens = splitTokens(key)
  if (queryTokens.length === 0 || keyTokens.length === 0) return 0
  const keySet = new Set(keyTokens)
  let overlap = 0
  for (const token of queryTokens) {
    if (keySet.has(token)) overlap += 1
  }
  if (overlap === 0) return 0
  const ratio = overlap / Math.max(queryTokens.length, keyTokens.length)
  return Math.round(ratio * 60)
}

function searchKeysForTag(tag: TheoryTag): string[] {
  const cat = getGrammarCategoryById(tag.categoryId)
  return [
    tag.menuLabelRu,
    tag.menuLabelEn,
    tag.title,
    tag.focusLine,
    tag.titleRu ?? '',
    cat?.menuTitle ?? '',
    cat?.menuTitleRu ?? '',
    cat?.hint ?? '',
    ...(TAG_ALIASES[tag.id] ?? []),
  ]
}

/** Поиск тегов теории внутри одной категории грамматики (тесты и переиспользование логики скоринга). */
export function findTheoryTagCandidatesInCategory(
  categoryId: string,
  query: string,
  limit = 8
): TheoryTagCandidate[] {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return []
  const tags = getTheoryTagsForCategory(categoryId)
  const candidates = tags
    .map((tag) => {
      const keys = searchKeysForTag(tag).map(normalize).filter(Boolean)
      let bestScore = 0
      let bestReason = ''
      for (const key of keys) {
        const score = scoreByKey(normalizedQuery, key)
        if (score > bestScore) {
          bestScore = score
          bestReason = key
        }
      }
      return {
        tagId: tag.id,
        categoryId: tag.categoryId,
        title: tag.menuLabelRu,
        score: bestScore,
        reason: bestReason || tag.menuLabelRu,
      }
    })
    .filter((c) => c.score >= 30)
    .sort((a, b) => b.score - a.score)

  return candidates.slice(0, Math.max(1, limit))
}

/** Поиск тегов теории по всем категориям грамматики (экран theoryGrammarCategories). */
export function findTheoryTagCandidatesGlobally(query: string, limit = 12): TheoryTagCandidate[] {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return []
  const tags = getAllTheoryTagsForMenu()
  const candidates = tags
    .map((tag) => {
      const keys = searchKeysForTag(tag).map(normalize).filter(Boolean)
      let bestScore = 0
      let bestReason = ''
      for (const key of keys) {
        const score = scoreByKey(normalizedQuery, key)
        if (score > bestScore) {
          bestScore = score
          bestReason = key
        }
      }
      return {
        tagId: tag.id,
        categoryId: tag.categoryId,
        title: tag.menuLabelRu,
        score: bestScore,
        reason: bestReason || tag.menuLabelRu,
      }
    })
    .filter((c) => c.score >= 30)
    .sort((a, b) => b.score - a.score)

  return candidates.slice(0, Math.max(1, limit))
}
