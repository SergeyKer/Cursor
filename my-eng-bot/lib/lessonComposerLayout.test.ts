import { describe, expect, it } from 'vitest'
import {
  estimateLessonChoiceChipsMinHeight,
  estimateLessonComposerMinHeight,
  isLessonChoiceChipsPanel,
  resolveLessonComposerPanelKind,
} from '@/lib/lessonComposerLayout'

describe('isLessonChoiceChipsPanel', () => {
  it('detects fill_choice with options', () => {
    expect(
      isLessonChoiceChipsPanel({
        type: 'fill_choice',
        options: ['a', 'an', 'the'],
        correctAnswer: 'a',
      })
    ).toBe(true)
  })

  it('rejects text exercises', () => {
    expect(
      isLessonChoiceChipsPanel({
        type: 'fill_text',
        correctAnswer: 'Russia',
      })
    ).toBe(false)
  })

  it('rejects translate exercises', () => {
    expect(
      isLessonChoiceChipsPanel({
        type: 'translate',
        correctAnswer: "I'm happy.",
      })
    ).toBe(false)
  })
})

describe('resolveLessonComposerPanelKind — post-chip lesson steps', () => {
  it('step 3 fill_text uses text-input panel', () => {
    expect(
      resolveLessonComposerPanelKind({
        exercise: { type: 'fill_text', correctAnswer: 'Russia' },
        hasPostLessonOptions: false,
        showPostLessonMedalPhase: false,
      })
    ).toBe('text-input')
  })

  it('step 4 translate uses text-input panel', () => {
    expect(
      resolveLessonComposerPanelKind({
        exercise: { type: 'translate', correctAnswer: "I'm tired." },
        hasPostLessonOptions: false,
        showPostLessonMedalPhase: false,
      })
    ).toBe('text-input')
  })

  it('step 5 puzzle uses puzzle panel', () => {
    expect(
      resolveLessonComposerPanelKind({
        exercise: { type: 'sentence_puzzle', correctAnswer: "I'm happy." },
        hasPostLessonOptions: false,
        showPostLessonMedalPhase: false,
      })
    ).toBe('puzzle')
  })

  it('step 7 fill_choice uses choice panel', () => {
    expect(
      resolveLessonComposerPanelKind({
        exercise: {
          type: 'fill_choice',
          options: ['happy', 'tired', 'fine'],
          correctAnswer: 'happy',
        },
        hasPostLessonOptions: false,
        showPostLessonMedalPhase: false,
      })
    ).toBe('choice')
  })
})

describe('estimateLessonChoiceChipsMinHeight', () => {
  it('uses one row for three short options', () => {
    expect(estimateLessonChoiceChipsMinHeight(3)).toBe(48)
  })

  it('uses two rows for four options', () => {
    expect(estimateLessonChoiceChipsMinHeight(4)).toBe(90)
  })
})

describe('estimateLessonComposerMinHeight', () => {
  it('choice panel is taller with more rows', () => {
    const oneRow = estimateLessonComposerMinHeight({
      panelKind: 'choice',
      optionCount: 3,
      compact: true,
    })
    const twoRows = estimateLessonComposerMinHeight({
      panelKind: 'choice',
      optionCount: 4,
      compact: true,
    })
    expect(twoRows).toBeGreaterThan(oneRow)
  })

  it('text input has stable baseline', () => {
    expect(
      estimateLessonComposerMinHeight({
        panelKind: 'text-input',
        compact: false,
      })
    ).toBeGreaterThan(80)
  })
})
