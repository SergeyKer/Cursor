import { describe, expect, it } from 'vitest'
import {
  getLessonTopicById,
  getPracticeLessonTopics,
  getTheoryLessonTopics,
  pickQuickStartPracticeTopic,
  PRACTICE_TOPICS_BY_AUDIENCE,
} from '@/lib/lessonCatalog'

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

  it('keeps Russian short labels separate from English catalog titles', () => {
    const topic = getLessonTopicById('4')
    const adult = PRACTICE_TOPICS_BY_AUDIENCE.adult['4']
    const child = PRACTICE_TOPICS_BY_AUDIENCE.child['4']

    expect(topic?.title).toBe('I am / I am from')
    expect(adult.short).toBe('Представление о себе')
    expect(adult.long).toMatch(/кто я/i)
    expect(child.long).toContain('через I am')
    expect(child.short).toBe('Знакомство')
    expect(adult.short).not.toBe(topic?.title)
  })

  it('avoids child «мы» in I am catalog long copy', () => {
    const child = PRACTICE_TOPICS_BY_AUDIENCE.child['4']
    expect(child.long).not.toMatch(/\bмы\b/i)
    expect(child.long).toMatch(/кто я/i)
  })
})
