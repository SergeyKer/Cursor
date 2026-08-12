import { describe, expect, it, vi } from 'vitest'
import {
  hasClearEnTopicAnchor,
  tutorTopicSheetChipLabel,
  tutorTopicSheetChipsEligible,
} from '@/lib/tutor/tutorTopicSheetChipsEligible'
import type { TutorExplainAnswer } from '@/lib/tutor/types'

vi.mock('@/lib/featureFlags', () => ({
  featureFlags: {
    referenceV1: true,
  },
}))

const base = (over: Partial<TutorExplainAnswer> & Pick<TutorExplainAnswer, 'answerKind'>): TutorExplainAnswer => ({
  title: over.title ?? 'Test',
  paragraphs: over.paragraphs ?? ['p'],
  examplesEn: over.examplesEn ?? ['Ex.'],
  topicAnchor: over.topicAnchor ?? {
    title: over.title ?? 'Test',
    canonicalKey: 'test',
    lessonIdHint: null,
  },
  cheatsheetVisibility: over.cheatsheetVisibility ?? 'hidden',
  answerKind: over.answerKind,
})

describe('tutorTopicSheetChipsEligible', () => {
  it('allows grammar/contrast/form', () => {
    expect(tutorTopicSheetChipsEligible(base({ answerKind: 'grammar' }))).toBe(true)
    expect(tutorTopicSheetChipsEligible(base({ answerKind: 'contrast' }))).toBe(true)
    expect(tutorTopicSheetChipsEligible(base({ answerKind: 'form' }))).toBe(true)
  })

  it('allows how_to_say only with EN anchor', () => {
    expect(
      tutorTopicSheetChipsEligible(
        base({ answerKind: 'how_to_say', title: "I can't come" })
      )
    ).toBe(true)
    expect(
      tutorTopicSheetChipsEligible(base({ answerKind: 'how_to_say', title: 'как сказать' }))
    ).toBe(false)
  })

  it('blocks translate', () => {
    expect(tutorTopicSheetChipsEligible(base({ answerKind: 'translate' }))).toBe(false)
  })

  it('chip label is always Шпаргалка', () => {
    expect(
      tutorTopicSheetChipLabel(
        base({ answerKind: 'grammar', title: "Using 'since' in English" })
      )
    ).toBe('Шпаргалка')

    expect(
      tutorTopicSheetChipLabel(base({ answerKind: 'how_to_say', title: "I can't come" }))
    ).toBe('Шпаргалка')

    expect(
      tutorTopicSheetChipLabel(
        base({
          answerKind: 'contrast',
          title: '',
          topicAnchor: { title: '', canonicalKey: 'for_since', lessonIdHint: null },
        })
      )
    ).toBe('Шпаргалка')
  })

  it('hasClearEnTopicAnchor', () => {
    expect(hasClearEnTopicAnchor(base({ answerKind: 'how_to_say', title: 'Hello' }))).toBe(true)
    expect(hasClearEnTopicAnchor(base({ answerKind: 'how_to_say', title: 'привет' }))).toBe(false)
  })
})
