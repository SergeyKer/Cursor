import { normalizeEnglishLearnerContractions } from '@/lib/englishLearnerContractions'
import {
  buildChoicePrompt,
  choicePromptHasContext,
  findLessonChoiceStepForPractice,
} from '@/lib/practice/buildChoicePrompt'
import { lessonForPracticeStep } from '@/lib/practice/buildPracticeDiversity'
import { buildVoiceShadowPrompt, sanitizeVoiceShadowPrompt } from '@/lib/practice/buildVoiceShadowPrompt'
import {
  buildReferencePromptFromLesson,
  getPracticePromptBuilder,
  isReferenceStepMapType,
} from '@/lib/practice/prompt/practicePromptBuilders'
import {
  canonicalAcceptedAnswersForExercise,
  freeResponsePromptHasValidContext,
  isTranslateBackedFreeResponseExercise,
} from '@/lib/practice/prompt/freeResponseTranslateMode'
import {
  extractSemanticKeywords,
  isTranslateStylePrompt,
  stripAnswerLeakFromHint,
} from '@/lib/practice/prompt/promptSourceUtils'
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
import {
  DEFAULT_PRACTICE_SENTENCE_PUZZLE_PROMPT,
  isStaleLessonPuzzlePrompt,
  resolvePracticeSentencePuzzleSlice,
} from '@/lib/practice/resolvePracticeSentencePuzzleSlice'
import {
  practiceWordMultisetsEqual,
  rebuildPracticeWordTokensFromAnswer,
  tokensFromTargetAnswer,
} from '@/lib/practice/rebuildPracticeWordTokensFromAnswer'
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
  const scopedLesson = mode === 'reference' ? lessonForPracticeStep(lesson, index) : lesson
  const resolved = resolvePracticeLessonStep({
    lesson: scopedLesson,
    practiceIndex: index,
    practiceType: type,
    mode,
    referenceExerciseType: normalizeOptions?.referenceExerciseType,
  })
  const canonicalExercise = resolved?.exercise
  const isTranslateBackedFreeResponse =
    type === 'free-response' &&
    canonicalExercise != null &&
    isTranslateBackedFreeResponseExercise(canonicalExercise)

  if (type === 'choice' && !choicePromptHasContext(prompt)) {
    if (mode === 'reference') return null
    const etalonStep = resolved
      ? { step: resolved.step, exercise: resolved.exercise }
      : findLessonChoiceStepForPractice(lesson, index)
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

  const referenceType = normalizeOptions?.referenceExerciseType ?? type
  const useReferencePromptBuilder =
    mode === 'reference' && isReferenceStepMapType(referenceType)

  if (useReferencePromptBuilder) {
    const builder = getPracticePromptBuilder(referenceType)
    if (type === 'free-response' && builder && !builder.hasContext(prompt)) {
      const rebuilt = buildReferencePromptFromLesson({
        lesson: scopedLesson,
        type: referenceType,
        stepIndex: index,
        targetAnswer,
      })
      if (rebuilt) prompt = rebuilt
    } else if (
      (type === 'dictation' || type === 'listening-select') &&
      (!builder?.hasContext(prompt) || prompt.includes(targetAnswer))
    ) {
      const rebuilt = buildReferencePromptFromLesson({
        lesson: scopedLesson,
        type: referenceType,
        stepIndex: index,
        targetAnswer,
      })
      if (rebuilt) prompt = rebuilt
    } else if (builder && !builder.hasContext(prompt)) {
      const rebuilt = buildReferencePromptFromLesson({
        lesson: scopedLesson,
        type: referenceType,
        stepIndex: index,
        targetAnswer,
      })
      if (rebuilt) prompt = rebuilt
    }
  }

  if (isTranslateBackedFreeResponse && canonicalExercise) {
    if (!isTranslateStylePrompt(prompt)) {
      const rebuilt = canonicalExercise.question?.trim()
      if (rebuilt && isTranslateStylePrompt(rebuilt)) prompt = rebuilt
    }
  }

  const rawAcceptedAnswers = Array.isArray(source.acceptedAnswers)
    ? source.acceptedAnswers.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []
  const rawShuffledWords = Array.isArray(source.shuffledWords)
    ? source.shuffledWords.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : undefined

  const puzzleSlice =
    (type === 'sentence-surgery' || type === 'word-builder-pro') && canonicalExercise
      ? resolvePracticeSentencePuzzleSlice(canonicalExercise)
      : null

  let normalizedTargetAnswer = targetAnswer
  let normalizedAcceptedAnswers = rawAcceptedAnswers
  let normalizedShuffledWords = rawShuffledWords
  let normalizedHint = typeof source.hint === 'string' ? source.hint.trim() : undefined

  if (puzzleSlice) {
    normalizedTargetAnswer = puzzleSlice.targetAnswer
    normalizedAcceptedAnswers = puzzleSlice.acceptedAnswers.filter(
      (item) => item.trim().toLowerCase() !== normalizedTargetAnswer.trim().toLowerCase()
    )
    normalizedHint = puzzleSlice.hint
    if (!prompt || isStaleLessonPuzzlePrompt(prompt)) {
      prompt = puzzleSlice.prompt
    }
    const answerTokens = tokensFromTargetAnswer(normalizedTargetAnswer)
    const candidateShuffle = normalizedShuffledWords ?? []
    normalizedShuffledWords =
      candidateShuffle.length > 0 && practiceWordMultisetsEqual(candidateShuffle, answerTokens)
        ? candidateShuffle
        : rebuildPracticeWordTokensFromAnswer(normalizedTargetAnswer)
  } else if (
    (type === 'sentence-surgery' || type === 'word-builder-pro') &&
    isStaleLessonPuzzlePrompt(prompt)
  ) {
    prompt = DEFAULT_PRACTICE_SENTENCE_PUZZLE_PROMPT
    const answerTokens = tokensFromTargetAnswer(normalizedTargetAnswer)
    if (
      !normalizedShuffledWords?.length ||
      !practiceWordMultisetsEqual(normalizedShuffledWords, answerTokens)
    ) {
      normalizedShuffledWords = rebuildPracticeWordTokensFromAnswer(normalizedTargetAnswer)
    }
  }

  if (isTranslateBackedFreeResponse && canonicalExercise) {
    normalizedTargetAnswer = canonicalExercise.correctAnswer
    const canonicalAccepted = canonicalAcceptedAnswersForExercise(canonicalExercise)
    normalizedAcceptedAnswers = canonicalAccepted.filter(
      (item) => item.trim().toLowerCase() !== normalizedTargetAnswer.trim().toLowerCase()
    )
  }

  if (!prompt) return null
  if (type === 'choice' && !choicePromptHasContext(prompt)) return null
  if (useReferencePromptBuilder) {
    const builder = getPracticePromptBuilder(referenceType)
    if (builder && !builder.hasContext(prompt)) return null
  }
  if (isTranslateBackedFreeResponse && !freeResponsePromptHasValidContext(prompt)) return null

  const meta = getPracticeExerciseMetadata(type)
  const rawOptions = Array.isArray(source.options)
    ? source.options.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : undefined
  const extraWords = Array.isArray(source.extraWords)
    ? source.extraWords.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : undefined
  const keywords = Array.isArray(source.keywords)
    ? source.keywords.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : undefined

  const granularity = inferChoiceGranularity({
    targetAnswer: normalizedTargetAnswer,
    answerFormat: canonicalExercise?.answerFormat,
    prompt: prompt || canonicalExercise?.question,
    exerciseType: canonicalExercise?.type,
  })
  const canonicalOptions = resolved?.canonicalOptions ?? []
  const filteredCanonical = filterByChoiceGranularity(canonicalOptions, granularity)
  const lessonChoiceOptions = isChoiceLikePracticeType(type)
    ? collectLessonChoicePool(lesson, normalizedTargetAnswer, {
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
          normalizedTargetAnswer,
          normalizeOptions.distractorTier,
          lessonChoiceOptions ?? rawOptions ?? [],
          buildParams
        )
      : ensurePracticeChoiceOptions(lessonChoiceOptions ?? rawOptions ?? [], normalizedTargetAnswer, {
          targetCount: filteredCanonical.length >= 3 ? 3 : undefined,
        })
    : type === 'dropdown-fill'
      ? ensurePracticeChoiceOptions(rawOptions ?? [], normalizedTargetAnswer, { targetCount: 3 })
      : rawOptions && rawOptions.length >= 2
        ? rawOptions
        : undefined

  if (isChoiceLikePracticeType(type) && !choiceOptions) return null
  if (type === 'dropdown-fill' && (!choiceOptions || choiceOptions.length < 3)) return null

  const audioText =
    type === 'voice-shadow' || type === 'dictation' || type === 'listening-select'
      ? normalizedTargetAnswer
      : typeof source.audioText === 'string'
        ? source.audioText.trim()
        : undefined

  const normalizedKeywords =
    isTranslateBackedFreeResponse
      ? undefined
      : keywords && keywords.length > 0
        ? keywords
        : type === 'free-response' || type === 'roleplay-mini' || type === 'boss-challenge'
          ? extractSemanticKeywords(normalizedTargetAnswer)
          : undefined

  const tolerance =
    isTranslateBackedFreeResponse && canonicalExercise
      ? canonicalExercise.answerPolicy === 'strict'
        ? 'strict'
        : 'normalized'
      : meta.tolerance

  return {
    id: `ai-practice-${lesson.id}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    lessonId: lesson.id,
    type,
    prompt,
    targetAnswer: normalizedTargetAnswer,
    acceptedAnswers: Array.from(new Set([normalizedTargetAnswer, ...normalizedAcceptedAnswers])),
    options: choiceOptions,
    shuffledWords:
      normalizedShuffledWords && normalizedShuffledWords.length > 0 ? normalizedShuffledWords : undefined,
    extraWords: extraWords && extraWords.length > 0 ? extraWords : undefined,
    audioText,
    keywords: normalizedKeywords && normalizedKeywords.length > 0 ? normalizedKeywords : undefined,
    minWords:
      isTranslateBackedFreeResponse
        ? undefined
        : typeof source.minWords === 'number' && source.minWords > 0
          ? Math.min(20, source.minWords)
          : undefined,
    hint: type === 'voice-shadow' ? undefined : stripAnswerLeakFromHint(normalizedHint, normalizedTargetAnswer),
    explanation: typeof source.explanation === 'string' ? source.explanation.trim() : undefined,
    correctionPrompt: `Закрепим правильный вариант: ${normalizeEnglishLearnerContractions(normalizedTargetAnswer)}`,
    xpBase: meta.xpBase,
    difficulty: meta.difficulty,
    tolerance,
  }
}
