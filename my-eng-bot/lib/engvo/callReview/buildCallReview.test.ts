import { describe, expect, it } from 'vitest'
import {
  buildCallReview,
  callReviewCardFromLanguageNote,
} from '@/lib/engvo/callReview/buildCallReview'
import type { CallReviewBufferItem } from '@/lib/engvo/callReview/types'
import type { LanguageNote } from '@/lib/languageNote/types'
import { formatCallReviewSummaryLine } from '@/lib/uiCopy/callReview'

function item(
  partial: Partial<CallReviewBufferItem> & Pick<CallReviewBufferItem, 'utteranceHash' | 'seq'>
): CallReviewBufferItem {
  return {
    original: partial.original ?? `orig-${partial.seq}`,
    correct: partial.correct ?? `corr-${partial.seq}`,
    reason: partial.reason ?? 'reason',
    better: partial.better ?? null,
    reviewTopics: partial.reviewTopics ?? [],
    lessonId: partial.lessonId ?? null,
    sourceNote: partial.sourceNote ?? null,
    teacherEtalon: partial.teacherEtalon,
    utteranceHash: partial.utteranceHash,
    seq: partial.seq,
  }
}

function note(overrides: Partial<LanguageNote> = {}): LanguageNote {
  return {
    status: 'needs_fix',
    original: 'I go yesterday',
    correct: 'I went yesterday',
    correctHighlights: [],
    correctReasons: ['Past Simple'],
    better: null,
    betterHighlights: [],
    betterReasons: [],
    betterAlternatives: [],
    reviewTopics: [{ id: 'past', title: 'Past Simple — прошедшее' }],
    lessonId: null,
    lessonTitle: null,
    ...overrides,
  }
}

describe('buildCallReview', () => {
  it('keeps last 5 of 6+ and builds free summary', () => {
    const items = Array.from({ length: 6 }, (_, i) =>
      item({
        utteranceHash: `h${i}`,
        seq: i,
        original: `o${i}`,
        correct: `c${i}`,
        reviewTopics: [{ id: 't', title: 'Same Topic' }],
      })
    )
    const session = buildCallReview('free_call', items)
    expect(session.cards).toHaveLength(5)
    expect(session.cards.map((c) => c.original)).toEqual(['o1', 'o2', 'o3', 'o4', 'o5'])
    expect(session.topics).toHaveLength(1)
    expect(session.summaryLine).toBe(formatCallReviewSummaryLine('free_call', 5))
  })

  it('dedupes same utteranceHash keeping latest seq', () => {
    const session = buildCallReview('free_call', [
      item({ utteranceHash: 'same', seq: 1, original: 'old', correct: 'A' }),
      item({ utteranceHash: 'same', seq: 2, original: 'new', correct: 'B' }),
    ])
    expect(session.cards).toHaveLength(1)
    expect(session.cards[0]?.original).toBe('new')
  })

  it('teacher cards have no reason/better', () => {
    const session = buildCallReview('teacher', [
      item({
        utteranceHash: 't1',
        seq: 0,
        original: 'I goed',
        correct: 'I went',
        reason: 'should hide',
        better: 'I left',
        teacherEtalon: true,
      }),
    ])
    expect(session.cards[0]?.reason).toBeNull()
    expect(session.cards[0]?.better).toBeNull()
    expect(session.cards[0]?.teacherEtalon).toBe(true)
    expect(session.summaryLine).toContain('правка')
  })

  it('callReviewCardFromLanguageNote skips non needs_fix', () => {
    expect(
      callReviewCardFromLanguageNote(note({ status: 'already_good' }), 'h', 0)
    ).toBeNull()
    expect(
      callReviewCardFromLanguageNote(note({ status: 'needs_better' }), 'h', 0)
    ).toBeNull()
    expect(callReviewCardFromLanguageNote(note(), 'h', 0)?.original).toBe('I go yesterday')
  })

  it('omits better when equal to correct', () => {
    const session = buildCallReview('free_call', [
      item({
        utteranceHash: 'x',
        seq: 0,
        original: 'a',
        correct: 'I went',
        better: 'I went',
      }),
    ])
    expect(session.cards[0]?.better).toBeNull()
  })
})

describe('formatCallReviewSummaryLine', () => {
  it('pluralizes places and fixes', () => {
    expect(formatCallReviewSummaryLine('free_call', 1)).toContain('1 место')
    expect(formatCallReviewSummaryLine('free_call', 2)).toContain('2 места')
    expect(formatCallReviewSummaryLine('free_call', 5)).toContain('5 мест')
    expect(formatCallReviewSummaryLine('teacher', 1)).toContain('1 правка')
    expect(formatCallReviewSummaryLine('teacher', 3)).toContain('3 правки')
  })
})
