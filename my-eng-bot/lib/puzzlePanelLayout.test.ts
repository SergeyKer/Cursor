import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PUZZLE_ERROR_TEXT,
  estimatePuzzleBottomStackMinHeight,
  estimatePuzzleWordBankMinHeight,
  PUZZLE_BOTTOM_STACK_FALLBACK,
  resolvePuzzleAttemptChatMessage,
  resolvePuzzleWordBankHeight,
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
      })
    ).toBe(DEFAULT_PUZZLE_ERROR_TEXT)
  })

  it('returns hintText from second attempt', () => {
    expect(
      resolvePuzzleAttemptChatMessage({
        attempts: 2,
        errorText: DEFAULT_PUZZLE_ERROR_TEXT,
        hintText: 'Подсказка: первое слово — I.',
      })
    ).toBe('Подсказка: первое слово — I.')
  })

  it('falls back to default error text when errorText is empty', () => {
    expect(
      resolvePuzzleAttemptChatMessage({
        attempts: 1,
        errorText: '  ',
        hintText: '',
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

  it('estimates two rows for four words on narrow layout', () => {
    expect(estimatePuzzleWordBankMinHeight(4)).toBe(78)
  })

  it('prefers measured height when it is larger than estimate', () => {
    expect(
      resolvePuzzleWordBankHeight({
        fullCount: 2,
        measuredHeight: 48,
      })
    ).toBe(48)
  })

  it('falls back to estimate when bank was never measured', () => {
    expect(
      resolvePuzzleWordBankHeight({
        fullCount: 3,
      })
    ).toBe(78)
  })
})

describe('puzzle bottom stack height', () => {
  it('exposes a CSS fallback taller than chat input', () => {
    expect(PUZZLE_BOTTOM_STACK_FALLBACK).toBe('18rem')
  })

  it('estimates full panel height including word bank', () => {
    expect(estimatePuzzleBottomStackMinHeight(2)).toBe(206)
    expect(estimatePuzzleBottomStackMinHeight(4)).toBe(248)
  })
})
