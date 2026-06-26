import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cyclePracticeTtsSpeedIndex,
  getPracticeTtsRateByIndex,
} from '@/lib/practice/practiceTtsSpeedPresets'

const speakMock = vi.fn()
const stopSpeakingMock = vi.fn()

vi.mock('@/lib/speech', () => ({
  speak: (...args: unknown[]) => speakMock(...args),
  stopSpeaking: () => stopSpeakingMock(),
}))

type SpeakCall = {
  text: string
  voiceId: string
  options: { rate?: number }
}

function lastSpeakCall(): SpeakCall | undefined {
  const call = speakMock.mock.calls.at(-1)
  if (!call) return undefined
  return {
    text: call[0] as string,
    voiceId: call[1] as string,
    options: (call[2] ?? {}) as { rate?: number },
  }
}

/** Минимальная симуляция логики togglePlay / cycleSpeed из usePracticeTts. */
function createPracticeTtsPlaybackModel() {
  let speedIndex = 0
  let isPlaying = false
  const text = 'It is dark outside.'
  const voiceId = 'voice-1'

  const togglePlay = () => {
    if (isPlaying) {
      isPlaying = false
      stopSpeakingMock()
      return
    }
    speakMock(text, voiceId, { rate: getPracticeTtsRateByIndex(speedIndex) })
    isPlaying = true
  }

  const cycleSpeed = () => {
    const next = cyclePracticeTtsSpeedIndex(speedIndex)
    speedIndex = next
    if (isPlaying) {
      stopSpeakingMock()
      speakMock(text, voiceId, { rate: getPracticeTtsRateByIndex(next) })
    }
  }

  return {
    get speedIndex() {
      return speedIndex
    },
    togglePlay,
    cycleSpeed,
  }
}

describe('usePracticeTts speed integration', () => {
  beforeEach(() => {
    speakMock.mockClear()
    stopSpeakingMock.mockClear()
  })

  it('passes selected preset rate when playback starts', async () => {
    const model = createPracticeTtsPlaybackModel()

    model.cycleSpeed()
    expect(model.speedIndex).toBe(1)
    model.togglePlay()

    expect(lastSpeakCall()?.options.rate).toBe(0.8)
  })

  it('restarts playback with new rate when speed changes during playback', () => {
    const model = createPracticeTtsPlaybackModel()

    model.togglePlay()
    expect(lastSpeakCall()?.options.rate).toBe(1)

    model.cycleSpeed()
    expect(stopSpeakingMock).toHaveBeenCalledTimes(1)
    expect(lastSpeakCall()?.options.rate).toBe(0.8)

    model.cycleSpeed()
    expect(lastSpeakCall()?.options.rate).toBe(0.6)
  })

  it('cycles through 1, 0.8 and 0.6 rates', () => {
    const model = createPracticeTtsPlaybackModel()
    const rates: number[] = []

    for (let step = 0; step < 3; step += 1) {
      model.togglePlay()
      rates.push(lastSpeakCall()?.options.rate ?? -1)
      model.togglePlay()
      model.cycleSpeed()
    }

    expect(rates).toEqual([1, 0.8, 0.6])
  })
})
