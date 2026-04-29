import type { LessonData, LessonFinale, LessonStep } from '@/types/lesson'

export function getLessonLearningSteps(lesson: LessonData | null | undefined): LessonStep[] {
  return lesson?.steps.filter((step) => step.stepType !== 'completion') ?? []
}

export function resolveLessonFinale(lesson: LessonData | null | undefined): LessonFinale | null {
  if (!lesson) return null
  if (lesson.finale) return lesson.finale

  const legacyCompletion = lesson.steps.find((step) => step.stepType === 'completion' && step.postLesson)
  if (!legacyCompletion?.postLesson) return null

  return {
    bubbles: legacyCompletion.bubbles,
    footerDynamic: legacyCompletion.footerDynamic,
    myEngComment: legacyCompletion.myEngComment,
    postLesson: legacyCompletion.postLesson,
  }
}

export function buildFinaleTimelineStep(lesson: LessonData, finale: LessonFinale, stepNumber: number): LessonStep {
  return {
    stepNumber,
    stepType: 'completion',
    bubbles: finale.bubbles,
    footerDynamic: finale.footerDynamic,
    myEngComment: finale.myEngComment,
    postLesson: finale.postLesson,
  }
}
