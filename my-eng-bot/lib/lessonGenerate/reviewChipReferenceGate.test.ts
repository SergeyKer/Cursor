import { describe, expect, it } from 'vitest'
import type { LessonIntro } from '@/types/lesson'
import {
  buildReviewChipRuntimeLessonId,
  prepareReviewChipIntroForReference,
  shouldRejectReviewChipLesson,
} from '@/lib/lessonGenerate/reviewChipReferenceGate'

function okIntro(overrides?: Partial<LessonIntro>): LessonIntro {
  return {
    topic: 'the',
    kind: 'structure',
    complexity: 'simple',
    quick: {
      why: ['Перед местом часто the.'],
      how: ['to the + place'],
      examples: [{ en: 'I go to the cinema.', ru: 'Я хожу в кино.', note: 'the' }],
      takeaway: 'Перед знакомым местом часто the.',
    },
    deepDive: {
      commonMistakes: ['Не to cinema — а to the cinema.'],
      selfCheckRule: 'То самое место? → the.',
    },
    ...overrides,
  }
}

describe('shouldRejectReviewChipLesson', () => {
  it('rejects http / fallback / missing intro', () => {
    expect(shouldRejectReviewChipLesson({ ok: false, intro: okIntro() }).reject).toBe(true)
    expect(shouldRejectReviewChipLesson({ ok: true, fallback: true, intro: okIntro() }).reject).toBe(
      true
    )
    expect(shouldRejectReviewChipLesson({ ok: true, intro: null }).reject).toBe(true)
  })

  it('rejects :: poison and generic fallback copy', () => {
    expect(
      shouldRejectReviewChipLesson({
        ok: true,
        intro: okIntro({ topic: 'the::-I13dsm' }),
      }).reject
    ).toBe(true)
    expect(
      shouldRejectReviewChipLesson({
        ok: true,
        intro: okIntro({
          quick: {
            why: ['the::-x помогает точнее выразить мысль в английском.'],
            how: ['Смотри на ситуацию'],
            examples: [{ en: 'x', ru: 'y', note: 'z' }],
            takeaway: 'Думай так: сначала смысл the::-x, потом форма.',
          },
        }),
      }).reject
    ).toBe(true)
  })

  it('accepts clean suitable intro', () => {
    expect(shouldRejectReviewChipLesson({ ok: true, fallback: false, intro: okIntro() })).toEqual({
      reject: false,
    })
  })
})

describe('prepareReviewChipIntroForReference', () => {
  it('pins topic and strips :: lines', () => {
    const prepared = prepareReviewChipIntroForReference(
      okIntro({
        topic: 'wrong',
        quick: {
          why: ['ok rule', 'bad :: leak'],
          how: ['to the cinema'],
          examples: [
            { en: 'I go to the cinema.', ru: 'Я хожу в кино.', note: 'the' },
            { en: 'bad ::', ru: 'x', note: 'y' },
          ],
          takeaway: 'Перед местом the.',
        },
      }),
      'the'
    )
    expect(prepared.topic).toBe('the')
    expect(prepared.quick.why).toEqual(['ok rule'])
    expect(prepared.quick.examples).toHaveLength(1)
  })
})

describe('buildReviewChipRuntimeLessonId', () => {
  it('avoids :: in id', () => {
    const id = buildReviewChipRuntimeLessonId('the', 'the::-I13dsm')
    expect(id).toBe('review-chip-the--I13dsm')
    expect(id.includes('::')).toBe(false)
  })
})
