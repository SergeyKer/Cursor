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
]
