import { getPracticeExerciseMetadata } from '@/lib/practice/registry'
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

function ensureChoiceOptions(options: string[] | undefined, targetAnswer: string): string[] {
  const unique = Array.from(new Set([targetAnswer, ...(options ?? [])].map((item) => item.trim()).filter(Boolean)))
  if (unique.length >= 2) return unique
  return [targetAnswer, "I don't know yet"]
}

function optionsForType(type: PracticeExerciseType, exercise: Exercise, targetAnswer: string): string[] | undefined {
  if (
    type === 'choice' ||
    type === 'dropdown-fill' ||
    type === 'listening-select' ||
    type === 'speed-round' ||
    type === 'context-clue'
  ) {
    return ensureChoiceOptions(exercise.options, targetAnswer)
  }
  return cloneOptions(exercise.options)
}

function shuffleWords(text: string): string[] {
  return text
    .replace(/[.!?]$/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right))
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
}): PracticeQuestion {
  const meta = getPracticeExerciseMetadata(params.type)
  const acceptedAnswers = acceptedAnswersFor(params.exercise)
  const targetAnswer = acceptedAnswers[0] ?? params.exercise.correctAnswer
  const prompt = params.exercise.question?.trim() || params.step.bubbles.at(-1)?.content || 'Ответьте по теме урока.'
  return {
    id: `${params.lesson.id}-${params.step.stepNumber}-${params.type}-${params.index}`,
    lessonId: params.lesson.id,
    type: params.type,
    prompt,
    targetAnswer,
    acceptedAnswers,
    options: optionsForType(params.type, params.exercise, targetAnswer),
    shuffledWords: params.type === 'sentence-surgery' || params.type === 'word-builder-pro' ? shuffleWords(targetAnswer) : undefined,
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

function mapExerciseType(exercise: Exercise, preferred: PracticeExerciseType): PracticeExerciseType {
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

function buildQuestions(lesson: LessonData, mode: PracticeBuildConfig['mode']): PracticeQuestion[] {
  const plan = getPracticeModePlan(mode)
  const sourceSteps = getExerciseSteps(lesson)
  if (sourceSteps.length === 0) return []

  const questions: PracticeQuestion[] = []
  let sourceIndex = 0
  for (let index = 0; index < plan.length; index += 1) {
    const source = sourceSteps[sourceIndex % sourceSteps.length]
    const preferredType = plan.boss && index === plan.length - 1 ? 'boss-challenge' : plan.types[index % plan.types.length]
    const type = mapExerciseType(source.exercise, preferredType)
    const previous = questions.at(-1)
    const finalType = previous?.type === type && source.exercise.options?.length ? 'choice' : type
    questions.push(createQuestion({ lesson, step: source.step, exercise: source.exercise, type: finalType, index }))
    sourceIndex += 1
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
  }
}

export function buildPracticeSessionFromQuestions(config: PracticeBuildConfig, questions: PracticeQuestion[]): PracticeSession {
  return createPracticeSession(config, questions)
}

export function buildLocalPracticeSession(config: PracticeBuildConfig): PracticeSession {
  return createPracticeSession(config, buildQuestions(config.lesson, config.mode))
}
