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
  extraWords?: string[]
}): string {
  const type = normalizePracticeFingerprintPart(params.type)
  const prompt = normalizePracticeFingerprintPart(params.prompt)
  const targetAnswer = normalizePracticeFingerprintPart(params.targetAnswer)
  if (params.type === 'word-builder-pro') {
    const extras = (params.extraWords ?? [])
      .map(normalizePracticeFingerprintPart)
      .filter(Boolean)
      .sort()
      .join(',')
    return `${type}|${prompt}|${targetAnswer}|${extras}`
  }
  return `${type}|${prompt}|${targetAnswer}`
}

export function buildPracticeQuestionFingerprintFromQuestion(
  question: Pick<PracticeQuestion, 'type' | 'prompt' | 'targetAnswer' | 'extraWords'>
): string {
  return buildPracticeQuestionFingerprint({
    type: question.type,
    prompt: question.prompt,
    targetAnswer: question.targetAnswer,
    extraWords: question.extraWords,
  })
}
