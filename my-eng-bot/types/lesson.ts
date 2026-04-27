export type StepType =
  | 'hook'
  | 'theory'
  | 'practice_fill'
  | 'practice_match'
  | 'practice_apply'
  | 'feedback'
  | 'completion'

export type BubbleType = 'positive' | 'info' | 'task'

export type ExerciseType = 'fill_choice' | 'translate' | 'write_own' | 'match'
export type LessonAnswerPolicy = 'strict' | 'normalized' | 'equivalent_variants'

export type PostLessonAction =
  | 'repeat_variant'
  | 'view_examples'
  | 'learn_interesting'
  | 'independent_practice'
  | 'myeng_training'

export type LessonAnswerFormat = 'choice' | 'single_word' | 'short_phrase' | 'full_sentence'

export interface Bubble {
  type: BubbleType
  content: string
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
  examples?: string[]
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
  topic: string
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1'
  steps: LessonStep[]
  repeatConfig?: LessonRepeatConfig
}
