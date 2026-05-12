import type { PracticeQuestion } from '@/types/practice'

export function normalizePracticeFingerprintPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,!?;:()[\]{}"'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildPracticeQuestionFingerprint(params: {
  type: string
  prompt: string
  targetAnswer: string
}): string {
  const type = normalizePracticeFingerprintPart(params.type)
  const prompt = normalizePracticeFingerprintPart(params.prompt)
  const targetAnswer = normalizePracticeFingerprintPart(params.targetAnswer)
  return `${type}|${prompt}|${targetAnswer}`
}

export function buildPracticeQuestionFingerprintFromQuestion(question: Pick<PracticeQuestion, 'type' | 'prompt' | 'targetAnswer'>): string {
  return buildPracticeQuestionFingerprint({
    type: question.type,
    prompt: question.prompt,
    targetAnswer: question.targetAnswer,
  })
}
