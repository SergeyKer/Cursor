import { describe, expect, it } from 'vitest'
import type { LanguageNote } from '@/lib/languageNote/types'
import {
  buildReviewChipCacheTopicKey,
  buildReviewChipLessonSystemPrompt,
  buildReviewChipLessonUserPayload,
} from '@/lib/lessonGenerate/reviewChipLessonPrompt'

const note: LanguageNote = {
  status: 'needs_fix',
  original: 'The book is over the table',
  correct: 'The book is on the table',
  correctHighlights: [],
  correctReasons: ['over — над; on — на поверхности', 'Для стола обычно on'],
  better: null,
  betterHighlights: [],
  betterReasons: [],
  betterAlternatives: [],
  reviewTopics: [],
  lessonId: null,
  lessonTitle: null,
}

describe('buildReviewChipLessonSystemPrompt', () => {
  it('includes anti-hallucination rules and etalon density', () => {
    const system = buildReviewChipLessonSystemPrompt()
    expect(system).toContain('ANTI-HALLUCINATION')
    expect(system).toContain('EN-anchor')
    expect(system).toContain('I am / I am from')
    expect(system).toContain('Не уводи в соседнюю грамматику')
  })
})

describe('buildReviewChipLessonUserPayload', () => {
  it('embeds original, correct, reasons and EN-anchor', () => {
    const user = buildReviewChipLessonUserPayload({
      chip: { id: 't1', title: 'over / on — предлоги места' },
      note,
    })
    expect(user).toContain('Тема (EN-anchor): over / on')
    expect(user).toContain('Gloss: предлоги места')
    expect(user).toContain('Ошибка ученика: The book is over the table')
    expect(user).toContain('Как правильно: The book is on the table')
    expect(user).toContain('over — над; on — на поверхности')
  })
})

describe('buildReviewChipCacheTopicKey', () => {
  it('is stable for same chip pair and differs when correct changes', () => {
    const a = buildReviewChipCacheTopicKey('over / on — места', 'a', 'b')
    const b = buildReviewChipCacheTopicKey('over / on — места', 'a', 'b')
    const c = buildReviewChipCacheTopicKey('over / on — места', 'a', 'c')
    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(a.startsWith('over / on::')).toBe(true)
  })
})
