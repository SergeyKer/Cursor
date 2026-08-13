import { afterEach, describe, expect, it, vi } from 'vitest'
import { toggleMessageSpeak } from '@/lib/communication/toggleMessageSpeak'
import {
  clearMessageSpeakPlayback,
  getMessageSpeakPlayingIndex,
} from '@/lib/communication/messageSpeakPlayback'

const speak = vi.fn()
const stopCommunicationTts = vi.fn()

vi.mock('@/lib/speech', () => ({
  speak: (...args: unknown[]) => speak(...args),
}))

vi.mock('@/lib/communication/playCommunicationTts', () => ({
  stopCommunicationTts: () => stopCommunicationTts(),
}))

describe('toggleMessageSpeak', () => {
  afterEach(() => {
    speak.mockReset()
    stopCommunicationTts.mockReset()
    clearMessageSpeakPlayback()
  })

  it('stops without speak when already playing', () => {
    toggleMessageSpeak({
      playing: true,
      text: 'Hello',
      voiceId: 'voice-1',
      rate: 1,
      messageIndex: 2,
    })
    expect(stopCommunicationTts).toHaveBeenCalledTimes(1)
    expect(speak).not.toHaveBeenCalled()
  })

  it('starts system speak without playCommunicationTts when idle', () => {
    toggleMessageSpeak({
      playing: false,
      text: 'Hello',
      voiceId: 'voice-1',
      rate: 0.9,
      messageIndex: 4,
    })
    expect(speak).toHaveBeenCalledTimes(1)
    expect(speak.mock.calls[0]?.[0]).toBe('Hello')
    expect(speak.mock.calls[0]?.[1]).toBe('voice-1')
    expect(speak.mock.calls[0]?.[2]).toMatchObject({ rate: 0.9 })
    expect(stopCommunicationTts).not.toHaveBeenCalled()
    expect(getMessageSpeakPlayingIndex()).toBe(4)
  })
})
