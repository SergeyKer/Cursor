import { describe, expect, it, vi } from 'vitest'
import { generateReferenceSheet } from '@/lib/reference/generateReferenceSheet'

vi.mock('@/lib/featureFlags', () => ({
  featureFlags: {
    referenceGenerate: false,
  },
}))

describe('generateReferenceSheet', () => {
  it('rejects generation when the flag is off without groundedExplain', async () => {
    const fetcher = vi.fn()
    const result = await generateReferenceSheet({
      query: 'present perfect usage',
      fetcher,
    })
    expect(result).toEqual({ kind: 'rejected', reason: 'generate_disabled' })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('allows groundedExplain when the flag is off and calls the network', async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        intro: {
          topic: 'for / since',
          quick: {
            takeaway: 'for = duration, since = start',
            why: ['For names a period.', 'Since names a starting point.'],
            how: ['Use for + period.', 'Use since + point in time.'],
            examples: [{ en: 'I have lived here for years.', ru: 'Я живу здесь уже годы.' }],
          },
        },
      })
    )
    const result = await generateReferenceSheet({
      query: 'for / since',
      fetcher,
      groundedExplain: {
        answerKind: 'contrast',
        title: 'for / since',
        paragraphs: ['For is duration.', 'Since is start point.'],
        examplesEn: ['I have lived here for years.'],
        topicAnchor: {
          title: 'for / since',
          canonicalKey: 'for_since',
          lessonIdHint: null,
        },
        cheatsheetVisibility: 'primary',
      },
    })
    expect(fetcher).toHaveBeenCalled()
    expect(result.kind === 'rejected' ? result.reason : null).not.toBe('generate_disabled')
  })

  it('rejects short tokens before checking the flag', async () => {
    const result = await generateReferenceSheet({ query: 'have' })
    expect(result).toEqual({ kind: 'rejected', reason: 'short_token' })
  })

  it('allows short query when generateQuery override is set (still respects flag)', async () => {
    const fetcher = vi.fn()
    const result = await generateReferenceSheet({
      query: 'get',
      generateQuery: 'get tired — become adjective',
      fetcher,
    })
    expect(result).toEqual({ kind: 'rejected', reason: 'generate_disabled' })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('builds local sheet from tutor explain', async () => {
    const { buildReferenceSheetFromTutorExplain } = await import(
      '@/lib/reference/generateReferenceSheet'
    )
    const sheet = buildReferenceSheetFromTutorExplain({
      answerKind: 'grammar',
      title: 'since',
      paragraphs: ['Since marks a starting point.'],
      examplesEn: ['I have lived here since 2010.'],
      topicAnchor: { title: 'since', canonicalKey: 'since', lessonIdHint: null },
      cheatsheetVisibility: 'primary',
    })
    expect(sheet?.title).toBe('since')
    expect(sheet?.rule[0]).toContain('starting point')
    expect(sheet?.examples[0]?.en).toContain('2010')
    expect(sheet?.examples[0]).toEqual({
      en: 'I have lived here since 2010.',
      ru: '',
      note: '',
    })
  })

  it('local tutor sheet paragraphs show in cheatsheet rule card without undefined', async () => {
    const { buildReferenceSheetFromTutorExplain } = await import(
      '@/lib/reference/generateReferenceSheet'
    )
    const { buildReferenceBubbles } = await import('@/lib/reference/buildReferenceBubbles')
    const { REFERENCE_READING_CARD_LABELS } = await import('@/lib/uiCopy/lessonReadingCards')
    const sheet = buildReferenceSheetFromTutorExplain({
      answerKind: 'grammar',
      title: 'since',
      paragraphs: ['Since marks a starting point.'],
      examplesEn: ['I have lived here since 2010.'],
      rememberRu: 'Since = точка старта.',
      topicAnchor: { title: 'since', canonicalKey: 'since', lessonIdHint: null },
      cheatsheetVisibility: 'primary',
    })
    expect(sheet).not.toBeNull()
    const bubbles = buildReferenceBubbles(sheet!, { mode: 'cheatsheet' })
    const labels = bubbles.map((b) => b.content.split('\n')[0])
    expect(labels).toContain(REFERENCE_READING_CARD_LABELS.rule)
    expect(labels).toContain(REFERENCE_READING_CARD_LABELS.examples)
    const joined = bubbles.map((b) => b.content).join('\n')
    expect(joined).toContain('Since marks a starting point.')
    expect(joined).not.toContain('undefined')
  })
})
