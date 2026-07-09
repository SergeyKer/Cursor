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

const fieldClass =
  'mt-1.5 w-full border border-neutral-200 bg-white px-3 py-2.5 font-mono text-sm text-neutral-900 outline-none transition focus:border-neutral-900'
const btnPrimary =
  'inline-flex items-center justify-center border border-neutral-900 bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40'
const btnGhost =
  'inline-flex items-center justify-center border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 transition hover:border-neutral-400 hover:text-neutral-900'
const btnDanger =
  'inline-flex items-center justify-center border border-red-600 bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700'
const btnTabActive = 'border-neutral-900 bg-neutral-900 text-white'
const btnTabIdle = 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400 hover:text-neutral-900'

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-y-contain bg-white text-neutral-900 antialiased">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #e5e5e5 1px, transparent 1px), linear-gradient(to bottom, #e5e5e5 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage: 'linear-gradient(to bottom, black 0%, transparent 72%)',
        }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-2xl px-4 py-8 pb-16 sm:px-6 sm:py-10">{children}</div>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-400">
      <span>{label}</span>
      <span className="h-px flex-1 bg-neutral-200" />
      <span className="text-neutral-600 normal-case tracking-normal">{value}</span>
    </div>
  )
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

  const progressPct = Math.min(100, Math.round((elapsedMs / TARGET_RECORD_MS) * 100))

  if (!unlocked) {
    return (
      <Shell>
        <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center gap-8">
          <div className="space-y-3">
            <MetaRow label="module" value="voice-lab" />
            <h1 className="text-2xl font-semibold tracking-tight">Engvo Voice Lab</h1>
            <p className="text-sm leading-relaxed text-neutral-500">
              Служебная панель клонирования голосов для меню Other.
            </p>
          </div>
          <form onSubmit={onUnlock} className="space-y-4 border border-neutral-200 bg-white p-5">
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
              Access key
              <input
                type="password"
                className={fieldClass}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoComplete="off"
              />
            </label>
            {gateError && (
              <p className="border border-red-200 bg-red-50 px-3 py-2 font-mono text-xs text-red-700">
                {gateError}
              </p>
            )}
            <button type="submit" className={`${btnPrimary} w-full`}>
              Unlock
            </button>
          </form>
          <MetaRow label="date.msk" value={getMoscowDateKey()} />
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <header className="mb-8 space-y-5 border-b border-neutral-200 pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <MetaRow label="module" value="voice-lab / custom-voices" />
            <h1 className="text-2xl font-semibold tracking-tight">Engvo Voice Lab</h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className={`${btnGhost} ${tab === 'record' ? btnTabActive : btnTabIdle}`}
              onClick={() => setTab('record')}
            >
              Record
            </button>
            <button
              type="button"
              className={`${btnGhost} ${tab === 'register' ? btnTabActive : btnTabIdle}`}
              onClick={() => setTab('register')}
            >
              Register ID
            </button>
          </div>
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-neutral-500">
          Запись reference-аудио → create / register voice_id → голос появляется в Other.
        </p>
      </header>

      {(error || status) && (
        <div className="mb-6 space-y-2">
          {error && (
            <p className="border border-red-200 bg-red-50 px-3 py-2 font-mono text-xs text-red-700">
              ERR · {error}
            </p>
          )}
          {status && (
            <p className="border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-xs text-neutral-700">
              OK · {status}
            </p>
          )}
        </div>
      )}

      {tab === 'record' && (
        <section className="space-y-6">
          <div className="space-y-2">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-400">
              01 · Script
            </h2>
            <p className="text-sm leading-relaxed text-neutral-600">{ENGVO_VOICE_LAB_SCRIPT_HINT}</p>
          </div>

          <ol className="divide-y divide-neutral-100 border border-neutral-200 bg-white">
            {ENGVO_VOICE_LAB_SCRIPT_LINES.map((line, index) => (
              <li key={line.en} className="grid gap-1 px-4 py-3.5 sm:grid-cols-[2.5rem_1fr]">
                <span className="font-mono text-[11px] text-neutral-300">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <p className="text-[15px] leading-snug text-neutral-900">{line.en}</p>
                  <p className="mt-1 text-sm text-neutral-400">{line.ru}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="space-y-3 border border-neutral-200 bg-white p-4">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-400">
              02 · Capture
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              {!recording ? (
                <button type="button" className={btnDanger} onClick={() => void startRecording()}>
                  ● Record
                </button>
              ) : (
                <button type="button" className={btnPrimary} onClick={stopRecording}>
                  ■ Stop
                </button>
              )}
              <span className="font-mono text-sm tabular-nums text-neutral-800">
                {elapsedLabel}
                <span className="ml-2 text-neutral-400">
                  {elapsedMs >= TARGET_RECORD_MS ? 'ready ≥ 1:30' : 'target ≥ 1:30'}
                </span>
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                <span>level</span>
                <span>progress {progressPct}%</span>
              </div>
              <div className="h-1.5 w-full bg-neutral-100">
                <div
                  className="h-full bg-emerald-500 transition-[width]"
                  style={{ width: `${Math.round(level * 100)}%` }}
                />
              </div>
              <div className="h-1 w-full bg-neutral-100">
                <div
                  className="h-full bg-neutral-900 transition-[width]"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
            {audioUrl && <audio controls src={audioUrl} className="mt-2 w-full" />}
          </div>

          <div className="space-y-3 border border-neutral-200 bg-white p-4">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-400">
              03 · Create
            </h2>
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
              Voice name
              <input
                className={fieldClass}
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                maxLength={40}
              />
            </label>
            <button
              type="button"
              className={btnPrimary}
              disabled={!audioBlob || voiceName.trim().length < 2}
              onClick={() => void createVoice()}
            >
              Create voice
            </button>
          </div>
        </section>
      )}

      {tab === 'register' && (
        <section className="space-y-4 border border-neutral-200 bg-white p-4">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-400">
            Register existing voice_id
          </h2>
          <p className="text-sm leading-relaxed text-neutral-600">
            Если create API недоступен: создайте голос в xAI Console, скопируйте voice_id и
            зарегистрируйте здесь.
          </p>
          <label className="block text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
            voice_id
            <input
              className={fieldClass}
              value={registerId}
              onChange={(e) => setRegisterId(e.target.value)}
              placeholder="nlbqfwie"
              maxLength={8}
            />
          </label>
          <label className="block text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
            Name
            <input
              className={fieldClass}
              value={registerName}
              onChange={(e) => setRegisterName(e.target.value)}
              maxLength={40}
            />
          </label>
          <button type="button" className={btnPrimary} onClick={() => void registerVoice()}>
            Register
          </button>
        </section>
      )}

      {manifestSnippet && (
        <section className="mt-8 space-y-3 border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-400">
              Manifest · commit payload
            </h2>
            <button
              type="button"
              className={btnGhost}
              onClick={() => void navigator.clipboard.writeText(manifestSnippet)}
            >
              Copy
            </button>
          </div>
          <pre className="overflow-x-auto border border-neutral-100 bg-neutral-50 p-3 font-mono text-xs leading-relaxed text-neutral-700">
            {manifestSnippet}
          </pre>
        </section>
      )}

      <section className="mt-8 space-y-3">
        <div className="flex items-baseline gap-2">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-400">
            Other · roster
          </h2>
          <span className="font-mono text-[11px] text-neutral-300">{voices.length}</span>
        </div>
        {voices.length === 0 ? (
          <p className="border border-dashed border-neutral-200 px-4 py-6 text-sm text-neutral-400">
            Пока пусто — создайте или зарегистрируйте голос.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100 border border-neutral-200 bg-white">
            {voices.map((v) => (
              <li
                key={v.voiceId}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <span className="min-w-0">
                  <span className="font-medium text-neutral-900">{v.name}</span>{' '}
                  <span className="font-mono text-neutral-400">{v.voiceId}</span>
                </span>
                <button
                  type="button"
                  className="shrink-0 font-mono text-xs text-red-600 hover:underline"
                  onClick={() => void deleteVoice(v.voiceId)}
                >
                  delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Shell>
  )
}
