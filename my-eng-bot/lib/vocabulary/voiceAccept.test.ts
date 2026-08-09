import { describe, expect, it } from 'vitest'
import { chipAccept, voiceAccept } from '@/lib/vocabulary/voiceAccept'

describe('voiceAccept', () => {
  it('accepts RU chip strictly', () => {
    expect(chipAccept('дом', 'дом')).toBe(true)
    expect(chipAccept('Дом', 'дом')).toBe(false)
  })

  it('accepts EN word with normalize', () => {
    expect(voiceAccept({ transcript: 'home', target: 'Home', kind: 'en_word' })).toBe(true)
    expect(voiceAccept({ transcript: 'I said home', target: 'home', kind: 'en_word' })).toBe(true)
  })

  it('accepts phrase loosely via normalize equality', () => {
    expect(
      voiceAccept({
        transcript: 'I know the word home',
        target: 'I know the word home',
        kind: 'en_phrase',
      })
    ).toBe(true)
  })
})
