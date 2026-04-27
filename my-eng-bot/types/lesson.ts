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

export interface LessonStep {
  stepNumber: number
  stepType: StepType
  bubbles: [Bubble, Bubble, Bubble]
  exercise?: Exercise
  footerDynamic: string
}

export interface LessonData {
  id: string
  topic: string
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1'
  steps: LessonStep[]
}
