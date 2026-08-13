import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  beginMessageSpeakPlayback,
  clearMessageSpeakPlayback,
  createMessageSpeakSession,
  getMessageSpeakPlayingIndex,
  isMessageSpeakGenerationCurrent,
  subscribeMessageSpeakPlayback,
} from '@/lib/communication/messageSpeakPlayback'
import { stopCommunicationTts } from '@/lib/communication/playCommunicationTts'

vi.mock('@/lib/tts/unaryTtsPlayback', () => ({
  stopUnaryTts: vi.fn(),
  playSystemUnaryTts: vi.fn(),
  startUnaryGrokSession: vi.fn(() => ({ generation: 0, signal: { aborted: false } })),
  isUnaryTtsGenerationCurrent: vi.fn(() => true),
  clearUnaryGrokSession: vi.fn(),
}))

describe('messageSpeakPlayback', () => {
  afterEach(() => {
    clearMessageSpeakPlayback()
  })

  it('sets playing index on begin and clears on stopCommunicationTts', () => {
    const seen: Array<number | null> = []
    const unsubscribe = subscribeMessageSpeakPlayback(() => {
      seen.push(getMessageSpeakPlayingIndex())
    })

    const gen = beginMessageSpeakPlayback(3)
    expect(getMessageSpeakPlayingIndex()).toBe(3)
    expect(isMessageSpeakGenerationCurrent(gen)).toBe(true)

    stopCommunicationTts()
    expect(getMessageSpeakPlayingIndex()).toBe(null)
    expect(isMessageSpeakGenerationCurrent(gen)).toBe(false)
    expect(seen).toEqual([3, null])
    unsubscribe()
  })

  it('ignores stale session end after a newer begin', () => {
    const first = createMessageSpeakSession()
    first.begin(1)
    const second = createMessageSpeakSession()
    second.begin(2)
    expect(getMessageSpeakPlayingIndex()).toBe(2)

    first.endHandler()
    expect(getMessageSpeakPlayingIndex()).toBe(2)

    second.endHandler()
    expect(getMessageSpeakPlayingIndex()).toBe(null)
  })
})
