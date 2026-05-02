'use client'

import * as React from 'react'

interface AudioPreviewState {
  supported: boolean
  recording: boolean
  audioUrl: string | null
  constructiveMessage: string | null
}

interface AudioPreviewControls extends AudioPreviewState {
  start: () => Promise<void>
  stop: () => void
  clear: () => void
}

function getPreferredMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType))
}

export function useAudioPreview(): AudioPreviewControls {
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const chunksRef = React.useRef<Blob[]>([])
  const audioUrlRef = React.useRef<string | null>(null)
  const [supported, setSupported] = React.useState(false)
  const [recording, setRecording] = React.useState(false)
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null)
  const [constructiveMessage, setConstructiveMessage] = React.useState<string | null>(null)

  const revokeAudioUrl = React.useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
    }
    setAudioUrl(null)
  }, [])

  const stopTracks = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const clear = React.useCallback(() => {
    revokeAudioUrl()
    chunksRef.current = []
    setConstructiveMessage(null)
  }, [revokeAudioUrl])

  React.useEffect(() => {
    setSupported(typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined')
  }, [])

  const start = React.useCallback(async () => {
    clear()
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setSupported(false)
      setConstructiveMessage('Браузер не даёт локальную запись. Можно пройти блок через ручной ввод.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = getPreferredMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        if (blob.size > 0) {
          const nextUrl = URL.createObjectURL(blob)
          audioUrlRef.current = nextUrl
          setAudioUrl(nextUrl)
        }
        setRecording(false)
        stopTracks()
      }

      recorder.start()
      setRecording(true)
      setConstructiveMessage(null)
    } catch {
      setRecording(false)
      stopTracks()
      setConstructiveMessage('Микрофон сейчас недоступен. Можно разрешить доступ и повторить или ввести текст вручную.')
    }
  }, [clear, stopTracks])

  const stop = React.useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') {
      setRecording(false)
      stopTracks()
      return
    }
    try {
      recorder.stop()
    } catch {
      setRecording(false)
      stopTracks()
    }
  }, [stopTracks])

  React.useEffect(() => {
    return () => {
      try {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop()
        }
      } catch {
        // Recorder may already be stopped by the browser.
      }
      stopTracks()
      revokeAudioUrl()
    }
  }, [revokeAudioUrl, stopTracks])

  return {
    supported,
    recording,
    audioUrl,
    constructiveMessage,
    start,
    stop,
    clear,
  }
}
