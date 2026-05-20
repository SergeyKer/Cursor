import { shouldShowLessonTaskProgress } from '@/utils/footerMessages'

export type LessonHeaderVariantProgress = {
  /** Zero-based variant index on the step */
  current: number
  total: number
}

export type LessonHeaderProgressInput = {
  isFinale: boolean
  /** Zero-based index among learning steps */
  currentStepIndex: number
  totalSteps: number
  stepNumber?: number | null
  variantProgress?: LessonHeaderVariantProgress | null
  puzzleSubIndex?: number
  puzzleSubTotal?: number
}

function formatTaskSuffix(
  stepNumber: number | null | undefined,
  variantProgress?: LessonHeaderVariantProgress | null,
  puzzleSubIndex?: number,
  puzzleSubTotal?: number
): string | null {
  if (puzzleSubTotal != null && puzzleSubTotal > 1 && puzzleSubIndex != null) {
    return `${puzzleSubIndex + 1}/${puzzleSubTotal}`
  }
  if (
    variantProgress &&
    variantProgress.total > 1 &&
    shouldShowLessonTaskProgress(stepNumber)
  ) {
    return `${variantProgress.current + 1}/${variantProgress.total}`
  }
  return null
}

export function formatLessonHeaderProgressLabel(input: LessonHeaderProgressInput): string | null {
  if (!input.isFinale && input.totalSteps <= 0) return null
  if (input.isFinale) return 'Готово'

  const stepLabel = `${Math.min(input.currentStepIndex + 1, input.totalSteps)}/${input.totalSteps}`
  const taskSuffix = formatTaskSuffix(
    input.stepNumber,
    input.variantProgress,
    input.puzzleSubIndex,
    input.puzzleSubTotal
  )
  return taskSuffix ? `${stepLabel} · ${taskSuffix}` : stepLabel
}

export function formatLessonHeaderProgressAriaLabel(input: LessonHeaderProgressInput): string | null {
  const label = formatLessonHeaderProgressLabel(input)
  if (!label) return null
  if (input.isFinale) return 'Урок завершён'

  const stepPart = `Шаг ${Math.min(input.currentStepIndex + 1, input.totalSteps)} из ${input.totalSteps}`
  const taskSuffix = formatTaskSuffix(
    input.stepNumber,
    input.variantProgress,
    input.puzzleSubIndex,
    input.puzzleSubTotal
  )
  if (!taskSuffix) return stepPart

  if (input.puzzleSubTotal != null && input.puzzleSubTotal > 1) {
    return `${stepPart}, задание пазла ${taskSuffix}`
  }
  return `${stepPart}, вариант ${taskSuffix}`
}
