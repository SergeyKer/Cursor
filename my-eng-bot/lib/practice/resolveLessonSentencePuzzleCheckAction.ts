export type LessonSentencePuzzleCheckAction = 'noop' | 'practiceSubmit' | 'lessonRetry' | 'lessonSuccess'

export function resolveLessonSentencePuzzleCheckAction(params: {
  submitMode: 'lesson' | 'practice'
  isFilled: boolean
  isCorrect: boolean
}): LessonSentencePuzzleCheckAction {
  if (!params.isFilled) return 'noop'
  if (params.submitMode === 'practice') return 'practiceSubmit'
  if (!params.isCorrect) return 'lessonRetry'
  return 'lessonSuccess'
}
