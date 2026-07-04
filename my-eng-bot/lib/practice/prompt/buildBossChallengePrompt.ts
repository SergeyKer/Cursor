import { mergePromptParts, resolveSituationLine, situationalPromptHasContext } from '@/lib/practice/prompt/promptSourceUtils'
import type { PracticePromptSource } from '@/lib/practice/prompt/promptSourceTypes'
import { resolveReferenceLessonStep } from '@/lib/practice/resolveReferenceLessonStep'
import type { LessonData } from '@/types/lesson'

export function findLessonBossChallengeSourceForPractice(
  lesson: LessonData,
  stepIndex = 0
): PracticePromptSource | null {
  const resolved = resolveReferenceLessonStep({
    lesson,
    referenceExerciseType: 'boss-challenge',
    stepIndex,
  })
  if (!resolved) return null
  return {
    step: resolved.step,
    exercise: resolved.exercise,
    variantProfileId: resolved.variantProfileId,
    variantIndex: resolved.variantIndex,
    axis: 'creative',
    sourceStepNumber: resolved.sourceStepNumber,
  }
}

export function buildBossChallengePrompt(
  source: PracticePromptSource,
  lesson: LessonData,
  stepIndex: number
): string {
  const situation = resolveSituationLine(source.step, lesson, stepIndex)
  return mergePromptParts([
    situation,
    'Финальный вызов: примените тему урока и напишите развёрнутый ответ по-английски.',
  ])
}

export function buildEtalonBossChallengePromptForLesson(lesson: LessonData, stepIndex = 0): string | null {
  const source = findLessonBossChallengeSourceForPractice(lesson, stepIndex)
  if (!source) return null
  return buildBossChallengePrompt(source, lesson, stepIndex)
}

export function bossChallengePromptHasContext(prompt: string): boolean {
  return situationalPromptHasContext(prompt)
}

export const BOSS_CHALLENGE_SYSTEM_RULES = [
  'For type boss-challenge: Russian situational final challenge; minWords 5; apply lesson theme; keywords 3-5 content words.',
] as const
