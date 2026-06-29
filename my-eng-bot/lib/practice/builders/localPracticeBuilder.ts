import { buildChoicePrompt } from '@/lib/practice/buildChoicePrompt'
import { buildVoiceShadowPrompt } from '@/lib/practice/buildVoiceShadowPrompt'
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
import { resolveLessonExerciseVariant } from '@/lib/practice/resolveLessonExerciseVariant'
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
  tier?: ReturnType<typeof resolveTierForStep>
): string[] | undefined {
  if (!isChoiceLikePracticeType(type)) {
    return cloneOptions(exercise.options)
  }
  const lessonPool = collectLessonChoicePool(lesson, targetAnswer)
  if (tier) {
    return buildTieredChoiceOptions(targetAnswer, tier, lessonPool)
  }
  return ensurePracticeChoiceOptions(lessonPool.length > 0 ? lessonPool : exercise.options, targetAnswer)
}
function wordTokensInPedagogicalOrder(exercise: Exercise, targetAnswer: string): string[] {
  if (exercise.type === 'sentence_puzzle' && exercise.puzzleVariants?.[0]) {
    const variant = exercise.puzzleVariants[0]
    const order = variant.correctOrder.length > 0 ? variant.correctOrder : variant.words
    if (order.length > 0) return order.map((word) => word.trim()).filter(Boolean)
  }
  return targetAnswer
    .replace(/[.!?]$/g, '')
    .split(/\s+/)
    .filter(Boolean)
}

function shuffledWordBank(exercise: Exercise, targetAnswer: string): string[] {
  const tokens = wordTokensInPedagogicalOrder(exercise, targetAnswer)
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
}): PracticeQuestion {
  const meta = getPracticeExerciseMetadata(params.type)
  const acceptedAnswers = acceptedAnswersFor(params.exercise)
  const targetAnswer = acceptedAnswers[0] ?? params.exercise.correctAnswer
  const tier = params.stepSpec?.distractorTier
    ? resolveTierForStep(params.mode, params.stepSpec)
    : undefined
  const isVoiceShadow = params.type === 'voice-shadow'
  const prompt = isVoiceShadow
    ? buildVoiceShadowPrompt(params.step, params.exercise, params.lesson)
    : params.type === 'choice' || params.exercise.answerFormat === 'choice'
      ? buildChoicePrompt(params.step, params.exercise, params.lesson)
      : params.exercise.question?.trim() || params.step.bubbles.at(-1)?.content || 'Ответьте по теме урока.'
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
    options: optionsForType(params.type, params.exercise, targetAnswer, params.lesson, tier),
    shuffledWords:
      params.type === 'sentence-surgery' || params.type === 'word-builder-pro'
        ? shuffledWordBank(params.exercise, targetAnswer)
        : undefined,
    extraWords,
    audioText:
      params.type === 'dictation' || params.type === 'listening-select' || params.type === 'voice-shadow'
        ? targetAnswer
        : undefined,
    keywords:
      params.type === 'free-response' || params.type === 'roleplay-mini'
        ? targetAnswer.split(/\s+/).slice(0, 3)
        : undefined,
    minWords:
      params.type === 'boss-challenge'
        ? 5
        : params.type === 'free-response' || params.type === 'roleplay-mini'
          ? 3
          : undefined,
    hint: isVoiceShadow ? undefined : params.exercise.hint,
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
  sourceSteps: Array<{ step: LessonStep; exercise: Exercise }>,
  index: number,
  mode: PracticeBuildConfig['mode']
): { step: LessonStep; exercise: Exercise; variantIndex?: number } {
  const source = mode === 'reference' ? sourceSteps[0]! : sourceSteps[index % sourceSteps.length]!
  const variantCount = source.exercise.variants?.length ?? 0
  const variantIndex = variantCount > 0 ? index % variantCount : 0
  const exercise = variantCount > 0 ? resolveLessonExerciseVariant(source.exercise, variantIndex) : source.exercise
  return { step: source.step, exercise, variantIndex: variantCount > 0 ? variantIndex : undefined }
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
    const resolved = resolveExerciseForIndex(sourceSteps, index, mode)
    const preferredType = resolvePreferredType(mode, index, plan.length, plan.boss)
    let type = mapExerciseType(resolved.exercise, preferredType)

    if (preferredType === 'voice-shadow' && mode === 'challenge' && index === 1) {
      type = 'voice-shadow'
    }

    const stepSpec = usesPracticeStepSpec(mode) ? getPracticeStepSpec(mode, index) ?? undefined : undefined
    const finalType =
      usesPracticeStepSpec(mode) || stepSpec
        ? type
        : (() => {
            const previous = questions.at(-1)
            return previous?.type === type && resolved.exercise.options?.length ? 'choice' : type
          })()

    questions.push(
      createQuestion({
        lesson,
        step: resolved.step,
        exercise: resolved.exercise,
        type: finalType,
        index,
        mode,
        variantIndex: resolved.variantIndex,
        stepSpec,
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
}): PracticeQuestion | null {
  const sourceSteps = getExerciseSteps(params.lesson)
  if (sourceSteps.length === 0) return null
  const index = params.questionIndex ?? 0
  const mode = params.mode ?? 'challenge'
  const source = sourceSteps[index % sourceSteps.length]!
  const variantCount = source.exercise.variants?.length ?? 0
  const variantIndex = variantCount > 0 ? index % variantCount : 0
  const exercise = variantCount > 0 ? resolveLessonExerciseVariant(source.exercise, variantIndex) : source.exercise
  const stepSpec = usesPracticeStepSpec(mode) ? getPracticeStepSpec(mode, index) ?? undefined : undefined
  return createQuestion({
    lesson: params.lesson,
    step: source.step,
    exercise,
    type: params.type,
    index,
    mode,
    variantIndex: variantCount > 0 ? variantIndex : undefined,
    stepSpec: stepSpec?.type === params.type ? stepSpec : undefined,
  })
}

