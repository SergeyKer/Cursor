'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { featureFlags } from '@/lib/featureFlags'
import {
  cyclePracticeTtsSpeedIndex,
  getPracticeTtsRateByIndex,
  getPracticeTtsSpeedPreset,
} from '@/lib/practice/practiceTtsSpeedPresets'
import { getVocabTtsEnginePref } from '@/lib/vocabulary/ttsEnginePref'
import {
  playVocabTts,
  prefetchVocabTts,
  resolveVocabGrokVoice,
  stopVocabTts,
} from '@/lib/vocabulary/playVocabTts'
import { unlockTtsAudioContext } from '@/lib/tts/streamTtsPlayback'

const PREFETCH_DEBOUNCE_MS = 300

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
  const grokVoiceKeyRef = useRef('')
  const grokVoiceRef = useRef('')

  speedIndexRef.current = speedIndex
  isPlayingRef.current = isPlaying

  const voiceForCard = useCallback((key: string): string => {
    if (grokVoiceKeyRef.current === key && grokVoiceRef.current) return grokVoiceRef.current
    const next = resolveVocabGrokVoice()
    grokVoiceKeyRef.current = key
    grokVoiceRef.current = next
    return next
  }, [])

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
          grokVoiceId:
            featureFlags.vocabGrokTtsV1 && getVocabTtsEnginePref() === 'grok'
              ? voiceForCard(playbackKeyRef.current)
              : undefined,
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
    [clearSpeakTimer, disabled, voiceForCard, voiceId]
  )

  const togglePlay = useCallback(() => {
    if (disabled || !text.trim()) return

    if (isPlaying) {
      stop()
      return
    }

    unlockTtsAudioContext()
    startPlayback(text, getPracticeTtsRateByIndex(speedIndexRef.current))
  }, [disabled, isPlaying, startPlayback, stop, text])

  const cycleSpeed = useCallback(() => {
    if (disabled) return

    const next = cyclePracticeTtsSpeedIndex(speedIndexRef.current)
    onSpeedIndexChange(next)

    if (isPlayingRef.current && text.trim()) {
      unlockTtsAudioContext()
      startPlayback(text, getPracticeTtsRateByIndex(next))
    }
  }, [disabled, onSpeedIndexChange, startPlayback, text])

  useEffect(() => {
    if (playbackKeyRef.current === playbackKey) return
    playbackKeyRef.current = playbackKey
    stop()
  }, [playbackKey, stop])

  useEffect(() => {
    if (disabled || !text.trim()) return
    if (!featureFlags.vocabGrokTtsV1 || getVocabTtsEnginePref() !== 'grok') return

    const key = playbackKey
    const rate = getPracticeTtsRateByIndex(speedIndex)
    const timer = window.setTimeout(() => {
      prefetchVocabTts(text, { rate, grokVoiceId: voiceForCard(key) })
    }, PREFETCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [disabled, playbackKey, speedIndex, text, voiceForCard])

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
