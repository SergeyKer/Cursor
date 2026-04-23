import { describe, expect, it } from 'vitest'
import { pickRecordingMimeType, shouldUseMediaRecorderFallback, sttLangFromLocale } from './sttClient'

describe('sttClient', () => {
  it('uses fallback when speech recognition is unavailable', () => {
    expect(
      shouldUseMediaRecorderFallback({
        hasSpeechRecognition: false,
      })
    ).toBe(true)
  })

  it('keeps browser speech path on iOS Chrome when speech recognition exists', () => {
    expect(
      shouldUseMediaRecorderFallback({
        hasSpeechRecognition: true,
      })
    ).toBe(false)
  })

  it('keeps browser speech path on desktop Chrome', () => {
    expect(
      shouldUseMediaRecorderFallback({
        hasSpeechRecognition: true,
      })
    ).toBe(false)
  })

  it('does not force fallback on iOS Safari when speech recognition exists', () => {
    expect(
      shouldUseMediaRecorderFallback({
        hasSpeechRecognition: true,
      })
    ).toBe(false)
  })

  it('maps locale to stt lang', () => {
    expect(sttLangFromLocale('ru-RU')).toBe('ru')
    expect(sttLangFromLocale('en-US')).toBe('en')
  })

  it('prefers mp4 mime type when available', () => {
    const supported = new Set(['audio/mp4'])
    const picked = pickRecordingMimeType((mime) => supported.has(mime))
    expect(picked).toBe('audio/mp4')
  })

  it('falls back to webm when mp4 is unavailable', () => {
    const supported = new Set(['audio/webm;codecs=opus'])
    const picked = pickRecordingMimeType((mime) => supported.has(mime))
    expect(picked).toBe('audio/webm;codecs=opus')
  })
})
