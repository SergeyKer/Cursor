import { describe, expect, it } from 'vitest'
import {
  nextCommunicationVoiceInputMode,
  normalizeCommunicationVoiceInputMode,
} from './communicationVoiceInputMode'

describe('normalizeCommunicationVoiceInputMode', () => {
  it('always returns mix', () => {
    expect(normalizeCommunicationVoiceInputMode('mix')).toBe('mix')
    expect(normalizeCommunicationVoiceInputMode('en')).toBe('mix')
    expect(normalizeCommunicationVoiceInputMode('ru')).toBe('mix')
    expect(normalizeCommunicationVoiceInputMode(undefined)).toBe('mix')
    expect(normalizeCommunicationVoiceInputMode('')).toBe('mix')
  })
})

describe('nextCommunicationVoiceInputMode', () => {
  it('always stays mix', () => {
    expect(nextCommunicationVoiceInputMode('mix', 'ru')).toBe('mix')
    expect(nextCommunicationVoiceInputMode('mix', 'en')).toBe('mix')
    expect(nextCommunicationVoiceInputMode('en', 'en')).toBe('mix')
    expect(nextCommunicationVoiceInputMode('en', 'ru')).toBe('mix')
    expect(nextCommunicationVoiceInputMode('ru', 'en')).toBe('mix')
  })
})
