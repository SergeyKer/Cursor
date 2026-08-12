'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  cyclePracticeTtsSpeedIndex,
  getPracticeTtsRateByIndex,
  getPracticeTtsSpeedPreset,
} from '@/lib/practice/practiceTtsSpeedPresets'
import { playVocabTts, stopVocabTts } from '@/lib/vocabulary/playVocabTts'

export type UseVocabGrokTtsOptions = {
  text: string
  voiceId: string
  playbackKey: string
  speedIndex: number
  onSpeedIndexChange: (index: number) => void
  disabled?: boolean
}

export type UseVocabGrokTtsResult = {
  isPlaying: boolean
  speedIndex: number
  speedPreset: ReturnType<typeof getPracticeTtsSpeedPreset>
  togglePlay: () => void
  stop: () => void
  cycleSpeed: () => void
}

export function useVocabGrokTts({
  text,
  voiceId,
  playbackKey,
  speedIndex,
  onSpeedIndexChange,
  disabled = false,
}: UseVocabGrokTtsOptions): UseVocabGrokTtsResult {
  const [isPlaying, setIsPlaying] = useState(false)
  const speedIndexRef = useRef(speedIndex)
  const isPlayingRef = useRef(false)
  const playbackGenerationRef = useRef(0)
  const playbackKeyRef = useRef(playbackKey)
  const speakTimerRef = useRef<number | null>(null)

  speedIndexRef.current = speedIndex
  isPlayingRef.current = isPlaying

  const clearSpeakTimer = useCallback(() => {
    if (speakTimerRef.current != null) {
      window.clearTimeout(speakTimerRef.current)
      speakTimerRef.current = null
    }
  }, [])

  const invalidatePlayback = useCallback(() => {
    playbackGenerationRef.current += 1
    clearSpeakTimer()
  }, [clearSpeakTimer])

  const stop = useCallback(() => {
    invalidatePlayback()
    stopVocabTts()
    setIsPlaying(false)
  }, [invalidatePlayback])

  const startPlayback = useCallback(
    (playbackText: string, rate: number) => {
      const normalized = playbackText.trim()
      if (!normalized || disabled) return

      const generation = playbackGenerationRef.current + 1
      playbackGenerationRef.current = generation
      clearSpeakTimer()
      setIsPlaying(true)

      speakTimerRef.current = window.setTimeout(() => {
        speakTimerRef.current = null
        if (playbackGenerationRef.current !== generation) return

        playVocabTts(normalized, {
          rate,
          browserVoiceId: voiceId,
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
      }, 0)
    },
    [clearSpeakTimer, disabled, voiceId]
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
    onSpeedIndexChange(next)

    if (isPlayingRef.current && text.trim()) {
      startPlayback(text, getPracticeTtsRateByIndex(next))
    }
  }, [disabled, onSpeedIndexChange, startPlayback, text])

  useEffect(() => {
    if (playbackKeyRef.current === playbackKey) return
    playbackKeyRef.current = playbackKey
    stop()
  }, [playbackKey, stop])

  useEffect(() => {
    return () => {
      invalidatePlayback()
      stopVocabTts()
    }
  }, [invalidatePlayback])

  useEffect(() => {
    if (disabled) stop()
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
