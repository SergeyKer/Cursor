'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { speak, stopSpeaking } from '@/lib/speech'
import {
  cyclePracticeTtsSpeedIndex,
  getPracticeTtsRateByIndex,
  getPracticeTtsSpeedPreset,
} from '@/lib/practice/practiceTtsSpeedPresets'

export type UsePracticeTtsOptions = {
  text: string
  voiceId: string
  questionId: string
  disabled?: boolean
}

export type UsePracticeTtsResult = {
  isPlaying: boolean
  speedIndex: number
  speedPreset: ReturnType<typeof getPracticeTtsSpeedPreset>
  togglePlay: () => void
  stop: () => void
  cycleSpeed: () => void
}

export function usePracticeTts({
  text,
  voiceId,
  questionId,
  disabled = false,
}: UsePracticeTtsOptions): UsePracticeTtsResult {
  const [isPlaying, setIsPlaying] = useState(false)
  const [speedIndex, setSpeedIndex] = useState(0)
  const activeTextRef = useRef('')
  const speedIndexRef = useRef(0)
  const isPlayingRef = useRef(false)
  const playbackGenerationRef = useRef(0)

  speedIndexRef.current = speedIndex
  isPlayingRef.current = isPlaying

  const invalidatePlayback = useCallback(() => {
    playbackGenerationRef.current += 1
  }, [])

  const stop = useCallback(() => {
    invalidatePlayback()
    stopSpeaking()
    setIsPlaying(false)
  }, [invalidatePlayback])

  const startPlayback = useCallback(
    (playbackText: string, rate: number) => {
      const normalized = playbackText.trim()
      if (!normalized || disabled) return

      const generation = playbackGenerationRef.current + 1
      playbackGenerationRef.current = generation
      activeTextRef.current = normalized

      speak(normalized, voiceId, {
        rate,
        onStart: () => {
          if (playbackGenerationRef.current !== generation) return
          setIsPlaying(true)
        },
        onEnd: () => {
          if (playbackGenerationRef.current !== generation) return
          setIsPlaying(false)
        },
        onError: () => {
          if (playbackGenerationRef.current !== generation) return
          setIsPlaying(false)
        },
      })
    },
    [disabled, voiceId]
  )

  const togglePlay = useCallback(() => {
    if (disabled || !text.trim()) return

    if (isPlaying) {
      stop()
      return
    }

    startPlayback(text, getPracticeTtsRateByIndex(speedIndexRef.current))
  }, [disabled, isPlaying, startPlayback, stop, text])

  const cycleSpeed = useCallback(() => {
    if (disabled) return

    const next = cyclePracticeTtsSpeedIndex(speedIndexRef.current)
    speedIndexRef.current = next
    setSpeedIndex(next)

    if (isPlayingRef.current && text.trim()) {
      invalidatePlayback()
      stopSpeaking()
      startPlayback(text, getPracticeTtsRateByIndex(next))
    }
  }, [disabled, invalidatePlayback, startPlayback, text])

  useEffect(() => {
    speedIndexRef.current = 0
    setSpeedIndex(0)
    stop()
  }, [questionId, stop])

  useEffect(() => {
    return () => {
      invalidatePlayback()
      stopSpeaking()
    }
  }, [invalidatePlayback])

  useEffect(() => {
    if (disabled) {
      stop()
    }
  }, [disabled, stop])

  const speedPreset = getPracticeTtsSpeedPreset(speedIndex)

  return {
    isPlaying,
    speedIndex,
    speedPreset,
    togglePlay,
    stop,
    cycleSpeed,
  }
}
