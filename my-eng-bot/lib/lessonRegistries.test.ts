import { describe, expect, it } from 'vitest'
import { getLearningLessonById, findStaticLessonByTopic } from '@/lib/learningLessons'
import { getStructuredLessonById } from '@/lib/structuredLessons'

describe('lesson registries', () => {
  it('registers A1 introducing-yourself lesson with simple intro', () => {
    const structured = getStructuredLessonById('4')
    const learning = getLearningLessonById('4')

    expect(structured?.level).toBe('A1')
    expect(structured?.intro?.complexity).toBe('simple')
    expect(structured?.intro?.quick.examples.length).toBeGreaterThanOrEqual(3)
    expect(learning?.title).toMatch(/I am/i)
  })

  it('resolves introducing-yourself from plain learner wording', () => {
    expect(findStaticLessonByTopic('расскажи про себя i am from')?.id).toBe('4')
    expect(findStaticLessonByTopic('знакомство на английском')?.id).toBe('4')
  })

  it('registers embedded questions lesson in structured and learning registries', () => {
    const structuredLesson = getStructuredLessonById('3')
    const learningLesson = getLearningLessonById('3')

    expect(structuredLesson?.topic).toBe('I know what she likes')
    expect(learningLesson?.title).toBe('I know what she likes')
  })

  it('matches embedded question topics through static topic resolver', () => {
    expect(findStaticLessonByTopic('I know what she likes')?.id).toBe('3')
    expect(findStaticLessonByTopic("I don't know where he lives")?.id).toBe('3')
    expect(findStaticLessonByTopic('Скажи мне, где находится станция')?.id).toBe('3')
  })
})
