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

export interface LessonRepeatStepBlueprint {
  stepNumber: number
  stepType: StepType
  learningGoal: string
  exerciseType?: ExerciseType
  answerFormat?: LessonAnswerFormat
  sourceCorrectAnswer?: string
  sourcePattern?: string
}

export interface LessonRepeatConfig {
  ruleSummary: string
  grammarFocus: string[]
  sourceSituations: string[]
  stepBlueprints: LessonRepeatStepBlueprint[]
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
