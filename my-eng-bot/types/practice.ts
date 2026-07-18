import type { LessonData } from '@/types/lesson'
import type { TutorLearningIntent } from '@/lib/tutorLearningIntent'

export type PracticeMode = 'relaxed' | 'balanced' | 'challenge' | 'reference'

export type PracticeExerciseType =
  | 'choice'
  | 'voice-shadow'
  | 'dropdown-fill'
  | 'listening-select'
  | 'sentence-surgery'
  | 'free-response'
  | 'word-builder-pro'
  | 'dictation'
  | 'roleplay-mini'
  | 'boss-challenge'
  | 'error-fix'
  | 'context-clue'

export type PracticeSkill = 'grammar' | 'vocabulary' | 'listening' | 'speaking' | 'pronunciation'
export type PracticeLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
export type PracticeTolerance = 'strict' | 'normalized' | 'soft'

export type PracticeEntrySource =
  | 'menu'
  | 'quick_start'
  | 'custom_topic'
  | 'after_lesson'
  | 'tutor_after_lesson'
  | 'quick_test'
  | 'my_plan'
export type PracticeGenerationSource = 'local' | 'ai_generated'

export interface PracticeExerciseMetadata {
  id: PracticeExerciseType
  name: string
  difficulty: 1 | 2 | 3 | 4 | 5
  skills: PracticeSkill[]
  minLevel: PracticeLevel
  maxLevel: PracticeLevel
  xpBase: number
  isBossEligible: boolean
  tolerance: PracticeTolerance
  locallyAvailable: boolean
  modes: PracticeMode[]
  weight: number
}

export interface PracticeQuestion {
  id: string
  lessonId: string
  type: PracticeExerciseType
  prompt: string
  targetAnswer: string
  acceptedAnswers: string[]
  options?: string[]
  shuffledWords?: string[]
  extraWords?: string[]
  audioText?: string
  keywords?: string[]
  minWords?: number
  hint?: string
  explanation?: string
  correctionPrompt?: string
  /** Challenge roleplay step 10: accept only exact target (no soft paraphrase). */
  requireExactTarget?: boolean
  xpBase: number
  difficulty: 1 | 2 | 3 | 4 | 5
  tolerance: PracticeTolerance
}

export interface PracticeAnswer {
  questionId: string
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean
  corrected: boolean
  feedbackMessage?: string
  feedbackTone?: 'success' | 'error'
  xpEarned: number
  responseTimeMs: number
  timestamp: number
}

export type PracticeSource =
  | { kind: 'static_lesson'; lessonId: string }
  | {
      kind: 'runtime_lesson'
      lesson: LessonData
      origin: 'tutor'
      topicInput?: string
      tutorIntent?: TutorLearningIntent
    }

export type PracticeSessionStatus = 'active' | 'completed' | 'abandoned'

export interface PracticeSession {
  id: string
  lessonId: string
  topic: string
  level: PracticeLevel
  mode: PracticeMode
  entrySource: PracticeEntrySource
  generationSource: PracticeGenerationSource
  source: PracticeSource
  status: PracticeSessionStatus
  questions: PracticeQuestion[]
  currentIndex: number
  answers: PracticeAnswer[]
  score: number
  xp: number
  streak: number
  startedAt: number
  completedAt?: number
  version: number
  targetQuestionCount?: number
  /** Предупреждение при fallback (ИИ недоступен / локальный эталон). */
  generationNotice?: string
  wrongAttemptsOnCurrentQuestion?: number
  /** Пользователь прочитал блок инструкций перед первым заданием. */
  instructionAcknowledged?: boolean
  /** Прощение ошибки в Challenge можно применить один раз за проход. */
  forgivenessUsedThisRun?: boolean
  forgivenessConfirmPending?: boolean
  forgivenessAppliedAckActive?: boolean
  /** Бонус используется только для зачёта, не меняя raw mastery / XP / COMBO. */
  forgivenessEffectiveBonus?: 0 | 1
  forgivenessQuestionId?: string
}

/** Снимок активной сессии для синхронизации меню практики. */
export type ActivePracticeMenuSnapshot = {
  lessonId: string
  mode: PracticeMode
  referenceExerciseType?: PracticeExerciseType
}

export interface PracticeBuildConfig {
  source: PracticeSource
  lesson: LessonData
  mode: PracticeMode
  entrySource: PracticeEntrySource
  generationSource?: PracticeGenerationSource
  questions?: PracticeQuestion[]
  seed?: string
  targetQuestionCount?: number
  generationNotice?: string
}
