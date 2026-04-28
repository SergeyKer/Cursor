export type StepType =
  | 'hook'
  | 'theory'
  | 'practice_fill'
  | 'practice_match'
  | 'practice_apply'
  | 'feedback'
  | 'completion'

export type BubbleType = 'positive' | 'info' | 'task'

export type ExerciseType = 'fill_choice' | 'translate' | 'write_own' | 'match' | 'micro_quiz'
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

export interface ExerciseVariant {
  id: string
  question: string
  options?: string[]
  correctAnswer: string
  acceptedAnswers?: string[]
  hint: string
  difficulty: ExerciseDifficulty
  answerFormat?: LessonAnswerFormat
  answerPolicy?: LessonAnswerPolicy
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
  answerFormat?: LessonAnswerFormat
  answerPolicy?: LessonAnswerPolicy
  hint?: string
  variants?: ExerciseVariant[]
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
  postLesson?: PostLessonContent
}

export interface LessonData {
  id: string
  runKey?: string
  variantId?: string
  topic: string
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1'
  steps: LessonStep[]
  repeatConfig?: LessonRepeatConfig
}
