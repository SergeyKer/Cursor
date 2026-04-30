import { describe, expect, it } from 'vitest'
import { getPracticeLessonTopics, getTheoryLessonTopics, pickQuickStartPracticeTopic } from '@/lib/lessonCatalog'

describe('lessonCatalog', () => {
  it('keeps theory and practice topics aligned for A2', () => {
    const theoryIds = getTheoryLessonTopics('A2').map((topic) => topic.id)
    const practiceIds = getPracticeLessonTopics('A2').map((topic) => topic.id)

    expect(practiceIds).toEqual(theoryIds)
  })

  it('picks an enabled quick-start topic', () => {
    const topic = pickQuickStartPracticeTopic('A2')

    expect(topic?.enabled).toBe(true)
    expect(topic?.hasPractice).toBe(true)
  })
})

