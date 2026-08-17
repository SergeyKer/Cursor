import { describe, expect, it } from 'vitest'
import {
  getFirstEnabledPlayableLessonId,
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
    expect(theoryIds).toEqual(['1', '2', '14', '3', '15', '16', '17', '18', '19', '20'])
  })

  it('marks upcoming A2 lessons as soon (disabled) without opening content', () => {
    const ready = new Set(['1', '2', '3'])
    const soon = getTheoryLessonTopics('A2').filter((topic) => !ready.has(topic.id))

    expect(soon).toHaveLength(7)
    for (const topic of soon) {
      expect(topic.enabled).toBe(false)
      expect(topic.hasTheory).toBe(true)
      expect(topic.hasPractice).toBe(true)
    }
    expect(getLessonTopicById('14')?.title).toBe('I don’t know where …')
    expect(getLessonTopicById('20')?.title).toBe('have time to')
  })

  it('keeps theory and practice topics aligned for B1', () => {
    const theoryIds = getTheoryLessonTopics('B1').map((topic) => topic.id)
    const practiceIds = getPracticeLessonTopics('B1').map((topic) => topic.id)

    expect(practiceIds).toEqual(theoryIds)
    expect(theoryIds).toEqual(['21', '22', '23', '24', '25', '26', '27', '28', '29', '30'])
  })

  it('marks all B1 lessons as soon (disabled) without opening content', () => {
    const topics = getTheoryLessonTopics('B1')

    expect(topics).toHaveLength(10)
    for (const topic of topics) {
      expect(topic.enabled).toBe(false)
      expect(topic.level).toBe('B1')
      expect(topic.hasTheory).toBe(true)
      expect(topic.hasPractice).toBe(true)
    }
    expect(getLessonTopicById('21')?.title).toBe('a bit of / a drop of')
    expect(getLessonTopicById('30')?.title).toBe('be invited')
  })

  it('keeps theory and practice topics aligned for B2', () => {
    const theoryIds = getTheoryLessonTopics('B2').map((topic) => topic.id)
    const practiceIds = getPracticeLessonTopics('B2').map((topic) => topic.id)

    expect(practiceIds).toEqual(theoryIds)
    expect(theoryIds).toEqual(['31', '32', '33', '34', '35', '36', '37', '38', '39', '40'])
  })

  it('marks all B2 lessons as soon (disabled) without opening content', () => {
    const topics = getTheoryLessonTopics('B2')

    expect(topics).toHaveLength(10)
    for (const topic of topics) {
      expect(topic.enabled).toBe(false)
      expect(topic.level).toBe('B2')
      expect(topic.hasTheory).toBe(true)
      expect(topic.hasPractice).toBe(true)
    }
    expect(getLessonTopicById('31')?.title).toBe('I’ve been … / that’s why')
    expect(getLessonTopicById('40')?.title).toBe('be about to')
  })

  it('keeps theory and practice topics aligned for A1', () => {
    const theoryIds = getTheoryLessonTopics('A1').map((topic) => topic.id)
    const practiceIds = getPracticeLessonTopics('A1').map((topic) => topic.id)

    expect(practiceIds).toEqual(theoryIds)
    expect(getLessonTopicById('4')?.level).toBe('A1')
    expect(theoryIds).toEqual(['4', '5', '6', '7', '8', '9', '10', '11', '12', '13'])
  })

  it('marks upcoming A1 lessons as soon (disabled) without opening content', () => {
    const soon = getTheoryLessonTopics('A1').filter((topic) => topic.id !== '4')

    expect(soon).toHaveLength(9)
    for (const topic of soon) {
      expect(topic.enabled).toBe(false)
      expect(topic.hasTheory).toBe(true)
      expect(topic.hasPractice).toBe(true)
    }
    expect(getLessonTopicById('5')?.title).toBe('You are / You’re …')
    expect(getLessonTopicById('13')?.title).toBe('often')
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

  it('picks the first enabled structured lesson for the home door', () => {
    expect(getFirstEnabledPlayableLessonId()).toBe('4')
  })
})
