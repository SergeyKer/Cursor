'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getMoscowDateKey, isValidVoiceLabPassword } from '@/lib/engvo/voiceLab/gatePassword'
import {
  ENGVO_VOICE_LAB_SCRIPT_HINT,
  ENGVO_VOICE_LAB_SCRIPT_LINES,
} from '@/lib/engvo/voiceLab/recordingScript'
import type { EngvoCustomVoiceEntry } from '@/lib/engvo/voiceLab/customVoicesManifest'

const UNLOCK_KEY = 'engvo-voice-lab-unlocked'
const MAX_RECORD_MS = 120_000
const TARGET_RECORD_MS = 90_000

type TabId = 'record' | 'register'

type ApiVoicePayload = {
  voice?: EngvoCustomVoiceEntry
  voices?: EngvoCustomVoiceEntry[]
  wroteToDisk?: boolean
  manifestSnippet?: string
  hint?: string | null
  userMessage?: string
  error?: string
}

function loadUnlock(): { ok: boolean; password: string } {
  try {
    const raw = sessionStorage.getItem(UNLOCK_KEY)
    if (!raw) return { ok: false, password: '' }
    const parsed = JSON.parse(raw) as { dateKey?: string; password?: string }
    if (parsed.dateKey !== getMoscowDateKey()) return { ok: false, password: '' }
    const password = typeof parsed.password === 'string' ? parsed.password : ''
    if (!password || !isValidVoiceLabPassword(password)) return { ok: false, password: '' }
    return { ok: true, password }
  } catch {
    return { ok: false, password: '' }
  }
}

function saveUnlock(password: string): void {
  try {
    sessionStorage.setItem(
      UNLOCK_KEY,
      JSON.stringify({ dateKey: getMoscowDateKey(), password })
    )
  } catch {
    // ignore
  }
}

function passwordHeader(password: string): HeadersInit {
  return { 'X-Voice-Lab-Password': password }
}

export default function VoiceLabApp() {
  const [passwordInput, setPasswordInput] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [gateError, setGateError] = useState<string | null>(null)
  const [tab, setTab] = useState<TabId>('record')
  const [voices, setVoices] = useState<EngvoCustomVoiceEntry[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [manifestSnippet, setManifestSnippet] = useState<string | null>(null)
  const [voiceName, setVoiceName] = useState('Engvo Warm')
  const [registerId, setRegisterId] = useState('')
  const [registerName, setRegisterName] = useState('')
  const [recording, setRecording] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [level, setLevel] = useState(0)
  const [sessionPassword, setSessionPassword] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const startedAtRef = useRef(0)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    const unlock = loadUnlock()
    if (unlock.ok) {
      setSessionPassword(unlock.password)
      setUnlocked(true)
    }
  }, [])

  const refreshVoices = useCallback(async () => {
    try {
      const res = await fetch('/api/engvo/voice-lab/voices')
      const data = (await res.json()) as { voices?: EngvoCustomVoiceEntry[] }
      setVoices(Array.isArray(data.voices) ? data.voices : [])
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (unlocked) void refreshVoices()
  }, [unlocked, refreshVoices])

  const stopMeter = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    analyserRef.current = null
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
    setLevel(0)
  }, [])

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    stopMeter()
  }, [stopMeter])

  const stopRecording = useCallback(() => {
    const rec = mediaRecorderRef.current
    if (rec && rec.state !== 'inactive') {
      try {
        rec.stop()
      } catch {
        // ignore
      }
    }
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    setRecording(false)
  }, [])

  useEffect(() => () => {
    stopRecording()
    cleanupStream()
    if (audioUrl) URL.revokeObjectURL(audioUrl)
  }, [audioUrl, cleanupStream, stopRecording])

  const startLevelMeter = (stream: MediaStream) => {
    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    analyserRef.current = analyser
    const data = new Uint8Array(analyser.frequencyBinCount)
    const tick = () => {
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) {
        const v = (data[i]! - 128) / 128
        sum += v * v
      }
      setLevel(Math.min(1, Math.sqrt(sum / data.length) * 4))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const startRecording = async () => {
    setError(null)
    setStatus(null)
    setManifestSnippet(null)
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    setAudioBlob(null)
    chunksRef.current = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      startLevelMeter(stream)
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : ''
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      mediaRecorderRef.current = rec
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        cleanupStream()
      }
      rec.start(250)
      startedAtRef.current = performance.now()
      setElapsedMs(0)
      setRecording(true)
      timerRef.current = window.setInterval(() => {
        const elapsed = performance.now() - startedAtRef.current
        setElapsedMs(elapsed)
        if (elapsed >= MAX_RECORD_MS) stopRecording()
      }, 200)
    } catch {
      setError('Нет доступа к микрофону.')
      cleanupStream()
    }
  }

  const onUnlock = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidVoiceLabPassword(passwordInput)) {
      setGateError('Неверный пароль.')
      return
    }
    setGateError(null)
    const pwd = passwordInput.trim()
    setSessionPassword(pwd)
    saveUnlock(pwd)
    setUnlocked(true)
  }

  const applyApiResult = (data: ApiVoicePayload) => {
    if (data.voices) setVoices(data.voices)
    if (data.manifestSnippet) setManifestSnippet(data.manifestSnippet)
    if (data.hint) setStatus(data.hint)
    else if (data.voice) setStatus(`Голос сохранён: ${data.voice.name} (${data.voice.voiceId})`)
  }

  const createVoice = async () => {
    if (!audioBlob) {
      setError('Сначала запишите голос.')
      return
    }
    if (!sessionPassword) {
      setError('Сессия без пароля API. Войдите снова.')
      setUnlocked(false)
      return
    }
    setError(null)
    setStatus('Создаём голос…')
    const form = new FormData()
    form.append('name', voiceName.trim())
    form.append('file', audioBlob, 'reference.webm')
    const res = await fetch('/api/engvo/voice-lab/voices?mode=create', {
      method: 'POST',
      headers: passwordHeader(sessionPassword),
      body: form,
    })
    const data = (await res.json().catch(() => ({}))) as ApiVoicePayload
    if (!res.ok) {
      setError(data.userMessage || 'Ошибка создания.')
      setStatus(null)
      if (res.status === 403) setTab('register')
      return
    }
    applyApiResult(data)
  }

  const registerVoice = async () => {
    if (!sessionPassword) {
      setError('Сессия без пароля API. Войдите снова.')
      setUnlocked(false)
      return
    }
    setError(null)
    setStatus('Регистрируем…')
    const res = await fetch('/api/engvo/voice-lab/voices?mode=register', {
      method: 'POST',
      headers: {
        ...passwordHeader(sessionPassword),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ voiceId: registerId.trim(), name: registerName.trim() }),
    })
    const data = (await res.json().catch(() => ({}))) as ApiVoicePayload
    if (!res.ok) {
      setError(data.userMessage || 'Ошибка регистрации.')
      setStatus(null)
      return
    }
    applyApiResult(data)
    setRegisterId('')
    setRegisterName('')
  }

  const deleteVoice = async (voiceId: string) => {
    if (!sessionPassword) return
    if (!window.confirm(`Удалить голос ${voiceId}?`)) return
    setError(null)
    const res = await fetch(`/api/engvo/voice-lab/voices/${voiceId}`, {
      method: 'DELETE',
      headers: passwordHeader(sessionPassword),
    })
    const data = (await res.json().catch(() => ({}))) as ApiVoicePayload
    if (!res.ok) {
      setError(data.userMessage || 'Ошибка удаления.')
      return
    }
    applyApiResult(data)
    setStatus(`Удалён: ${voiceId}`)
  }

  const elapsedLabel = useMemo(() => {
    const s = Math.floor(elapsedMs / 1000)
    const m = Math.floor(s / 60)
    const r = s % 60
    return `${m}:${r.toString().padStart(2, '0')}`
  }, [elapsedMs])

  if (!unlocked) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4 py-10">
        <h1 className="text-xl font-semibold">Engvo Voice Lab</h1>
        <form onSubmit={onUnlock} className="flex flex-col gap-3">
          <label className="text-sm">
            Пароль
            <input
              type="password"
              className="mt-1 w-full rounded border px-3 py-2"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              autoComplete="off"
            />
          </label>
          {gateError && <p className="text-sm text-red-600">{gateError}</p>}
          <button type="submit" className="rounded bg-neutral-900 px-4 py-2 text-white">
            Войти
          </button>
        </form>
        <p className="text-xs text-neutral-500">Дата (MSK): {getMoscowDateKey()}</p>
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Engvo Voice Lab</h1>
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            className={`rounded px-3 py-1 ${tab === 'record' ? 'bg-neutral-900 text-white' : 'bg-neutral-100'}`}
            onClick={() => setTab('record')}
          >
            Записать
          </button>
          <button
            type="button"
            className={`rounded px-3 py-1 ${tab === 'register' ? 'bg-neutral-900 text-white' : 'bg-neutral-100'}`}
            onClick={() => setTab('register')}
          >
            Зарегистрировать ID
          </button>
        </div>
      </header>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {status && <p className="mb-3 text-sm text-neutral-700">{status}</p>}

      {tab === 'record' && (
        <section className="space-y-4">
          <p className="text-sm text-neutral-600">{ENGVO_VOICE_LAB_SCRIPT_HINT}</p>
          <div className="max-h-64 space-y-3 overflow-y-auto rounded border p-3">
            {ENGVO_VOICE_LAB_SCRIPT_LINES.map((line) => (
              <div key={line.en}>
                <p className="font-medium">{line.en}</p>
                <p className="text-sm text-neutral-500">{line.ru}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!recording ? (
              <button type="button" className="rounded bg-red-600 px-4 py-2 text-white" onClick={() => void startRecording()}>
                ● Запись
              </button>
            ) : (
              <button type="button" className="rounded bg-neutral-800 px-4 py-2 text-white" onClick={stopRecording}>
                ■ Стоп
              </button>
            )}
            <span className="tabular-nums text-sm">
              {elapsedLabel} {elapsedMs >= TARGET_RECORD_MS ? '(достаточно)' : '(цель ≥ 1:30)'}
            </span>
            <div className="h-2 w-32 overflow-hidden rounded bg-neutral-200">
              <div className="h-full bg-emerald-500 transition-[width]" style={{ width: `${Math.round(level * 100)}%` }} />
            </div>
          </div>
          {audioUrl && (
            <audio controls src={audioUrl} className="w-full" />
          )}
          <label className="block text-sm">
            Имя голоса
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              maxLength={40}
            />
          </label>
          <button
            type="button"
            className="rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-40"
            disabled={!audioBlob || voiceName.trim().length < 2}
            onClick={() => void createVoice()}
          >
            Создать
          </button>
        </section>
      )}

      {tab === 'register' && (
        <section className="space-y-3">
          <p className="text-sm text-neutral-600">
            Если create API недоступен: создайте голос в xAI Console, скопируйте voice_id и зарегистрируйте здесь.
          </p>
          <label className="block text-sm">
            voice_id
            <input
              className="mt-1 w-full rounded border px-3 py-2 font-mono"
              value={registerId}
              onChange={(e) => setRegisterId(e.target.value)}
              placeholder="nlbqfwie"
              maxLength={8}
            />
          </label>
          <label className="block text-sm">
            Имя
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={registerName}
              onChange={(e) => setRegisterName(e.target.value)}
              maxLength={40}
            />
          </label>
          <button
            type="button"
            className="rounded bg-neutral-900 px-4 py-2 text-white"
            onClick={() => void registerVoice()}
          >
            Зарегистрировать
          </button>
        </section>
      )}

      {manifestSnippet && (
        <section className="mt-6 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Манифест (для коммита)</h2>
            <button
              type="button"
              className="text-sm underline"
              onClick={() => void navigator.clipboard.writeText(manifestSnippet)}
            >
              Скопировать
            </button>
          </div>
          <pre className="overflow-x-auto rounded bg-neutral-100 p-3 text-xs">{manifestSnippet}</pre>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold">Голоса в Other</h2>
        {voices.length === 0 ? (
          <p className="text-sm text-neutral-500">Пока пусто.</p>
        ) : (
          <ul className="space-y-2">
            {voices.map((v) => (
              <li key={v.voiceId} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                <span>
                  <strong>{v.name}</strong>{' '}
                  <span className="font-mono text-neutral-500">{v.voiceId}</span>
                </span>
                <button type="button" className="text-red-600" onClick={() => void deleteVoice(v.voiceId)}>
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
