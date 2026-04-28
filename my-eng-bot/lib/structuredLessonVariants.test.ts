import { afterEach, describe, expect, it, vi } from 'vitest'
import { embeddedQuestionsLesson } from '@/lib/lessons/embedded-questions'
import { itsTimeToLesson } from '@/lib/lessons/its-time-to'
import { applyStructuredLessonVariant, selectStructuredLessonVariant } from '@/lib/structuredLessonVariants'

describe('structuredLessonVariants', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('applies variant profile to steps and blueprints', () => {
    const variant = itsTimeToLesson.repeatConfig?.variantProfiles?.find((profile) => profile.id === 'cold-study')
    const lesson = applyStructuredLessonVariant(itsTimeToLesson, variant)

    expect(lesson.variantId).toBe('cold-study')
    expect(lesson.steps[0].exercise?.correctAnswer).toBe("It's cold.")
    expect(lesson.steps[4].exercise?.correctAnswer).toBe("It's time to do homework.")
    expect(lesson.repeatConfig?.stepBlueprints[0]?.semanticExpectations?.mustInclude).toEqual(['cold'])
  })

  it('avoids recently used variants inside anti-repeat window', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const { lesson, selectedVariantId } = selectStructuredLessonVariant(itsTimeToLesson, [
      'evening-dark',
      'cold-study',
      'hot-rest',
    ])

    expect(selectedVariantId).toBe('late-cook')
    expect(lesson.variantId).toBe('late-cook')
    expect(lesson.steps[0].exercise?.correctAnswer).toBe("It's late.")
  })

  it('applies embedded question variant profile to steps and blueprints', () => {
    const variant = embeddedQuestionsLesson.repeatConfig?.variantProfiles?.find((profile) => profile.id === 'station-is')
    const lesson = applyStructuredLessonVariant(embeddedQuestionsLesson, variant)

    expect(lesson.variantId).toBe('station-is')
    expect(lesson.steps[0].exercise?.correctAnswer).toBe('Tell me where the station is.')
    expect(lesson.steps[4].exercise?.correctAnswer).toBe('Tell me where the museum is. It is near the school.')
    expect(lesson.repeatConfig?.stepBlueprints[3]?.sourceCorrectAnswer).toBe('Tell me where the station is.')
  })
})
