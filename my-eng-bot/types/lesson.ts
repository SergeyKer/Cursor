export type StepType =
  | 'hook'
  | 'theory'
  | 'practice_fill'
  | 'practice_match'
  | 'practice_apply'
  | 'feedback'
  | 'completion'

export type BubbleType = 'positive' | 'info' | 'task'

export type ExerciseType =
  | 'fill_choice'
  | 'fill_text'
  | 'translate'
  | 'write_own'
  | 'match'
  | 'micro_quiz'
  | 'sentence_puzzle'
export type LessonAnswerPolicy = 'strict' | 'normalized' | 'equivalent_variants'
export type ExerciseDifficulty = 'easy' | 'medium' | 'hard'

export type PostLessonAction =
  | 'repeat_variant'
  | 'learn_interesting'
  | 'independent_practice'
  | 'myeng_training'

export type LessonAnswerFormat = 'choice' | 'single_word' | 'short_phrase' | 'full_sentence'

export interface Bubble {
  type: BubbleType
  content: string
}

export type LessonIntroKind = 'single_rule' | 'contrast' | 'concept' | 'tense' | 'structure'
export type LessonIntroComplexity = 'simple' | 'medium' | 'advanced'

export interface LessonIntroExample {
  en: string
  ru: string
  note: string
}

export interface LessonIntro {
  topic: string
  kind: LessonIntroKind
  complexity: LessonIntroComplexity
  quick: {
    why: string[]
    how: string[]
    examples: LessonIntroExample[]
    takeaway: string
  }
  details?: {
    points: string[]
    examples?: LessonIntroExample[]
  }
  deepDive?: {
    commonMistakes: string[]
    contrastNotes?: string[]
    selfCheckRule: string
  }
  learningPlan?: {
    grammarFocus: string[]
    contrastPair?: [string, string]
    firstPracticeGoal: string
  }
}

export interface ExerciseVariant {
  id: string
  question: string
  options?: string[]
  correctAnswer: string
  acceptedAnswers?: string[]
  singleWordCueRu?: string
  hint: string
  difficulty: ExerciseDifficulty
  answerFormat?: LessonAnswerFormat
  answerPolicy?: LessonAnswerPolicy
}

export type SentencePuzzleStageType = 'word_order' | 'translation'

export interface SentencePuzzleStage {
  type: SentencePuzzleStageType
  title: string
  instruction: string
  prompt?: string
  words?: string[]
  correctOrder?: string[]
  options?: string[]
  correctAnswer: string
  successText: string
  errorText: string
  hintText: string
  hintFirstWord?: string
}

export interface SentencePuzzleVariant {
  id: string
  title: string
  instruction: string
  words: string[]
  correctOrder: string[]
  correctAnswer: string
  successText: string
  errorText: string
  hintText: string
  hintFirstWord?: string
  myEngComment: string
}

export interface AdaptiveConfig {
  minVariants: number
  maxVariants: number
  startDifficulty: 'easy' | 'medium'
  errorThreshold: number
}

export interface DifficultyProfile {
  levelBand: 'A1_A2' | 'B1_B2' | 'C1_C2'
  expectedAnswerLength?: 'short' | 'medium' | 'long'
  preferredExerciseMode?: 'drill' | 'contrast' | 'production' | 'micro_quiz'
}

export interface Exercise {
  type: ExerciseType
  question: string
  options?: string[]
  correctAnswer: string
  acceptedAnswers?: string[]
  singleWordCueRu?: string
  answerFormat?: LessonAnswerFormat
  answerPolicy?: LessonAnswerPolicy
  hint?: string
  variants?: ExerciseVariant[]
  puzzleVariants?: [SentencePuzzleVariant, SentencePuzzleVariant, SentencePuzzleVariant]
  bonusXp?: number
  adaptive?: AdaptiveConfig
  currentVariantIndex?: number
  difficultyProfile?: DifficultyProfile
}

export interface PostLessonOption {
  action: PostLessonAction
  label: string
  icon: string
}

export interface PostLessonContent {
  options: PostLessonOption[]
  dynamicFooterText?: string
  staticFooterText?: string
  interestingFact?: string
}

export type LessonPedagogicalRole =
  | 'introduce_context'
  | 'explain_rule'
  | 'controlled_pattern_drill'
  | 'apply_in_new_situation'
  | 'contrast_check'
  | 'celebrate_completion'

export interface LessonSemanticExpectations {
  pedagogicalRole: LessonPedagogicalRole
  mustInclude?: string[]
  shouldInclude?: string[]
  mustAvoid?: string[]
  hintShouldMention?: string[]
  maxAcceptedAnswers?: number
  requireQuestionMarkInAnswer?: boolean
  requireCyrillicHint?: boolean
}

export interface LessonRepeatStepBlueprint {
  stepNumber: number
  stepType: StepType
  learningGoal: string
  exerciseType?: ExerciseType
  answerFormat?: LessonAnswerFormat
  answerPolicy?: LessonAnswerPolicy
  sourceCorrectAnswer?: string
  sourcePattern?: string
  semanticAnchors?: string[]
  semanticExpectations?: LessonSemanticExpectations
}

export interface LessonRepeatStepVariant {
  stepNumber: number
  bubbles?: [Bubble, Bubble, Bubble]
  exercise?: Partial<Exercise>
  footerDynamic?: string
  myEngComment?: string
}

export interface LessonRepeatVariantProfile {
  id: string
  label?: string
  sourceSituations?: string[]
  stepBlueprints?: LessonRepeatStepBlueprint[]
  steps?: LessonRepeatStepVariant[]
}

export interface LessonQualityGate {
  minScore: number
  maxSoftIssues: number
  rejectOnHardFailures: boolean
}

export interface LessonRepeatConfig {
  ruleSummary: string
  grammarFocus: string[]
  sourceSituations: string[]
  stepBlueprints: LessonRepeatStepBlueprint[]
  variantProfiles?: LessonRepeatVariantProfile[]
  antiRepeatWindow?: number
  bannedTerms?: string[]
  qualityGate?: LessonQualityGate
}

export interface LessonMistake {
  step: number
  userAnswer: string
  correctAnswer: string
}

export interface LessonStep {
  stepNumber: number
  stepType: StepType
  bubbles: [Bubble, Bubble, Bubble]
  exercise?: Exercise
  footerDynamic: string
  myEngComment?: string
  postLesson?: PostLessonContent
}

export interface LessonFinale {
  bubbles: [Bubble, Bubble, Bubble]
  footerDynamic: string
  myEngComment?: string
  postLesson: PostLessonContent
}

export interface LessonData {
  id: string
  runKey?: string
  variantId?: string
  topic: string
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1'
  intro?: LessonIntro
  tutorIntent?: import('@/lib/tutorLearningIntent').TutorLearningIntent
  steps: LessonStep[]
  finale?: LessonFinale
  repeatConfig?: LessonRepeatConfig
}
