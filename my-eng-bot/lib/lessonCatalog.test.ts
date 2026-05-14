import { describe, expect, it } from 'vitest'
import { getLessonTopicById, getPracticeLessonTopics, getTheoryLessonTopics, pickQuickStartPracticeTopic } from '@/lib/lessonCatalog'

describe('lessonCatalog', () => {
  it('keeps theory and practice topics aligned for A2', () => {
    const theoryIds = getTheoryLessonTopics('A2').map((topic) => topic.id)
    const practiceIds = getPracticeLessonTopics('A2').map((topic) => topic.id)

    expect(practiceIds).toEqual(theoryIds)
  })

  it('keeps theory and practice topics aligned for A1', () => {
    const theoryIds = getTheoryLessonTopics('A1').map((topic) => topic.id)
    const practiceIds = getPracticeLessonTopics('A1').map((topic) => topic.id)

    expect(practiceIds).toEqual(theoryIds)
    expect(getLessonTopicById('4')?.level).toBe('A1')
  })

  it('picks an enabled quick-start topic', () => {
    const topic = pickQuickStartPracticeTopic('A2')

    expect(topic?.enabled).toBe(true)
    expect(topic?.hasPractice).toBe(true)
  })

  it('assigns theory tag ids to all catalog lessons', () => {
    for (const topic of getTheoryLessonTopics()) {
      expect(topic.tagIds?.length).toBeGreaterThan(0)
    }
  })

  it('allows multiple theory tags on one lesson', () => {
    expect(getLessonTopicById('2')?.tagIds?.sort()).toEqual(['special-questions', 'subject-questions'].sort())
    expect(getLessonTopicById('3')?.tagIds?.sort()).toEqual(['reported-speech', 'word-order'].sort())
  })
})

