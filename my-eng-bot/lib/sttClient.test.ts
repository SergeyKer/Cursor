import { describe, expect, it } from 'vitest'
import { isIosChromeBrowser, pickRecordingMimeType, shouldUseMediaRecorderFallback, sttLangFromLocale } from './sttClient'

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

  it('detects iOS Chrome user agent', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.73 Mobile/15E148 Safari/604.1'
    expect(isIosChromeBrowser(ua)).toBe(true)
  })

  it('does not match iOS Safari user agent', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
    expect(isIosChromeBrowser(ua)).toBe(false)
  })

  it('does not match Android Chrome user agent', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
    expect(isIosChromeBrowser(ua)).toBe(false)
  })

  it('does not match desktop Chrome user agent', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    expect(isIosChromeBrowser(ua)).toBe(false)
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
