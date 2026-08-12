'use client'

import * as React from 'react'
import { playVocabTts, stopVocabTts } from '@/lib/vocabulary/playVocabTts'
import { pickRecordingMimeType } from '@/lib/sttClient'
import { playCueBeeps } from '@/lib/voice/playCueBeeps'
import {
  startRmsSilenceVad,
  VOCAB_RECORD_MAX_MS,
  type RmsSilenceVadHandle,
} from '@/lib/voice/rmsSilenceVad'
import {
  initialVocabSpeakAttemptState,
  reduceVocabSpeakAttempt,
  type VocabSpeakAttemptPhase,
} from '@/lib/vocabulary/vocabSpeakAttemptState'

export type VocabSpeakPreviewResult = {
  transcript: string
  audioUrl: string | null
}

type UseVocabSpeakAttemptParams = {
  etalonText: string
  voiceId?: string
  /** TTS rate for mic-cycle etalon; keep in sync with AudioDeck speedIndex. */
  rate?: number
  enabled?: boolean
  onPreview: (result: VocabSpeakPreviewResult) => void
  onCapabilityBlocked?: (message: string) => void
}

type UseVocabSpeakAttemptResult = {
  phase: VocabSpeakAttemptPhase
  isBusy: boolean
  isRecording: boolean
  isFinalizing: boolean
  startCycle: () => void
  stopRecording: () => void
  cancel: () => void
}

type SpeechRecognitionCtor = typeof SpeechRecognition

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

export function useVocabSpeakAttempt({
  etalonText,
  voiceId = '',
  rate,
  enabled = true,
  onPreview,
  onCapabilityBlocked,
}: UseVocabSpeakAttemptParams): UseVocabSpeakAttemptResult {
  const [runtime, dispatch] = React.useReducer(reduceVocabSpeakAttempt, initialVocabSpeakAttemptState)
  const phase = runtime.phase
  const phaseRef = React.useRef(phase)
  phaseRef.current = phase

  const playbackGenerationRef = React.useRef(0)
  const audioCtxRef = React.useRef<AudioContext | null>(null)
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const mediaStreamRef = React.useRef<MediaStream | null>(null)
  const mediaChunksRef = React.useRef<Blob[]>([])
  const mimeTypeRef = React.useRef('')
  const vadRef = React.useRef<RmsSilenceVadHandle | null>(null)
  const maxTimerRef = React.useRef<number | null>(null)
  const stoppingRef = React.useRef(false)
  const recognitionRef = React.useRef<SpeechRecognition | null>(null)
  const transcriptRef = React.useRef('')
  const onPreviewRef = React.useRef(onPreview)
  const onBlockedRef = React.useRef(onCapabilityBlocked)
  const etalonRef = React.useRef(etalonText)
  const rateRef = React.useRef(rate)
  const startRecordingRef = React.useRef<() => Promise<void>>(async () => undefined)
  const stopRecordingRef = React.useRef<() => void>(() => undefined)

  onPreviewRef.current = onPreview
  onBlockedRef.current = onCapabilityBlocked
  etalonRef.current = etalonText
  rateRef.current = rate

  const clearMaxTimer = React.useCallback(() => {
    if (maxTimerRef.current != null) {
      window.clearTimeout(maxTimerRef.current)
      maxTimerRef.current = null
    }
  }, [])

  const stopSpeechRecognition = React.useCallback(() => {
    const recognition = recognitionRef.current
    recognitionRef.current = null
    if (!recognition) return
    try {
      recognition.onerror = null
      recognition.onend = null
      recognition.stop()
    } catch {
      try {
        recognition.abort()
      } catch {
        // ignore
      }
    }
  }, [])

  const releaseStream = React.useCallback(() => {
    vadRef.current?.stop()
    vadRef.current = null
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    mediaStreamRef.current = null
    mediaRecorderRef.current = null
    mediaChunksRef.current = []
  }, [])

  const cancel = React.useCallback(() => {
    const phaseNow = phaseRef.current
    playbackGenerationRef.current += 1
    stoppingRef.current = true
    clearMaxTimer()
    // Don't cancel alien TTS (AudioDeck preview) when the speak-cycle is idle.
    if (phaseNow !== 'idle' && phaseNow !== 'preview') {
      stopVocabTts()
    }
    stopSpeechRecognition()
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = null
        mediaRecorderRef.current.stop()
      }
    } catch {
      // ignore
    }
    releaseStream()
    transcriptRef.current = ''
    stoppingRef.current = false
    dispatch({ type: 'CANCEL' })
  }, [clearMaxTimer, releaseStream, stopSpeechRecognition])

  React.useEffect(() => {
    return () => {
      cancel()
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        void audioCtxRef.current.close().catch(() => undefined)
        audioCtxRef.current = null
      }
    }
  }, [cancel])

  const finishWithPreview = React.useCallback((blob: Blob | null) => {
    const transcript = transcriptRef.current.trim()
    const audioUrl = blob && blob.size > 0 ? URL.createObjectURL(blob) : null
    dispatch({ type: 'PREVIEW_READY' })
    onPreviewRef.current({ transcript, audioUrl })
  }, [])

  const completeAfterStop = React.useCallback(
    async (blob: Blob | null) => {
      audioCtxRef.current = await playCueBeeps('double', { ctx: audioCtxRef.current })
      dispatch({ type: 'CUE_STOP_DONE' })
      finishWithPreview(blob)
    },
    [finishWithPreview]
  )

  const stopRecordingInternal = React.useCallback(() => {
    if (stoppingRef.current) return
    stoppingRef.current = true
    clearMaxTimer()
    vadRef.current?.stop()
    vadRef.current = null
    stopSpeechRecognition()
    dispatch({ type: 'STOP_RECORDING' })

    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') {
      releaseStream()
      stoppingRef.current = false
      void completeAfterStop(null)
      return
    }

    try {
      recorder.stop()
    } catch {
      releaseStream()
      stoppingRef.current = false
      void completeAfterStop(null)
    }
  }, [clearMaxTimer, completeAfterStop, releaseStream, stopSpeechRecognition])

  const startBrowserSpeechRecognition = React.useCallback((): boolean => {
    const RecognitionCtor = getSpeechRecognitionCtor()
    if (!RecognitionCtor) return false

    transcriptRef.current = ''
    const recognition = new RecognitionCtor()
    recognition.lang = 'en-US'
    recognition.continuous = true
    recognition.interimResults = false
    ;(recognition as SpeechRecognition & { maxAlternatives?: number }).maxAlternatives = 3

    recognition.onresult = (event) => {
      const chunks: string[] = []
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        if (result.isFinal && result[0]?.transcript) {
          chunks.push(result[0].transcript)
        }
      }
      if (chunks.length > 0) {
        transcriptRef.current = `${transcriptRef.current} ${chunks.join(' ')}`.trim()
      }
    }

    recognition.onerror = () => {
      // Keep any partial transcript; stop path still finishes preview.
    }

    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
      return true
    } catch {
      recognitionRef.current = null
      return false
    }
  }, [])

  const startRecording = React.useCallback(async () => {
    stoppingRef.current = false
    transcriptRef.current = ''

    if (!getSpeechRecognitionCtor()) {
      onBlockedRef.current?.(
        'Браузер не даёт встроенное распознавание. Можно ввести текст вручную и отправить.'
      )
      dispatch({ type: 'CANCEL' })
      return
    }

    const canRecordBlob =
      Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined'

    try {
      const speechStarted = startBrowserSpeechRecognition()
      if (!speechStarted) {
        onBlockedRef.current?.('Не удалось начать распознавание. Введите текст вручную.')
        dispatch({ type: 'CANCEL' })
        return
      }

      if (!canRecordBlob) {
        dispatch({ type: 'START_RECORDING' })
        maxTimerRef.current = window.setTimeout(() => {
          stopRecordingRef.current()
        }, VOCAB_RECORD_MAX_MS)
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      const mimeType = pickRecordingMimeType((mime) => MediaRecorder.isTypeSupported(mime))
      mimeTypeRef.current = mimeType ?? ''
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      mediaChunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) mediaChunksRef.current.push(event.data)
      }

      recorder.onstop = () => {
        clearMaxTimer()
        const chunks = mediaChunksRef.current.slice()
        const effectiveMime = mimeTypeRef.current || recorder.mimeType || 'audio/webm'
        releaseStream()
        stoppingRef.current = false
        const blob = chunks.length > 0 ? new Blob(chunks, { type: effectiveMime }) : null
        void completeAfterStop(blob)
      }

      dispatch({ type: 'START_RECORDING' })
      recorder.start(100)

      vadRef.current = startRmsSilenceVad({
        stream,
        audioContext: audioCtxRef.current,
        onSilence: () => {
          stopRecordingRef.current()
        },
      })

      maxTimerRef.current = window.setTimeout(() => {
        stopRecordingRef.current()
      }, VOCAB_RECORD_MAX_MS)
    } catch {
      stopSpeechRecognition()
      releaseStream()
      onBlockedRef.current?.('Нет доступа к микрофону. Разрешите доступ или введите текст.')
      dispatch({ type: 'CANCEL' })
    }
  }, [
    clearMaxTimer,
    completeAfterStop,
    releaseStream,
    startBrowserSpeechRecognition,
    stopSpeechRecognition,
  ])

  startRecordingRef.current = startRecording
  stopRecordingRef.current = stopRecordingInternal

  const unlockAudioContext = React.useCallback(async () => {
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new Ctor()
      }
      await audioCtxRef.current.resume()
    } catch {
      // ignore
    }
  }, [])

  const startCycle = React.useCallback(() => {
    if (!enabled) return
    const target = etalonRef.current.trim()
    if (!target) return

    if (phase === 'recording') {
      stopRecordingInternal()
      return
    }

    if (phase === 'playing' || phase === 'cueStart' || phase === 'cueStop' || phase === 'finalizing') {
      cancel()
      return
    }

    void (async () => {
      playbackGenerationRef.current += 1
      const generation = playbackGenerationRef.current
      stopVocabTts()
      await unlockAudioContext()
      dispatch({ type: 'START_PLAYING' })

      const afterEtalon = () => {
        if (playbackGenerationRef.current !== generation) return
        void (async () => {
          dispatch({ type: 'ETALON_ENDED' })
          audioCtxRef.current = await playCueBeeps('single', { ctx: audioCtxRef.current })
          if (playbackGenerationRef.current !== generation) return
          dispatch({ type: 'CUE_START_DONE' })
          await startRecordingRef.current()
        })()
      }

      playVocabTts(target, {
        browserVoiceId: voiceId,
        ...(rateRef.current != null ? { rate: rateRef.current } : {}),
        onEnd: afterEtalon,
        onError: afterEtalon,
      })
    })()
  }, [cancel, enabled, phase, stopRecordingInternal, unlockAudioContext, voiceId])

  return {
    phase,
    isBusy: phase !== 'idle' && phase !== 'preview',
    isRecording: phase === 'recording',
    isFinalizing: phase === 'finalizing' || phase === 'cueStop',
    startCycle,
    stopRecording: stopRecordingInternal,
    cancel,
  }
}
