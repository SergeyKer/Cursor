import type { Audience } from '@/lib/types'
import type { PracticeQuestion } from '@/types/practice'

function stableHash(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

function pickStable<T>(items: readonly T[], seed: string): T {
  return items[stableHash(seed) % items.length]!
}

function lowercaseLead(text: string): string {
  if (!text) return text
  return text.charAt(0).toLowerCase() + text.slice(1)
}

const FIRST_OPENERS_ADULT = [
  'Начнём',
  'Поехали',
  'Первый вопрос',
  'Стартуем',
] as const

const FIRST_OPENERS_CHILD = ['Начнём', 'Поехали', 'Старт'] as const

const AFTER_CORRECT_ADULT = [
  'Отлично. А теперь',
  'Верно. Дальше',
  'Так держать. Следующий',
  'Супер. А теперь',
] as const

const AFTER_WRONG_ADULT = [
  'Разобрались. А теперь',
  'Ничего страшного. Дальше',
  'Понятно. Следующий',
  'Ок, идём дальше',
] as const

const MID_ADULT = ['А теперь', 'Дальше', 'Следующий вопрос', 'Ещё один', 'Продолжаем'] as const

const AFTER_CORRECT_CHILD = ['Отлично. А теперь', 'Верно. Дальше', 'Класс. Следующий'] as const

const AFTER_WRONG_CHILD = ['Ничего страшного. А теперь', 'Ок. Дальше', 'Понятно. Следующий'] as const

const MID_CHILD = ['А теперь', 'Дальше', 'Ещё один', 'Продолжаем'] as const

function resolveTransitionPhrase(params: {
  questionIndex: number
  previousWasCorrect: boolean | null
  audience: Audience
  seed: string
}): string {
  const { questionIndex, previousWasCorrect, audience, seed } = params
  const isChild = audience === 'child'

  if (questionIndex === 0) {
    return pickStable(isChild ? FIRST_OPENERS_CHILD : FIRST_OPENERS_ADULT, seed)
  }

  if (previousWasCorrect === true) {
    return pickStable(isChild ? AFTER_CORRECT_CHILD : AFTER_CORRECT_ADULT, seed)
  }

  if (previousWasCorrect === false) {
    return pickStable(isChild ? AFTER_WRONG_CHILD : AFTER_WRONG_ADULT, seed)
  }

  return pickStable(isChild ? MID_CHILD : MID_ADULT, seed)
}

/** Info-блок вопроса быстрого теста: короткий диалоговый переход + инструкция. */
export function buildQuickTestQuestionInfoLabel(params: {
  question: PracticeQuestion
  questionIndex: number
  previousWasCorrect: boolean | null
  audience: Audience
  baseInstruction: string
}): string {
  const instruction = params.baseInstruction.trim()
  if (!instruction) return ''

  const seed = `${params.question.id}:${params.questionIndex}:${params.previousWasCorrect ?? 'none'}`
  const transition = resolveTransitionPhrase({
    questionIndex: params.questionIndex,
    previousWasCorrect: params.previousWasCorrect,
    audience: params.audience,
    seed,
  })

  if (params.questionIndex === 0) {
    return `${transition}. ${instruction}`
  }

  return `${transition} — ${lowercaseLead(instruction)}`
}
