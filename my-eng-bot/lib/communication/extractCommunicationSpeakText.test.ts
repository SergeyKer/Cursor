import { describe, expect, it } from 'vitest'
import { extractCommunicationSpeakText } from './extractCommunicationSpeakText'
import { COMMUNICATION_A_RU_WARN_CHILD } from './cefrBands'

describe('extractCommunicationSpeakText', () => {
  it('returns EN tail after RU warn', () => {
    const content = `${COMMUNICATION_A_RU_WARN_CHILD}\nHi! Let’s talk. What do you like?`
    expect(extractCommunicationSpeakText(content)).toBe('Hi! Let’s talk. What do you like?')
  })

  it('keeps pure English unchanged', () => {
    expect(extractCommunicationSpeakText('Hello! How are you?')).toBe('Hello! How are you?')
  })
})
