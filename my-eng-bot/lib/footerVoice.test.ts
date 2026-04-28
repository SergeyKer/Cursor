import { describe, expect, it } from 'vitest'
import { pickFooterVoice } from '@/lib/footerVoice'

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
