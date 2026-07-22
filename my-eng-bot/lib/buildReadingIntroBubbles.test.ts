import { describe, expect, it } from 'vitest'
import { buildLessonReadingBubbles } from '@/lib/buildLessonReadingBubbles'
import { buildReadingIntroBubbles } from '@/lib/buildReadingIntroBubbles'
import { buildReferenceBubbles } from '@/lib/reference/buildReferenceBubbles'
import { buildReferenceSheetFromLesson } from '@/lib/reference/buildReferenceSheet'
import { READING_COLUMN_MAX_CLASS } from '@/lib/lessonReadingLayout'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import { LESSON_READING_CARD_LABELS, LESSON_READING_CARD_ORDER } from '@/lib/uiCopy/lessonReadingCards'
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
  it('builds exactly 6 reading cards with shared labels', () => {
    const bubbles = buildReadingIntroBubbles(baseIntro, 'adult')
    expect(bubbles).toHaveLength(6)
    expect(bubbles.map((b) => b.content.split('\n')[0])).toEqual([
      LESSON_READING_CARD_LABELS.essence,
      LESSON_READING_CARD_LABELS.rule,
      LESSON_READING_CARD_LABELS.templates,
      LESSON_READING_CARD_LABELS.examples,
      LESSON_READING_CARD_LABELS.mistakes,
      LESSON_READING_CARD_LABELS.selfCheck,
    ])
    expect(bubbles.map((b) => b.type)).toEqual(['info', 'positive', 'info', 'task', 'positive', 'task'])
    expect(bubbles[0]?.content.split('\n')[0]).toBe('Тема урока')
    expect(bubbles[0]?.content).toContain('to be')
    expect(bubbles[0]?.content).toContain('takeaway')
    expect(bubbles.every((b) => !/^[📘🟡⚪🟢🔬]/.test(b.content.split('\n')[0] ?? ''))).toBe(true)
    expect(bubbles.every((b) => !b.content.includes('ПОЧЕМУ ТАК'))).toBe(true)
    expect(bubbles.every((b) => !b.content.includes('contrast1'))).toBe(true)
    expect(bubbles.every((b) => !b.content.includes('point1'))).toBe(true)
  })

  it('omits mistakes and self-check when deepDive is missing', () => {
    const intro: LessonIntro = {
      ...baseIntro,
      details: undefined,
      deepDive: undefined,
    }
    const bubbles = buildReadingIntroBubbles(intro, 'adult')
    expect(bubbles).toHaveLength(4)
    expect(bubbles.every((b) => !b.content.includes(LESSON_READING_CARD_LABELS.mistakes))).toBe(true)
    expect(bubbles.every((b) => !b.content.includes(LESSON_READING_CARD_LABELS.selfCheck))).toBe(true)
  })

  it('matches shared builder output', () => {
    expect(buildReadingIntroBubbles(baseIntro, 'child')).toEqual(buildLessonReadingBubbles(baseIntro))
  })
})

describe('reference mirror', () => {
  it('mirrors intro card order and labels for I am lesson', () => {
    const lesson = getStructuredLessonById('4')
    expect(lesson?.intro).toBeTruthy()
    const introBubbles = buildReadingIntroBubbles(lesson!.intro!, 'adult')
    const sheet = buildReferenceSheetFromLesson(lesson)
    expect(sheet?.selfCheck).toBeTruthy()
    const refBubbles = buildReferenceBubbles(sheet!)
    expect(refBubbles.map((b) => b.content.split('\n')[0])).toEqual(
      introBubbles.map((b) => b.content.split('\n')[0])
    )
    expect(refBubbles).toEqual(introBubbles)
    expect(refBubbles.every((b) => b.content.split('\n').length > 1)).toBe(true)
  })
})

describe('reading layout + labels', () => {
  it('keeps reading column aligned with dialog max-w-[29rem]', () => {
    expect(READING_COLUMN_MAX_CLASS).toBe('max-w-[29rem]')
  })

  it('keeps shared labels for intro and reference', () => {
    expect(LESSON_READING_CARD_ORDER).toHaveLength(6)
    expect(LESSON_READING_CARD_LABELS.essence).toBe('Тема урока')
    expect(REFERENCE_COPY.cardHook).toBe(LESSON_READING_CARD_LABELS.essence)
    expect(REFERENCE_COPY.cardFormula).toBe(LESSON_READING_CARD_LABELS.templates)
    expect(REFERENCE_COPY.cardTraps).toBe(LESSON_READING_CARD_LABELS.mistakes)
    expect(REFERENCE_COPY.cardSelfCheck).toBe(LESSON_READING_CARD_LABELS.selfCheck)
    expect(REFERENCE_COPY.hubTitle).toBe('Справочник')
  })
})
