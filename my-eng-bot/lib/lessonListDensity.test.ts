import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LESSON_LIST_DENSITY,
  parseLessonListDensity,
  resolveLessonRowLines,
} from '@/lib/lessonListDensity'

describe('parseLessonListDensity', () => {
  it('parses 1/2/3 from number or string', () => {
    expect(parseLessonListDensity(1)).toBe(1)
    expect(parseLessonListDensity('2')).toBe(2)
    expect(parseLessonListDensity(3)).toBe(3)
  })

  it('falls back to default for invalid input', () => {
    expect(parseLessonListDensity(null)).toBe(DEFAULT_LESSON_LIST_DENSITY)
    expect(parseLessonListDensity('x')).toBe(DEFAULT_LESSON_LIST_DENSITY)
    expect(parseLessonListDensity(9)).toBe(DEFAULT_LESSON_LIST_DENSITY)
  })
})

describe('resolveLessonRowLines', () => {
  const base = {
    label: 'I am / I am from',
    subtitle: 'Знакомство',
    description: 'Кто я, откуда я и какой я — через I am.',
  }

  it('density 1 shows only title layers', () => {
    expect(resolveLessonRowLines({ ...base, density: 1 })).toEqual({
      showSubtitle: false,
      showDescription: false,
    })
  })

  it('density 2 shows subtitle but not description', () => {
    expect(resolveLessonRowLines({ ...base, density: 2 })).toEqual({
      showSubtitle: true,
      showDescription: false,
    })
  })

  it('density 3 shows subtitle and description', () => {
    expect(resolveLessonRowLines({ ...base, density: 3 })).toEqual({
      showSubtitle: true,
      showDescription: true,
    })
  })

  it('omitted density keeps full text (practice format rows)', () => {
    expect(resolveLessonRowLines(base)).toEqual({
      showSubtitle: true,
      showDescription: true,
    })
  })

  it('hides subtitle when it duplicates label', () => {
    expect(
      resolveLessonRowLines({
        density: 3,
        label: 'Знакомство',
        subtitle: 'знакомство',
        description: 'desc',
      })
    ).toEqual({
      showSubtitle: false,
      showDescription: true,
    })
  })

  it('hides empty description even at density 3', () => {
    expect(
      resolveLessonRowLines({
        density: 3,
        label: 'Title',
        subtitle: 'Cat',
        description: '  ',
      })
    ).toEqual({
      showSubtitle: true,
      showDescription: false,
    })
  })
})
