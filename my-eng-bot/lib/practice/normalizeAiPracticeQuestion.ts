import { normalizeEnglishLearnerContractions } from '@/lib/englishLearnerContractions'
import {
  buildChoicePrompt,
  choicePromptHasContext,
  findLessonChoiceStepForPractice,
} from '@/lib/practice/buildChoicePrompt'
import { lessonForPracticeStep } from '@/lib/practice/buildPracticeDiversity'
import {
  embeddedRoleplayInterlocutorOk,
  embeddedScenarioRuEnAligned,
  embeddedTargetHasBadInversion,
  isRecipeAnswerHint,
  situationRuIsTranslateLeak,
} from '@/lib/practice/embeddedQuestionScenarioAlignment'
import { buildVoiceShadowPrompt, sanitizeVoiceShadowPrompt, VOICE_SHADOW_FALLBACK_PROMPT } from '@/lib/practice/buildVoiceShadowPrompt'
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
  bossChallengePromptHasContext,
} from '@/lib/practice/prompt/buildBossChallengePrompt'
import { resolveBossPatternAnchors } from '@/lib/practice/bossChallengeAnswerValidation'
import {
  extractSemanticKeywords,
  isTranslateStylePrompt,
  normalizePracticeEmDashes,
  stripAnswerLeakFromHint,
} from '@/lib/practice/prompt/promptSourceUtils'
import {
  buildErrorFixPrompt,
  findLessonErrorFixSourceForPractice,
  isErrorFixAiPairValid,
} from '@/lib/practice/prompt/buildErrorFixPrompt'
import {
  filterByChoiceGranularity,
  inferChoiceGranularity,
  isCompleteSentence,
} from '@/lib/practice/choiceOptionGranularity'
import { resolveDropdownOptionCount } from '@/lib/practice/dropdownOptionCount'
import { buildWordBuilderProExtraWords } from '@/lib/practice/buildWordBuilderProTraps'
import { buildTieredChoiceOptions, sanitizeWordBuilderProExtraWords } from '@/lib/practice/distractorTier'
import { inferGapWordSlot, validateDropdownFillOptions } from '@/lib/practice/gapWordSlot'
import { ensurePracticeChoiceOptions, isChoiceLikePracticeType } from '@/lib/practice/ensurePracticeChoiceOptions'
import type { PracticeDistractorTier } from '@/lib/practice/engine/stepSpec'
import { collectLessonChoicePool } from '@/lib/practice/lessonChoicePool'
import {
  gapFillPromptHasValidContext,
  isGapFillStylePrompt,
  normalizeGapFillPrompt,
  sanitizeDropdownHint,
} from '@/lib/practice/prompt/dropdownFillPromptFormat'
import {
  isDropdownFillPairAligned,
  resolveAlignedDropdownTarget,
} from '@/lib/practice/prompt/dropdownFillPairAlign'
import {
  buildDropdownFillPrompt,
  findLessonDropdownFillSourceForPractice,
} from '@/lib/practice/prompt/buildDropdownFillPrompt'
import { buildWordBuilderProPrompt } from '@/lib/practice/prompt/buildWordBuilderProPrompt'
import {
  buildRoleplayHint,
  extractRoleplayKeywords,
  inferRoleplayAxis,
  parseInterlocutorFromPrompt,
  resolveRoleplayTargetAnswer,
} from '@/lib/practice/prompt/roleplayPromptEngine'
import { roleplayPromptHasContext } from '@/lib/practice/prompt/buildRoleplayPrompt'
import {
  buildRoleplayPromptFromAnchor,
  collectPriorSessionPhrases,
  selectRoleplayAnchor,
  type PriorSessionPhrase,
} from '@/lib/practice/roleplaySessionContinuity'
import {
  dictationPromptHasLeakMarkers,
  isDictationStylePrompt,
  stripDictationTaskInstruction,
} from '@/lib/practice/prompt/dictationPromptFormat'
import {
  listeningSelectPromptHasContext,
  stripListeningSelectTaskInstruction,
} from '@/lib/practice/prompt/buildListeningSelectPrompt'
import { resolveWordBuilderProHint } from '@/lib/practice/prompt/resolveWordBuilderProHint'
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
    value === 'error-fix' ||
    value === 'context-clue'
  )
}

function resolvePracticeType(value: unknown): PracticeExerciseType | null {
  if (value === 'speed-round') return 'error-fix'
  return isPracticeExerciseType(value) ? value : null
}

function isLesson3EmbeddedAiQuestionValid(params: {
  lessonId: string
  type: PracticeExerciseType
  prompt: string
  targetAnswer: string
}): boolean {
  if (params.lessonId !== '3') return true
  if (embeddedTargetHasBadInversion(params.targetAnswer)) return false

  const situationMatch = /(?:Ситуация|Тема)\s*:\s*([^.]*)/iu.exec(params.prompt)
  if (situationMatch?.[1]) {
    const situationRu = situationMatch[1].trim()
    if (!embeddedScenarioRuEnAligned(situationRu, params.targetAnswer)) return false
    if (situationRuIsTranslateLeak(situationRu, params.targetAnswer, params.type)) return false
  }

  if (params.type === 'roleplay-mini') {
    const interlocutor = parseInterlocutorFromPrompt(params.prompt)
    if (!interlocutor || !embeddedRoleplayInterlocutorOk(interlocutor)) return false
  }

  return true
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
    priorSessionPhrases?: PriorSessionPhrase[]
    priorQuestionsInBatch?: PracticeQuestion[]
  }
): PracticeQuestion | null {
  if (!row || typeof row !== 'object') return null
  const source = row as Record<string, unknown>
  const type =
    normalizeOptions?.forcedType ?? resolvePracticeType(source.type)
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

  if (type === 'dictation') {
    if (!isCompleteSentence(targetAnswer)) return null
    if (prompt) {
      prompt = stripDictationTaskInstruction(prompt)
    }
    const needsRebuild =
      !isDictationStylePrompt(prompt) ||
      dictationPromptHasLeakMarkers(prompt) ||
      prompt.includes(targetAnswer)
    if (needsRebuild) {
      const rebuilt = buildReferencePromptFromLesson({
        lesson: scopedLesson,
        type: 'dictation',
        stepIndex: index,
        targetAnswer,
      })
      if (rebuilt) prompt = rebuilt
    }
    if (prompt) {
      prompt = stripDictationTaskInstruction(sanitizeVoiceShadowPrompt(prompt, targetAnswer))
    }
    if (!isDictationStylePrompt(prompt)) return null
  }

  if (type === 'listening-select') {
    if (prompt) {
      prompt = stripListeningSelectTaskInstruction(sanitizeVoiceShadowPrompt(prompt, targetAnswer))
      if (prompt === VOICE_SHADOW_FALLBACK_PROMPT) prompt = ''
    }
    const needsRebuild =
      !prompt ||
      !listeningSelectPromptHasContext(prompt) ||
      prompt.includes(targetAnswer)
    if (needsRebuild) {
      const rebuilt = buildReferencePromptFromLesson({
        lesson: scopedLesson,
        type: 'listening-select',
        stepIndex: index,
        targetAnswer,
      })
      if (rebuilt) prompt = rebuilt
    }
    if (prompt) {
      prompt = stripListeningSelectTaskInstruction(sanitizeVoiceShadowPrompt(prompt, targetAnswer))
      if (prompt === VOICE_SHADOW_FALLBACK_PROMPT) prompt = ''
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
      type === 'dropdown-fill' &&
      builder &&
      (!isGapFillStylePrompt(prompt) || !builder.hasContext(prompt))
    ) {
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

  if (type === 'word-builder-pro' && resolved?.step && resolved.exercise) {
    prompt = buildWordBuilderProPrompt({
      step: resolved.step,
      exercise: resolved.exercise,
      lesson: scopedLesson,
      puzzlePrompt: puzzleSlice?.prompt ?? prompt ?? DEFAULT_PRACTICE_SENTENCE_PUZZLE_PROMPT,
      stepIndex: index,
      targetAnswer: normalizedTargetAnswer,
      matchedVariant: puzzleSlice?.matchedVariant,
    })
  }

  if (isTranslateBackedFreeResponse && canonicalExercise) {
    normalizedTargetAnswer = canonicalExercise.correctAnswer
    const canonicalAccepted = canonicalAcceptedAnswersForExercise(canonicalExercise)
    normalizedAcceptedAnswers = canonicalAccepted.filter(
      (item) => item.trim().toLowerCase() !== normalizedTargetAnswer.trim().toLowerCase()
    )
  }

  if (type === 'roleplay-mini') {
    const priorPhrases: PriorSessionPhrase[] = [
      ...(normalizeOptions?.priorSessionPhrases ?? []),
      ...(normalizeOptions?.priorQuestionsInBatch ?? []).map((question, stepIndex) => ({
        stepIndex,
        type: question.type,
        targetAnswer: question.targetAnswer,
        prompt: question.prompt,
      })),
    ]
    if (mode === 'challenge' && index === 9) {
      const anchor = selectRoleplayAnchor(priorPhrases)
      if (anchor) {
        normalizedTargetAnswer = anchor.targetAnswer
        prompt = buildRoleplayPromptFromAnchor(anchor, lesson)
      }
    }
    const needsRebuild =
      !roleplayPromptHasContext(prompt) ||
      isTranslateStylePrompt(prompt) ||
      Boolean(normalizedHint?.toLowerCase().includes('переведите'))
    if (needsRebuild) {
      const rebuilt = buildReferencePromptFromLesson({
        lesson: scopedLesson,
        type: 'roleplay-mini',
        stepIndex: mode === 'reference' ? index : 0,
        targetAnswer: normalizedTargetAnswer,
      })
      if (rebuilt) prompt = rebuilt
    }
    normalizedTargetAnswer = resolveRoleplayTargetAnswer(normalizedTargetAnswer, scopedLesson.id)
    normalizedAcceptedAnswers = normalizedAcceptedAnswers.map((item) =>
      resolveRoleplayTargetAnswer(item, scopedLesson.id)
    )
    const axis = inferRoleplayAxis(normalizedTargetAnswer, scopedLesson, index % 3)
    normalizedHint = buildRoleplayHint(axis, scopedLesson.id)
  }

  if (type === 'boss-challenge') {
    const needsRebuild =
      !prompt ||
      !bossChallengePromptHasContext(prompt) ||
      isTranslateStylePrompt(prompt)
    if (needsRebuild) {
      const rebuilt = buildReferencePromptFromLesson({
        lesson: scopedLesson,
        type: 'boss-challenge',
        stepIndex: mode === 'reference' ? index : 0,
        targetAnswer: normalizedTargetAnswer,
      })
      if (rebuilt) prompt = rebuilt
    }
    normalizedHint = undefined
  }

  if (!prompt) return null
  prompt = normalizePracticeEmDashes(prompt)
  if (type === 'dropdown-fill') {
    prompt = normalizeGapFillPrompt(prompt)
    if (!isDropdownFillPairAligned(prompt, normalizedTargetAnswer)) {
      const alignedTarget = resolveAlignedDropdownTarget(prompt, normalizedTargetAnswer)
      if (alignedTarget) {
        normalizedTargetAnswer = alignedTarget
        normalizedAcceptedAnswers = normalizedAcceptedAnswers.filter(
          (item) => item.trim().toLowerCase() === alignedTarget.toLowerCase()
        )
      } else {
        const dropdownSource = findLessonDropdownFillSourceForPractice(scopedLesson, index)
        if (!dropdownSource) return null
        const etalonTarget = dropdownSource.exercise.correctAnswer.trim()
        if (!etalonTarget) return null
        const rebuilt = buildDropdownFillPrompt(dropdownSource, scopedLesson, index)
        if (!rebuilt || !isDropdownFillPairAligned(rebuilt, etalonTarget)) return null
        prompt = rebuilt
        normalizedTargetAnswer = etalonTarget
        const etalonAccepted = canonicalAcceptedAnswersForExercise(dropdownSource.exercise)
        normalizedAcceptedAnswers = etalonAccepted.filter(
          (item) => item.trim().toLowerCase() !== etalonTarget.toLowerCase()
        )
      }
    }
  }
  if (type === 'choice' && !choicePromptHasContext(prompt)) return null
  if (type === 'listening-select' && !listeningSelectPromptHasContext(prompt)) return null
  if (type === 'error-fix') {
    const source = findLessonErrorFixSourceForPractice(scopedLesson, index)
    const pairOk = isErrorFixAiPairValid({
      prompt,
      targetAnswer: normalizedTargetAnswer,
      lessonId: scopedLesson.id,
    })
    if (!pairOk) {
      if (scopedLesson.id === '3') return null
      if (!source) return null
      const etalonTarget = source.exercise.correctAnswer.trim()
      if (!etalonTarget) return null
      const rebuilt = buildErrorFixPrompt(source, scopedLesson, index, etalonTarget)
      if (
        !rebuilt ||
        !isErrorFixAiPairValid({
          prompt: rebuilt,
          targetAnswer: etalonTarget,
          lessonId: scopedLesson.id,
        })
      ) {
        return null
      }
      prompt = rebuilt
      normalizedTargetAnswer = etalonTarget
      const etalonAccepted = canonicalAcceptedAnswersForExercise(source.exercise)
      normalizedAcceptedAnswers = etalonAccepted.filter(
        (item) => item.trim().toLowerCase() !== etalonTarget.toLowerCase()
      )
    }
  }
  if (useReferencePromptBuilder) {
    const builder = getPracticePromptBuilder(referenceType)
    if (builder && !builder.hasContext(prompt)) return null
  }
  if (isTranslateBackedFreeResponse && !freeResponsePromptHasValidContext(prompt)) return null
  if (type === 'dropdown-fill' && useReferencePromptBuilder && !gapFillPromptHasValidContext(prompt)) return null

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
  const isDropdown = type === 'dropdown-fill'
  const gapSlot = isDropdown
    ? inferGapWordSlot({ targetAnswer: normalizedTargetAnswer, prompt })
    : undefined
  const dropdownTargetCount = isDropdown
    ? resolveDropdownOptionCount({
        slot: gapSlot ?? 'unknown',
        lesson: scopedLesson,
        mode,
        tier: normalizeOptions?.distractorTier,
      })
    : undefined
  const lessonChoiceOptions = isChoiceLikePracticeType(type)
    ? collectLessonChoicePool(scopedLesson, normalizedTargetAnswer, {
        sourceStepNumber: resolved?.sourceStepNumber,
        granularity,
        applyGapWordSlot: isDropdown,
        gapSlot,
        lesson: scopedLesson,
      })
    : undefined
  const buildParams = {
    granularity,
    canonicalOptions,
    sourceStepOptionCount: filteredCanonical.length,
    practiceType: type,
    prompt,
    lesson: scopedLesson,
    mode,
  }

  let choiceOptions = isChoiceLikePracticeType(type)
    ? normalizeOptions?.distractorTier
      ? buildTieredChoiceOptions(
          normalizedTargetAnswer,
          normalizeOptions.distractorTier,
          lessonChoiceOptions ?? rawOptions ?? [],
          buildParams
        )
      : ensurePracticeChoiceOptions(lessonChoiceOptions ?? rawOptions ?? [], normalizedTargetAnswer, {
          targetCount: isDropdown
            ? dropdownTargetCount
            : filteredCanonical.length >= 3
              ? 3
              : undefined,
        })
    : rawOptions && rawOptions.length >= 2
      ? rawOptions
      : undefined

  if (
    isDropdown &&
    choiceOptions &&
    !validateDropdownFillOptions({
      options: choiceOptions,
      targetAnswer: normalizedTargetAnswer,
      prompt,
      slot: gapSlot,
      targetCount: dropdownTargetCount,
    })
  ) {
    choiceOptions = buildTieredChoiceOptions(
      normalizedTargetAnswer,
      normalizeOptions?.distractorTier ?? 'semantic-near',
      lessonChoiceOptions ?? [],
      buildParams
    )
  }

  if (isChoiceLikePracticeType(type) && !choiceOptions) return null
  if (isDropdown && (!choiceOptions || choiceOptions.length < 3)) return null
  if (type === 'error-fix') choiceOptions = undefined

  const audioText =
    type === 'voice-shadow' || type === 'dictation' || type === 'listening-select'
      ? normalizedTargetAnswer
      : typeof source.audioText === 'string'
        ? source.audioText.trim()
        : undefined

  const bossAnchors =
    type === 'boss-challenge'
      ? resolveBossPatternAnchors({ lesson: scopedLesson, targetAnswer: normalizedTargetAnswer })
      : undefined

  const normalizedKeywords =
    isTranslateBackedFreeResponse
      ? undefined
      : type === 'boss-challenge'
        ? bossAnchors && bossAnchors.length > 0
          ? bossAnchors
          : undefined
        : type === 'roleplay-mini'
          ? extractRoleplayKeywords(normalizedTargetAnswer, scopedLesson)
          : keywords && keywords.length > 0
            ? keywords
            : type === 'free-response'
              ? extractSemanticKeywords(normalizedTargetAnswer)
              : undefined

  const tolerance =
    type === 'boss-challenge'
      ? 'soft'
      : isTranslateBackedFreeResponse && canonicalExercise
        ? canonicalExercise.answerPolicy === 'strict'
          ? 'strict'
          : 'normalized'
        : meta.tolerance

  const normalizedExtraWords =
    type === 'word-builder-pro'
      ? sanitizeWordBuilderProExtraWords({
          targetAnswer: normalizedTargetAnswer,
          candidates: extraWords,
          lesson: scopedLesson,
        })
      : extraWords && extraWords.length > 0
        ? extraWords
        : undefined

  const question: PracticeQuestion = {
    id: `ai-practice-${lesson.id}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    lessonId: lesson.id,
    type,
    prompt,
    targetAnswer: normalizedTargetAnswer,
    acceptedAnswers: Array.from(new Set([normalizedTargetAnswer, ...normalizedAcceptedAnswers])),
    options: choiceOptions,
    shuffledWords:
      normalizedShuffledWords && normalizedShuffledWords.length > 0 ? normalizedShuffledWords : undefined,
    extraWords: normalizedExtraWords,
    audioText,
    keywords: normalizedKeywords && normalizedKeywords.length > 0 ? normalizedKeywords : undefined,
    minWords:
      isTranslateBackedFreeResponse
        ? undefined
        : type === 'boss-challenge'
          ? 4
          : type === 'roleplay-mini'
            ? 2
            : typeof source.minWords === 'number' && source.minWords > 0
              ? Math.min(20, source.minWords)
              : undefined,
    hint: (() => {
      if (lesson.id === '3') return undefined
      const raw =
        type === 'voice-shadow' ||
        type === 'dictation' ||
        type === 'listening-select' ||
        type === 'error-fix' ||
        type === 'boss-challenge'
          ? undefined
          : type === 'word-builder-pro' && resolved?.exercise
            ? stripAnswerLeakFromHint(
                resolveWordBuilderProHint({
                  targetAnswer: normalizedTargetAnswer,
                  lesson: scopedLesson,
                  exercise: resolved.exercise,
                  variantHint: puzzleSlice?.hint ?? normalizedHint,
                  matchedVariant: puzzleSlice?.matchedVariant,
                }),
                normalizedTargetAnswer
              )
            : type === 'dropdown-fill'
              ? sanitizeDropdownHint(stripAnswerLeakFromHint(normalizedHint, normalizedTargetAnswer))
              : stripAnswerLeakFromHint(normalizedHint, normalizedTargetAnswer)
      return isRecipeAnswerHint(raw) ? undefined : raw
    })(),
    explanation: typeof source.explanation === 'string' ? source.explanation.trim() : undefined,
    correctionPrompt: `Закрепим правильный вариант: ${normalizeEnglishLearnerContractions(normalizedTargetAnswer)}`,
    xpBase: meta.xpBase,
    difficulty: meta.difficulty,
    tolerance,
    requireExactTarget: type === 'roleplay-mini' && mode === 'challenge' && index === 9 ? true : undefined,
  }

  if (
    !isLesson3EmbeddedAiQuestionValid({
      lessonId: lesson.id,
      type,
      prompt: question.prompt,
      targetAnswer: question.targetAnswer,
    })
  ) {
    return null
  }

  return question
}
