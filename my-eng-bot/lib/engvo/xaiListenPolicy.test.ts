import { describe, expect, it } from 'vitest'
import {
  ENGVO_INTERRUPT_DEBOUNCE_MS,
  ENGVO_REALTIME_SERVER_VAD_TURN_DETECTION,
  ENGVO_VAD_SILENCE_DURATION_MS,
  ENGVO_VAD_THRESHOLD,
  ENGVO_XAI_TEACHER_INTERRUPT_DEBOUNCE_MS,
} from '@/lib/engvo/constants'
import {
  appendEngvoXaiUnclearAudioRule,
  buildEngvoTeacherKeyterms,
  ENGVO_XAI_UNCLEAR_AUDIO_APPENDIX,
  getEngvoXaiInterruptDebounceMs,
  resolveEngvoXaiLanguageHint,
  resolveEngvoXaiVadTurnDetection,
  shouldReplaceEngvoUserTranscript,
} from '@/lib/engvo/xaiListenPolicy'

describe('OpenAI VAD snapshot unchanged', () => {
  it('keeps OpenAI threshold 0.72 and silence 900', () => {
    expect(ENGVO_VAD_THRESHOLD).toBe(0.72)
    expect(ENGVO_VAD_SILENCE_DURATION_MS).toBe(900)
    expect(ENGVO_REALTIME_SERVER_VAD_TURN_DETECTION).toEqual({
      type: 'server_vad',
      threshold: 0.72,
      prefix_padding_ms: 300,
      silence_duration_ms: 900,
      create_response: true,
      interrupt_response: false,
    })
  })
})

describe('resolveEngvoXaiLanguageHint', () => {
  it('uses ru for free_call and teacher topic_choice', () => {
    expect(resolveEngvoXaiLanguageHint({ kind: 'free_call' })).toBe('ru')
    expect(resolveEngvoXaiLanguageHint({ kind: 'teacher', teacherPhase: 'topic_choice' })).toBe('ru')
  })

  it('uses en for teacher drill', () => {
    expect(resolveEngvoXaiLanguageHint({ kind: 'teacher', teacherPhase: 'drill' })).toBe('en')
  })
})

describe('resolveEngvoXaiVadTurnDetection', () => {
  it('uses softer teacher thresholds and createResponse flag', () => {
    expect(resolveEngvoXaiVadTurnDetection({ kind: 'teacher', createResponse: false })).toEqual({
      type: 'server_vad',
      threshold: 0.55,
      prefix_padding_ms: 300,
      silence_duration_ms: 500,
      create_response: false,
      interrupt_response: false,
    })
    expect(resolveEngvoXaiVadTurnDetection({ kind: 'free_call', createResponse: true })).toEqual({
      type: 'server_vad',
      threshold: 0.65,
      prefix_padding_ms: 300,
      silence_duration_ms: 700,
      create_response: true,
      interrupt_response: false,
    })
  })
})

describe('getEngvoXaiInterruptDebounceMs', () => {
  it('uses 200 for teacher and 400 for free_call', () => {
    expect(getEngvoXaiInterruptDebounceMs('teacher')).toBe(ENGVO_XAI_TEACHER_INTERRUPT_DEBOUNCE_MS)
    expect(getEngvoXaiInterruptDebounceMs('free_call')).toBe(ENGVO_INTERRUPT_DEBOUNCE_MS)
  })
})

describe('appendEngvoXaiUnclearAudioRule', () => {
  it('appends once', () => {
    const once = appendEngvoXaiUnclearAudioRule('You are a tutor.')
    expect(once).toContain('You are a tutor.')
    expect(once).toContain(ENGVO_XAI_UNCLEAR_AUDIO_APPENDIX)
    expect(appendEngvoXaiUnclearAudioRule(once)).toBe(once)
  })
})

describe('shouldReplaceEngvoUserTranscript', () => {
  it('allows near-equal and prefix extension', () => {
    expect(shouldReplaceEngvoUserTranscript('I go', 'I go')).toBe(true)
    expect(shouldReplaceEngvoUserTranscript('I go', 'I go home')).toBe(true)
    expect(shouldReplaceEngvoUserTranscript('I go home', 'I go')).toBe(true)
  })

  it('rejects unrelated rewrite', () => {
    expect(shouldReplaceEngvoUserTranscript('I go', 'We went home yesterday')).toBe(false)
  })
})

describe('buildEngvoTeacherKeyterms', () => {
  it('includes canonical words and caps at 15', () => {
    const terms = buildEngvoTeacherKeyterms({ canonicalEnglish: 'She goes to school' })
    expect(terms[0]).toBe('She goes to school')
    expect(terms).toContain('goes')
    expect(terms.length).toBeLessThanOrEqual(15)
  })
})
