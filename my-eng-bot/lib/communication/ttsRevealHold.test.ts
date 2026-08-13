import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COMMUNICATION_TTS_MAX_CHARS } from '@/lib/communication/ttsLimits'
import {
  communicationTtsRevealTimeoutMs,
  makeCommunicationAutoSpeakKey,
  resolveCommunicationTtsRevealEngine,
  shouldHoldCommunicationTtsReveal,
} from '@/lib/communication/ttsRevealHold'

const enginePref = vi.hoisted(() => ({ value: 'system' as 'system' | 'grok' }))
const grokFlag = vi.hoisted(() => ({ value: true }))

vi.mock('@/lib/featureFlags', () => ({
  featureFlags: {
    get communicationGrokTtsV1() {
      return grokFlag.value
    },
  },
}))

vi.mock('@/lib/communication/ttsEnginePref', () => ({
  getCommunicationTtsEnginePref: () => enginePref.value,
}))

describe('ttsRevealHold', () => {
  beforeEach(() => {
    enginePref.value = 'system'
    grokFlag.value = true
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('holds only new-message', () => {
    expect(shouldHoldCommunicationTtsReveal('new-message')).toBe(true)
    expect(shouldHoldCommunicationTtsReveal('bootstrap')).toBe(false)
    expect(shouldHoldCommunicationTtsReveal('toggle-on')).toBe(false)
  })

  it('uses system timeout when engine is system', () => {
    expect(resolveCommunicationTtsRevealEngine('Hello there')).toBe('system')
    expect(communicationTtsRevealTimeoutMs('system')).toBe(800)
  })

  it('uses grok timeout when pref is grok and text fits', () => {
    enginePref.value = 'grok'
    expect(resolveCommunicationTtsRevealEngine('Hello there')).toBe('grok')
    expect(communicationTtsRevealTimeoutMs('grok')).toBe(1000)
  })

  it('falls back to system for long grok text', () => {
    enginePref.value = 'grok'
    const long = 'a'.repeat(COMMUNICATION_TTS_MAX_CHARS + 1)
    expect(resolveCommunicationTtsRevealEngine(long)).toBe('system')
  })

  it('falls back to system when grok flag is off', () => {
    grokFlag.value = false
    enginePref.value = 'grok'
    expect(resolveCommunicationTtsRevealEngine('Hello there')).toBe('system')
  })

  it('builds speak keys like Chat auto-tts', () => {
    expect(makeCommunicationAutoSpeakKey(3, 'Hi')).toBe('3:Hi')
    expect(makeCommunicationAutoSpeakKey(2, '')).toBe('2:')
  })
})
