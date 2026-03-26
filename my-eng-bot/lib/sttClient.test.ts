import { describe, expect, it } from 'vitest'
import { pickRecordingMimeType, shouldUseMediaRecorderFallback, sttLangFromLocale } from './sttClient'

describe('sttClient', () => {
  it('uses fallback when speech recognition is unavailable', () => {
    expect(
      shouldUseMediaRecorderFallback({
        hasSpeechRecognition: false,
        userAgent: 'Mozilla/5.0',
      })
    ).toBe(true)
  })

  it('uses fallback on iOS Chrome', () => {
    expect(
      shouldUseMediaRecorderFallback({
        hasSpeechRecognition: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/124.0 Mobile/15E148 Safari/604.1',
      })
    ).toBe(true)
  })

  it('keeps browser speech path on desktop Chrome', () => {
    expect(
      shouldUseMediaRecorderFallback({
        hasSpeechRecognition: true,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
      })
    ).toBe(false)
  })

  it('maps locale to stt lang', () => {
    expect(sttLangFromLocale('ru-RU')).toBe('ru')
    expect(sttLangFromLocale('en-US')).toBe('en')
  })

  it('picks first supported mime type', () => {
    const supported = new Set(['audio/mp4'])
    const picked = pickRecordingMimeType((mime) => supported.has(mime))
    expect(picked).toBe('audio/mp4')
  })
})
