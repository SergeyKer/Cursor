import { describe, expect, it } from 'vitest'
import { buildLessonReadingBubbles } from '@/lib/buildLessonReadingBubbles'
import { buildReadingIntroBubbles } from '@/lib/buildReadingIntroBubbles'
import { buildReferenceBubbles } from '@/lib/reference/buildReferenceBubbles'
import { buildReferenceSheetFromLesson } from '@/lib/reference/buildReferenceSheet'
import { READING_COLUMN_MAX_CLASS } from '@/lib/lessonReadingLayout'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import {
  LESSON_READING_CARD_LABELS,
  LESSON_READING_CARD_ORDER,
  REFERENCE_READING_CARD_LABELS,
} from '@/lib/uiCopy/lessonReadingCards'
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
  it('builds reading cards including contrast when present', () => {
    const bubbles = buildReadingIntroBubbles(baseIntro, 'adult')
    expect(bubbles).toHaveLength(7)
    expect(bubbles.map((b) => b.content.split('\n')[0])).toEqual([
      LESSON_READING_CARD_LABELS.essence,
      LESSON_READING_CARD_LABELS.rule,
      LESSON_READING_CARD_LABELS.templates,
      LESSON_READING_CARD_LABELS.examples,
      LESSON_READING_CARD_LABELS.contrast,
      LESSON_READING_CARD_LABELS.mistakes,
      LESSON_READING_CARD_LABELS.selfCheck,
    ])
    expect(bubbles[0]?.content.split('\n')[0]).toBe('Тема урока')
    expect(bubbles[0]?.content).toContain('to be')
    expect(bubbles[0]?.content).toContain('takeaway')
    expect(bubbles.some((b) => b.content.includes('contrast1'))).toBe(true)
    expect(bubbles.every((b) => !b.content.includes('point1'))).toBe(true)
  })

  it('omits contrast mistakes and self-check when deepDive is missing', () => {
    const intro: LessonIntro = {
      ...baseIntro,
      details: undefined,
      deepDive: undefined,
    }
    const bubbles = buildReadingIntroBubbles(intro, 'adult')
    expect(bubbles).toHaveLength(4)
    expect(bubbles.every((b) => !b.content.includes(LESSON_READING_CARD_LABELS.mistakes))).toBe(true)
    expect(bubbles.every((b) => !b.content.includes(LESSON_READING_CARD_LABELS.selfCheck))).toBe(true)
    expect(bubbles.every((b) => !b.content.includes(LESSON_READING_CARD_LABELS.contrast))).toBe(true)
  })

  it('matches shared builder output in lesson mode', () => {
    expect(buildReadingIntroBubbles(baseIntro, 'child')).toEqual(
      buildLessonReadingBubbles(baseIntro, { mode: 'lesson' })
    )
  })

  it('formats paired commonMistakes as ✗ wrong → ✓ right without Не/а', () => {
    const intro: LessonIntro = {
      ...baseIntro,
      deepDive: {
        ...baseIntro.deepDive!,
        commonMistakes: ['Не I go sleep — а I go to sleep.', 'Пытаться переводить дословно.'],
      },
    }
    const mistakesCard = buildReadingIntroBubbles(intro, 'adult').find((b) =>
      b.content.startsWith(LESSON_READING_CARD_LABELS.mistakes)
    )
    expect(mistakesCard?.content).toContain('✗ I go sleep → ✓ I go to sleep')
    expect(mistakesCard?.content).not.toContain('Не I go sleep — а')
    expect(mistakesCard?.content).toContain('• Пытаться переводить дословно.')
  })

  it('cheatsheet mode keeps rule, lifts contrast, drops selfCheck', () => {
    const bubbles = buildLessonReadingBubbles(baseIntro, { mode: 'cheatsheet' })
    const labels = bubbles.map((b) => b.content.split('\n')[0])
    expect(labels).toEqual([
      REFERENCE_READING_CARD_LABELS.essence,
      REFERENCE_READING_CARD_LABELS.rule,
      REFERENCE_READING_CARD_LABELS.contrast,
      REFERENCE_READING_CARD_LABELS.templates,
      REFERENCE_READING_CARD_LABELS.examples,
      REFERENCE_READING_CARD_LABELS.mistakes,
    ])
    expect(labels).not.toContain(REFERENCE_READING_CARD_LABELS.selfCheck)
  })

  it('omits empty ru/note in examples (no undefined)', () => {
    const bubbles = buildLessonReadingBubbles(
      {
        ...baseIntro,
        quick: {
          ...baseIntro.quick,
          examples: [{ en: 'I have lived here since 2010.', ru: '', note: '' }],
        },
      },
      { mode: 'cheatsheet' }
    )
    const examplesCard = bubbles.find((b) =>
      b.content.startsWith(REFERENCE_READING_CARD_LABELS.examples)
    )
    expect(examplesCard?.content).toContain('✓ I have lived here since 2010.')
    expect(examplesCard?.content).not.toContain('undefined')
    expect(examplesCard?.content).not.toContain('→')
    expect(examplesCard?.content).not.toContain('()')
  })
})

describe('reference mirror', () => {
  it('copies contrast from It’s lesson intro into sheet and lookup bubbles', () => {
    const sheet = buildReferenceSheetFromLesson(getStructuredLessonById('1'))
    expect(sheet?.contrast?.length).toBeGreaterThan(0)
    const refBubbles = buildReferenceBubbles(sheet!, { mode: 'lookup' })
    expect(refBubbles.some((b) => b.content.startsWith(REFERENCE_READING_CARD_LABELS.contrast))).toBe(
      true
    )
    expect(refBubbles[0]?.content.split('\n')[0]).toBe('Тема')
  })

  it('keeps same card keys for I am lesson intro vs lookup (labels may differ)', () => {
    const lesson = getStructuredLessonById('4')
    expect(lesson?.intro).toBeTruthy()
    const introBubbles = buildReadingIntroBubbles(lesson!.intro!, 'adult')
    const sheet = buildReferenceSheetFromLesson(lesson)
    expect(sheet?.selfCheck).toBeTruthy()
    const refBubbles = buildReferenceBubbles(sheet!, { mode: 'lookup' })
    expect(refBubbles).toHaveLength(introBubbles.length)
    expect(refBubbles.every((b) => b.content.split('\n').length > 1)).toBe(true)
  })
})

describe('reading layout + labels', () => {
  it('keeps reading column aligned with dialog session column', () => {
    expect(READING_COLUMN_MAX_CLASS).toBe('max-w-[29rem]')
  })

  it('keeps shared card keys; reference copy uses lookup labels', () => {
    expect(LESSON_READING_CARD_ORDER).toContain('contrast')
    expect(LESSON_READING_CARD_LABELS.essence).toBe('Тема урока')
    expect(LESSON_READING_CARD_LABELS.contrast).toBe('Не путать')
    expect(REFERENCE_COPY.cardHook).toBe(REFERENCE_READING_CARD_LABELS.essence)
    expect(REFERENCE_COPY.cardHook).toBe('Тема')
    expect(REFERENCE_COPY.cardContrast).toBe('Не путать')
    expect(REFERENCE_COPY.cardFormula).toBe(REFERENCE_READING_CARD_LABELS.templates)
    expect(REFERENCE_COPY.hubTitle).toBe('Справочник')
  })
})
