import { normalizeEnglishForLearnerAnswerMatch } from '@/lib/normalizeEnglishForLearnerAnswerMatch'
import { collectPracticeSourceSituations } from '@/lib/practice/buildPracticeDiversity'
import {
  resolvePuzzleAxis,
  sourceSituationIndexForAxis,
  type WordBuilderPuzzleAxis,
} from '@/lib/practice/puzzleAxisUtils'
import type { Exercise, LessonData, SentencePuzzleVariant } from '@/types/lesson'

function answersMatch(left: string, right: string): boolean {
  const a = normalizeEnglishForLearnerAnswerMatch(left, 'translation')
  const b = normalizeEnglishForLearnerAnswerMatch(right, 'translation')
  return a.length > 0 && a === b
}

function formatSituation(text: string): string {
  const trimmed = text.trim().replace(/[.!?…]+$/u, '')
  if (!trimmed) return ''
  if (/^ситуация:/i.test(trimmed)) return trimmed.endsWith('.') ? trimmed : `${trimmed}.`
  return `Ситуация: ${trimmed}.`
}

function situationFromAxis(axis: WordBuilderPuzzleAxis, lesson: LessonData): string | null {
  const situations = collectPracticeSourceSituations(lesson)
  const index = sourceSituationIndexForAxis(axis)
  if (index == null) return null
  const candidate = situations[index]?.trim()
  return candidate ? formatSituation(candidate) : null
}

function situationFromLessonSteps(lesson: LessonData, targetAnswer: string): string | null {
  for (const step of lesson.steps) {
    const exercise = step.exercise
    if (!exercise) continue
    const candidates = [exercise.correctAnswer, ...(exercise.acceptedAnswers ?? [])]
    if (!candidates.some((item) => answersMatch(item, targetAnswer))) continue

    const question = exercise.question?.trim() ?? ''
    const translateMatch = question.match(/переведите[^:]*:\s*["«]([^"»]+)["»]/i)
    if (translateMatch?.[1]) return formatSituation(translateMatch[1])

    for (const bubble of step.bubbles) {
      if (bubble.type !== 'task') continue
      const bubbleMatch = bubble.content.match(/["«]([^"»]+)["»]/)
      if (bubbleMatch?.[1] && bubbleMatch[1].length >= 8) {
        return formatSituation(bubbleMatch[1])
      }
    }
  }
  return null
}

function situationFromChoiceStep(
  lesson: LessonData,
  targetAnswer: string,
  exercise: Exercise
): string | null {
  for (const step of lesson.steps) {
    const stepExercise = step.exercise
    if (!stepExercise || stepExercise.type !== 'fill_choice') continue
    const options = stepExercise.options ?? []
    if (!options.some((item) => answersMatch(item, targetAnswer))) continue

    for (const bubble of step.bubbles) {
      if (bubble.type !== 'task') continue
      const quoted = bubble.content.match(/["«]([^"»]+)["»]/)
      if (quoted?.[1]) return formatSituation(quoted[1])
    }
  }

  if ((exercise.options ?? []).some((item) => answersMatch(item, targetAnswer))) {
    const taskBubble = lesson.steps
      .flatMap((step) => step.bubbles)
      .find((bubble) => bubble.type === 'task' && /["«][^"»]+["»]/.test(bubble.content))
    const quoted = taskBubble?.content.match(/["«]([^"»]+)["»]/)
    if (quoted?.[1]) return formatSituation(quoted[1])
  }

  return null
}

function fallbackSituationFromPhrase(targetAnswer: string): string | null {
  const axis = resolvePuzzleAxis(targetAnswer)
  if (axis === 'from') {
    const country = targetAnswer.replace(/.*\bfrom\s+/i, '').replace(/[.!?]/g, '').trim()
    if (country) return formatSituation(`Я из ${country}.`)
  }
  return null
}

export function resolveWordBuilderSituation(params: {
  targetAnswer: string
  lesson: LessonData
  exercise: Exercise
  matchedVariant?: SentencePuzzleVariant | null
}): string {
  const axis = resolvePuzzleAxis(params.targetAnswer, params.matchedVariant)

  const fromAxis = situationFromAxis(axis, params.lesson)
  if (fromAxis) return fromAxis

  const fromSteps = situationFromLessonSteps(params.lesson, params.targetAnswer)
  if (fromSteps) return fromSteps

  const fromChoice = situationFromChoiceStep(params.lesson, params.targetAnswer, params.exercise)
  if (fromChoice) return fromChoice

  const fromPhrase = fallbackSituationFromPhrase(params.targetAnswer)
  if (fromPhrase) return fromPhrase

  const situations = collectPracticeSourceSituations(params.lesson)
  const first = situations[0]?.trim()
  if (first) return formatSituation(first)

  return ''
}
