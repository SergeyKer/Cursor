import type { AdaptiveConfig, ExerciseVariant } from '@/types/lesson'

type GenerateParams = {
  topic: string
  rule: string
  baseExamples: string[]
  config?: AdaptiveConfig
}

export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveConfig = {
  minVariants: 2,
  maxVariants: 3,
  startDifficulty: 'easy',
  errorThreshold: 2,
}

function buildFallbackVariants(baseExamples: string[], config: AdaptiveConfig): ExerciseVariant[] {
  const normalizedExamples = baseExamples.map((example) => example.trim()).filter(Boolean)
  return normalizedExamples.slice(0, config.maxVariants).map((example, index) => ({
    id: `fallback_${index + 1}`,
    question: example,
    correctAnswer: example,
    acceptedAnswers: [example],
    hint: 'Опирайтесь на правило и пример выше.',
    difficulty: index === 0 ? 'easy' : index === 1 ? 'medium' : 'hard',
  }))
}

export function generateExerciseVariants({
  topic,
  rule,
  baseExamples,
  config = DEFAULT_ADAPTIVE_CONFIG,
}: GenerateParams): ExerciseVariant[] {
  const safeRule = rule.trim()

  if (topic === 'there-is-are') {
    const variants: ExerciseVariant[] = [
      {
        id: 'v1_easy',
        question: 'There ___ a cat on the roof.',
        options: ['is', 'are'],
        correctAnswer: 'is',
        acceptedAnswers: ['is'],
        hint: 'a cat = одна кошка -> is',
        difficulty: 'easy',
        answerFormat: 'choice',
        answerPolicy: 'strict',
      },
      {
        id: 'v2_medium',
        question: 'There ___ three apples in the bag.',
        options: ['is', 'are'],
        correctAnswer: 'are',
        acceptedAnswers: ['are'],
        hint: 'three apples = много -> are',
        difficulty: 'medium',
        answerFormat: 'choice',
        answerPolicy: 'strict',
      },
      {
        id: 'v3_hard',
        question: 'There ___ some water in the glass.',
        options: ['is', 'are'],
        correctAnswer: 'is',
        acceptedAnswers: ['is'],
        hint: 'water = неисчисляемое существительное -> is',
        difficulty: 'hard',
        answerFormat: 'choice',
        answerPolicy: 'strict',
      },
    ]
    return variants.slice(0, config.maxVariants)
  }

  const fallbackVariants = buildFallbackVariants(baseExamples, config)
  if (fallbackVariants.length >= config.minVariants) {
    return fallbackVariants
  }

  const variants: ExerciseVariant[] = [
    {
      id: 'rule_1',
      question: safeRule || 'Примените правило к примеру.',
      correctAnswer: safeRule || 'Use the rule.',
      acceptedAnswers: safeRule ? [safeRule] : ['Use the rule.'],
      hint: 'Сначала определите, какое правило здесь нужно применить.',
      difficulty: 'easy',
    },
  ]
  return variants
}

export function getNextVariant(
  variants: ExerciseVariant[],
  currentIndex: number,
  userErrors: number,
  config: AdaptiveConfig = DEFAULT_ADAPTIVE_CONFIG
): number {
  if (variants.length === 0) return -1

  if (userErrors >= config.errorThreshold) {
    const easierIndex = variants.findIndex((variant) => variant.difficulty === 'easy')
    return easierIndex >= 0 ? easierIndex : 0
  }

  if (currentIndex < variants.length - 1) {
    return currentIndex + 1
  }

  return -1
}
