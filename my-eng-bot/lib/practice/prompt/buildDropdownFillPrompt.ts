import {
  buildGapFillPrompt,
  extractQuotedGapFrame,
  gapFillPromptHasValidContext,
  isGapFillStylePrompt,
  normalizeGapFillPrompt,
  parseFillInstructionGapQuestion,
  parseLegacyTranslateGapQuestion,
  resolveDropdownRuPhrase,
} from '@/lib/practice/prompt/dropdownFillPromptFormat'
import type { PracticePromptSource } from '@/lib/practice/prompt/promptSourceTypes'
import { resolveReferenceLessonStep } from '@/lib/practice/resolveReferenceLessonStep'
import type { LessonData } from '@/types/lesson'

export function findLessonDropdownFillSourceForPractice(
  lesson: LessonData,
  stepIndex = 0
): PracticePromptSource | null {
  const resolved = resolveReferenceLessonStep({
    lesson,
    referenceExerciseType: 'dropdown-fill',
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

export function buildDropdownFillPrompt(
  source: PracticePromptSource,
  lesson: LessonData,
  stepIndex: number
): string | null {
  const question = source.exercise.question?.trim() ?? ''

  const parsed = parseLegacyTranslateGapQuestion(question)
  if (parsed) {
    return buildGapFillPrompt(parsed.ruPhrase, parsed.gapFrameEn)
  }

  const fillInstruction = parseFillInstructionGapQuestion(question)
  if (fillInstruction) {
    const ruPhrase = resolveDropdownRuPhrase(source, lesson, stepIndex)
    return buildGapFillPrompt(ruPhrase, fillInstruction.gapFrameEn)
  }

  if (isGapFillStylePrompt(question)) return normalizeGapFillPrompt(question)

  const gapFrame = extractQuotedGapFrame(question)
  if (gapFrame) {
    const ruPhrase = resolveDropdownRuPhrase(source, lesson, stepIndex)
    return buildGapFillPrompt(ruPhrase, gapFrame)
  }

  return null
}

export function buildEtalonDropdownFillPromptForLesson(lesson: LessonData, stepIndex = 0): string | null {
  const source = findLessonDropdownFillSourceForPractice(lesson, stepIndex)
  if (!source) return null
  return buildDropdownFillPrompt(source, lesson, stepIndex)
}

export function dropdownFillPromptHasContext(prompt: string): boolean {
  return gapFillPromptHasValidContext(prompt)
}

export const DROPDOWN_FILL_SYSTEM_RULES = [
  'For type dropdown-fill: prompt MUST be one line: Выберите слово для пропуска: "{Russian phrase}" - «{English frame with ___}».',
  'Russian phrase MUST explicitly name what maps to targetAnswer (Я из России → Russia).',
  'targetAnswer is the single word that fills ___ and matches RU + gap object (пить чай / ___ tea → drink, never go/eat/sleep).',
  'Never pair ___ tea with targetAnswer go/eat/sleep; never pair ___ lunch with drink.',
  'Never stack Ситуация + Переведите + Выберите in one prompt.',
  'targetAnswer is exactly one word matching the gap slot.',
  'options MUST include targetAnswer; 3 single words for closed slots (article, auxiliary); 4 for open lexical slots; ALL same word class as targetAnswer.',
  'country gap (from ___): distractors = other country names only, never articles.',
  'Never use full-sentence options for dropdown-fill.',
] as const
