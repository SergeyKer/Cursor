import { normalizeEnglishForLearnerAnswerMatch } from '@/lib/normalizeEnglishForLearnerAnswerMatch'
import type { LessonData } from '@/types/lesson'

function normalizeSentence(value: string): string {
  return normalizeEnglishForLearnerAnswerMatch(value, 'translation')
}

function tokenize(value: string): string[] {
  return value
    .replace(/[.!?]$/g, '')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
}

function collectLessonSentencePool(lesson?: LessonData): Set<string> {
  const pool = new Set<string>()
  if (!lesson) return pool

  for (const step of lesson.steps) {
    const exercise = step.exercise
    if (!exercise) continue
    for (const candidate of [exercise.correctAnswer, ...(exercise.options ?? []), ...(exercise.acceptedAnswers ?? [])]) {
      const trimmed = candidate.trim()
      if (!trimmed || !/\s/.test(trimmed)) continue
      pool.add(normalizeSentence(trimmed))
    }
    for (const variant of exercise.puzzleVariants ?? []) {
      const trimmed = variant.correctAnswer.trim()
      if (trimmed) pool.add(normalizeSentence(trimmed))
    }
  }

  return pool
}

/** Returns true if swapping `correctTokens[swapIndex]` with `trap` can form another valid lesson sentence. */
export function wouldTrapFormAlternateSentence(params: {
  correctTokens: string[]
  swapIndex: number
  trap: string
  lesson?: LessonData
  targetAnswer: string
}): boolean {
  const pool = collectLessonSentencePool(params.lesson)
  if (pool.size === 0) return false

  const targetKey = normalizeSentence(params.targetAnswer)
  const candidateTokens = [...params.correctTokens]
  candidateTokens[params.swapIndex] = params.trap
  const candidate = candidateTokens.join(' ')
  const candidateKey = normalizeSentence(candidate)
  if (!candidateKey || candidateKey === targetKey) return false
  return pool.has(candidateKey)
}

export function isWordBuilderTrapAllowed(params: {
  trap: string
  correctTokens: string[]
  targetAnswer: string
  lesson?: LessonData
}): boolean {
  const trap = params.trap.trim()
  if (!trap) return false

  for (let index = 0; index < params.correctTokens.length; index += 1) {
    if (wouldTrapFormAlternateSentence({
      correctTokens: params.correctTokens,
      swapIndex: index,
      trap,
      lesson: params.lesson,
      targetAnswer: params.targetAnswer,
    })) {
      return false
    }
  }

  return true
}
