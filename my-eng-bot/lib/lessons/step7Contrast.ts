import type { ExerciseVariant } from '@/types/lesson'

export type Step7ContrastVariantInput = {
  id: string
  difficulty: 'easy' | 'medium' | 'hard'
  situationRu: string
  frameEn: string
  correctWord: string
  distractors: [string, string]
  hint: string
}

function buildContrastOptions(correctWord: string, distractors: [string, string]): [string, string, string] {
  const options = [correctWord, distractors[0], distractors[1]]
  const seen = new Set<string>()
  const unique: string[] = []
  for (const option of options) {
    const key = option.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    unique.push(option.trim())
  }
  if (unique.length < 3) {
    throw new Error(`step7 contrast needs 3 unique options for "${correctWord}"`)
  }
  return [unique[0]!, unique[1]!, unique[2]!]
}

export function buildStep7ContrastVariants(items: Step7ContrastVariantInput[]): ExerciseVariant[] {
  return items.map((item) => ({
    id: item.id,
    question: `Выберите слово для пропуска: ${item.situationRu} — «${item.frameEn}»`,
    options: buildContrastOptions(item.correctWord, item.distractors),
    correctAnswer: item.correctWord,
    hint: item.hint,
    difficulty: item.difficulty,
    answerFormat: 'choice' as const,
    answerPolicy: 'strict' as const,
  }))
}
