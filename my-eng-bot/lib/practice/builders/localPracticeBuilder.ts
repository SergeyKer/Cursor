import { buildChoicePrompt } from '@/lib/practice/buildChoicePrompt'
import { ensurePracticeChoiceOptions } from '@/lib/practice/ensurePracticeChoiceOptions'
import { getPracticeExerciseMetadata } from '@/lib/practice/registry'
import { resolveLessonExerciseVariant } from '@/lib/practice/resolveLessonExerciseVariant'
import { getPracticeModePlan } from '@/lib/practice/engine/sessionPlan'
import type { Exercise, LessonData, LessonStep } from '@/types/lesson'
import type {
  PracticeBuildConfig,
  PracticeExerciseType,
  PracticeLevel,
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

function optionsForType(type: PracticeExerciseType, exercise: Exercise, targetAnswer: string): string[] | undefined {
  if (
    type === 'choice' ||
    type === 'dropdown-fill' ||
    type === 'listening-select' ||
    type === 'speed-round' ||
    type === 'context-clue'
  ) {
    return ensurePracticeChoiceOptions(exercise.options, targetAnswer)
  }
  return cloneOptions(exercise.options)
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
  variantIndex?: number
}): PracticeQuestion {
  const meta = getPracticeExerciseMetadata(params.type)
  const acceptedAnswers = acceptedAnswersFor(params.exercise)
  const targetAnswer = acceptedAnswers[0] ?? params.exercise.correctAnswer
  const prompt =
    params.type === 'choice' || params.exercise.answerFormat === 'choice'
      ? buildChoicePrompt(params.step, params.exercise, params.lesson)
      : params.exercise.question?.trim() || params.step.bubbles.at(-1)?.content || 'Ответьте по теме урока.'
  const variantSuffix = params.variantIndex != null ? `-v${params.variantIndex}` : ''
  return {
    id: `${params.lesson.id}-${params.step.stepNumber}-${params.type}-${params.index}${variantSuffix}`,
    lessonId: params.lesson.id,
    type: params.type,
    prompt,
    targetAnswer,
    acceptedAnswers,
    options: optionsForType(params.type, params.exercise, targetAnswer),
    shuffledWords:
      params.type === 'sentence-surgery' || params.type === 'word-builder-pro'
        ? shuffledWordBank(params.exercise, targetAnswer)
        : undefined,
    audioText: params.type === 'dictation' || params.type === 'listening-select' || params.type === 'voice-shadow' ? targetAnswer : undefined,
    keywords: params.type === 'free-response' || params.type === 'roleplay-mini' ? targetAnswer.split(/\s+/).slice(0, 3) : undefined,
    minWords: params.type === 'boss-challenge' ? 5 : params.type === 'free-response' || params.type === 'roleplay-mini' ? 3 : undefined,
    hint: params.exercise.hint,
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
  // Reference mode intentionally reuses the same source exercise in a cycle.
  const source = mode === 'reference' ? sourceSteps[0]! : sourceSteps[index % sourceSteps.length]!
  const variantCount = source.exercise.variants?.length ?? 0
  const variantIndex = variantCount > 0 ? index % variantCount : 0
  const exercise = variantCount > 0 ? resolveLessonExerciseVariant(source.exercise, variantIndex) : source.exercise
  return { step: source.step, exercise, variantIndex: variantCount > 0 ? variantIndex : undefined }
}

function buildQuestions(lesson: LessonData, mode: PracticeBuildConfig['mode']): PracticeQuestion[] {
  const plan = getPracticeModePlan(mode)
  const sourceSteps = getExerciseSteps(lesson)
  if (sourceSteps.length === 0) return []

  const questions: PracticeQuestion[] = []
  for (let index = 0; index < plan.length; index += 1) {
    const resolved = resolveExerciseForIndex(sourceSteps, index, mode)
    const preferredType =
      mode === 'reference'
        ? undefined
        : plan.boss && index === plan.length - 1
          ? 'boss-challenge'
          : plan.types[index % plan.types.length]
    const type = mapExerciseType(resolved.exercise, preferredType)
    const previous = questions.at(-1)
    const finalType = previous?.type === type && resolved.exercise.options?.length ? 'choice' : type
    questions.push(
      createQuestion({
        lesson,
        step: resolved.step,
        exercise: resolved.exercise,
        type: finalType,
        index,
        variantIndex: resolved.variantIndex,
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
