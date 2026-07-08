import type { PracticePromptSource } from '@/lib/practice/prompt/promptSourceTypes'
import { resolveReferenceLessonStep } from '@/lib/practice/resolveReferenceLessonStep'
import {
  buildCanonicalRoleplayPrompt,
  resolveRoleplayScenario,
  resolveRoleplayTargetAnswer,
  roleplayPromptHasContext as engineRoleplayPromptHasContext,
} from '@/lib/practice/prompt/roleplayPromptEngine'
import type { LessonData } from '@/types/lesson'
import type { Audience } from '@/lib/types'

export function findLessonRoleplaySourceForPractice(
  lesson: LessonData,
  stepIndex = 0
): PracticePromptSource | null {
  const resolved = resolveReferenceLessonStep({
    lesson,
    referenceExerciseType: 'roleplay-mini',
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

export function buildRoleplayPrompt(
  source: PracticePromptSource,
  lesson: LessonData,
  stepIndex: number,
  targetAnswer?: string,
  audience: Audience = 'adult'
): string {
  const rawTarget = targetAnswer ?? source.exercise.correctAnswer
  const resolvedTarget = resolveRoleplayTargetAnswer(rawTarget, lesson.id)
  const scenario = resolveRoleplayScenario({
    lesson,
    targetAnswer: resolvedTarget,
    source,
    stepIndex,
    audience,
  })
  return buildCanonicalRoleplayPrompt(scenario)
}

export function buildEtalonRoleplayPromptForLesson(lesson: LessonData, stepIndex = 0): string | null {
  const source = findLessonRoleplaySourceForPractice(lesson, stepIndex)
  if (!source) return null
  const variant = source.exercise.variants?.[source.variantIndex ?? 0]
  const rawTarget = variant?.correctAnswer ?? source.exercise.correctAnswer
  const targetAnswer = resolveRoleplayTargetAnswer(rawTarget, lesson.id)
  return buildRoleplayPrompt(source, lesson, stepIndex, targetAnswer)
}

export function roleplayPromptHasContext(prompt: string): boolean {
  return engineRoleplayPromptHasContext(prompt)
}

export const ROLEPLAY_MINI_SYSTEM_RULES = [
  'For type roleplay-mini: prompt MUST include RU role intro line + Собеседник: «{EN question}?».',
  'Grammar cue stays in hint only, not in prompt.',
  'CHALLENGE step 10: targetAnswer MUST equal priorSessionPhrases[anchor].targetAnswer exactly.',
  'CHALLENGE step 10: interlocutor EN question must elicit the anchor phrase.',
  'REFERENCE: never reuse targetAnswer, intro, or interlocutor EN from recent session lists.',
  'Never use Переведите, Ситуация + abstract lead stack, or translate-style hints.',
  'targetAnswer MUST be declarative EN for roleplay-mini; lesson 2 pairs use declarative part only.',
  'keywords: ALL must appear in validation; minWords: 2; tolerance soft.',
  'hint: dialogue grammar cue for axis, not translate exercise hint.',
] as const
