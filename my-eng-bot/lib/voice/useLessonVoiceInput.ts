'use client'

import * as React from 'react'
import { applyTypoFixes } from '@/lib/voice/applyTypoFixes'
import { isLikelySttSilenceHallucination } from '@/lib/voice/isLikelySttSilenceHallucination'
import {
  chooseFinalSpeechText,
  extractSpeechRecognitionTranscript,
  stabilizeInterimAcrossTicks,
  useVoiceComposer,
  type VoicePhase,
} from '@/lib/voice/useVoiceComposer'
import {
  isIosChromeBrowser,
  isIosLikeDevice,
  pickRecordingMimeType,
  resolvePreferredSpeechLocale,
  shouldUseMediaRecorderFallback,
  sttLangFromLocale,
} from '@/lib/sttClient'

type MicVisualState = 'idle' | 'invite' | 'wait'

type UseLessonVoiceInputParams = {
  inviteKey: string | null
}

export function shouldLockLessonTextInput(params: {
  listening: boolean
  voicePhase: VoicePhase
}): boolean {
  return params.listening || params.voicePhase === 'finalizing'
}

export function getLessonVoiceStatusMessage(params: {
  listening: boolean
  voicePhase: VoicePhase
  statusMessage: string | null
}): string | null {
  if (params.listening) return 'Голосовой ввод...'
  if (params.voicePhase === 'finalizing') {
    return params.statusMessage ?? 'Распознаю речь...'
  }
  return params.statusMessage
}

export function useLessonVoiceInput({ inviteKey }: UseLessonVoiceInputParams) {
  const [listening, setListening] = React.useState(false)
  const [micVisualState, setMicVisualState] = React.useState<MicVisualState>('idle')
  const lastInviteKeyRef = React.useRef<string | null>(null)
  const recognitionRef = React.useRef<SpeechRecognition | null>(null)
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const mediaStreamRef = React.useRef<MediaStream | null>(null)
  const mediaChunksRef = React.useRef<BlobPart[]>([])
  const mediaStopTimerRef = React.useRef<number | null>(null)
  const mediaRecorderSpeechDetectedRef = React.useRef(false)
  const mediaRecorderSkipSttAfterSilenceRef = React.useRef(false)
  const mediaSilenceRafRef = React.useRef<number | null>(null)
  const mediaSilenceAudioContextRef = React.useRef<AudioContext | null>(null)
  const mediaRecorderStopFallbackTimerRef = React.useRef<number | null>(null)
  const finalizingWatchdogTimerRef = React.useRef<number | null>(null)
  const micInviteTimerRef = React.useRef<number | null>(null)

  const {
    draftText,
    displayText,
    livePreviewText,
    voicePhase,
    statusMessage,
    isVoiceActive,
    setDraftText: dispatchSetDraftText,
    startRecording: startVoiceSession,
    updateTranscript: updateVoiceTranscript,
    beginFinalizing: beginVoiceFinalizing,
    commitVoiceText,
    failVoiceSession,
    finishVoiceSession,
    setStatusMessage: setVoiceStatusMessage,
    resetComposer,
  } = useVoiceComposer()

  const micActionActive = listening || voicePhase === 'finalizing'
  const isInputLocked = shouldLockLessonTextInput({ listening, voicePhase })
  const voiceStatusMessage = getLessonVoiceStatusMessage({
    listening,
    voicePhase,
    statusMessage,
  })

  const releaseMediaRecorderResources = React.useCallback(() => {
    if (mediaSilenceRafRef.current != null) {
      window.cancelAnimationFrame(mediaSilenceRafRef.current)
      mediaSilenceRafRef.current = null
    }
    if (mediaSilenceAudioContextRef.current) {
      const ctx = mediaSilenceAudioContextRef.current
      mediaSilenceAudioContextRef.current = null
      void ctx.close()
    }
    if (mediaStopTimerRef.current != null) {
      window.clearTimeout(mediaStopTimerRef.current)
      mediaStopTimerRef.current = null
    }
    if (mediaRecorderStopFallbackTimerRef.current != null) {
      window.clearTimeout(mediaRecorderStopFallbackTimerRef.current)
      mediaRecorderStopFallbackTimerRef.current = null
    }
    const rec = mediaRecorderRef.current
    if (rec && rec.state !== 'inactive') {
      try {
        rec.stop()
      } catch {
        // ignore
      }
    }
    mediaRecorderRef.current = null
    const stream = mediaStreamRef.current
    if (stream) {
      for (const track of stream.getTracks()) track.stop()
    }
    mediaStreamRef.current = null
    mediaChunksRef.current = []
    mediaRecorderSpeechDetectedRef.current = false
    mediaRecorderSkipSttAfterSilenceRef.current = false
  }, [])

  const clearMicAnimationTimers = React.useCallback(() => {
    if (micInviteTimerRef.current != null) {
      window.clearTimeout(micInviteTimerRef.current)
      micInviteTimerRef.current = null
    }
  }, [])

  const resetMicAnimation = React.useCallback(() => {
    clearMicAnimationTimers()
    setMicVisualState('idle')
  }, [clearMicAnimationTimers])

  const clearFinalizingWatchdog = React.useCallback(() => {
    if (finalizingWatchdogTimerRef.current != null) {
      window.clearTimeout(finalizingWatchdogTimerRef.current)
      finalizingWatchdogTimerRef.current = null
    }
  }, [])

  const startListening = React.useCallback(async () => {
    if (typeof window === 'undefined') return

    const LISTENING_MAX_MS = 25_000
    const BROWSER_SILENCE_MS = 1_200
    const MEDIA_FALLBACK_MAX_MS = 15_000
    const userAgent = window.navigator.userAgent
    const isIosDevice = isIosLikeDevice(userAgent)
    const isIosChrome = isIosChromeBrowser(userAgent)
    const SpeechRecognitionAPI =
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition

    const preferredLocale = resolvePreferredSpeechLocale({
      mode: 'translation',
      communicationInputExpectedLang: 'en',
      forceNextMicLang: null,
    })
    const sttLangForApi = sttLangFromLocale(preferredLocale)
    const failVoiceSoft = (message: string) => {
      if (isIosDevice) {
        finishVoiceSession(message)
        return
      }
      failVoiceSession(message)
    }

    startVoiceSession()
    setVoiceStatusMessage(null)

    const startMediaRecorderFallback = async (sttLang: 'ru' | 'en') => {
      if (!window.isSecureContext) {
        failVoiceSession('[Голосовой ввод работает только в защищённом контексте (HTTPS).]')
        return
      }
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        failVoiceSession('[Распознавание речи не поддерживается в этом браузере]')
        return
      }

      releaseMediaRecorderResources()

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        mediaStreamRef.current = stream
        const mimeType = pickRecordingMimeType((mime) => MediaRecorder.isTypeSupported(mime))
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
        mediaRecorderRef.current = recorder
        mediaChunksRef.current = []
        mediaRecorderSpeechDetectedRef.current = false
        mediaRecorderSkipSttAfterSilenceRef.current = false
        setListening(true)

        recorder.ondataavailable = (event: BlobEvent) => {
          if (event.data && event.data.size > 0) {
            mediaChunksRef.current.push(event.data)
          }
        }

        recorder.onerror = () => {
          releaseMediaRecorderResources()
          setListening(false)
          failVoiceSoft('[Ошибка записи аудио. Попробуйте ещё раз.]')
        }

        recorder.onstop = async () => {
          if (mediaRecorderStopFallbackTimerRef.current != null) {
            window.clearTimeout(mediaRecorderStopFallbackTimerRef.current)
            mediaRecorderStopFallbackTimerRef.current = null
          }
          const chunks = mediaChunksRef.current.slice()
          const skipSttAfterSilence = mediaRecorderSkipSttAfterSilenceRef.current
          mediaRecorderSkipSttAfterSilenceRef.current = false
          releaseMediaRecorderResources()
          setListening(false)
          if (skipSttAfterSilence) {
            finishVoiceSession()
            return
          }
          if (!chunks.length) {
            finishVoiceSession()
            return
          }
          beginVoiceFinalizing('Распознаю речь...')

          const effectiveMimeType = mimeType || recorder.mimeType || 'application/octet-stream'
          const blob = new Blob(chunks, { type: effectiveMimeType })
          const fileName = effectiveMimeType.includes('mp4')
            ? 'speech.mp4'
            : effectiveMimeType.includes('webm')
              ? 'speech.webm'
              : 'speech.wav'
          const formData = new FormData()
          formData.append('audio', blob, fileName)
          formData.append('lang', sttLang)

          try {
            const response = await fetch('/api/stt', {
              method: 'POST',
              body: formData,
            })
            const data = (await response.json()) as { text?: string; error?: string }
            if (!response.ok || !data.text) {
              failVoiceSoft('[Не удалось распознать речь. Попробуйте ещё раз или введите текст.]')
              return
            }
            const correctedText = applyTypoFixes(data.text.trim())
            if (!correctedText) {
              finishVoiceSession()
              return
            }
            if (isIosDevice && isLikelySttSilenceHallucination(correctedText)) {
              finishVoiceSession()
              return
            }
            commitVoiceText(correctedText)
          } catch {
            failVoiceSoft('[Ошибка сети при распознавании речи. Попробуйте ещё раз.]')
          }
        }

        recorder.start(100)

        const AudioContextCtor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (AudioContextCtor) {
          try {
            const audioCtx = new AudioContextCtor()
            mediaSilenceAudioContextRef.current = audioCtx
            void audioCtx.resume()
            const source = audioCtx.createMediaStreamSource(stream)
            const analyser = audioCtx.createAnalyser()
            analyser.fftSize = 1024
            analyser.smoothingTimeConstant = 0.5
            source.connect(analyser)
            const timeData = new Uint8Array(analyser.fftSize)
            let lastSpeechAt = performance.now()
            let hasHeardSpeech = false
            const silenceWarmupUntilMs = performance.now() + 450
            const silenceRmsThreshold = 0.024
            type MediaRecorderState = 'inactive' | 'recording' | 'paused'
            const recorderRuntimeState = () => recorder.state as MediaRecorderState

            const silenceTick = () => {
              if (mediaRecorderRef.current !== recorder || recorderRuntimeState() === 'inactive') {
                mediaSilenceRafRef.current = null
                return
              }
              analyser.getByteTimeDomainData(timeData)
              let sumSq = 0
              for (let i = 0; i < timeData.length; i++) {
                const x = (timeData[i]! - 128) / 128
                sumSq += x * x
              }
              const rms = Math.sqrt(sumSq / timeData.length)
              const now = performance.now()

              if (rms >= silenceRmsThreshold && now >= silenceWarmupUntilMs) {
                hasHeardSpeech = true
                lastSpeechAt = now
                mediaRecorderSpeechDetectedRef.current = true
              }

              if (hasHeardSpeech && now - lastSpeechAt >= BROWSER_SILENCE_MS) {
                if (mediaRecorderRef.current === recorder && recorderRuntimeState() !== 'inactive') {
                  beginVoiceFinalizing('Распознаю речь...')
                  recorder.stop()
                }
                mediaSilenceRafRef.current = null
                return
              }

              mediaSilenceRafRef.current = window.requestAnimationFrame(silenceTick)
            }

            mediaSilenceRafRef.current = window.requestAnimationFrame(silenceTick)
          } catch {
            // ignore: fallback continues with timeout-only stop
          }
        }

        mediaStopTimerRef.current = window.setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            if (mediaRecorderSpeechDetectedRef.current) {
              beginVoiceFinalizing('Распознаю речь...')
            } else {
              mediaRecorderSkipSttAfterSilenceRef.current = true
            }
            mediaRecorderRef.current.stop()
          }
        }, MEDIA_FALLBACK_MAX_MS)
      } catch (error) {
        releaseMediaRecorderResources()
        setListening(false)
        const code =
          (error as { name?: string; message?: string }).name ??
          (error as { message?: string }).message ??
          ''
        if (/notallowederror|permission/i.test(code.toLowerCase())) {
          failVoiceSession('[Нет доступа к микрофону. Разрешите микрофон для этого сайта и попробуйте снова.]')
          return
        }
        if (/notfounderror|devicesnotfounderror/i.test(code.toLowerCase())) {
          failVoiceSession('[Микрофон не найден на устройстве.]')
          return
        }
        if (/security|secure/i.test(code.toLowerCase())) {
          failVoiceSession('[Голосовой ввод работает только в защищённом контексте (HTTPS).]')
          return
        }
        failVoiceSoft('[Не удалось записать аудио. Попробуйте ещё раз.]')
      }
    }

    const startBrowserSpeechRecognition = (lang: 'ru-RU' | 'en-US') => {
      if (!SpeechRecognitionAPI) {
        void startMediaRecorderFallback(sttLangForApi)
        return
      }

      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }

      const recognition = new SpeechRecognitionAPI()
      recognition.lang = lang
      recognition.continuous = true
      recognition.interimResults = true
      let latestFinalText = ''
      let latestInterimText = ''
      let didFallbackToRecorder = false
      let timedOut = false
      let fellBackToRecorder = false
      let safetyTimeoutId: number | null = null
      let silenceTimeoutId: number | null = null

      const clearSafetyTimeout = () => {
        if (safetyTimeoutId != null) {
          window.clearTimeout(safetyTimeoutId)
          safetyTimeoutId = null
        }
      }

      const clearSilenceTimeout = () => {
        if (silenceTimeoutId != null) {
          window.clearTimeout(silenceTimeoutId)
          silenceTimeoutId = null
        }
      }

      const stopBrowserRecognition = () => {
        if (recognitionRef.current !== recognition) return
        beginVoiceFinalizing()
        try {
          recognition.stop()
        } catch {
          // ignore
        }
      }

      recognition.addEventListener('start', () => {
        setListening(true)
        clearSafetyTimeout()
        clearSilenceTimeout()
        safetyTimeoutId = window.setTimeout(() => {
          safetyTimeoutId = null
          if (recognitionRef.current !== recognition) return
          timedOut = true
          stopBrowserRecognition()
        }, LISTENING_MAX_MS)
      })

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const { finalText, interimText } = extractSpeechRecognitionTranscript(event)
        const interimBase = finalText === latestFinalText ? latestInterimText : ''
        const stableInterimText = stabilizeInterimAcrossTicks(interimBase, interimText)
        latestFinalText = finalText
        latestInterimText = stableInterimText
        updateVoiceTranscript(finalText, stableInterimText)
        clearSilenceTimeout()
        silenceTimeoutId = window.setTimeout(() => {
          stopBrowserRecognition()
        }, BROWSER_SILENCE_MS)
      }

      recognition.onend = () => {
        clearSafetyTimeout()
        clearSilenceTimeout()
        if (recognitionRef.current === recognition) {
          recognitionRef.current = null
        }
        setListening(false)
        if (fellBackToRecorder) return
        if (
          isIosChrome &&
          !didFallbackToRecorder &&
          !chooseFinalSpeechText(latestFinalText, latestInterimText)
        ) {
          didFallbackToRecorder = true
          fellBackToRecorder = true
          updateVoiceTranscript('', '')
          void startMediaRecorderFallback(sttLangForApi)
          return
        }
        const resolvedFinalText = chooseFinalSpeechText(latestFinalText, latestInterimText)
        const correctedFinalText = applyTypoFixes(resolvedFinalText)
        if (correctedFinalText) {
          if (isIosDevice && isLikelySttSilenceHallucination(correctedFinalText)) {
            finishVoiceSession()
            return
          }
          commitVoiceText(correctedFinalText)
          return
        }
        if (timedOut) {
          failVoiceSoft(
            '[Распознавание затянулось. Скажите короче или введите текст с клавиатуры (включая цифры и знаки).]'
          )
          return
        }
        finishVoiceSession()
      }

      recognition.onerror = (event: Event) => {
        clearSafetyTimeout()
        clearSilenceTimeout()
        const err = (event as unknown as { error?: string; message?: string }).error
        const msg = (event as unknown as { message?: string }).message
        const code = (err ?? msg ?? '').toString()
        if (/^aborted$/i.test(code)) {
          if (recognitionRef.current === recognition) {
            recognitionRef.current = null
          }
          setListening(false)
          if (isIosChrome && !didFallbackToRecorder) {
            didFallbackToRecorder = true
            fellBackToRecorder = true
            updateVoiceTranscript('', '')
            void startMediaRecorderFallback(sttLangForApi)
            return
          }
          finishVoiceSession()
          return
        }
        if (recognitionRef.current === recognition) {
          recognitionRef.current = null
        }
        setListening(false)

        if (/service-not-allowed|not-allowed|audio-capture|network/i.test(code)) {
          fellBackToRecorder = true
          updateVoiceTranscript('', '')
          void startMediaRecorderFallback(sttLangForApi)
          return
        }

        if (/no-speech/i.test(code)) {
          if (isIosChrome && !didFallbackToRecorder) {
            didFallbackToRecorder = true
            fellBackToRecorder = true
            updateVoiceTranscript('', '')
            void startMediaRecorderFallback(sttLangForApi)
            return
          }
          failVoiceSoft('[Речь не распознана. Скажите фразу ещё раз чуть громче.]')
        } else if (/not-allowed|permission/i.test(code)) {
          failVoiceSession('[Нет доступа к микрофону. Разрешите микрофон для этого сайта и попробуйте снова.]')
        } else if (code) {
          failVoiceSoft(`[Ошибка распознавания речи: ${code}]`)
        } else {
          failVoiceSoft('[Не удалось распознать речь. Попробуйте ещё раз.]')
        }
      }

      recognitionRef.current = recognition
      try {
        recognition.start()
      } catch {
        void startMediaRecorderFallback(sttLangForApi)
      }
    }

    const useFallback = shouldUseMediaRecorderFallback({
      hasSpeechRecognition: Boolean(SpeechRecognitionAPI),
      isIosChrome,
    })
    if (useFallback) {
      await startMediaRecorderFallback(sttLangForApi)
    } else {
      startBrowserSpeechRecognition(preferredLocale)
    }
  }, [
    beginVoiceFinalizing,
    commitVoiceText,
    failVoiceSession,
    finishVoiceSession,
    releaseMediaRecorderResources,
    setVoiceStatusMessage,
    startVoiceSession,
    updateVoiceTranscript,
  ])

  const stopListening = React.useCallback(() => {
    if (voicePhase === 'finalizing') return
    if (recognitionRef.current) {
      beginVoiceFinalizing()
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
      recognitionRef.current = null
      setListening(false)
    }
    if (mediaStopTimerRef.current != null) {
      window.clearTimeout(mediaStopTimerRef.current)
      mediaStopTimerRef.current = null
    }
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      beginVoiceFinalizing('Распознаю речь...')
      try {
        recorder.stop()
      } catch {
        // ignore
      }
    }
    if (mediaRecorderRef.current != null) {
      if (mediaRecorderStopFallbackTimerRef.current != null) {
        window.clearTimeout(mediaRecorderStopFallbackTimerRef.current)
      }
      mediaRecorderStopFallbackTimerRef.current = window.setTimeout(() => {
        mediaRecorderStopFallbackTimerRef.current = null
        if (mediaStreamRef.current != null || mediaRecorderRef.current != null) {
          releaseMediaRecorderResources()
        }
      }, 2500)
    }
    resetMicAnimation()
  }, [beginVoiceFinalizing, releaseMediaRecorderResources, resetMicAnimation, voicePhase])

  const resetVoiceInput = React.useCallback(() => {
    if (mediaStopTimerRef.current != null) {
      window.clearTimeout(mediaStopTimerRef.current)
      mediaStopTimerRef.current = null
    }
    if (mediaRecorderStopFallbackTimerRef.current != null) {
      window.clearTimeout(mediaRecorderStopFallbackTimerRef.current)
      mediaRecorderStopFallbackTimerRef.current = null
    }
    clearFinalizingWatchdog()
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
      recognitionRef.current = null
    }
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop()
        }
      } catch {
        // ignore
      }
    }
    releaseMediaRecorderResources()
    setListening(false)
    clearMicAnimationTimers()
    setMicVisualState('idle')
    lastInviteKeyRef.current = null
    resetComposer()
  }, [clearFinalizingWatchdog, clearMicAnimationTimers, releaseMediaRecorderResources, resetComposer])

  const setDraftText = React.useCallback((text: string) => {
    dispatchSetDraftText(text)
  }, [dispatchSetDraftText])

  React.useEffect(() => {
    if (listening || voicePhase === 'recording' || voicePhase === 'finalizing') return
    resetMicAnimation()
  }, [listening, resetMicAnimation, voicePhase])

  React.useEffect(() => {
    if (!inviteKey) return
    if (listening || isVoiceActive) return
    if (lastInviteKeyRef.current === inviteKey) return
    lastInviteKeyRef.current = inviteKey
    setMicVisualState((current) => (current === 'idle' ? 'invite' : current))
  }, [inviteKey, isVoiceActive, listening])

  React.useEffect(() => {
    if (micVisualState !== 'invite') return
    clearMicAnimationTimers()
    micInviteTimerRef.current = window.setTimeout(() => {
      micInviteTimerRef.current = null
      setMicVisualState('wait')
    }, 1800)
    return () => {
      clearMicAnimationTimers()
    }
  }, [clearMicAnimationTimers, micVisualState])

  React.useEffect(() => {
    clearFinalizingWatchdog()
    if (voicePhase !== 'finalizing') return
    finalizingWatchdogTimerRef.current = window.setTimeout(() => {
      finalizingWatchdogTimerRef.current = null
      releaseMediaRecorderResources()
      setListening(false)
      if (typeof window !== 'undefined' && isIosLikeDevice(window.navigator.userAgent)) {
        finishVoiceSession()
        return
      }
      failVoiceSession('[Голосовой ввод завис. Продолжайте печатать с клавиатуры или попробуйте микрофон снова.]')
    }, 22_000)
    return () => {
      clearFinalizingWatchdog()
    }
  }, [clearFinalizingWatchdog, failVoiceSession, finishVoiceSession, releaseMediaRecorderResources, voicePhase])

  React.useEffect(() => {
    return () => {
      clearFinalizingWatchdog()
      clearMicAnimationTimers()
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // ignore
        }
        recognitionRef.current = null
      }
      releaseMediaRecorderResources()
    }
  }, [clearFinalizingWatchdog, clearMicAnimationTimers, releaseMediaRecorderResources])

  return {
    draftText,
    displayText,
    livePreviewText,
    voicePhase,
    voiceStatusMessage,
    isVoiceActive,
    isInputLocked,
    setDraftText,
    listening,
    micVisualState,
    micActionActive,
    startListening,
    stopListening,
    resetMicAnimation,
    resetVoiceInput,
  }
}
