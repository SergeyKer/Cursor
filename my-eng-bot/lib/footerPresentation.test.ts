import { describe, expect, it } from 'vitest'
import { resolveFooterPresentation } from '@/lib/footerPresentation'

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

  it('keeps adult mode professional and deterministic', () => {
    const presentation = resolveFooterPresentation({
      audience: 'adult',
      tone: 'error',
      emphasis: 'none',
      typingKey: 'chat-error',
      text: 'Связь подвела. Попробуем снова.',
    })

    expect(presentation.mode).toBe('professional')
    expect(presentation.markerKind).toBe('dot')
    expect(presentation.markerText).toBe(null)
    expect(presentation.typingSpeed).toBe(28)
  })
})
