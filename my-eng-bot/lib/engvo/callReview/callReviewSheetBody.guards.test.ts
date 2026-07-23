import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function readCallReviewSheetBody(): string {
  return readFileSync(join(process.cwd(), 'components', 'chat', 'CallReviewSheetBody.tsx'), 'utf8')
}

/** Slice from CallReviewErrorCard declaration until CallReviewSheetReady. */
function extractErrorCardSource(source: string): string {
  const start = source.indexOf('function CallReviewErrorCard')
  const end = source.indexOf('export function CallReviewSheetReady')
  expect(start).toBeGreaterThanOrEqual(0)
  expect(end).toBeGreaterThan(start)
  return source.slice(start, end)
}

describe('CallReviewSheetBody dense ErrorCard guards', () => {
  const source = readCallReviewSheetBody()
  const errorCard = extractErrorCardSource(source)

  it('CallReviewErrorCard does not nest LanguageNoteSectionCard', () => {
    expect(errorCard).not.toContain('LanguageNoteSectionCard')
  })

  it('LanguageNoteSectionCard appears only in the review block', () => {
    const jsxOpens = source.match(/<LanguageNoteSectionCard\b/g) ?? []
    expect(jsxOpens.length).toBe(1)
    expect(source).toContain("title={CALL_REVIEW_COPY.review}")
  })

  it('why row uses CALL_REVIEW_COPY.why, card.reason, and 💡 marker', () => {
    expect(errorCard).toContain('CALL_REVIEW_COPY.why')
    expect(errorCard).toContain('card.reason')
    expect(errorCard).toContain('💡')
  })

  it('why and better rows are gated off teacherEtalon', () => {
    expect(errorCard).toMatch(/!card\.teacherEtalon/)
  })

  it('CallReviewSheetReady keeps review chips wiring', () => {
    expect(source).toContain('LanguageNoteTopicChip')
    expect(source).toContain('onReviewTopicPress')
    expect(source).toContain('CALL_REVIEW_COPY.review')
  })

  it('ErrorCard root is a single language-note-card surface', () => {
    const cardClassMatches = errorCard.match(/language-note-card/g) ?? []
    expect(cardClassMatches.length).toBeGreaterThanOrEqual(1)
    expect(errorCard).toContain('language-note-card--shared')
    expect(errorCard).toMatch(/<section[\s\S]*language-note-card/)
  })

  it('ErrorCard row markers include said, correct, why, better', () => {
    expect(errorCard).toContain('💬')
    expect(errorCard).toContain('✅')
    expect(errorCard).toContain('💡')
    expect(errorCard).toContain('✨')
  })
})
