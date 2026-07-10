import { lessonForPracticeStep } from '@/lib/practice/buildPracticeDiversity'
import { buildChoicePrompt, choicePromptHasContext } from '@/lib/practice/buildChoicePrompt'
import { buildWordBuilderProPrompt } from '@/lib/practice/prompt/buildWordBuilderProPrompt'
import { resolveWordBuilderProHint } from '@/lib/practice/prompt/resolveWordBuilderProHint'
import { buildVoiceShadowPrompt } from '@/lib/practice/buildVoiceShadowPrompt'
import { inferChoiceGranularity, filterByChoiceGranularity } from '@/lib/practice/choiceOptionGranularity'
import { buildWordBuilderProExtraWords } from '@/lib/practice/buildWordBuilderProTraps'
import { buildTieredChoiceOptions } from '@/lib/practice/distractorTier'
import { ensurePracticeChoiceOptions, isChoiceLikePracticeType } from '@/lib/practice/ensurePracticeChoiceOptions'
import {
  getPracticeStepSpec,
  resolveTierForStep,
  usesPracticeStepSpec,
} from '@/lib/practice/engine/stepSpec'
import { collectLessonChoicePool } from '@/lib/practice/lessonChoicePool'
import { getPracticeModePlan } from '@/lib/practice/engine/sessionPlan'
import { getPracticeExerciseMetadata } from '@/lib/practice/registry'
import {
  buildReferencePromptFromLesson,
  isReferenceStepMapType,
} from '@/lib/practice/prompt/practicePromptBuilders'
import { resolveDropdownOptionCount } from '@/lib/practice/dropdownOptionCount'
import { inferGapWordSlot } from '@/lib/practice/gapWordSlot'
import { sanitizeDropdownHint } from '@/lib/practice/prompt/dropdownFillPromptFormat'
import {
  isDropdownFillPairAligned,
  resolveAlignedDropdownTarget,
} from '@/lib/practice/prompt/dropdownFillPairAlign'
import {
  buildDropdownFillPrompt,
  findLessonDropdownFillSourceForPractice,
} from '@/lib/practice/prompt/buildDropdownFillPrompt'
import { buildDictationPrompt } from '@/lib/practice/prompt/buildDictationPrompt'
import {
  buildErrorFixPrompt,
  findLessonErrorFixSourceForPractice,
  resolveErrorFixTargetAnswer,
} from '@/lib/practice/prompt/buildErrorFixPrompt'
import { buildRoleplayPrompt, roleplayPromptHasContext } from '@/lib/practice/prompt/buildRoleplayPrompt'
import {
  buildRoleplayHint,
  extractRoleplayKeywords,
  inferRoleplayAxis,
  resolveRoleplayTargetAnswer,
} from '@/lib/practice/prompt/roleplayPromptEngine'
import {
  buildRoleplayPromptFromAnchor,
  collectPriorSessionPhrases,
  selectRoleplayAnchor,
} from '@/lib/practice/roleplaySessionContinuity'
import { isTranslateBackedFreeResponseExercise } from '@/lib/practice/prompt/freeResponseTranslateMode'
import { resolveBossPatternAnchors } from '@/lib/practice/bossChallengeAnswerValidation'
import { extractSemanticKeywords, normalizePracticeEmDashes, stripAnswerLeakFromHint } from '@/lib/practice/prompt/promptSourceUtils'
import { resolveLessonExerciseVariant } from '@/lib/practice/resolveLessonExerciseVariant'
import {
  resolvePracticeLessonStep,
  type ResolvedPracticeLessonStep,
} from '@/lib/practice/resolvePracticeLessonStep'
import { resolvePracticeSentencePuzzleSlice } from '@/lib/practice/resolvePracticeSentencePuzzleSlice'
import { tokensFromTargetAnswer } from '@/lib/practice/rebuildPracticeWordTokensFromAnswer'
import type { Exercise, LessonData, LessonStep } from '@/types/lesson'
import type {
  PracticeBuildConfig,
  PracticeExerciseType,
  PracticeLevel,
  PracticeMode,
  PracticeQuestion,
  PracticeSession,
  PracticeTolerance,
} from '@/types/practice'

const PRACTICE_SESSION_VERSION = 1

function toPracticeLevel(level: LessonData['level']): PracticeLevel {
  if (level === 'A1' || level === 'A2' || level === 'B1' || level === 'B2' || level === 'C1') return level
  return 'A2'
}

function cloneOptions(options: string[] | undefined): string[] | undefined {
  return options && options.length > 0 ? [...options] : undefined
}

function optionsForType(
  type: PracticeExerciseType,
  exercise: Exercise,
  targetAnswer: string,
  lesson: LessonData,
  mode: PracticeMode,
  tier?: ReturnType<typeof resolveTierForStep>,
  resolvedStep?: ResolvedPracticeLessonStep
): string[] | undefined {
  if (type === 'error-fix') return undefined
  if (!isChoiceLikePracticeType(type)) {
    return cloneOptions(exercise.options)
  }

  const granularity = inferChoiceGranularity({
    targetAnswer,
    answerFormat: exercise.answerFormat,
    prompt: exercise.question,
    exerciseType: exercise.type,
  })
  const canonicalOptions = resolvedStep?.canonicalOptions ?? []
  const filteredCanonical = filterByChoiceGranularity(canonicalOptions, granularity)
  const isDropdown = type === 'dropdown-fill'
  const gapSlot = isDropdown
    ? inferGapWordSlot({ targetAnswer, prompt: exercise.question })
    : undefined
  const lessonPool = collectLessonChoicePool(lesson, targetAnswer, {
    sourceStepNumber: resolvedStep?.sourceStepNumber,
    granularity,
    applyGapWordSlot: isDropdown,
    gapSlot,
    lesson,
  })
  const buildParams = {
    granularity,
    canonicalOptions,
    sourceStepOptionCount: filteredCanonical.length,
    practiceType: type,
    prompt: exercise.question,
    lesson,
    mode,
  }

  if (tier) {
    return buildTieredChoiceOptions(targetAnswer, tier, lessonPool, buildParams)
  }

  const targetCount = isDropdown
    ? resolveDropdownOptionCount({ slot: gapSlot ?? 'unknown', lesson, mode, tier })
    : filteredCanonical.length >= 3
      ? 3
      : undefined

  return ensurePracticeChoiceOptions(lessonPool.length > 0 ? lessonPool : exercise.options, targetAnswer, {
    targetCount,
  })
}
function shuffleWordTokens(tokens: string[]): string[] {
  if (tokens.length === 0) return []
  const copy = [...tokens]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = copy[i]!
    copy[i] = copy[j]!
    copy[j] = tmp
  }
  return copy
}

function shuffledWordBankFromTokens(tokens: string[]): string[] {
  return shuffleWordTokens(tokens)
}

function acceptedAnswersFor(exercise: Exercise): string[] {
  return Array.from(new Set([exercise.correctAnswer, ...(exercise.acceptedAnswers ?? [])].map((item) => item.trim()).filter(Boolean)))
}

function toleranceFor(exercise: Exercise, type: PracticeExerciseType): PracticeTolerance {
  if (type === 'free-response' && isTranslateBackedFreeResponseExercise(exercise)) {
    return exercise.answerPolicy === 'strict' ? 'strict' : 'normalized'
  }
  if (type === 'free-response' || type === 'roleplay-mini' || type === 'boss-challenge' || type === 'voice-shadow') {
    return 'soft'
  }
  if (type === 'error-fix') return 'normalized'
  if (exercise.answerPolicy === 'strict' || exercise.answerFormat === 'choice' || type === 'choice') return 'strict'
  if (exercise.answerPolicy === 'normalized') return 'normalized'
  return getPracticeExerciseMetadata(type).tolerance
}

function createQuestion(params: {
  lesson: LessonData
  step: LessonStep
  exercise: Exercise
  type: PracticeExerciseType
  index: number
  mode: PracticeMode
  variantIndex?: number
  stepSpec?: ReturnType<typeof getPracticeStepSpec>
  resolvedStep?: ResolvedPracticeLessonStep
  priorQuestions?: PracticeQuestion[]
}): PracticeQuestion {
  const meta = getPracticeExerciseMetadata(params.type)
  const isPuzzlePracticeType =
    params.type === 'sentence-surgery' || params.type === 'word-builder-pro'
  const puzzleSlice =
    isPuzzlePracticeType ? resolvePracticeSentencePuzzleSlice(params.exercise) : null
  let acceptedAnswers = acceptedAnswersFor(params.exercise)
  let targetAnswer = acceptedAnswers[0] ?? params.exercise.correctAnswer
  const tier = params.stepSpec?.distractorTier
    ? resolveTierForStep(params.mode, params.stepSpec)
    : undefined
  const isVoiceShadow = params.type === 'voice-shadow'
  const isDictation = params.type === 'dictation'
  const isListeningSelect = params.type === 'listening-select'
  const isErrorFix = params.type === 'error-fix'
  const useEtalonPromptBuilder =
    isReferenceStepMapType(params.type) &&
    (params.mode === 'reference' || params.stepSpec?.type === params.type)
  const granularity = inferChoiceGranularity({
    targetAnswer,
    answerFormat: params.exercise.answerFormat,
    prompt: params.exercise.question,
    exerciseType: params.exercise.type,
  })
  let prompt = isVoiceShadow
    ? buildVoiceShadowPrompt(params.step, params.exercise, params.lesson)
    : isDictation
      ? (() => {
          const source = {
            step: params.step,
            exercise: params.exercise,
            sourceStepNumber: params.step.stepNumber,
          }
          return buildDictationPrompt(source, params.lesson, params.index, targetAnswer)
        })()
      : params.type === 'choice' || params.exercise.answerFormat === 'choice'
      ? buildChoicePrompt(params.step, params.exercise, params.lesson)
      : params.exercise.question?.trim() || params.step.bubbles.at(-1)?.content || 'Ответьте по теме урока.'
  if (
    params.type === 'context-clue' &&
    granularity === 'sentence' &&
    !choicePromptHasContext(prompt) &&
    (params.exercise.answerFormat === 'choice' || params.exercise.type === 'fill_choice')
  ) {
    prompt = buildChoicePrompt(params.step, params.exercise, params.lesson)
  }
  if (puzzleSlice) {
    targetAnswer = puzzleSlice.targetAnswer
    acceptedAnswers = puzzleSlice.acceptedAnswers
    prompt = puzzleSlice.prompt
  } else if (useEtalonPromptBuilder) {
    const built = buildReferencePromptFromLesson({
      lesson: params.lesson,
      type: params.type,
      stepIndex: params.mode === 'reference' ? params.index : 0,
      targetAnswer,
    })
    if (built) prompt = built
  }
  if (params.type === 'word-builder-pro' && puzzleSlice) {
    prompt = buildWordBuilderProPrompt({
      step: params.step,
      exercise: params.exercise,
      lesson: params.lesson,
      puzzlePrompt: puzzleSlice.prompt,
      stepIndex: params.index,
      targetAnswer,
      matchedVariant: puzzleSlice.matchedVariant,
    })
  }

  if (isErrorFix) {
    const source = findLessonErrorFixSourceForPractice(params.lesson, params.index)
    if (source) {
      targetAnswer = resolveErrorFixTargetAnswer(source, params.lesson, params.index, targetAnswer)
      acceptedAnswers = Array.from(
        new Set([
          targetAnswer,
          ...acceptedAnswers.filter(
            (item) => item.trim().toLowerCase() !== targetAnswer.trim().toLowerCase()
          ),
        ])
      )
      const built = buildErrorFixPrompt(source, params.lesson, params.index, targetAnswer)
      if (built) {
        prompt = built
      }
    }
  }

  if (params.type === 'roleplay-mini') {
    targetAnswer = resolveRoleplayTargetAnswer(targetAnswer, params.lesson.id)
    acceptedAnswers = acceptedAnswers
      .map((item) => resolveRoleplayTargetAnswer(item, params.lesson.id))
      .filter(Boolean)
    if (params.mode === 'challenge' && params.index === 9 && params.priorQuestions?.length) {
      const priorPhrases = collectPriorSessionPhrases(params.priorQuestions, params.index)
      const anchor = selectRoleplayAnchor(priorPhrases)
      if (anchor) {
        const anchorQuestion = params.priorQuestions[anchor.stepIndex]
        targetAnswer = anchor.targetAnswer
        if (anchorQuestion) {
          acceptedAnswers = Array.from(
            new Set([
              anchor.targetAnswer,
              anchorQuestion.targetAnswer,
              ...(anchorQuestion.acceptedAnswers ?? []),
            ])
          )
            .map((item) => item.trim())
            .filter(Boolean)
        }
        prompt = buildRoleplayPromptFromAnchor(anchor, params.lesson)
      }
    }
    if (!roleplayPromptHasContext(prompt)) {
      const built = buildReferencePromptFromLesson({
        lesson: params.lesson,
        type: 'roleplay-mini',
        stepIndex: params.mode === 'reference' ? params.index : 0,
        targetAnswer,
      })
      if (built) prompt = built
    }
  }

  if (params.type === 'boss-challenge') {
    const built = buildReferencePromptFromLesson({
      lesson: params.lesson,
      type: 'boss-challenge',
      stepIndex: params.mode === 'reference' ? params.index : 0,
      targetAnswer,
    })
    if (built) prompt = built
  }

  prompt = normalizePracticeEmDashes(prompt)
  if (params.type === 'dropdown-fill' && !isDropdownFillPairAligned(prompt, targetAnswer)) {
    const alignedTarget = resolveAlignedDropdownTarget(prompt, targetAnswer)
    if (alignedTarget) {
      targetAnswer = alignedTarget
      acceptedAnswers = acceptedAnswers.filter(
        (item) => item.trim().toLowerCase() === alignedTarget.toLowerCase()
      )
      if (!acceptedAnswers.includes(alignedTarget)) acceptedAnswers = [alignedTarget]
    } else {
      const dropdownSource = findLessonDropdownFillSourceForPractice(params.lesson, params.index)
      if (dropdownSource) {
        const etalonTarget = dropdownSource.exercise.correctAnswer.trim()
        const rebuilt = buildDropdownFillPrompt(dropdownSource, params.lesson, params.index)
        if (rebuilt && etalonTarget && isDropdownFillPairAligned(rebuilt, etalonTarget)) {
          prompt = rebuilt
          targetAnswer = etalonTarget
          acceptedAnswers = [etalonTarget]
        }
      }
    }
  }

  const roleplayAxis =
    params.type === 'roleplay-mini'
      ? inferRoleplayAxis(targetAnswer, params.lesson, params.variantIndex)
      : undefined
  const roleplayHint =
    params.type === 'roleplay-mini' && roleplayAxis
      ? buildRoleplayHint(roleplayAxis, params.lesson.id)
      : undefined
  const roleplayKeywords =
    params.type === 'roleplay-mini' ? extractRoleplayKeywords(targetAnswer, params.lesson) : undefined
  const variantSuffix = params.variantIndex != null ? `-v${params.variantIndex}` : ''
  const extraWords =
    params.type === 'word-builder-pro'
      ? buildWordBuilderProExtraWords(targetAnswer, params.lesson)
      : undefined

  const isTranslateBackedFreeResponse =
    params.type === 'free-response' && isTranslateBackedFreeResponseExercise(params.exercise)
  const isBossChallenge = params.type === 'boss-challenge'
  const bossKeywords = isBossChallenge
    ? resolveBossPatternAnchors({ lesson: params.lesson, targetAnswer })
    : undefined

  return {
    id: `${params.lesson.id}-${params.step.stepNumber}-${params.type}-${params.index}${variantSuffix}`,
    lessonId: params.lesson.id,
    type: params.type,
    prompt,
    targetAnswer,
    acceptedAnswers,
    options: optionsForType(params.type, params.exercise, targetAnswer, params.lesson, params.mode, tier, params.resolvedStep),
    shuffledWords: isPuzzlePracticeType
      ? shuffledWordBankFromTokens(
          puzzleSlice?.wordTokens ?? tokensFromTargetAnswer(targetAnswer)
        )
      : undefined,
    extraWords,
    audioText:
      params.type === 'dictation' || params.type === 'listening-select' || params.type === 'voice-shadow'
        ? targetAnswer
        : undefined,
    keywords:
      isTranslateBackedFreeResponse
        ? undefined
        : isBossChallenge
          ? bossKeywords && bossKeywords.length > 0
            ? bossKeywords
            : undefined
          : params.type === 'free-response'
            ? useEtalonPromptBuilder
              ? extractSemanticKeywords(targetAnswer)
              : targetAnswer.split(/\s+/).slice(0, 3)
            : params.type === 'roleplay-mini'
              ? roleplayKeywords
              : undefined,
    minWords:
      isBossChallenge
        ? 4
        : isTranslateBackedFreeResponse
          ? undefined
          : params.type === 'free-response'
            ? 3
            : params.type === 'roleplay-mini'
              ? 2
              : undefined,
    hint: isVoiceShadow || isDictation || isListeningSelect || isErrorFix || isBossChallenge
      ? undefined
      : params.type === 'roleplay-mini'
        ? roleplayHint
        : params.type === 'word-builder-pro' && puzzleSlice
        ? stripAnswerLeakFromHint(
            resolveWordBuilderProHint({
              targetAnswer,
              lesson: params.lesson,
              exercise: params.exercise,
              variantHint: puzzleSlice.hint,
              matchedVariant: puzzleSlice.matchedVariant,
            }),
            targetAnswer
          )
        : params.type === 'dropdown-fill'
          ? sanitizeDropdownHint(
              stripAnswerLeakFromHint(puzzleSlice?.hint ?? params.exercise.hint, targetAnswer)
            )
          : stripAnswerLeakFromHint(puzzleSlice?.hint ?? params.exercise.hint, targetAnswer),
    explanation: params.step.footerDynamic,
    correctionPrompt: `Закрепим правильный вариант: ${targetAnswer}`,
    xpBase: meta.xpBase,
    difficulty: meta.difficulty,
    tolerance: toleranceFor(params.exercise, params.type),
    requireExactTarget:
      params.type === 'roleplay-mini' && params.mode === 'challenge' && params.index === 9
        ? true
        : undefined,
  }
}

function mapExerciseType(exercise: Exercise, preferred?: PracticeExerciseType): PracticeExerciseType {
  if (preferred === 'boss-challenge') return 'boss-challenge'
  if (preferred === 'voice-shadow') return 'voice-shadow'
  if (preferred === 'listening-select') return 'listening-select'
  if (preferred === 'dictation') return 'dictation'
  if (preferred === 'roleplay-mini') return 'roleplay-mini'
  if (preferred === 'word-builder-pro') return 'word-builder-pro'
  if (preferred === 'error-fix') return 'error-fix'
  if (preferred === 'context-clue') return 'context-clue'
  if (preferred === 'sentence-surgery') return 'sentence-surgery'
  if (preferred === 'dropdown-fill') return 'dropdown-fill'
  if (preferred === 'free-response') return 'free-response'
  if (exercise.options?.length) return 'choice'
  if (exercise.type === 'sentence_puzzle') return 'sentence-surgery'
  return 'free-response'
}

function getExerciseSteps(lesson: LessonData): Array<{ step: LessonStep; exercise: Exercise }> {
  return lesson.steps
    .filter((step) => step.stepType !== 'completion' && step.exercise)
    .map((step) => ({ step, exercise: step.exercise as Exercise }))
}

function resolveExerciseForIndex(
  lesson: LessonData,
  sourceSteps: Array<{ step: LessonStep; exercise: Exercise }>,
  index: number,
  mode: PracticeBuildConfig['mode']
): { step: LessonStep; exercise: Exercise; variantIndex?: number; scopedLesson: LessonData } {
  const scopedLesson = mode === 'reference' ? lessonForPracticeStep(lesson, index) : lesson
  const stepsForIndex = mode === 'reference' ? getExerciseSteps(scopedLesson) : sourceSteps
  const source = stepsForIndex[0] ?? sourceSteps[index % sourceSteps.length]!
  const variantCount = source.exercise.variants?.length ?? 0
  const variantIndex = variantCount > 0 ? index % variantCount : 0
  const exercise = variantCount > 0 ? resolveLessonExerciseVariant(source.exercise, variantIndex) : source.exercise
  return {
    step: source.step,
    exercise,
    variantIndex: variantCount > 0 ? variantIndex : undefined,
    scopedLesson,
  }
}

function resolvePreferredType(mode: PracticeMode, index: number, planLength: number, boss: boolean): PracticeExerciseType | undefined {
  if (mode === 'reference') return undefined
  const stepSpec = getPracticeStepSpec(mode, index)
  if (stepSpec) return stepSpec.type
  if (boss && index === planLength - 1) return 'boss-challenge'
  return undefined
}

function buildQuestions(lesson: LessonData, mode: PracticeBuildConfig['mode']): PracticeQuestion[] {
  const plan = getPracticeModePlan(mode)
  const sourceSteps = getExerciseSteps(lesson)
  if (sourceSteps.length === 0) return []

  const questions: PracticeQuestion[] = []
  for (let index = 0; index < plan.length; index += 1) {
    const stepSpec = usesPracticeStepSpec(mode) ? getPracticeStepSpec(mode, index) ?? undefined : undefined
    const preferredType = resolvePreferredType(mode, index, plan.length, plan.boss)
    const fallbackResolved = resolveExerciseForIndex(lesson, sourceSteps, index, mode)

    let type = mapExerciseType(fallbackResolved.exercise, preferredType)
    if (preferredType === 'voice-shadow' && mode === 'challenge' && index === 1) {
      type = 'voice-shadow'
    }

    const finalType =
      usesPracticeStepSpec(mode) || stepSpec
        ? type
        : (() => {
            const previous = questions.at(-1)
            return previous?.type === type && fallbackResolved.exercise.options?.length ? 'choice' : type
          })()

    const resolved =
      mode === 'reference'
        ? resolvePracticeLessonStep({
            lesson: fallbackResolved.scopedLesson,
            practiceIndex: index,
            practiceType: finalType,
            mode,
            referenceExerciseType: finalType,
          })
        : resolvePracticeLessonStep({
            lesson,
            practiceIndex: index,
            practiceType: finalType,
            mode,
          })

    if (!resolved) continue

    questions.push(
      createQuestion({
        lesson: fallbackResolved.scopedLesson,
        step: resolved.step,
        exercise: resolved.exercise,
        type: finalType,
        index,
        mode,
        variantIndex: resolved.variantIndex ?? fallbackResolved.variantIndex,
        stepSpec,
        resolvedStep: resolved,
        priorQuestions: index === 9 && mode === 'challenge' ? questions : undefined,
      })
    )
  }

  return questions
}

function createPracticeSession(config: PracticeBuildConfig, questions: PracticeQuestion[]): PracticeSession {
  const now = Date.now()
  return {
    id: `practice-${config.lesson.id}-${now}-${Math.random().toString(36).slice(2, 8)}`,
    lessonId: config.lesson.id,
    topic: config.lesson.topic,
    level: toPracticeLevel(config.lesson.level),
    mode: config.mode,
    entrySource: config.entrySource,
    generationSource: config.generationSource ?? 'local',
    source: config.source,
    status: 'active',
    questions,
    currentIndex: 0,
    answers: [],
    score: 0,
    xp: 0,
    streak: 0,
    startedAt: now,
    version: PRACTICE_SESSION_VERSION,
    targetQuestionCount: config.targetQuestionCount ?? questions.length,
    wrongAttemptsOnCurrentQuestion: 0,
    instructionAcknowledged: false,
    generationNotice: config.generationNotice,
  }
}

export function buildPracticeSessionFromQuestions(config: PracticeBuildConfig, questions: PracticeQuestion[]): PracticeSession {
  return createPracticeSession(config, questions)
}

export function buildLocalPracticeSession(config: PracticeBuildConfig): PracticeSession {
  return createPracticeSession(config, buildQuestions(config.lesson, config.mode))
}

export function buildSinglePracticeQuestion(params: {
  lesson: LessonData
  type: PracticeExerciseType
  questionIndex?: number
  mode?: PracticeMode
  referenceExerciseType?: PracticeExerciseType
}): PracticeQuestion | null {
  const index = params.questionIndex ?? 0
  const mode = params.mode ?? 'challenge'
  const lesson = mode === 'reference' ? lessonForPracticeStep(params.lesson, index) : params.lesson
  const resolved = resolvePracticeLessonStep({
    lesson,
    practiceIndex: index,
    practiceType: params.type,
    mode,
    referenceExerciseType: params.referenceExerciseType ?? (mode === 'reference' ? params.type : undefined),
  })
  if (!resolved) return null
  const stepSpec = usesPracticeStepSpec(mode) ? getPracticeStepSpec(mode, index) ?? undefined : undefined
  return createQuestion({
    lesson,
    step: resolved.step,
    exercise: resolved.exercise,
    type: params.type,
    index,
    mode,
    variantIndex: resolved.variantIndex,
    stepSpec: stepSpec?.type === params.type ? stepSpec : undefined,
    resolvedStep: resolved,
  })
}

