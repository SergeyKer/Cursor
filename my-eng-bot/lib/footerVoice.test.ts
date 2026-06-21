import { describe, expect, it } from 'vitest'
import {
  FOOTER_DYNAMIC_MAX_LENGTH,
  formatFooterDynamicLine,
  pickFooterVoice,
} from '@/lib/footerVoice'

describe('pickFooterVoice', () => {
  it('prefers the highest-priority candidate', () => {
    const voice = pickFooterVoice([
      { key: 'low', text: 'Низкий приоритет.', priority: 10 },
      { key: 'high', text: 'Высокий приоритет.', priority: 100 },
    ])

    expect(voice?.text).toBe('Высокий приоритет.')
    expect(voice?.typingKey).toBe('high')
  })

  it('uses compact text when the main text is too long', () => {
    const voice = pickFooterVoice(
      [
        {
          key: 'compact',
          text: 'Это очень длинная реплика, которая не должна целиком попадать в верхнюю строку футера.',
          compactText: 'Короткая реплика.',
          priority: 100,
        },
      ],
      { maxLength: 24 }
    )

    expect(voice?.text).toBe('Короткая реплика.')
  })

  it('shortens the text as a last resort', () => {
    const voice = pickFooterVoice(
      [
        {
          key: 'trimmed',
          text: 'Эта реплика все равно останется слишком длинной даже после ужатия.',
          priority: 100,
        },
      ],
      { maxLength: 18 }
    )

    expect(voice?.text.endsWith('…')).toBe(true)
    expect(voice?.text.length).toBeLessThanOrEqual(18)
  })
})

describe('formatFooterDynamicLine', () => {
  it('uses compact text when main line exceeds default limit', () => {
    expect(
      formatFooterDynamicLine(
        'Поздравляем! Золотая медаль - отличный результат!',
        'Золотая медаль - отлично!'
      )
    ).toBe('Золотая медаль - отлично!')
  })

  it('defaults to FOOTER_DYNAMIC_MAX_LENGTH of 38', () => {
    expect(FOOTER_DYNAMIC_MAX_LENGTH).toBe(38)
    expect('Золотая медаль - отлично!'.length).toBeLessThanOrEqual(FOOTER_DYNAMIC_MAX_LENGTH)
  })
})
