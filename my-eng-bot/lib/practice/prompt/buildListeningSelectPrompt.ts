import { sanitizeVoiceShadowPrompt } from '@/lib/practice/buildVoiceShadowPrompt'
import { resolveSituationLine, situationalPromptHasContext } from '@/lib/practice/prompt/promptSourceUtils'
import type { PracticePromptSource } from '@/lib/practice/prompt/promptSourceTypes'
import { resolveReferenceLessonStep } from '@/lib/practice/resolveReferenceLessonStep'
import type { LessonData } from '@/types/lesson'

export function findLessonListeningSelectSourceForPractice(
  lesson: LessonData,
  stepIndex = 0
): PracticePromptSource | null {
  const resolved = resolveReferenceLessonStep({
    lesson,
    referenceExerciseType: 'listening-select',
    stepIndex,
  })
  if (!resolved) return null
  return {
    step: resolved.step,
    exercise: resolved.exercise,
    variantProfileId: resolved.variantProfileId,
    variantIndex: resolved.variantIndex,
    sourceStepNumber: resolved.sourceStepNumber,
  }
}

export const LISTENING_SELECT_INSTRUCTION = 'Прослушайте фразу и выберите правильный ответ.'

const LISTENING_SELECT_INSTRUCTION_TAIL =
  /\s*прослушайте(?:\s+фразу)?\s+и\s+выберите(?:\s+правильный)?(?:\s+вариант|\s+ответ)\.?\s*$/iu

export function stripListeningSelectTaskInstruction(prompt: string): string {
  return prompt.trim().replace(LISTENING_SELECT_INSTRUCTION_TAIL, '').trim()
}

export function buildListeningSelectPrompt(
  source: PracticePromptSource,
  lesson: LessonData,
  stepIndex: number,
  targetAnswer: string
): string {
  const situation = resolveSituationLine(source.step, lesson, stepIndex)
  return sanitizeVoiceShadowPrompt(situation, targetAnswer)
}

export function buildEtalonListeningSelectPromptForLesson(lesson: LessonData, stepIndex = 0): string | null {
  const source = findLessonListeningSelectSourceForPractice(lesson, stepIndex)
  if (!source) return null
  return buildListeningSelectPrompt(source, lesson, stepIndex, source.exercise.correctAnswer)
}

export function listeningSelectPromptHasContext(prompt: string): boolean {
  return situationalPromptHasContext(stripListeningSelectTaskInstruction(prompt))
}

export const LISTENING_SELECT_SYSTEM_RULES = [
  'For type listening-select: prompt is Russian situational context only (Ситуация/Тема); no listening instruction in prompt.',
  'audioText = targetAnswer; provide exactly 3 options matching granularity of source exercise.',
  'Never repeat the English target phrase in prompt.',
] as const
