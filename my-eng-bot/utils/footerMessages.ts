import type { Exercise } from '@/types/lesson'

export type VariantInfo = {
  current: number
  total: number
}

export function getVariantInfo(exercise?: Exercise | null): VariantInfo | null {
  const total = exercise?.variants?.length ?? 0
  if (total <= 1) return null

  return {
    current: (exercise?.currentVariantIndex ?? 0) + 1,
    total,
  }
}

export function getLessonRepeatFooterMessage(
  stepNumber?: number | null,
  variantInfo?: VariantInfo | null
): string | null {
  if (!variantInfo || (stepNumber !== 3 && stepNumber !== 4)) return null

  return variantInfo.current >= variantInfo.total
    ? `Последнее! (${variantInfo.current} из ${variantInfo.total})`
    : `Ещё одно! (${variantInfo.current} из ${variantInfo.total}) 🔥`
}

const LESSON_MULTI_TASK_STEPS = new Set([3, 4, 5])
const LESSON_PUZZLE_STEP = 5

export const LESSON_PUZZLE_COMPLETE_MESSAGE = 'Отлично! Пазл собран.'

function shouldOmitLessonTaskSuffix(stepNumber?: number | null, nextStepNumber?: number | null): boolean {
  return stepNumber === LESSON_PUZZLE_STEP || nextStepNumber === LESSON_PUZZLE_STEP
}

export function shouldShowLessonTaskProgress(stepNumber?: number | null): boolean {
  return stepNumber != null && LESSON_MULTI_TASK_STEPS.has(stepNumber)
}

export type LessonAdvanceMessageParams = {
  base?: string
  currentStep: number
  totalSteps: number
  stepNumber?: number | null
  taskCurrent?: number
  taskTotal?: number
  nextStepNumber?: number | null
  nextTaskTotal?: number
}

export function getLessonStepTaskTotal(stepNumber?: number | null, taskTotal?: number): number | undefined {
  if (!shouldShowLessonTaskProgress(stepNumber) || taskTotal == null || taskTotal <= 1) return undefined
  return taskTotal
}

export function buildLessonAdvanceMessage(params: LessonAdvanceMessageParams): string {
  const prefix = params.base ?? 'Верно.'
  const total = params.totalSteps
  const completedStep = params.stepNumber ?? params.currentStep + 1
  const nextStep = Math.min(completedStep + 1, total)
  const hasNextStep = params.nextStepNumber != null

  const omitTaskSuffix = shouldOmitLessonTaskSuffix(params.stepNumber, params.nextStepNumber)

  const completedTaskSuffix =
    !omitTaskSuffix &&
    getLessonStepTaskTotal(params.stepNumber, params.taskTotal) != null &&
    params.taskCurrent != null
      ? ` (задание ${params.taskCurrent} из ${params.taskTotal})`
      : ''

  const upcomingTaskTotal = omitTaskSuffix
    ? undefined
    : getLessonStepTaskTotal(params.nextStepNumber, params.nextTaskTotal)
  const upcomingTaskSuffix =
    upcomingTaskTotal != null ? ` (задание 1 из ${upcomingTaskTotal})` : ''

  if (upcomingTaskSuffix) {
    return `${prefix} Шаг ${nextStep} из ${total}${upcomingTaskSuffix}.`
  }

  if (hasNextStep) {
    return `${prefix} Шаг ${nextStep} из ${total}.`
  }

  const showCompletedStep =
    params.taskCurrent != null && getLessonStepTaskTotal(params.stepNumber, params.taskTotal) != null

  if (showCompletedStep) {
    return `${prefix} Шаг ${Math.min(completedStep, total)} из ${total}${completedTaskSuffix}.`
  }

  return `${prefix} Шаг ${nextStep} из ${total}.`
}

export function buildLessonNextVariantMessage(params: {
  stepNumber?: number | null
  nextVariantIndex: number
  variantTotal: number
}): string {
  const base = 'Верно. Следующий вариант'
  if (params.variantTotal <= 1 || !shouldShowLessonTaskProgress(params.stepNumber)) {
    return `${base}.`
  }

  const nextNumber = params.nextVariantIndex + 1
  return `${base} (${nextNumber} из ${params.variantTotal}).`
}
