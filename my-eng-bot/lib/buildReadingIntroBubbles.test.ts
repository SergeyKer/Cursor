import { describe, expect, it } from 'vitest'
import { buildReadingIntroBubbles } from '@/lib/buildReadingIntroBubbles'
import { READING_COLUMN_MAX_CLASS } from '@/lib/lessonReadingLayout'
import { REFERENCE_COPY } from '@/lib/uiCopy/reference'
import type { LessonIntro } from '@/types/lesson'

const baseIntro: LessonIntro = {
  topic: 'to be',
  kind: 'single_rule',
  complexity: 'simple',
  quick: {
    why: ['why1'],
    how: ['how1'],
    examples: [{ en: 'I am', ru: 'Я есть', note: 'note' }],
    takeaway: 'takeaway',
  },
  details: {
    points: ['point1'],
    examples: [{ en: 'You are', ru: 'Ты есть', note: 'n' }],
  },
  deepDive: {
    commonMistakes: ['mistake1'],
    contrastNotes: ['contrast1'],
    selfCheckRule: 'check',
  },
}

describe('buildReadingIntroBubbles', () => {
  it('includes quick + details + deepDive sections', () => {
    const bubbles = buildReadingIntroBubbles(baseIntro, 'adult')
    expect(bubbles.length).toBe(10)
    expect(bubbles.some((b) => b.content.includes('ТЕМА УРОКА'))).toBe(true)
    expect(bubbles.some((b) => b.content.includes('ПОЧЕМУ ТАК'))).toBe(true)
    expect(bubbles.some((b) => b.content.includes('ЧАСТЫЕ ОШИБКИ'))).toBe(true)
  })

  it('omits details and deepDive when missing', () => {
    const intro: LessonIntro = {
      ...baseIntro,
      details: undefined,
      deepDive: undefined,
    }
    const bubbles = buildReadingIntroBubbles(intro, 'adult')
    expect(bubbles.length).toBe(4)
    expect(bubbles.every((b) => !b.content.includes('ПОЧЕМУ ТАК'))).toBe(true)
    expect(bubbles.every((b) => !b.content.includes('ЧАСТЫЕ ОШИБКИ'))).toBe(true)
  })
})

describe('reading layout + reference labels', () => {
  it('keeps reading column aligned with dialog max-w-[29rem]', () => {
    expect(READING_COLUMN_MAX_CLASS).toBe('max-w-[29rem]')
  })

  it('uses human reference card labels', () => {
    expect(REFERENCE_COPY.cardHook).toBe('Суть')
    expect(REFERENCE_COPY.cardFormula).toBe('Шаблоны')
    expect(REFERENCE_COPY.cardTraps).toBe('Частые ошибки')
    expect(REFERENCE_COPY.hubTitle).toBe('Справочник')
  })
})
