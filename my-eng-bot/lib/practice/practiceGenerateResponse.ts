import {
  buildReferenceFallbackQuestions,
  type BuildReferenceFallbackQuestionParams,
} from '@/lib/practice/referenceFallbackQuestion'
import { pickUniquePracticeQuestions } from '@/lib/practice/pickUniquePracticeQuestions'
import type { LessonData } from '@/types/lesson'
import type { PracticeExerciseType, PracticeMode, PracticeQuestion } from '@/types/practice'

export type PracticeGenerateApiResponse = {
  questions?: PracticeQuestion[]
  generated?: boolean
  fallback?: boolean
  fallbackReason?: string
  providerError?: string
  fallbackNotice?: string
  error?: string
}

export const REFERENCE_LOCAL_DEBUG_SUFFIX =
  'Запущен локальный эталон для отладки (7 одинаковых шагов).'

export function composePracticeGenerationNotice(data: PracticeGenerateApiResponse): string | undefined {
  const parts: string[] = []
  if (data.providerError?.trim()) parts.push(data.providerError.trim())
  if (data.fallbackNotice?.trim()) parts.push(data.fallbackNotice.trim())
  if (parts.length === 0 && data.fallback) {
    parts.push(REFERENCE_LOCAL_DEBUG_SUFFIX)
  }
  return parts.length > 0 ? parts.join(' ') : undefined
}

export function shouldPrebuildReferenceFallbackSession(params: {
  mode: string
  fallback?: boolean
  referenceStepIndex?: number
  fromIndex?: number
}): boolean {
  if (params.mode !== 'reference' || !params.fallback) return false
  const stepIndex = params.referenceStepIndex ?? params.fromIndex ?? 0
  return stepIndex === 0
}

export function buildFullReferenceFallbackSessionQuestions(
  lesson: LessonData,
  referenceExerciseType: PracticeExerciseType,
  referenceTotal = 7
): PracticeQuestion[] {
  return buildReferenceFallbackQuestions({
    lesson,
    referenceExerciseType,
    referenceTotal,
  })
}

export function resolvePracticeQuestionsFromGenerateResponse(
  data: PracticeGenerateApiResponse,
  options: {
    mode: PracticeMode
    lesson: LessonData
    referenceExerciseType?: PracticeExerciseType
    referenceTotal?: number
    referenceStepIndex?: number
    fromIndex?: number
    existingQuestions: PracticeQuestion[]
  }
): { questions: PracticeQuestion[]; generationNotice?: string; useLocalGenerationSource: boolean } | { error: string } {
  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    return { error: data.error ?? 'Не удалось получить задания для сгенерированного варианта.' }
  }

  const generationNotice = composePracticeGenerationNotice(data)
  const useLocalGenerationSource = Boolean(data.fallback)

  if (
    shouldPrebuildReferenceFallbackSession({
      mode: options.mode,
      fallback: data.fallback,
      referenceStepIndex: options.referenceStepIndex,
      fromIndex: options.fromIndex,
    }) &&
    options.referenceExerciseType
  ) {
    const full = buildFullReferenceFallbackSessionQuestions(
      options.lesson,
      options.referenceExerciseType,
      options.referenceTotal ?? 7
    )
    if (full.length === 0) {
      return { error: 'Не удалось собрать локальный эталон для выбранного типа.' }
    }
    return { questions: full, generationNotice, useLocalGenerationSource: true }
  }

  const fresh = pickUniquePracticeQuestions(data.questions, options.existingQuestions)
  if (fresh.length === 0) {
    return { error: 'Не удалось получить уникальное следующее задание.' }
  }

  return { questions: fresh, generationNotice, useLocalGenerationSource }
}
