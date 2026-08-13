import type { Audience } from '@/lib/types'

const WORD_RE = /[A-Za-zА-Яа-яЁё]{3,}/g

const ASSISTANT_SEED_STOPWORDS = new Set([
  'want',
  'know',
  'about',
  'the',
  'you',
  'do',
  'or',
  'and',
  'a',
  'an',
  'is',
  'are',
  'what',
  'which',
  'this',
  'that',
  'like',
  'most',
  'part',
  'keep',
  'talking',
  'english',
])

function extractSeedWords(text: string, limit: number, stopwords?: Set<string>): string[] {
  const raw = text.match(WORD_RE) ?? []
  const words: string[] = []
  for (const token of raw) {
    const w = token.toLowerCase()
    if (stopwords?.has(w)) continue
    words.push(w)
  }
  return words.slice(-limit)
}

export function buildCommunicationPersonalizationRule(params: {
  audience: Audience
  level: string
  lastUserText: string
  lastAssistantText?: string
}): string {
  const seedWords = extractSeedWords(params.lastUserText, 4)
  const seedHint = seedWords.length > 0 ? `Key words from last user message: ${seedWords.join(', ')}.` : ''
  const assistantWords = extractSeedWords(params.lastAssistantText ?? '', 4, ASSISTANT_SEED_STOPWORDS)
  const openThreadHint =
    assistantWords.length > 0
      ? `Open thread: last assistant asked about ${assistantWords.join(', ')}. Treat a short user reply as an answer to that, not a new topic.`
      : ''
  const lowLevel = ['starter', 'a1', 'a2'].includes(params.level)
  const childHint =
    params.audience === 'child'
      ? 'For child audience, keep follow-up playful and concrete (friends, games, school, pets, hobbies).'
      : 'For adult audience, keep follow-up practical and respectful.'
  const brevityHint = lowLevel
    ? 'Keep follow-up short (1 reaction + 1 simple question).'
    : 'Use natural concise follow-up (1 reaction + 1 question, optionally a short context sentence).'
  return [
    'Personalization rule: connect your next follow-up to the user message context instead of generic templates.',
    seedHint,
    openThreadHint,
    childHint,
    brevityHint,
  ]
    .filter(Boolean)
    .join(' ')
}
