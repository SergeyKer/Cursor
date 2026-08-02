import { describe, expect, it } from 'vitest'
import {
  ageBeWrongForm,
  buildAgeChoiceItems,
  buildPhraseContrastChoiceItems,
  isPhraseContrastPair,
  isPhraseContrastSide,
  matchAgeBeExample,
} from '@/lib/tutor/buildMicroChoiceItems'
import type { TutorExplainAnswer } from '@/lib/tutor/types'

function ageAnswer(partial?: Partial<TutorExplainAnswer>): TutorExplainAnswer {
  return {
    answerKind: 'grammar',
    title: 'Возраст',
    paragraphs: ['Возраст через be.'],
    examplesEn: ['I am 20 years old.', 'She is 18 years old.'],
    rememberRu: 'Возраст — I am … years old.',
    topicAnchor: {
      title: 'Возраст',
      canonicalKey: 'age_be',
      skillTagIds: ['present-simple'],
    },
    cheatsheetVisibility: 'primary',
    ...partial,
  }
}

describe('matchAgeBeExample', () => {
  it('parses years old with trailing period', () => {
    expect(matchAgeBeExample('I am 20 years old.')).toEqual({
      subject: 'I',
      be: 'am',
      age: '20',
      correct: 'I am 20 years old',
    })
  })

  it('rejects non-age examples', () => {
    expect(matchAgeBeExample('I have lost my keys.')).toBeNull()
    expect(matchAgeBeExample('an honest man')).toBeNull()
  })
})

describe('ageBeWrongForm', () => {
  it('uses have calque for third person', () => {
    const m = matchAgeBeExample('She is 18 years old.')!
    expect(ageBeWrongForm(m)).toBe('She have 18 years')
  })
})

describe('isPhraseContrastPair', () => {
  it('accepts concrete age phrases', () => {
    expect(isPhraseContrastPair(['I have 20 years', 'I am 20 years old'])).toBe(true)
  })

  it('rejects tense labels and short stubs', () => {
    expect(isPhraseContrastSide('Present Perfect')).toBe(false)
    expect(isPhraseContrastSide('will')).toBe(false)
    expect(isPhraseContrastPair(['will', 'going to'])).toBe(false)
  })

  it('rejects ellipsis templates', () => {
    expect(isPhraseContrastSide('I have … years')).toBe(false)
  })
})

describe('buildAgeChoiceItems', () => {
  it('builds at least two choice items', () => {
    const items = buildAgeChoiceItems(ageAnswer(), 'present-simple')
    expect(items.length).toBeGreaterThanOrEqual(2)
    expect(items.every((i) => i.kind === 'choice')).toBe(true)
    expect(items[0]!.skillTagId).toBe('present-simple')
  })

  it('returns empty for translate', () => {
    expect(buildAgeChoiceItems(ageAnswer({ answerKind: 'translate' }))).toEqual([])
  })

  it('synthesizes second item when only one age example', () => {
    const items = buildAgeChoiceItems(
      ageAnswer({ examplesEn: ['I am 20 years old.'] }),
      'present-simple'
    )
    expect(items.length).toBeGreaterThanOrEqual(2)
  })
})

describe('buildPhraseContrastChoiceItems', () => {
  it('builds from age contrastPair', () => {
    const items = buildPhraseContrastChoiceItems(
      ageAnswer({
        examplesEn: ['I am 20 years old.'],
        contrastPair: ['I have 20 years', 'I am 20 years old'],
      }),
      'present-simple'
    )
    expect(items.length).toBeGreaterThanOrEqual(2)
  })

  it('returns empty for will / going to', () => {
    expect(
      buildPhraseContrastChoiceItems(
        ageAnswer({
          answerKind: 'contrast',
          examplesEn: ['I will call.', 'I am going to call.'],
          contrastPair: ['will', 'going to'],
        })
      )
    ).toEqual([])
  })
})
