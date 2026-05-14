import { PRACTICE_TOPICS_BY_AUDIENCE, getPracticeLessonTopics, getPracticeTopicSearchTexts } from '@/lib/lessonCatalog'
import type { Audience } from '@/lib/types'

export interface PracticeTopicCandidate {
  lessonId: string
  title: string
  score: number
  reason: string
}

const PRACTICE_TOPIC_ALIASES: Record<string, string[]> = {
  '4': [
    'представление',
    'рассказ о себе',
    'знакомство',
    'i am from',
    'i am from russia',
    "i'm from",
    'introducing yourself',
    'self introduction',
    'vasya',
  ],
  '1': ['its time to', "it's time to", 'it is time to', 'состояние и действие'],
  '2': ['who questions', 'questions with who', 'вопросы с who', 'кто любит'],
  '3': ['вложенные вопросы', 'встроенные вопросы', 'косвенные вопросы', 'embedded questions', 'indirect questions'],
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

export function findPracticeTopicCandidatesByMenuKeys(
  query: string,
  audience: Audience,
  limit = 3
): PracticeTopicCandidate[] {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return []
  const topics = getPracticeLessonTopics().filter((topic) => topic.enabled)
  const candidates = topics
    .map((topic) => {
      const keys = [
        ...getPracticeTopicSearchTexts(topic, audience),
        ...getPracticeTopicSearchTexts(topic, audience === 'adult' ? 'child' : 'adult'),
        ...Object.values(PRACTICE_TOPICS_BY_AUDIENCE)
          .map((copy) => copy[topic.id])
          .filter(Boolean)
          .flatMap((copy) => [copy.short, copy.long]),
        ...(PRACTICE_TOPIC_ALIASES[topic.id] ?? []),
      ]
        .map(normalize)
        .filter(Boolean)
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
        lessonId: topic.id,
        title: topic.title,
        score: bestScore,
        reason: bestReason || topic.title,
      }
    })
    .filter((candidate) => candidate.score >= 30)
    .sort((left, right) => right.score - left.score)

  return candidates.slice(0, Math.max(1, limit))
}
