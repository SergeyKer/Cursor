import type { TopicId, LevelId, TenseId, SentenceType } from './types'

export const TOPICS: { id: TopicId; label: string }[] = [
  { id: 'free_talk',      label: 'Свободная тема' },
  { id: 'business',       label: 'Бизнес' },
  { id: 'family_friends', label: 'Семья и друзья' },
  { id: 'hobbies',        label: 'Хобби и интересы' },
  { id: 'movies_series',  label: 'Фильмы и сериалы' },
  { id: 'music',          label: 'Музыка' },
  { id: 'sports',         label: 'Спорт и активный отдых' },
  { id: 'food',           label: 'Еда' },
  { id: 'culture',        label: 'Культура' },
  { id: 'daily_life',     label: 'Повседневная жизнь' },
  { id: 'travel',         label: 'Путешествия' },
  { id: 'work',           label: 'Работа' },
  { id: 'technology',     label: 'Технологии' },
]

export const LEVELS: { id: LevelId; label: string }[] = [
  { id: 'all', label: 'Все (любой уровень)' },
  { id: 'starter', label: 'Starter — первый год, до A1' },
  { id: 'a1', label: 'A1 — начальный' },
  { id: 'a2', label: 'A2 — элементарный' },
  { id: 'b1', label: 'B1 — средний' },
  { id: 'b2', label: 'B2 — выше среднего' },
  { id: 'c1', label: 'C1 — продвинутый' },
  { id: 'c2', label: 'C2 — почти как носитель' },
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
