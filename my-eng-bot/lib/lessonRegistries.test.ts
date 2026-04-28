import { describe, expect, it } from 'vitest'
import { getLearningLessonById, findStaticLessonByTopic } from '@/lib/learningLessons'
import { getStructuredLessonById } from '@/lib/structuredLessons'

describe('lesson registries', () => {
  it('registers embedded questions lesson in structured and learning registries', () => {
    const structuredLesson = getStructuredLessonById('3')
    const learningLesson = getLearningLessonById('3')

    expect(structuredLesson?.topic).toBe("I don't know where he lives")
    expect(learningLesson?.title).toBe("I don't know where he lives")
  })

  it('matches embedded question topics through static topic resolver', () => {
    expect(findStaticLessonByTopic("I don't know where he lives")?.id).toBe('3')
    expect(findStaticLessonByTopic('Скажи мне, где находится станция')?.id).toBe('3')
  })
})
