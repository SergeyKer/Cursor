import { tokenizeEnglish } from '@/lib/vocabulary/worlds'
import type { ParsedNecessaryWord } from '@/types/vocabulary'
import type { VocabularyTopicId } from '@/types/vocabulary'
import type { VocabularyWorldId } from '@/types/vocabulary'

export const VOCABULARY_TOPICS: Array<{
  id: VocabularyTopicId
  title: string
  badge: string
  description: string
}> = [
  {
    id: 'travel',
    title: 'Путешествия',
    badge: '✈️',
    description: 'Транспорт, дорога, отель, аэропорт.',
  },
  {
    id: 'food',
    title: 'Еда и напитки',
    badge: '🍽️',
    description: 'Еда, напитки, кафе и дом.',
  },
  {
    id: 'work',
    title: 'Работа',
    badge: '💼',
    description: 'Офис, задачи, переписка и встречи.',
  },
  {
    id: 'family',
    title: 'Семья и люди',
    badge: '👨‍👩‍👧',
    description: 'Родственники, друзья, описание людей.',
  },
  {
    id: 'health',
    title: 'Здоровье',
    badge: '🩺',
    description: 'Тело, самочувствие, врач.',
  },
  {
    id: 'tech',
    title: 'Технологии',
    badge: '💻',
    description: 'Гаджеты, интернет, приложения.',
  },
  {
    id: 'education',
    title: 'Учёба',
    badge: '📚',
    description: 'Школа, занятия, время и расписание.',
  },
  {
    id: 'culture',
    title: 'Досуг и культура',
    badge: '🎬',
    description: 'Хобби, музыка, игры, впечатления.',
  },
  {
    id: 'core',
    title: 'Связки и база',
    badge: '🌟',
    description: 'Частые слова-связки и универсальная лексика.',
  },
]

type TopicKeywordMap = Record<VocabularyTopicId, Set<string>>

const TOPIC_KEYWORDS: TopicKeywordMap = {
  travel: new Set([
    'travel', 'trip', 'flight', 'airport', 'passport', 'train', 'bus', 'taxi', 'ticket', 'hotel', 'map',
    'luggage', 'vacation', 'road', 'station', 'weather', 'beach', 'mountain', 'river',
  ]),
  food: new Set([
    'food', 'eat', 'drink', 'water', 'coffee', 'tea', 'breakfast', 'dinner', 'apple', 'pizza', 'meat',
    'kitchen', 'sweet', 'hungry', 'restaurant', 'menu', 'order',
  ]),
  work: new Set([
    'work', 'job', 'office', 'meeting', 'deadline', 'email', 'task', 'project', 'report', 'salary',
    'negotiate', 'stakeholder', 'deadline', 'schedule',
  ]),
  family: new Set([
    'family', 'mother', 'father', 'brother', 'sister', 'friend', 'baby', 'home', 'house', 'child',
    'parent', 'cousin', 'neighbor',
  ]),
  health: new Set([
    'health', 'doctor', 'safe', 'dangerous', 'body', 'head', 'heart', 'hand', 'pain', 'tired', 'sick',
    'medicine',
  ]),
  tech: new Set([
    'computer', 'phone', 'app', 'internet', 'online', 'email', 'message', 'password', 'website',
    'download', 'software',
  ]),
  education: new Set([
    'school', 'student', 'teacher', 'class', 'lesson', 'homework', 'book', 'study', 'exam', 'library',
    'english', 'science',
  ]),
  culture: new Set([
    'movie', 'music', 'game', 'play', 'hobby', 'party', 'film', 'song', 'fun', 'holiday', 'festival',
    'culture',
  ]),
  core: new Set([
    'the', 'and', 'but', 'because', 'when', 'where', 'before', 'after', 'must', 'may', 'can', 'have',
    'want', 'need', 'think', 'know', 'make', 'take', 'give',
  ]),
}

const WORLD_TOPIC_BIAS: Partial<Record<VocabularyWorldId, VocabularyTopicId>> = {
  travel: 'travel',
  home: 'family',
  school: 'education',
  digital: 'tech',
  core: 'core',
}

const TOPIC_PRIORITY: VocabularyTopicId[] = [
  'travel',
  'food',
  'work',
  'family',
  'health',
  'tech',
  'education',
  'culture',
  'core',
]

export function inferVocabularyTopic(word: ParsedNecessaryWord, primaryWorld: VocabularyWorldId): VocabularyTopicId {
  const tokens = new Set(tokenizeEnglish(word.en))
  const scores: Record<VocabularyTopicId, number> = {
    travel: 0,
    food: 0,
    work: 0,
    family: 0,
    health: 0,
    tech: 0,
    education: 0,
    culture: 0,
    core: 0,
  }

  for (const topicId of TOPIC_PRIORITY) {
    for (const token of tokens) {
      if (TOPIC_KEYWORDS[topicId].has(token)) scores[topicId] += 1
    }
  }

  const bias = WORLD_TOPIC_BIAS[primaryWorld]
  if (bias) scores[bias] += 1.5

  const sorted = (Object.entries(scores) as Array<[VocabularyTopicId, number]>).sort(
    (left, right) => right[1] - left[1] || TOPIC_PRIORITY.indexOf(left[0]) - TOPIC_PRIORITY.indexOf(right[0])
  )

  const best = sorted[0]?.[1] ? sorted[0][0] : 'core'
  return best
}

export function countActiveWordsByVocabularyTopic(
  words: Array<{ status: string; primaryVocabularyTopic: VocabularyTopicId }>
): Record<VocabularyTopicId, number> {
  const empty: Record<VocabularyTopicId, number> = {
    travel: 0,
    food: 0,
    work: 0,
    family: 0,
    health: 0,
    tech: 0,
    education: 0,
    culture: 0,
    core: 0,
  }
  return words.reduce((acc, word) => {
    if (word.status !== 'active') return acc
    acc[word.primaryVocabularyTopic] += 1
    return acc
  }, empty)
}
