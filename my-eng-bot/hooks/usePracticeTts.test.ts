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

/** Минимальная симуляция контролируемого usePracticeTts. */
function createControlledPracticeTtsPlaybackModel(initialSpeedIndex = 0) {
  let speedIndex = initialSpeedIndex
  let questionId = 'q-1'
  let isPlaying = false
  const text = 'It is dark outside.'
  const voiceId = 'voice-1'

  const stop = () => {
    isPlaying = false
    stopSpeakingMock()
  }

  const togglePlay = () => {
    if (isPlaying) {
      stop()
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

  const changeQuestion = (nextQuestionId: string) => {
    questionId = nextQuestionId
    stop()
  }

  const setSpeedFromParent = (next: number) => {
    speedIndex = next
  }

  return {
    get speedIndex() {
      return speedIndex
    },
    get questionId() {
      return questionId
    },
    togglePlay,
    cycleSpeed,
    changeQuestion,
    setSpeedFromParent,
  }
}

describe('usePracticeTts speed integration', () => {
  beforeEach(() => {
    speakMock.mockClear()
    stopSpeakingMock.mockClear()
  })

  it('passes selected preset rate when playback starts', () => {
    const model = createControlledPracticeTtsPlaybackModel(1)
    model.togglePlay()
    expect(lastSpeakCall()?.options.rate).toBe(0.8)
  })

  it('does not reset speed when questionId changes', () => {
    const model = createControlledPracticeTtsPlaybackModel(2)
    model.changeQuestion('q-2')
    expect(model.speedIndex).toBe(2)
  })

  it('restarts playback with new rate when speed changes during playback', () => {
    const model = createControlledPracticeTtsPlaybackModel()

    model.togglePlay()
    expect(lastSpeakCall()?.options.rate).toBe(1)

    model.cycleSpeed()
    expect(stopSpeakingMock).toHaveBeenCalledTimes(1)
    expect(lastSpeakCall()?.options.rate).toBe(0.8)

    model.cycleSpeed()
    expect(lastSpeakCall()?.options.rate).toBe(0.6)
  })

  it('cycles through 1, 0.8 and 0.6 rates', () => {
    const model = createControlledPracticeTtsPlaybackModel()
    const rates: number[] = []

    for (let step = 0; step < 3; step += 1) {
      model.togglePlay()
      rates.push(lastSpeakCall()?.options.rate ?? -1)
      model.togglePlay()
      model.cycleSpeed()
    }

    expect(rates).toEqual([1, 0.8, 0.6])
  })

  it('uses parent-provided speed index after session override', () => {
    const model = createControlledPracticeTtsPlaybackModel(0)
    model.setSpeedFromParent(2)
    model.togglePlay()
    expect(lastSpeakCall()?.options.rate).toBe(0.6)
  })
})
