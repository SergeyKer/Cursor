import { describe, expect, it } from 'vitest'
import { textHasEmoji } from '@/lib/emojiText'
import {
  ADULT_EMOJI_BY_TONE,
  CHILD_EMOJI_BY_TONE,
  resolveFooterPresentation,
} from '@/lib/footerPresentation'

describe('resolveFooterPresentation', () => {
  it('uses a stable playful emoji for the same typing key', () => {
    const first = resolveFooterPresentation({
      audience: 'child',
      tone: 'celebrate',
      emphasis: 'none',
      typingKey: 'lesson-1-success',
      text: 'Верно. Идем дальше.',
    })

    const second = resolveFooterPresentation({
      audience: 'child',
      tone: 'celebrate',
      emphasis: 'none',
      typingKey: 'lesson-1-success',
      text: 'Верно. Идем дальше.',
    })

    expect(first.mode).toBe('playful')
    expect(first.markerKind).toBe('emoji')
    expect(first.markerText).toBe(second.markerText)
    expect(first.typingSpeed).toBe(44)
    expect(first.bottomLineRowClassName).toBe('pl-2')
  })

  it('falls back to stable text-based seed when typing key is missing', () => {
    const first = resolveFooterPresentation({
      audience: 'child',
      tone: 'thinking',
      emphasis: 'pulse',
      text: 'Смотрю ваш ответ.',
    })

    const second = resolveFooterPresentation({
      audience: 'child',
      tone: 'thinking',
      emphasis: 'pulse',
      text: 'Смотрю ваш ответ.',
    })

    expect(first.markerText).toBe(second.markerText)
    expect(first.markerClassName.includes('animate-pulse')).toBe(true)
  })

  it('keeps adult mode professional with emoji marker', () => {
    const first = resolveFooterPresentation({
      audience: 'adult',
      tone: 'error',
      emphasis: 'none',
      typingKey: 'chat-error',
      text: 'Связь подвела. Попробуем снова.',
    })

    const second = resolveFooterPresentation({
      audience: 'adult',
      tone: 'error',
      emphasis: 'none',
      typingKey: 'chat-error',
      text: 'Связь подвела. Попробуем снова.',
    })

    expect(first.mode).toBe('professional')
    expect(first.markerKind).toBe('emoji')
    expect(first.markerText).toBe(second.markerText)
    expect(first.markerText).toBeTruthy()
    expect(ADULT_EMOJI_BY_TONE.error).toContain(first.markerText)
    expect(first.typingSpeed).toBe(28)
    expect(first.bottomLineRowClassName).toBe('pl-2')
    expect(first.topLineRowClassName.includes('rounded-full')).toBe(false)
  })

  it('uses different celebrate markers for child and adult with the same typing key', () => {
    const child = resolveFooterPresentation({
      audience: 'child',
      tone: 'celebrate',
      emphasis: 'none',
      typingKey: 'lesson-1-success',
    })

    const adult = resolveFooterPresentation({
      audience: 'adult',
      tone: 'celebrate',
      emphasis: 'none',
      typingKey: 'lesson-1-success',
    })

    expect(child.markerText).toBe('🏆')
    expect(adult.markerText).toBe('🤩')
    expect(child.markerText).not.toBe(adult.markerText)
  })

  it('uses expanded child emoji pools', () => {
    expect(CHILD_EMOJI_BY_TONE.celebrate.length).toBeGreaterThanOrEqual(7)
    expect(CHILD_EMOJI_BY_TONE.support.length).toBeGreaterThanOrEqual(9)
  })

  it('hides dynamic marker when hideDynamicMarker is set', () => {
    const withMarker = resolveFooterPresentation({
      audience: 'adult',
      tone: 'thinking',
      emphasis: 'pulse',
      typingKey: 'engvo-listening',
      text: 'В эфире.',
    })
    const withoutMarker = resolveFooterPresentation({
      audience: 'adult',
      tone: 'thinking',
      emphasis: 'pulse',
      typingKey: 'engvo-listening',
      text: 'В эфире.',
      hideDynamicMarker: true,
    })

    expect(withMarker.markerKind).toBe('emoji')
    expect(withMarker.markerText).toBeTruthy()
    expect(withoutMarker.markerKind).toBe('none')
    expect(withoutMarker.markerText).toBeNull()
    expect(withoutMarker.bottomLineRowClassName).toBe('')
  })

  it('uses only pictographic emoji in footer marker pools', () => {
    const allMarkers = [
      ...Object.values(CHILD_EMOJI_BY_TONE).flat(),
      ...Object.values(ADULT_EMOJI_BY_TONE).flat(),
    ]

    for (const marker of allMarkers) {
      expect(textHasEmoji(marker), `expected emoji: ${marker}`).toBe(true)
    }
  })
})
