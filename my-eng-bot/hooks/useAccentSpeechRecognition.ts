'use client'

import * as React from 'react'

interface AccentSpeechState {
  supported: boolean
  listening: boolean
  transcript: string
  constructiveMessage: string | null
}

interface AccentSpeechRecognitionControls extends AccentSpeechState {
  start: () => void
  stop: () => void
  resetTranscript: () => void
  setManualTranscript: (value: string) => void
}

type SpeechRecognitionCtor = typeof SpeechRecognition

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

export function useAccentSpeechRecognition(): AccentSpeechRecognitionControls {
  const recognitionRef = React.useRef<SpeechRecognition | null>(null)
  const finalTranscriptRef = React.useRef<string>('')
  const [supported, setSupported] = React.useState(false)
  const [listening, setListening] = React.useState(false)
  const [transcript, setTranscript] = React.useState('')
  const [constructiveMessage, setConstructiveMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    setSupported(Boolean(getSpeechRecognitionCtor()))
  }, [])

  const resetTranscript = React.useCallback(() => {
    finalTranscriptRef.current = ''
    setTranscript('')
    setConstructiveMessage(null)
  }, [])

  const stop = React.useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition) {
      setListening(false)
      return
    }
    try {
      recognition.stop()
    } catch {
      setListening(false)
    }
  }, [])

  const start = React.useCallback(() => {
    const RecognitionCtor = getSpeechRecognitionCtor()
    if (!RecognitionCtor) {
      setSupported(false)
      setConstructiveMessage('Браузер не даёт встроенное распознавание. Можно ввести услышанный текст вручную.')
      return
    }

    resetTranscript()
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
        finalTranscriptRef.current = `${finalTranscriptRef.current} ${chunks.join(' ')}`.trim()
        setTranscript(finalTranscriptRef.current)
      }
    }

    recognition.onerror = () => {
      setConstructiveMessage('Микрофон не дал текст. Можно повторить запись или перейти в ручной ввод.')
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
      setTranscript(finalTranscriptRef.current.trim())
    }

    recognitionRef.current = recognition
    setConstructiveMessage(null)
    try {
      recognition.start()
      setListening(true)
    } catch {
      setConstructiveMessage('Запись уже занята браузером. Останови текущую попытку и начни заново.')
      setListening(false)
    }
  }, [resetTranscript])

  const setManualTranscript = React.useCallback((value: string) => {
    finalTranscriptRef.current = value
    setTranscript(value)
  }, [])

  React.useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort()
      } catch {
        // Nothing to clean up if the browser already stopped recognition.
      }
      recognitionRef.current = null
    }
  }, [])

  return {
    supported,
    listening,
    transcript,
    constructiveMessage,
    start,
    stop,
    resetTranscript,
    setManualTranscript,
  }
}
