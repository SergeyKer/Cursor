import type { TopicId, LevelId, TenseId, SentenceType } from './types'

export const TOPICS: { id: TopicId; label: string }[] = [
  { id: 'travel', label: 'Путешествия' },
  { id: 'work', label: 'Работа' },
  { id: 'daily_life', label: 'Повседневная жизнь' },
  { id: 'food', label: 'Еда' },
  { id: 'culture', label: 'Культура' },
  { id: 'technology', label: 'Технологии' },
  { id: 'free_talk', label: 'Свободная тема' },
]

export const LEVELS: { id: LevelId; label: string }[] = [
  { id: 'starter', label: 'Starter / Первый год' },
  { id: 'a1', label: 'A1' },
  { id: 'a2', label: 'A2' },
  { id: 'b1', label: 'B1' },
  { id: 'b2', label: 'B2' },
  { id: 'c1', label: 'C1' },
  { id: 'c2', label: 'C2' },
]

export const TENSES: { id: TenseId; label: string }[] = [
  { id: 'all', label: 'Все (любое время)' },
  { id: 'present_simple', label: 'Present Simple' },
  { id: 'present_continuous', label: 'Present Continuous' },
  { id: 'present_perfect', label: 'Present Perfect' },
  { id: 'present_perfect_continuous', label: 'Present Perfect Continuous' },
  { id: 'past_simple', label: 'Past Simple' },
  { id: 'past_continuous', label: 'Past Continuous' },
  { id: 'past_perfect', label: 'Past Perfect' },
  { id: 'past_perfect_continuous', label: 'Past Perfect Continuous' },
  { id: 'future_simple', label: 'Future Simple' },
  { id: 'future_continuous', label: 'Future Continuous' },
  { id: 'future_perfect', label: 'Future Perfect' },
  { id: 'future_perfect_continuous', label: 'Future Perfect Continuous' },
]

export const SENTENCE_TYPES: { id: SentenceType; label: string }[] = [
  { id: 'general', label: 'Общие' },
  { id: 'interrogative', label: 'Вопросительные' },
  { id: 'negative', label: 'Отрицательные' },
  { id: 'mixed', label: 'Смешанные' },
]
