import type { ExerciseType } from '@/types/lesson'

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[.,!?;:]/g, '')
}

export function validateAnswer(userInput: string, correctAnswer: string, type: ExerciseType): boolean {
  if (type === 'match') {
    return normalize(userInput) === normalize(correctAnswer)
  }

  return normalize(userInput) === normalize(correctAnswer)
}
