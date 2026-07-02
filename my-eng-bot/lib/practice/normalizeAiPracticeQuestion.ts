import { normalizeEnglishLearnerContractions } from '@/lib/englishLearnerContractions'
import {
  buildChoicePrompt,
  choicePromptHasContext,
  findFirstLessonChoiceStep,
} from '@/lib/practice/buildChoicePrompt'
import { buildVoiceShadowPrompt, sanitizeVoiceShadowPrompt } from '@/lib/practice/buildVoiceShadowPrompt'
import {
  filterByChoiceGranularity,
  inferChoiceGranularity,
} from '@/lib/practice/choiceOptionGranularity'
import { buildTieredChoiceOptions } from '@/lib/practice/distractorTier'
import { ensurePracticeChoiceOptions, isChoiceLikePracticeType } from '@/lib/practice/ensurePracticeChoiceOptions'
import type { PracticeDistractorTier } from '@/lib/practice/engine/stepSpec'
import { collectLessonChoicePool } from '@/lib/practice/lessonChoicePool'
import { getPracticeExerciseMetadata } from '@/lib/practice/registry'
import { resolvePracticeLessonStep } from '@/lib/practice/resolvePracticeLessonStep'
import type { LessonData } from '@/types/lesson'
import type { PracticeExerciseType, PracticeMode, PracticeQuestion } from '@/types/practice'

function isPracticeExerciseType(value: unknown): value is PracticeExerciseType {
  return (
    value === 'choice' ||
    value === 'voice-shadow' ||
    value === 'dropdown-fill' ||
    value === 'listening-select' ||
    value === 'sentence-surgery' ||
    value === 'free-response' ||
    value === 'word-builder-pro' ||
    value === 'dictation' ||
    value === 'roleplay-mini' ||
    value === 'boss-challenge' ||
    value === 'speed-round' ||
    value === 'context-clue'
  )
}

export function normalizeAiPracticeQuestion(
  row: unknown,
  lesson: LessonData,
  index: number,
  normalizeOptions?: {
    forcedType?: PracticeExerciseType
    distractorTier?: PracticeDistractorTier
    mode?: PracticeMode
    referenceExerciseType?: PracticeExerciseType
  }
): PracticeQuestion | null {
  if (!row || typeof row !== 'object') return null
  const source = row as Record<string, unknown>
  const type = normalizeOptions?.forcedType ?? (isPracticeExerciseType(source.type) ? source.type : null)
  let prompt = typeof source.prompt === 'string' ? source.prompt.trim() : ''
  const targetAnswer = typeof source.targetAnswer === 'string' ? source.targetAnswer.trim() : ''
  if (!type || !targetAnswer) return null

  const mode = normalizeOptions?.mode ?? 'challenge'
  const resolved = resolvePracticeLessonStep({
    lesson,
    practiceIndex: index,
    practiceType: type,
    mode,
    referenceExerciseType: normalizeOptions?.referenceExerciseType,
  })
  const canonicalExercise = resolved?.exercise

  if (type === 'choice' && !choicePromptHasContext(prompt)) {
    if (mode === 'reference') return null
    const etalonStep = resolved
      ? { step: resolved.step, exercise: resolved.exercise }
      : findFirstLessonChoiceStep(lesson)
    if (etalonStep) {
      prompt = buildChoicePrompt(etalonStep.step, etalonStep.exercise, lesson)
    }
  }

  if (type === 'context-clue' && canonicalExercise) {
    const granularity = inferChoiceGranularity({
      targetAnswer,
      answerFormat: canonicalExercise.answerFormat,
      prompt: prompt || canonicalExercise.question,
      exerciseType: canonicalExercise.type,
    })
    if (granularity === 'sentence' && !choicePromptHasContext(prompt)) {
      prompt = buildChoicePrompt(resolved!.step, canonicalExercise, lesson)
    }
  }

  if (type === 'voice-shadow') {
    prompt = prompt ? sanitizeVoiceShadowPrompt(prompt, targetAnswer) : ''
    if (!prompt || !/[А-Яа-яЁё]/.test(prompt)) {
      const sourceStep = resolved?.step ?? lesson.steps.find((step) => step.exercise && step.stepType !== 'completion')
      const sourceExercise = resolved?.exercise ?? sourceStep?.exercise
      if (sourceStep && sourceExercise) {
        prompt = buildVoiceShadowPrompt(sourceStep, sourceExercise, lesson)
      }
    }
  }

  if (!prompt) return null
  if (type === 'choice' && !choicePromptHasContext(prompt)) return null

  const meta = getPracticeExerciseMetadata(type)
  const acceptedAnswers = Array.isArray(source.acceptedAnswers)
    ? source.acceptedAnswers.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []
  const rawOptions = Array.isArray(source.options)
    ? source.options.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : undefined
  const shuffledWords = Array.isArray(source.shuffledWords)
    ? source.shuffledWords.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : undefined
  const extraWords = Array.isArray(source.extraWords)
    ? source.extraWords.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : undefined
  const keywords = Array.isArray(source.keywords)
    ? source.keywords.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : undefined

  const granularity = inferChoiceGranularity({
    targetAnswer,
    answerFormat: canonicalExercise?.answerFormat,
    prompt: prompt || canonicalExercise?.question,
    exerciseType: canonicalExercise?.type,
  })
  const canonicalOptions = resolved?.canonicalOptions ?? []
  const filteredCanonical = filterByChoiceGranularity(canonicalOptions, granularity)
  const lessonChoiceOptions = isChoiceLikePracticeType(type)
    ? collectLessonChoicePool(lesson, targetAnswer, {
        sourceStepNumber: resolved?.sourceStepNumber,
        granularity,
      })
    : undefined
  const buildParams = {
    granularity,
    canonicalOptions,
    sourceStepOptionCount: filteredCanonical.length,
  }

  const choiceOptions = isChoiceLikePracticeType(type)
    ? normalizeOptions?.distractorTier
      ? buildTieredChoiceOptions(
          targetAnswer,
          normalizeOptions.distractorTier,
          lessonChoiceOptions ?? rawOptions ?? [],
          buildParams
        )
      : ensurePracticeChoiceOptions(lessonChoiceOptions ?? rawOptions ?? [], targetAnswer, {
          targetCount: filteredCanonical.length >= 3 ? 3 : undefined,
        })
    : rawOptions && rawOptions.length >= 2
      ? rawOptions
      : undefined

  if (isChoiceLikePracticeType(type) && !choiceOptions) return null

  const audioText =
    type === 'voice-shadow' || type === 'dictation' || type === 'listening-select'
      ? targetAnswer
      : typeof source.audioText === 'string'
        ? source.audioText.trim()
        : targetAnswer

  return {
    id: `ai-practice-${lesson.id}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    lessonId: lesson.id,
    type,
    prompt,
    targetAnswer,
    acceptedAnswers: Array.from(new Set([targetAnswer, ...acceptedAnswers])),
    options: choiceOptions,
    shuffledWords: shuffledWords && shuffledWords.length > 0 ? shuffledWords : undefined,
    extraWords: extraWords && extraWords.length > 0 ? extraWords : undefined,
    audioText,
    keywords: keywords && keywords.length > 0 ? keywords : undefined,
    minWords: typeof source.minWords === 'number' && source.minWords > 0 ? Math.min(20, source.minWords) : undefined,
    hint: type === 'voice-shadow' ? undefined : typeof source.hint === 'string' ? source.hint.trim() : undefined,
    explanation: typeof source.explanation === 'string' ? source.explanation.trim() : undefined,
    correctionPrompt: `Закрепим правильный вариант: ${normalizeEnglishLearnerContractions(targetAnswer)}`,
    xpBase: meta.xpBase,
    difficulty: meta.difficulty,
    tolerance: meta.tolerance,
  }
}
