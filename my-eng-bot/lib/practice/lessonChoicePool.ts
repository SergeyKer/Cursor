import { normalizeEnglishLearnerContractions } from '@/lib/englishLearnerContractions'
import type { LessonData } from '@/types/lesson'

function normalizeChoiceTextKey(value: string): string {
  return value.trim().toLowerCase().replace(/[.,!?;:]/g, '').replace(/\s+/g, ' ')
}

function normalizeChoiceText(value: string): string {
  return normalizeChoiceTextKey(normalizeEnglishLearnerContractions(value))
}

export function answerMatchesTarget(candidate: string, targetAnswer: string): boolean {
  const key = normalizeChoiceTextKey(normalizeEnglishLearnerContractions(candidate))
  const targetKey = normalizeChoiceText(targetAnswer)
  return key === targetKey
}

function isExcludedAnswer(candidate: string, targetAnswer: string, acceptedAnswers: string[]): boolean {
  if (answerMatchesTarget(candidate, targetAnswer)) return true
  return acceptedAnswers.some((answer) => answerMatchesTarget(candidate, answer))
}

function appendUniqueOptions(target: string[], candidates: string[]): void {
  for (const candidate of candidates) {
    const trimmed = candidate.trim()
    if (!trimmed) continue
    const key = normalizeChoiceText(trimmed)
    if (target.some((item) => normalizeChoiceText(item) === key)) continue
    target.push(trimmed)
  }
}

/** Options from the lesson step whose correct answer matches target. */
export function findLessonChoiceOptionsForTarget(lesson: LessonData, targetAnswer: string): string[] | undefined {
  const matchedExercise = lesson.steps.find((step) => {
    const exercise = step.exercise
    if (!exercise || !Array.isArray(exercise.options) || exercise.options.length < 2) return false
    if (answerMatchesTarget(exercise.correctAnswer, targetAnswer)) return true
    return (exercise.acceptedAnswers ?? []).some((answer) => answerMatchesTarget(answer, targetAnswer))
  })?.exercise
  return matchedExercise?.options && matchedExercise.options.length >= 2 ? [...matchedExercise.options] : undefined
}

/** All choice options from lesson steps, excluding target and accepted variants. */
export function collectLessonWideChoiceOptions(lesson: LessonData, targetAnswer: string): string[] {
  const acceptedAnswers: string[] = []
  const result: string[] = []

  for (const step of lesson.steps) {
    const exercise = step.exercise
    if (!exercise?.options || exercise.options.length < 2) continue
    const stepAccepted = [exercise.correctAnswer, ...(exercise.acceptedAnswers ?? [])]
      .map((item) => item.trim())
      .filter(Boolean)
    appendUniqueOptions(acceptedAnswers, stepAccepted)
    for (const option of exercise.options) {
      if (isExcludedAnswer(option, targetAnswer, acceptedAnswers)) continue
      appendUniqueOptions(result, [option])
    }
  }

  return result
}

/** Matched step options first, then lesson-wide wrong answers. */
export function collectLessonChoicePool(lesson: LessonData, targetAnswer: string): string[] {
  const pool: string[] = []
  const matched = findLessonChoiceOptionsForTarget(lesson, targetAnswer)
  if (matched) appendUniqueOptions(pool, matched)
  appendUniqueOptions(pool, collectLessonWideChoiceOptions(lesson, targetAnswer))
  return pool
}
