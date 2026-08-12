import { beforeEach, describe, expect, it, vi } from 'vitest'
import { peekTutorCheatsheetAvailable } from '@/lib/tutor/peekTutorCheatsheetAvailable'
import type { TutorExplainAnswer } from '@/lib/tutor/types'

vi.mock('@/lib/featureFlags', () => ({
  featureFlags: {
    referenceV1: true,
    referenceGenerate: false,
  },
}))

const grammarAnswer = (opts: {
  title?: string
  hint?: string | null
  canonicalKey?: string
  visibility?: TutorExplainAnswer['cheatsheetVisibility']
}): TutorExplainAnswer => ({
  answerKind: 'grammar',
  title: opts.title ?? 'Test',
  paragraphs: ['Para one.', 'Para two.'],
  examplesEn: ['I am Anna.'],
  topicAnchor: {
    title: opts.title ?? 'Test',
    canonicalKey: opts.canonicalKey ?? 'test_topic',
    lessonIdHint: opts.hint === undefined ? null : opts.hint,
  },
  cheatsheetVisibility: opts.visibility ?? 'primary',
})

describe('peekTutorCheatsheetAvailable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('true for lessonIdHint that opens', () => {
    expect(peekTutorCheatsheetAvailable(grammarAnswer({ hint: '4' }))).toBe(true)
  })

  it('true for is doing prebuilt via runtime assumption', () => {
    expect(peekTutorCheatsheetAvailable(grammarAnswer({ title: 'is doing', hint: null }))).toBe(
      true
    )
  })

  it('true for get choose', () => {
    expect(peekTutorCheatsheetAvailable(grammarAnswer({ title: 'get', hint: null }))).toBe(true)
  })

  it('true for grounded generate fallback when no gold', () => {
    expect(
      peekTutorCheatsheetAvailable(
        grammarAnswer({ title: 'привет', hint: null, canonicalKey: 'nope' })
      )
    ).toBe(true)
  })

  it('false when translate (not eligible)', () => {
    expect(
      peekTutorCheatsheetAvailable({
        ...grammarAnswer({ hint: '4' }),
        answerKind: 'translate',
        cheatsheetVisibility: 'hidden',
      })
    ).toBe(false)
  })

  it('true for how_to_say with EN anchor', () => {
    expect(
      peekTutorCheatsheetAvailable({
        answerKind: 'how_to_say',
        title: "I can't come",
        paragraphs: ['Use can for ability.'],
        examplesEn: ["I can't come tomorrow."],
        topicAnchor: {
          title: "I can't come",
          canonicalKey: 'i_cant_come',
          lessonIdHint: null,
        },
        cheatsheetVisibility: 'hidden',
      })
    ).toBe(true)
  })
})
