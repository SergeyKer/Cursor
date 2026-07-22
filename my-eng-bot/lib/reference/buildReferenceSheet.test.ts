import { describe, expect, it } from 'vitest'
import {
  buildReferenceSheetByLessonId,
  buildReferenceSheetFromLesson,
  isIntroSuitableForReference,
} from '@/lib/reference/buildReferenceSheet'
import { getReferenceLessonTopics, isReferenceLessonId } from '@/lib/reference/getReferenceLessonTopics'
import {
  findReferenceTopicCandidates,
  pickStrongReferenceHit,
} from '@/lib/reference/findReferenceTopicCandidates'
import { getStructuredLessonById } from '@/lib/structuredLessons'

describe('buildReferenceSheetFromLesson', () => {
  it('builds sheet for I am lesson (id 4)', () => {
    const lesson = getStructuredLessonById('4')
    expect(lesson).toBeTruthy()
    const sheet = buildReferenceSheetFromLesson(lesson)
    expect(sheet).not.toBeNull()
    expect(sheet?.relatedLessonId).toBe('4')
    expect(sheet?.hook).toMatch(/am/i)
    expect(sheet?.rule.length).toBeGreaterThan(0)
    expect(sheet?.formula.length).toBeGreaterThan(0)
    expect(sheet?.examples.length).toBeGreaterThan(0)
    expect(sheet?.traps.length).toBeGreaterThan(0)
    expect(sheet?.selfCheck).toBeTruthy()
    expect(sheet?.hasPractice).toBe(true)
    expect(sheet?.teaser.length).toBeGreaterThan(0)
  })

  it('builds sheet for It’s time lesson (id 1)', () => {
    const sheet = buildReferenceSheetByLessonId('1')
    expect(sheet).not.toBeNull()
    expect(sheet?.id).toBe('1')
    expect(sheet?.rule.length || sheet?.hook).toBeTruthy()
    expect((sheet?.formula.length ?? 0) + (sheet?.examples.length ?? 0)).toBeGreaterThan(0)
  })

  it('returns null for empty lesson', () => {
    expect(buildReferenceSheetFromLesson(null)).toBeNull()
  })

  it('rejects intro without hook/rule or formula/examples', () => {
    expect(
      isIntroSuitableForReference({
        topic: 'X',
        kind: 'structure',
        complexity: 'simple',
        quick: { why: [], how: [], examples: [], takeaway: '' },
      })
    ).toBe(false)
  })

  it('T4: catalog lessons 1 and 4 expose hasPractice', () => {
    expect(buildReferenceSheetByLessonId('1')?.hasPractice).toBe(true)
    expect(buildReferenceSheetByLessonId('4')?.hasPractice).toBe(true)
  })

  it('T8/T9: intro-only runtime lesson builds sheet without steps', () => {
    const intro = {
      topic: 'over / on',
      kind: 'contrast' as const,
      complexity: 'simple' as const,
      quick: {
        why: ['over — над; on — на поверхности'],
        how: ['on + стол/пол'],
        examples: [{ en: 'The book is on the table.', ru: 'Книга на столе.', note: 'поверхность' }],
        takeaway: 'На поверхности — on, не over.',
      },
      deepDive: {
        commonMistakes: ['Не The book is over the table для «на столе».'],
        selfCheckRule: 'Можно ли положить предмет на поверхность? → on.',
      },
    }
    expect(isIntroSuitableForReference(intro)).toBe(true)
    const sheet = buildReferenceSheetFromLesson({
      id: 'review-chip:over',
      topic: 'over / on',
      level: 'A2',
      intro,
      steps: [],
    })
    expect(sheet).not.toBeNull()
    expect(sheet?.hasPractice).toBe(false)
    expect(sheet?.relatedLessonId).toBe('review-chip:over')
    expect(sheet?.examples[0]?.en).toContain('on the table')
  })
})

describe('getReferenceLessonTopics', () => {
  it('returns enabled theory topics with suitable intro', () => {
    const topics = getReferenceLessonTopics()
    expect(topics.length).toBeGreaterThanOrEqual(4)
    expect(topics.every((t) => t.enabled && t.hasTheory && t.teaser)).toBe(true)
    expect(topics.some((t) => t.id === '4')).toBe(true)
  })

  it('filters by level', () => {
    const a1 = getReferenceLessonTopics('A1')
    expect(a1.every((t) => t.level === 'A1')).toBe(true)
    expect(a1.some((t) => t.id === '4')).toBe(true)
  })

  it('isReferenceLessonId matches catalog', () => {
    expect(isReferenceLessonId('4')).toBe(true)
    expect(isReferenceLessonId('missing')).toBe(false)
  })
})

describe('findReferenceTopicCandidates', () => {
  it('substitutes catalog title for I am query', () => {
    const hits = findReferenceTopicCandidates('i am', 'adult', 5)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0]?.lessonId).toBe('4')
    expect(hits[0]?.title).toMatch(/I am/i)
  })

  it('pickStrongReferenceHit returns single candidate', () => {
    const hit = pickStrongReferenceHit([{ lessonId: '4', title: 'I am', score: 120, reason: 'i am' }])
    expect(hit?.lessonId).toBe('4')
  })
})
