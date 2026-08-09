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

  it('false for garbage title with no canon', () => {
    expect(
      peekTutorCheatsheetAvailable(
        grammarAnswer({ title: 'привет', hint: null, canonicalKey: 'nope' })
      )
    ).toBe(false)
  })

  it('false when cheatsheetVisibility hidden', () => {
    expect(
      peekTutorCheatsheetAvailable(grammarAnswer({ hint: '4', visibility: 'hidden' }))
    ).toBe(false)
  })
})
