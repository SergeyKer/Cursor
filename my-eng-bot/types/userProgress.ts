import type { PostLessonAction } from '@/types/lesson'

export interface UserLessonProgress {
  lessonId: string
  topic: string
  level: string
  completedSteps: number[]
  completedVariants: number[]
  xp: number
  combo: number
  mistakes: Array<{ step: number; userAnswer: string; correctAnswer: string }>
  lastCompleted: string
  postLessonChoice?: PostLessonAction
}
