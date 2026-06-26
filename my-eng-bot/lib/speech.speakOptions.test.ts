import { beforeEach, describe, expect, it, vi } from 'vitest'
import { speak, stopSpeaking } from '@/lib/speech'

type MockUtterance = {
  text: string
  rate: number
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}

function createSpeechSynthesisMock() {
  const utterances: MockUtterance[] = []

  const synth = {
    speaking: false,
    pending: false,
    paused: false,
    getVoices: () => [{ name: 'Test', lang: 'en-US', default: true, voiceURI: 'voice-1' }],
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    cancel: vi.fn(() => {
      synth.speaking = false
      synth.pending = false
    }),
    resume: vi.fn(),
    speak: vi.fn((utterance: MockUtterance) => {
      utterances.push(utterance)
      synth.speaking = true
      utterance.onstart?.()
    }),
  }

  return { synth, utterances }
}

describe('speak options', () => {
  beforeEach(() => {
    vi.restoreAllMocks()

    class MockSpeechSynthesisUtterance {
      text: string
      lang = 'en-US'
      rate = 1
      voice: SpeechSynthesisVoice | null = null
      onstart: (() => void) | null = null
      onend: (() => void) | null = null
      onerror: (() => void) | null = null

      constructor(text: string) {
        this.text = text
      }
    }

    vi.stubGlobal('SpeechSynthesisUtterance', MockSpeechSynthesisUtterance)
  })

  it('passes custom rate and lifecycle callbacks', () => {
    const { synth, utterances } = createSpeechSynthesisMock()
    vi.stubGlobal('window', {
      speechSynthesis: synth,
      clearTimeout: vi.fn(),
      setTimeout: vi.fn(),
    })

    const onStart = vi.fn()
    const onEnd = vi.fn()

    speak('Hello', 'voice-1', { rate: 0.7, onStart, onEnd })

    expect(utterances[0]?.rate).toBe(0.7)
    expect(onStart).toHaveBeenCalledTimes(1)

    utterances[0]?.onend?.()
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('stops active playback when speak is called again with the same session', () => {
    const { synth } = createSpeechSynthesisMock()
    vi.stubGlobal('window', {
      speechSynthesis: synth,
      clearTimeout: vi.fn(),
      setTimeout: vi.fn(),
    })

    speak('Hello', 'voice-1', { rate: 0.85 })
    speak('Hello', 'voice-1', { rate: 0.85 })

    expect(synth.cancel).toHaveBeenCalled()
  })

  it('exposes stopSpeaking helper', () => {
    const { synth } = createSpeechSynthesisMock()
    vi.stubGlobal('window', {
      speechSynthesis: synth,
      clearTimeout: vi.fn(),
      setTimeout: vi.fn(),
    })

    speak('Hello', 'voice-1')
    stopSpeaking()

    expect(synth.cancel).toHaveBeenCalled()
  })

  it('starts a new utterance when rate changes while another session is active', () => {
    const { synth, utterances } = createSpeechSynthesisMock()
    vi.stubGlobal('window', {
      speechSynthesis: synth,
      clearTimeout: vi.fn(),
      setTimeout: vi.fn(),
    })

    speak('Hello', 'voice-1', { rate: 1 })
    expect(utterances[0]?.rate).toBe(1)

    speak('Hello', 'voice-1', { rate: 0.7 })
    expect(utterances).toHaveLength(2)
    expect(utterances[1]?.rate).toBe(0.7)
  })
})
