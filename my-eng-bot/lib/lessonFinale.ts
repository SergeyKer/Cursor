import type { Bubble, LessonData, LessonFinale, LessonStep } from '@/types/lesson'

/** Заменяет «Готово!» в финальном пузыре на «Урок завершён.» */
export function normalizeFinaleBubbleContent(content: string): string {
  return content.replace(/^Готово!\s*/, 'Урок завершён. ')
}

type FinaleBubbles = [Bubble, Bubble, Bubble]

function normalizeFinaleBubbles(bubbles: Bubble[]): Bubble[] {
  return bubbles.map((bubble) => ({
    ...bubble,
    content: normalizeFinaleBubbleContent(bubble.content),
  }))
}

function toLessonStepBubbles(bubbles: Bubble[]): FinaleBubbles {
  return normalizeFinaleBubbles(bubbles) as FinaleBubbles
}

export function getLessonLearningSteps(lesson: LessonData | null | undefined): LessonStep[] {
  return lesson?.steps.filter((step) => step.stepType !== 'completion') ?? []
}

export function resolveLessonFinale(lesson: LessonData | null | undefined): LessonFinale | null {
  if (!lesson) return null
  if (lesson.finale) {
    return {
      ...lesson.finale,
      bubbles: normalizeFinaleBubbles(lesson.finale.bubbles),
    }
  }

  const legacyCompletion = lesson.steps.find((step) => step.stepType === 'completion' && step.postLesson)
  if (!legacyCompletion?.postLesson) return null

  return {
    bubbles: normalizeFinaleBubbles(legacyCompletion.bubbles),
    footerDynamic: legacyCompletion.footerDynamic,
    myEngComment: legacyCompletion.myEngComment,
    postLesson: legacyCompletion.postLesson,
  }
}

export function buildFinaleTimelineStep(lesson: LessonData, finale: LessonFinale, stepNumber: number): LessonStep {
  return {
    stepNumber,
    stepType: 'completion',
    bubbles: toLessonStepBubbles(finale.bubbles),
    footerDynamic: finale.footerDynamic,
    myEngComment: finale.myEngComment,
    postLesson: finale.postLesson,
  }
}
