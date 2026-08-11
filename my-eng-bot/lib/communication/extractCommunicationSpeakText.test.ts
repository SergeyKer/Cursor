import { describe, expect, it } from 'vitest'
import {
  extractCommunicationSpeakText,
  splitCommunicationOpening,
} from './extractCommunicationSpeakText'
import {
  COMMUNICATION_A_RU_WARN_ADULT,
  COMMUNICATION_A_RU_WARN_CHILD,
} from './cefrBands'

describe('splitCommunicationOpening', () => {
  it('splits child RU warn + EN invite', () => {
    const content = `${COMMUNICATION_A_RU_WARN_CHILD}\nHi! Let’s talk. What do you like?`
    expect(splitCommunicationOpening(content)).toEqual({
      ruWarn: COMMUNICATION_A_RU_WARN_CHILD,
      enInvite: 'Hi! Let’s talk. What do you like?',
    })
  })

  it('splits adult RU warn + EN invite', () => {
    const content = `${COMMUNICATION_A_RU_WARN_ADULT}\nHello! How are you?`
    expect(splitCommunicationOpening(content)).toEqual({
      ruWarn: COMMUNICATION_A_RU_WARN_ADULT,
      enInvite: 'Hello! How are you?',
    })
  })

  it('returns null for pure English', () => {
    expect(splitCommunicationOpening('Hello! How are you?')).toBeNull()
  })

  it('returns null when first line mixes Cyrillic and Latin', () => {
    expect(splitCommunicationOpening('Привет Hi!\nHello again.')).toBeNull()
  })

  it('returns null when Cyrillic has no Latin-leading line after', () => {
    expect(splitCommunicationOpening('Мы общаемся только по-английски.')).toBeNull()
  })
})

describe('extractCommunicationSpeakText', () => {
  it('returns EN tail after RU warn', () => {
    const content = `${COMMUNICATION_A_RU_WARN_CHILD}\nHi! Let’s talk. What do you like?`
    expect(extractCommunicationSpeakText(content)).toBe('Hi! Let’s talk. What do you like?')
  })

  it('keeps pure English unchanged', () => {
    expect(extractCommunicationSpeakText('Hello! How are you?')).toBe('Hello! How are you?')
  })
})
