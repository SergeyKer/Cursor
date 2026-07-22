/** Shared labels for lesson intro + reference reading cards (single source of truth). */
export const LESSON_READING_CARD_LABELS = {
  essence: 'Тема урока',
  rule: 'Правило',
  templates: 'Шаблоны',
  examples: 'Примеры',
  mistakes: 'Частые ошибки',
  selfCheck: 'Самопроверка',
} as const

export type LessonReadingCardKey = keyof typeof LESSON_READING_CARD_LABELS

export const LESSON_READING_CARD_ORDER: readonly LessonReadingCardKey[] = [
  'essence',
  'rule',
  'templates',
  'examples',
  'mistakes',
  'selfCheck',
] as const
