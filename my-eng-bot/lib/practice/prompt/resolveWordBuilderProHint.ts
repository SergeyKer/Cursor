import { resolvePuzzleAxis } from '@/lib/practice/puzzleAxisUtils'
import type { Exercise, LessonData, SentencePuzzleVariant } from '@/types/lesson'

function hintMentionsWrongAxis(hint: string, targetAnswer: string): boolean {
  const normalizedHint = hint.toLowerCase()
  const hasFrom = /\bfrom\b/i.test(targetAnswer)
  const hasArticle = /\b(a|an)\s+\w/i.test(targetAnswer)

  if (!hasFrom && normalizedHint.includes('from')) return true
  if (!hasArticle && (normalizedHint.includes('артикль') || normalizedHint.includes('article'))) {
    return false
  }
  if (!hasFrom && normalizedHint.includes('стран')) return true
  return false
}

function buildAxisHint(targetAnswer: string, axis: ReturnType<typeof resolvePuzzleAxis>): string | undefined {
  const tokens = targetAnswer.replace(/[.!?]/g, '').split(/\s+/).filter(Boolean)
  const first = tokens[0]?.trim()
  if (!first) return undefined

  if (axis === 'from') {
    return 'Подсказка: после from идёт название страны одним словом.'
  }
  if (axis === 'role') {
    const article = tokens.find((token) => /^a$/i.test(token) || /^an$/i.test(token))
    if (article) {
      return `Подсказка: проверьте артикль (${article}) перед профессией.`
    }
    return 'Подсказка: соберите фразу о профессии или роли.'
  }
  if (axis === 'mood') {
    return `Подсказка: первое слово - ${first}.`
  }
  if (tokens.length > 4) {
    return `Подсказка: первое слово - ${first}.`
  }
  return undefined
}

export function resolveWordBuilderProHint(params: {
  targetAnswer: string
  lesson: LessonData
  exercise: Exercise
  variantHint?: string
  matchedVariant?: SentencePuzzleVariant | null
}): string | undefined {
  const variantHint = params.variantHint?.trim()
  if (variantHint && !hintMentionsWrongAxis(variantHint, params.targetAnswer)) {
    return variantHint
  }

  const exerciseHint = params.exercise.hint?.trim()
  if (exerciseHint && !hintMentionsWrongAxis(exerciseHint, params.targetAnswer)) {
    return exerciseHint
  }

  const axis = resolvePuzzleAxis(params.targetAnswer, params.matchedVariant)
  return buildAxisHint(params.targetAnswer, axis)
}
