import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PUZZLE_ERROR_TEXT,
  estimatePuzzleBottomStackMinHeight,
  estimatePuzzlePanelMinHeight,
  estimatePuzzleSlotBlockMinHeight,
  estimatePuzzleWordBankMinHeight,
  PUZZLE_BOTTOM_STACK_FALLBACK,
  buildPuzzleFooterVoiceCandidate,
  resolvePuzzleAttemptChatMessage,
  resolvePuzzleSlotColumns,
} from '@/lib/puzzlePanelLayout'
import { CHIP_PANEL_DEFAULT_WIDTH_PX } from '@/lib/chipFlexLayout'

const I_KNOW_WORDS = ['I', 'know', 'what', 'she', 'likes']

describe('resolvePuzzleAttemptChatMessage', () => {
  it('returns errorText on first attempt', () => {
    expect(
      resolvePuzzleAttemptChatMessage({
        attempts: 1,
        errorText: DEFAULT_PUZZLE_ERROR_TEXT,
        hintText: 'Подсказка: первое слово - I.',
        wordCount: 6,
      })
    ).toBe(DEFAULT_PUZZLE_ERROR_TEXT)
  })

  it('returns hintText from second attempt when word bank is long', () => {
    expect(
      resolvePuzzleAttemptChatMessage({
        attempts: 2,
        errorText: DEFAULT_PUZZLE_ERROR_TEXT,
        hintText: 'Подсказка: первое слово - I.',
        wordCount: 6,
      })
    ).toBe('Подсказка: первое слово - I.')
  })

  it('appends Выбери with variant answer on second attempt when word bank is short', () => {
    expect(
      resolvePuzzleAttemptChatMessage({
        attempts: 2,
        errorText: DEFAULT_PUZZLE_ERROR_TEXT,
        hintText: 'Подсказка: первое слово - I.',
        wordCount: 3,
        correctAnswer: 'I am a student.',
      })
    ).toBe(`${DEFAULT_PUZZLE_ERROR_TEXT}\nВыбери: I am a student.`)
  })

  it('keeps errorText on second attempt when word bank is short and answer is missing', () => {
    expect(
      resolvePuzzleAttemptChatMessage({
        attempts: 2,
        errorText: DEFAULT_PUZZLE_ERROR_TEXT,
        hintText: 'Подсказка: первое слово - I.',
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

describe('puzzle slot layout', () => {
  it('uses two columns for five slots on a narrow panel', () => {
    expect(resolvePuzzleSlotColumns(5, CHIP_PANEL_DEFAULT_WIDTH_PX)).toBe(2)
  })

  it('estimates three slot rows for five words on a narrow panel', () => {
    expect(estimatePuzzleSlotBlockMinHeight(5, CHIP_PANEL_DEFAULT_WIDTH_PX)).toBe(120)
  })
})

describe('puzzle word bank height', () => {
  it('estimates one row for two short words', () => {
    expect(estimatePuzzleWordBankMinHeight(['I', 'am'])).toBe(36)
  })

  it('estimates one row for four short words', () => {
    expect(estimatePuzzleWordBankMinHeight(['I', 'am', 'a', 'student'])).toBe(36)
  })

  it('estimates one row for five short I know words on a wide panel', () => {
    expect(estimatePuzzleWordBankMinHeight(I_KNOW_WORDS, CHIP_PANEL_DEFAULT_WIDTH_PX)).toBe(36)
  })

  it('estimates full panel height from real words', () => {
    const height = estimatePuzzlePanelMinHeight({
      words: I_KNOW_WORDS,
      hasInstruction: true,
      containerWidthPx: CHIP_PANEL_DEFAULT_WIDTH_PX,
    })
    expect(height).toBeGreaterThan(150)
    expect(height).toBeLessThan(320)
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
    expect(estimatePuzzleBottomStackMinHeight(2)).toBeGreaterThan(150)
    expect(estimatePuzzleBottomStackMinHeight(4)).toBeGreaterThan(150)
  })
})
