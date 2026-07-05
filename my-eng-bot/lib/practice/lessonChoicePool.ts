import { normalizeEnglishLearnerContractions } from '@/lib/englishLearnerContractions'
import {
  filterByChoiceGranularity,
  inferChoiceGranularity,
  type ChoiceGranularity,
} from '@/lib/practice/choiceOptionGranularity'
import {
  buildSlotAwareWordDistractors,
  inferGapWordSlot,
  isOptionCompatibleWithSlot,
  validateDropdownFillOptions,
  type GapWordSlot,
} from '@/lib/practice/gapWordSlot'
import type { Exercise, LessonData } from '@/types/lesson'

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

function filterPoolBySlot(pool: string[], slot: GapWordSlot, targetAnswer: string): string[] {
  return pool.filter((item) => isOptionCompatibleWithSlot(item, slot, targetAnswer))
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

export function getSourceStepChoiceOptions(lesson: LessonData, sourceStepNumber: number): string[] | undefined {
  const step = lesson.steps.find((item) => item.stepNumber === sourceStepNumber)
  const options = step?.exercise?.options
  if (!options || options.length < 2) return undefined
  return [...options]
}

function collectWordOptionSteps(exercise: Exercise): Array<{ options: string[]; correctAnswer: string; question?: string }> {
  const rows: Array<{ options: string[]; correctAnswer: string; question?: string }> = []
  if (exercise.options && exercise.options.length >= 2) {
    rows.push({
      options: exercise.options,
      correctAnswer: exercise.correctAnswer,
      question: exercise.question,
    })
  }
  for (const variant of exercise.variants ?? []) {
    if (!variant.options || variant.options.length < 2) continue
    rows.push({
      options: variant.options,
      correctAnswer: variant.correctAnswer,
      question: variant.question,
    })
  }
  return rows
}

function borrowWordOptionsForSlot(
  lesson: LessonData,
  targetAnswer: string,
  targetSlot: GapWordSlot,
  exercise: Exercise
): string[] {
  const compatibleSteps: Array<{ wrong: string[] }> = []

  for (const step of lesson.steps) {
    const candidate = step.exercise
    if (!candidate) continue
    for (const row of collectWordOptionSteps(candidate)) {
      const candidateGranularity = inferChoiceGranularity({
        targetAnswer: row.correctAnswer,
        answerFormat: candidate.answerFormat,
        prompt: row.question ?? candidate.question,
        exerciseType: candidate.type,
      })
      if (candidateGranularity !== 'word') continue

      const candidateSlot = inferGapWordSlot({
        targetAnswer: row.correctAnswer,
        prompt: row.question ?? candidate.question,
      })
      if (candidateSlot !== targetSlot && targetSlot !== 'unknown') continue

      const wrong = row.options
        .filter((item) => !answerMatchesTarget(item, row.correctAnswer))
        .filter((item) => !answerMatchesTarget(item, targetAnswer))
        .filter((item) =>
          targetSlot === 'country' || targetSlot === 'article'
            ? isOptionCompatibleWithSlot(item, targetSlot, targetAnswer)
            : true
        )
      if (wrong.length >= 2) {
        compatibleSteps.push({ wrong })
      }
    }
  }

  if (compatibleSteps.length === 0) return []

  const preferred = compatibleSteps.find((entry) => entry.wrong.length >= 2)
  if (!preferred) return []
  return [targetAnswer.trim(), preferred.wrong[0]!.trim(), preferred.wrong[1]!.trim()]
}

/** Canonical trio for choice-like practice: step options or word-pattern borrow for gap-fill. */
export function resolveCanonicalChoiceOptions(
  lesson: LessonData,
  exercise: Exercise,
  targetAnswer: string
): string[] {
  if (Array.isArray(exercise.options) && exercise.options.length >= 2) {
    return [...exercise.options]
  }

  const matched = findLessonChoiceOptionsForTarget(lesson, targetAnswer)
  if (matched && matched.length >= 2) return [...matched]

  const granularity = inferChoiceGranularity({
    targetAnswer,
    answerFormat: exercise.answerFormat,
    prompt: exercise.question,
    exerciseType: exercise.type,
  })

  if (granularity === 'sentence') {
    for (const step of lesson.steps) {
      const candidate = step.exercise
      if (!candidate?.options || candidate.options.length < 2) continue
      const candidateGranularity = inferChoiceGranularity({
        targetAnswer: candidate.correctAnswer,
        answerFormat: candidate.answerFormat,
        prompt: candidate.question,
        exerciseType: candidate.type,
      })
      if (candidateGranularity !== 'sentence') continue
      const wrong = candidate.options.filter(
        (item) => !answerMatchesTarget(item, candidate.correctAnswer)
      )
      if (wrong.length >= 2) {
        return [targetAnswer.trim(), wrong[0]!.trim(), wrong[1]!.trim()]
      }
    }
  }

  if (granularity !== 'word') return []

  const targetSlot = inferGapWordSlot({
    targetAnswer,
    prompt: exercise.question,
  })
  const slotBorrowed = borrowWordOptionsForSlot(lesson, targetAnswer, targetSlot, exercise)
  if (slotBorrowed.length >= 3) return slotBorrowed

  return []
}

/** All choice options from lesson steps, excluding target and accepted variants. */
export function collectLessonWideChoiceOptions(
  lesson: LessonData,
  targetAnswer: string,
  granularity?: ChoiceGranularity
): string[] {
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
      if (granularity && !filterByChoiceGranularity([option], granularity).length) continue
      appendUniqueOptions(result, [option])
    }
  }

  return result
}

export type CollectLessonChoicePoolOptions = {
  sourceStepNumber?: number
  granularity?: ChoiceGranularity
  applyGapWordSlot?: boolean
  gapSlot?: GapWordSlot
  lesson?: LessonData
}

/** Matched step options first, then lesson-wide wrong answers of the same granularity. */
export function collectLessonChoicePool(
  lesson: LessonData,
  targetAnswer: string,
  opts?: CollectLessonChoicePoolOptions
): string[] {
  const pool: string[] = []
  const granularity = opts?.granularity
  const slot =
    opts?.gapSlot ??
    (opts?.applyGapWordSlot
      ? inferGapWordSlot({ targetAnswer, prompt: undefined })
      : undefined)

  if (opts?.sourceStepNumber != null) {
    const sourceOptions = getSourceStepChoiceOptions(lesson, opts.sourceStepNumber)
    if (sourceOptions) {
      let filtered = granularity ? filterByChoiceGranularity(sourceOptions, granularity) : sourceOptions
      if (opts.applyGapWordSlot && slot) {
        filtered = filterPoolBySlot(filtered, slot, targetAnswer)
      }
      appendUniqueOptions(pool, filtered)
    }
  }

  const matched = findLessonChoiceOptionsForTarget(lesson, targetAnswer)
  if (matched) {
    let filtered = granularity ? filterByChoiceGranularity(matched, granularity) : matched
    if (opts?.applyGapWordSlot && slot) {
      filtered = filterPoolBySlot(filtered, slot, targetAnswer)
    }
    appendUniqueOptions(pool, filtered)
  }

  let wide = collectLessonWideChoiceOptions(lesson, targetAnswer, granularity)
  if (opts?.applyGapWordSlot && slot) {
    wide = filterPoolBySlot(wide, slot, targetAnswer)
  }
  appendUniqueOptions(pool, wide)

  if (opts?.applyGapWordSlot && slot && pool.length < 3) {
    appendUniqueOptions(
      pool,
      buildSlotAwareWordDistractors({
        slot,
        targetAnswer,
        lesson: opts.lesson ?? lesson,
      }).filter((item) => !answerMatchesTarget(item, targetAnswer))
    )
  }

  return pool
}

export { validateDropdownFillOptions }
