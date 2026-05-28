import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PUZZLE_ERROR_TEXT,
  estimatePuzzleBottomStackMinHeight,
  estimatePuzzleWordBankMinHeight,
  PUZZLE_BOTTOM_STACK_FALLBACK,
  buildPuzzleFooterVoiceCandidate,
  resolveActivePuzzleWordBankMinHeight,
  resolvePuzzleAttemptChatMessage,
  resolvePuzzleWordBankHeight,
  resolvePuzzleWordsPerRow,
  shouldCaptureBankBaseline,
  shouldResetBankBaseline,
} from '@/lib/puzzlePanelLayout'

describe('resolvePuzzleAttemptChatMessage', () => {
  it('returns errorText on first attempt', () => {
    expect(
      resolvePuzzleAttemptChatMessage({
        attempts: 1,
        errorText: DEFAULT_PUZZLE_ERROR_TEXT,
        hintText: 'Подсказка: первое слово — I.',
        wordCount: 6,
      })
    ).toBe(DEFAULT_PUZZLE_ERROR_TEXT)
  })

  it('returns hintText from second attempt when word bank is long', () => {
    expect(
      resolvePuzzleAttemptChatMessage({
        attempts: 2,
        errorText: DEFAULT_PUZZLE_ERROR_TEXT,
        hintText: 'Подсказка: первое слово — I.',
        wordCount: 6,
      })
    ).toBe('Подсказка: первое слово — I.')
  })

  it('appends Скажи with variant answer on second attempt when word bank is short', () => {
    expect(
      resolvePuzzleAttemptChatMessage({
        attempts: 2,
        errorText: DEFAULT_PUZZLE_ERROR_TEXT,
        hintText: 'Подсказка: первое слово — I.',
        wordCount: 3,
        correctAnswer: 'I am a student.',
      })
    ).toBe(`${DEFAULT_PUZZLE_ERROR_TEXT}\nСкажи: I am a student.`)
  })

  it('keeps errorText on second attempt when word bank is short and answer is missing', () => {
    expect(
      resolvePuzzleAttemptChatMessage({
        attempts: 2,
        errorText: DEFAULT_PUZZLE_ERROR_TEXT,
        hintText: 'Подсказка: первое слово — I.',
        wordCount: 3,
      })
    ).toBe(DEFAULT_PUZZLE_ERROR_TEXT)
  })

  it('falls back to default error text when errorText is empty', () => {
    expect(
      resolvePuzzleAttemptChatMessage({
        attempts: 1,
        errorText: '  ',
        hintText: '',
        wordCount: 3,
      })
    ).toBe(DEFAULT_PUZZLE_ERROR_TEXT)
  })
})

describe('shouldCaptureBankBaseline', () => {
  it('is true when bank is full and slots are empty', () => {
    expect(
      shouldCaptureBankBaseline({
        selectedCount: 0,
        availableCount: 3,
        fullCount: 3,
      })
    ).toBe(true)
  })

  it('is false when words are in slots', () => {
    expect(
      shouldCaptureBankBaseline({
        selectedCount: 1,
        availableCount: 2,
        fullCount: 3,
      })
    ).toBe(false)
  })
})

describe('shouldResetBankBaseline', () => {
  it('is true when variant id changes', () => {
    expect(shouldResetBankBaseline('a', 'b')).toBe(true)
  })

  it('is false for the same variant id', () => {
    expect(shouldResetBankBaseline('a', 'a')).toBe(false)
  })
})

describe('puzzle word bank height', () => {
  it('estimates one row for two short words', () => {
    expect(estimatePuzzleWordBankMinHeight(2)).toBe(36)
  })

  it('estimates one row for four short words (matches grid-cols-4 slots)', () => {
    expect(estimatePuzzleWordBankMinHeight(4)).toBe(36)
    expect(resolvePuzzleWordsPerRow(4)).toBe(4)
  })

  it('estimates three rows for five words on narrow layout', () => {
    expect(estimatePuzzleWordBankMinHeight(5)).toBe(120)
  })

  it('prefers measured height when it is larger than estimate', () => {
    expect(
      resolvePuzzleWordBankHeight({
        fullCount: 2,
        measuredHeight: 48,
      })
    ).toBe(48)
  })

  it('estimates one row for three short words', () => {
    expect(
      resolvePuzzleWordBankHeight({
        fullCount: 3,
      })
    ).toBe(36)
    expect(resolvePuzzleWordsPerRow(3)).toBe(3)
  })

  it('keeps full-bank min height when all words are in slots', () => {
    expect(
      resolveActivePuzzleWordBankMinHeight({
        fullWordCount: 3,
        measuredHeight: 78,
      })
    ).toBe(78)
    expect(
      resolveActivePuzzleWordBankMinHeight({
        fullWordCount: 3,
      })
    ).toBe(36)
  })

  it('uses measured height for four words instead of inflating with a two-row estimate', () => {
    expect(
      resolveActivePuzzleWordBankMinHeight({
        fullWordCount: 4,
        measuredHeight: 36,
      })
    ).toBe(36)
  })

  it('uses the same baseline while words move between bank and slots', () => {
    const baseline = resolveActivePuzzleWordBankMinHeight({ fullWordCount: 3 })
    expect(baseline).toBe(36)
    expect(resolveActivePuzzleWordBankMinHeight({ fullWordCount: 3 })).toBe(baseline)
  })
})

describe('buildPuzzleFooterVoiceCandidate', () => {
  it('uses variant title for footer hint', () => {
    const candidate = buildPuzzleFooterVoiceCandidate({
      subIndex: 1,
      subTotal: 3,
      variantTitle: 'Пазл 2/3: откуда ты',
    })
    expect(candidate.text).toBe('Пазл 2/3: откуда ты')
    expect(candidate.priority).toBe(55)
  })
})

describe('puzzle bottom stack height', () => {
  it('exposes a CSS fallback taller than chat input', () => {
    expect(PUZZLE_BOTTOM_STACK_FALLBACK).toBe('18rem')
  })

  it('estimates full panel height including word bank', () => {
    expect(estimatePuzzleBottomStackMinHeight(2)).toBe(206)
    expect(estimatePuzzleBottomStackMinHeight(4)).toBe(206)
  })
})
