import { describe, expect, it } from 'vitest'
import { itsTimeToLesson } from '@/lib/lessons/its-time-to'
import { buildFinaleTimelineStep, getLessonLearningSteps, resolveLessonFinale } from '@/lib/lessonFinale'
import type { LessonData } from '@/types/lesson'

describe('lessonFinale helpers', () => {
  it('keeps finale outside learning steps', () => {
    expect(getLessonLearningSteps(itsTimeToLesson)).toHaveLength(7)
    expect(getLessonLearningSteps(itsTimeToLesson).some((step) => step.stepType === 'completion')).toBe(false)
    expect(resolveLessonFinale(itsTimeToLesson)?.postLesson.options.length).toBeGreaterThan(0)
  })

  it('resolves legacy completion step as finale', () => {
    const legacyLesson: LessonData = {
      ...itsTimeToLesson,
      finale: undefined,
      steps: [
        ...itsTimeToLesson.steps,
        {
          stepNumber: 8,
          stepType: 'completion',
          bubbles: itsTimeToLesson.finale!.bubbles,
          footerDynamic: itsTimeToLesson.finale!.footerDynamic,
          myEngComment: itsTimeToLesson.finale!.myEngComment,
          postLesson: itsTimeToLesson.finale!.postLesson,
        },
      ],
    }

    expect(getLessonLearningSteps(legacyLesson)).toHaveLength(7)
    expect(resolveLessonFinale(legacyLesson)?.footerDynamic).toBe(itsTimeToLesson.finale?.footerDynamic)
  })

  it('builds a render-only completion step for the timeline', () => {
    const finale = resolveLessonFinale(itsTimeToLesson)
    expect(finale).not.toBeNull()

    const timelineStep = buildFinaleTimelineStep(itsTimeToLesson, finale!, 8)
    expect(timelineStep.stepType).toBe('completion')
    expect(timelineStep.postLesson?.options).toHaveLength(finale!.postLesson.options.length)
  })
})
