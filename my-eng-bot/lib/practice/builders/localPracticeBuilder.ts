import { lessonForPracticeStep } from '@/lib/practice/buildPracticeDiversity'
import { buildChoicePrompt, choicePromptHasContext } from '@/lib/practice/buildChoicePrompt'
import { buildVoiceShadowPrompt } from '@/lib/practice/buildVoiceShadowPrompt'
import { inferChoiceGranularity, filterByChoiceGranularity } from '@/lib/practice/choiceOptionGranularity'
import { buildTieredChoiceOptions, buildWordBankExtraWords } from '@/lib/practice/distractorTier'
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
import { extractSemanticKeywords, stripAnswerLeakFromHint } from '@/lib/practice/prompt/promptSourceUtils'
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
  tier?: ReturnType<typeof resolveTierForStep>,
  resolvedStep?: ResolvedPracticeLessonStep
): string[] | undefined {
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
  const lessonPool = collectLessonChoicePool(lesson, targetAnswer, {
    sourceStepNumber: resolvedStep?.sourceStepNumber,
    granularity,
  })
  const buildParams = {
    granularity,
    canonicalOptions,
    sourceStepOptionCount: filteredCanonical.length,
  }

  if (tier) {
    return buildTieredChoiceOptions(targetAnswer, tier, lessonPool, buildParams)
  }
  return ensurePracticeChoiceOptions(lessonPool.length > 0 ? lessonPool : exercise.options, targetAnswer, {
    targetCount: filteredCanonical.length >= 3 ? 3 : undefined,
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
  if (type === 'free-response' || type === 'roleplay-mini' || type === 'boss-challenge' || type === 'voice-shadow') {
    return 'soft'
  }
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
      stepIndex: params.index,
      targetAnswer,
    })
    if (built) prompt = built
  }
  const variantSuffix = params.variantIndex != null ? `-v${params.variantIndex}` : ''
  const extraWords =
    params.type === 'word-builder-pro' && params.stepSpec?.wordBankMode
      ? buildWordBankExtraWords(targetAnswer, params.stepSpec.wordBankMode)
      : undefined

  return {
    id: `${params.lesson.id}-${params.step.stepNumber}-${params.type}-${params.index}${variantSuffix}`,
    lessonId: params.lesson.id,
    type: params.type,
    prompt,
    targetAnswer,
    acceptedAnswers,
    options: optionsForType(params.type, params.exercise, targetAnswer, params.lesson, tier, params.resolvedStep),
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
      params.type === 'free-response' || params.type === 'roleplay-mini' || params.type === 'boss-challenge'
        ? useEtalonPromptBuilder
          ? extractSemanticKeywords(targetAnswer)
          : targetAnswer.split(/\s+/).slice(0, 3)
        : undefined,
    minWords:
      params.type === 'boss-challenge'
        ? 5
        : params.type === 'free-response' || params.type === 'roleplay-mini'
          ? 3
          : undefined,
    hint: isVoiceShadow
      ? undefined
      : stripAnswerLeakFromHint(puzzleSlice?.hint ?? params.exercise.hint, targetAnswer),
    explanation: params.step.footerDynamic,
    correctionPrompt: `Закрепим правильный вариант: ${targetAnswer}`,
    xpBase: meta.xpBase,
    difficulty: meta.difficulty,
    tolerance: toleranceFor(params.exercise, params.type),
  }
}

function mapExerciseType(exercise: Exercise, preferred?: PracticeExerciseType): PracticeExerciseType {
  if (preferred === 'boss-challenge') return 'boss-challenge'
  if (preferred === 'voice-shadow') return 'voice-shadow'
  if (preferred === 'listening-select') return 'listening-select'
  if (preferred === 'dictation') return 'dictation'
  if (preferred === 'roleplay-mini') return 'roleplay-mini'
  if (preferred === 'word-builder-pro') return 'word-builder-pro'
  if (preferred === 'speed-round') return 'speed-round'
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

