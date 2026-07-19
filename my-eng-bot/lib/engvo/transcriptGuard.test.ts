import { describe, expect, it } from 'vitest'
import {
  engvoVoiceTranscriptIsLikelyNoise,
  engvoVoiceTranscriptIsLikelyNoiseForKind,
  shouldShowEngvoVoiceUserTranscript,
} from './transcriptGuard'

describe('shouldShowEngvoVoiceUserTranscript', () => {
  it('allows Russian, English, and mixed ru+en', () => {
    expect(shouldShowEngvoVoiceUserTranscript('Hello')).toBe(true)
    expect(shouldShowEngvoVoiceUserTranscript('Привет')).toBe(true)
    expect(shouldShowEngvoVoiceUserTranscript('I am готовлю')).toBe(true)
    expect(shouldShowEngvoVoiceUserTranscript('я was home')).toBe(true)
    expect(shouldShowEngvoVoiceUserTranscript('это my book')).toBe(true)
  })

  it('rejects other scripts (Hangul etc.)', () => {
    expect(shouldShowEngvoVoiceUserTranscript('어')).toBe(false)
    expect(shouldShowEngvoVoiceUserTranscript('Привет 어')).toBe(false)
  })

  it('rejects noise-only transcripts', () => {
    expect(shouldShowEngvoVoiceUserTranscript('hm')).toBe(false)
    expect(shouldShowEngvoVoiceUserTranscript('uh')).toBe(false)
    expect(shouldShowEngvoVoiceUserTranscript('кхе')).toBe(false)
    expect(shouldShowEngvoVoiceUserTranscript('  кхе! ')).toBe(false)
  })

  it('allows normal short answers', () => {
    expect(shouldShowEngvoVoiceUserTranscript('ok')).toBe(true)
    expect(shouldShowEngvoVoiceUserTranscript('да')).toBe(true)
    expect(shouldShowEngvoVoiceUserTranscript('yes')).toBe(true)
  })

  it('rejects empty', () => {
    expect(shouldShowEngvoVoiceUserTranscript('')).toBe(false)
    expect(shouldShowEngvoVoiceUserTranscript('   ')).toBe(false)
  })
})

describe('engvoVoiceTranscriptIsLikelyNoise', () => {
  it('treats repeated cough-like consonants as noise', () => {
    expect(engvoVoiceTranscriptIsLikelyNoise('кхкх')).toBe(true)
  })
})

describe('engvoVoiceTranscriptIsLikelyNoiseForKind', () => {
  it('keeps short EN/RU lexical tokens for teacher', () => {
    expect(engvoVoiceTranscriptIsLikelyNoiseForKind('I', 'teacher')).toBe(false)
    expect(engvoVoiceTranscriptIsLikelyNoiseForKind('go', 'teacher')).toBe(false)
    expect(engvoVoiceTranscriptIsLikelyNoiseForKind('am', 'teacher')).toBe(false)
    expect(engvoVoiceTranscriptIsLikelyNoiseForKind('да', 'teacher')).toBe(false)
  })

  it('still treats filler as noise for teacher', () => {
    expect(engvoVoiceTranscriptIsLikelyNoiseForKind('hm', 'teacher')).toBe(true)
    expect(engvoVoiceTranscriptIsLikelyNoiseForKind('uh', 'teacher')).toBe(true)
    expect(engvoVoiceTranscriptIsLikelyNoiseForKind('кхе', 'teacher')).toBe(true)
  })

  it('defaults free_call to the strict noise helper', () => {
    expect(engvoVoiceTranscriptIsLikelyNoiseForKind('hm', 'free_call')).toBe(
      engvoVoiceTranscriptIsLikelyNoise('hm')
    )
    expect(engvoVoiceTranscriptIsLikelyNoiseForKind('кхкх')).toBe(
      engvoVoiceTranscriptIsLikelyNoise('кхкх')
    )
  })
})
