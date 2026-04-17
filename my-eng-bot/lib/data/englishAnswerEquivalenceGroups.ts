/**
 * Допустимые варианты одной «ячейки» смысла при сравнении ответа ученика с эталоном.
 * Системные контракции (do not → don't и т.д.) — в `englishLearnerContractions`, не дублировать здесь.
 */
export type EquivalenceScope = 'translation' | 'dialogue'

export type EquivalenceGroup = {
  id: string
  /** Пусто или не задано — обе ветки (перевод и диалог). */
  scopes?: readonly EquivalenceScope[]
  /** Подстроки после базовой нормализации (нижний регистр, одиночные пробелы). */
  variants: readonly string[]
}

export const ENGLISH_ANSWER_EQUIVALENCE_GROUPS: readonly EquivalenceGroup[] = [
  {
    id: 'i_am_contractible',
    scopes: ['translation', 'dialogue'],
    variants: ['i am', "i'm"],
  },
  {
    id: 'want_would_like_desire',
    scopes: ['translation', 'dialogue'],
    variants: [
      'i want',
      'i would like',
      "i'd like",
      'we want',
      'we would like',
      "we'd like",
      'you want',
      'you would like',
      "you'd like",
      'they want',
      'they would like',
      "they'd like",
      'he wants',
      'he would like',
      "he'd like",
      'she wants',
      'she would like',
      "she'd like",
      'it wants',
      'it would like',
      "it'd like",
    ],
  },
]
