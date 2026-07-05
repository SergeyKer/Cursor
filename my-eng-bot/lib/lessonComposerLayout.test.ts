import { describe, expect, it } from 'vitest'
import {
  estimateIntroComposerMinHeight,
  estimateLessonChoiceChipsMinHeight,
  estimateLessonComposerMinHeight,
  isLessonChoiceChipsPanel,
  resolveLessonComposerPanelKind,
} from '@/lib/lessonComposerLayout'

const ITS_TIME_WORDS = ["It's", 'time', 'to', 'go', 'home']

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

describe('resolveLessonComposerPanelKind - post-chip lesson steps', () => {
  it('step 3 fill_text uses text-input panel', () => {
    expect(
      resolveLessonComposerPanelKind({
        exercise: { type: 'fill_text', correctAnswer: 'Russia' },
        hasPostLessonOptions: false,
        showLessonFinale: false,
      })
    ).toBe('text-input')
  })

  it('step 4 translate uses text-input panel', () => {
    expect(
      resolveLessonComposerPanelKind({
        exercise: { type: 'translate', correctAnswer: "I'm tired." },
        hasPostLessonOptions: false,
        showLessonFinale: false,
      })
    ).toBe('text-input')
  })

  it('step 5 puzzle uses puzzle panel', () => {
    expect(
      resolveLessonComposerPanelKind({
        exercise: { type: 'sentence_puzzle', correctAnswer: "I'm happy." },
        hasPostLessonOptions: false,
        showLessonFinale: false,
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
        showLessonFinale: false,
      })
    ).toBe('choice')
  })

  it('return briefing uses briefing panel', () => {
    expect(
      resolveLessonComposerPanelKind({
        exercise: {
          type: 'fill_choice',
          options: ['a', 'b'],
          correctAnswer: 'a',
        },
        hasPostLessonOptions: false,
        showLessonFinale: false,
        showReturnBriefing: true,
      })
    ).toBe('briefing')
  })

  it('coin forgiveness confirm uses forgiveness panel', () => {
    expect(
      resolveLessonComposerPanelKind({
        exercise: { type: 'translate', correctAnswer: "I'm tired." },
        hasPostLessonOptions: false,
        showLessonFinale: false,
        showCoinForgivenessConfirm: true,
      })
    ).toBe('forgiveness')
  })
})

describe('estimateLessonComposerMinHeight', () => {
  it('adds no extra height for briefing dual cta in one row', () => {
    const single = estimateLessonComposerMinHeight({ panelKind: 'briefing', compact: true })
    const dual = estimateLessonComposerMinHeight({
      panelKind: 'briefing',
      compact: true,
      briefingDualCta: true,
    })
    expect(dual - single).toBe(0)
  })
})

describe('estimateLessonChoiceChipsMinHeight', () => {
  it('uses one row for three short options', () => {
    expect(estimateLessonChoiceChipsMinHeight(3)).toBe(48)
  })

  it('uses two rows for step 1 options on a narrow panel', () => {
    const step1Options = ["I'm happy.", "I'm from Russia.", "I am a student."]
    expect(
      estimateLessonChoiceChipsMinHeight(3, step1Options, 360)
    ).toBe(90)
    expect(estimateLessonChoiceChipsMinHeight(3)).toBe(48)
  })

  it('uses count-based one row when only count is provided without options', () => {
    expect(estimateLessonChoiceChipsMinHeight(3)).toBe(48)
  })

  it('uses width-aware layout when options provided but width is not measured yet', () => {
    const step1Options = ["I'm happy.", "I'm from Russia.", "I am a student."]
    expect(estimateLessonChoiceChipsMinHeight(3, step1Options)).toBe(90)
    expect(estimateLessonChoiceChipsMinHeight(0, step1Options)).toBe(90)
  })

  it('uses two rows for four options', () => {
    expect(estimateLessonChoiceChipsMinHeight(4)).toBe(90)
  })

  it('documents practice reference options row estimate on typical lane widths', () => {
    const practiceRefOptions = ["It's dark.", "It's time to sleep.", "It's time to drink."]
    expect(estimateLessonChoiceChipsMinHeight(3, practiceRefOptions, 360)).toBe(90)
    expect(estimateLessonChoiceChipsMinHeight(3, practiceRefOptions, 432)).toBe(48)
  })
})

describe('estimateIntroComposerMinHeight', () => {
  it('covers intro quick layout: chip row + primary CTA', () => {
    expect(
      estimateIntroComposerMinHeight({
        hasSecondaryChips: true,
      })
    ).toBeGreaterThanOrEqual(116)
  })

  it('adds height for error banner', () => {
    const base = estimateIntroComposerMinHeight({ hasSecondaryChips: true })
    const withError = estimateIntroComposerMinHeight({
      hasSecondaryChips: true,
      hasErrorBanner: true,
    })
    expect(withError).toBeGreaterThan(base)
  })
})

describe('estimateLessonComposerMinHeight', () => {
  it('choice panel uses option text layout on narrow width', () => {
    const step1Options = ["I'm happy.", "I'm from Russia.", "I am a student."]
    const legacy = estimateLessonComposerMinHeight({
      panelKind: 'choice',
      optionCount: 3,
      compact: true,
    })
    const withOptions = estimateLessonComposerMinHeight({
      panelKind: 'choice',
      optionCount: 3,
      choiceOptions: step1Options,
      containerWidthPx: 360,
      compact: true,
    })
    const beforeWidthMeasured = estimateLessonComposerMinHeight({
      panelKind: 'choice',
      optionCount: 3,
      choiceOptions: step1Options,
      compact: true,
    })
    expect(withOptions).toBeGreaterThan(legacy)
    expect(withOptions).toBe(98)
    expect(beforeWidthMeasured).toBe(withOptions)
  })

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

  it('post-lesson panel reserves tall dock for action cards', () => {
    expect(
      estimateLessonComposerMinHeight({
        panelKind: 'post-lesson',
        compact: false,
      })
    ).toBeGreaterThanOrEqual(250)
  })

  it('forgiveness panel reserves confirm card and action buttons', () => {
    const standard = estimateLessonComposerMinHeight({
      panelKind: 'forgiveness',
      compact: false,
    })
    const compact = estimateLessonComposerMinHeight({
      panelKind: 'forgiveness',
      compact: true,
    })
    expect(standard).toBeGreaterThanOrEqual(230)
    expect(compact).toBeGreaterThanOrEqual(220)
    expect(standard).toBeGreaterThan(compact)
  })

  it('finale panel fits medal card and action grid', () => {
    const finaleHeight = estimateLessonComposerMinHeight({
      panelKind: 'finale',
      compact: false,
    })
    const medalHeight = estimateLessonComposerMinHeight({
      panelKind: 'medal',
      compact: false,
    })

    expect(finaleHeight).toBeGreaterThan(medalHeight)
    expect(finaleHeight).toBeGreaterThanOrEqual(300)
  })

  it('puzzle panel uses width-aware estimate for short sentences', () => {
    const puzzleHeight = estimateLessonComposerMinHeight({
      panelKind: 'puzzle',
      puzzleSlotTokens: ['I', 'know', 'what', 'she', 'likes'],
      puzzleBankWords: ['I', 'know', 'what', 'she', 'likes'],
      puzzleHasTitle: true,
      puzzleHasInstruction: true,
      compact: true,
    })
    expect(puzzleHeight).toBeGreaterThan(100)
    expect(puzzleHeight).toBeLessThan(320)
  })

  it('word-builder-pro bank with traps reserves more height than clean bank', () => {
    const slots = ["It's", 'time', 'to', 'go', 'home']
    const bank7 = [...slots, 'goes', 'times']
    const bank5 = [...slots]
    const compact = true
    const width = 360
    const withTraps = estimateLessonComposerMinHeight({
      panelKind: 'puzzle',
      puzzleSlotTokens: slots,
      puzzleBankWords: bank7,
      puzzleHasTitle: false,
      puzzleHasInstruction: false,
      compact,
      containerWidthPx: width,
    })
    const clean = estimateLessonComposerMinHeight({
      panelKind: 'puzzle',
      puzzleSlotTokens: slots,
      puzzleBankWords: bank5,
      puzzleHasTitle: false,
      puzzleHasInstruction: false,
      compact,
      containerWidthPx: width,
    })
    expect(withTraps).toBeGreaterThanOrEqual(clean)
  })

  it('practice compact puzzle omits title block from estimate', () => {
    const withTitle = estimateLessonComposerMinHeight({
      panelKind: 'puzzle',
      puzzleSlotTokens: ITS_TIME_WORDS,
      puzzleBankWords: ITS_TIME_WORDS,
      puzzleHasTitle: true,
      puzzleHasInstruction: false,
      compact: true,
    })
    const withoutTitle = estimateLessonComposerMinHeight({
      panelKind: 'puzzle',
      puzzleSlotTokens: ITS_TIME_WORDS,
      puzzleBankWords: ITS_TIME_WORDS,
      puzzleHasTitle: false,
      puzzleHasInstruction: false,
      compact: true,
    })
    expect(withTitle - withoutTitle).toBe(34)
  })

  it('practice canonical word chips are shorter than sentence chips', () => {
    const wordHeight = estimateLessonComposerMinHeight({
      panelKind: 'choice',
      choiceOptions: ['drink', 'sleeps', 'sleeping'],
      compact: true,
      containerWidthPx: 360,
    })
    const sentenceHeight = estimateLessonComposerMinHeight({
      panelKind: 'choice',
      choiceOptions: ["It's dark.", "It's time to sleep.", "It's time to drink."],
      compact: true,
      containerWidthPx: 360,
    })
    expect(wordHeight).toBeLessThan(sentenceHeight)
    expect(wordHeight).toBeGreaterThanOrEqual(40)
    expect(sentenceHeight).toBeGreaterThanOrEqual(80)
  })
})
