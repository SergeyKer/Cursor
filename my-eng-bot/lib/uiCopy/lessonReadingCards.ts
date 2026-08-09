/** Shared labels for lesson intro + reference reading cards (single source of truth). */

export type LessonReadingCardKey =
  | 'essence'
  | 'rule'
  | 'templates'
  | 'examples'
  | 'contrast'
  | 'mistakes'
  | 'selfCheck'

/** Display mode: which cards + which labels. */
export type LessonReadingBubbleMode = 'lesson' | 'lookup' | 'cheatsheet'

export const LESSON_READING_CARD_LABELS = {
  essence: 'Тема урока',
  rule: 'Правило',
  templates: 'Шаблоны',
  examples: 'Примеры',
  contrast: 'Не путать',
  mistakes: 'Частые ошибки',
  selfCheck: 'Самопроверка',
} as const satisfies Record<LessonReadingCardKey, string>

/** Lookup / cheatsheet: exam-aid wording (same fields, clearer for search). */
export const REFERENCE_READING_CARD_LABELS = {
  essence: 'Тема',
  rule: 'Когда так',
  templates: 'Как сказать',
  examples: 'Примеры',
  contrast: 'Не путать',
  mistakes: 'Частые ошибки',
  selfCheck: 'Самопроверка',
} as const satisfies Record<LessonReadingCardKey, string>

/** Default lesson order (+ contrast when filled). */
export const LESSON_READING_CARD_ORDER: readonly LessonReadingCardKey[] = [
  'essence',
  'rule',
  'templates',
  'examples',
  'contrast',
  'mistakes',
  'selfCheck',
] as const

/** Cheatsheet: contrast early; no when/selfCheck. */
export const CHEATSHEET_READING_CARD_ORDER: readonly LessonReadingCardKey[] = [
  'essence',
  'contrast',
  'templates',
  'examples',
  'mistakes',
] as const

/** Lookup: full exam aid including when; selfCheck only if filled (same order as lesson). */
export const LOOKUP_READING_CARD_ORDER: readonly LessonReadingCardKey[] = [
  'essence',
  'rule',
  'templates',
  'examples',
  'contrast',
  'mistakes',
  'selfCheck',
] as const

export function labelsForReadingMode(
  mode: LessonReadingBubbleMode
): Record<LessonReadingCardKey, string> {
  if (mode === 'lesson') return { ...LESSON_READING_CARD_LABELS }
  return { ...REFERENCE_READING_CARD_LABELS }
}

export function orderForReadingMode(
  mode: LessonReadingBubbleMode
): readonly LessonReadingCardKey[] {
  if (mode === 'cheatsheet') return CHEATSHEET_READING_CARD_ORDER
  if (mode === 'lookup') return LOOKUP_READING_CARD_ORDER
  return LESSON_READING_CARD_ORDER
}
