import { sanitizeVoiceShadowPrompt } from '@/lib/practice/buildVoiceShadowPrompt'
import {
  buildDictationTaskPrompt,
  dictationPromptHasValidContext,
  resolveDictationRuSituation,
} from '@/lib/practice/prompt/dictationPromptFormat'
import type { PracticePromptSource } from '@/lib/practice/prompt/promptSourceTypes'
import { resolveReferenceLessonStep } from '@/lib/practice/resolveReferenceLessonStep'
import type { LessonData } from '@/types/lesson'

export {
  DICTATION_INSTRUCTION,
  buildDictationTaskPrompt,
  dictationPromptHasValidContext,
  isDictationStylePrompt,
  resolveDictationRuSituation,
} from '@/lib/practice/prompt/dictationPromptFormat'

export function findLessonDictationSourceForPractice(
  lesson: LessonData,
  stepIndex = 0
): PracticePromptSource | null {
  const resolved = resolveReferenceLessonStep({
    lesson,
    referenceExerciseType: 'dictation',
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

export function buildDictationPrompt(
  source: PracticePromptSource,
  lesson: LessonData,
  stepIndex: number,
  targetAnswer: string
): string {
  const ruSituation = resolveDictationRuSituation(source, lesson, stepIndex)
  const base = buildDictationTaskPrompt(ruSituation)
  return sanitizeVoiceShadowPrompt(base, targetAnswer)
}

export function buildEtalonDictationPromptForLesson(lesson: LessonData, stepIndex = 0): string | null {
  const source = findLessonDictationSourceForPractice(lesson, stepIndex)
  if (!source) return null
  return buildDictationPrompt(source, lesson, stepIndex, source.exercise.correctAnswer)
}

export function dictationPromptHasContext(prompt: string): boolean {
  return dictationPromptHasValidContext(prompt)
}

export const DICTATION_SYSTEM_RULES = [
  'For type dictation: prompt MUST be one line only: Ситуация: "{short Russian phrase from sourceSituations}". Прослушайте английскую фразу и запишите её целиком.',
  'Never use Переведите, Выберите слово, ___ gap-fill, or дополните одним словом in dictation prompts.',
  'When canonicalSourceExercise has translate wording, ignore it; use dictation prompt template only.',
  'audioText and targetAnswer must be the same full English sentence; leave hint empty.',
  'Rotate Russian situations across sourceSituations; do not repeat identical prompt text across scenarios.',
  'Never include the English phrase or targetAnswer in prompt.',
] as const
