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
  'mt-1.5 w-full rounded-xl border border-sky-100/80 bg-white/90 px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-200/70'
const btnPrimary =
  'inline-flex items-center justify-center rounded-xl bg-[#5093EE] px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-sky-200/60 transition hover:bg-[#3f82dd] disabled:cursor-not-allowed disabled:opacity-40'
const btnGhost =
  'inline-flex items-center justify-center rounded-full border border-sky-100 bg-white/70 px-3.5 py-1.5 text-sm text-slate-600 shadow-sm transition hover:border-sky-200 hover:bg-white hover:text-slate-900'
const btnDanger =
  'inline-flex items-center justify-center rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-rose-200/50 transition hover:bg-rose-600'
const btnTabActive = 'border-transparent bg-[#5093EE] text-white shadow-sm shadow-sky-200/70 hover:bg-[#3f82dd] hover:text-white'
const btnTabIdle = 'border-sky-100 bg-white/70 text-slate-500 hover:border-sky-200 hover:bg-white hover:text-slate-800'
const panelClass = 'rounded-2xl border border-white/70 bg-white/75 p-4 shadow-[0_8px_30px_rgba(80,147,238,0.08)] backdrop-blur-sm'
const labelClass = 'block text-xs font-medium uppercase tracking-[0.12em] text-slate-400'
const sectionLabelClass = 'font-mono text-[11px] uppercase tracking-[0.14em] text-sky-500/80'
const alertErrorClass =
  'rounded-xl border border-rose-200/80 bg-rose-50/90 px-3.5 py-2.5 font-mono text-xs text-rose-700'
const alertOkClass =
  'rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-3.5 py-2.5 font-mono text-xs text-emerald-700'

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-y-contain text-slate-800 antialiased">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 10% -10%, rgba(80,147,238,0.28), transparent 55%), radial-gradient(ellipse 70% 45% at 95% 5%, rgba(125,211,252,0.35), transparent 50%), linear-gradient(165deg, #e8f1f8 0%, #f4f8fc 42%, #eef4fa 100%)',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.22]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(80,147,238,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(80,147,238,0.18) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'linear-gradient(to bottom, black 0%, transparent 65%)',
        }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-2xl px-4 py-8 pb-16 sm:px-6 sm:py-10">{children}</div>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-sky-500/70">
      <span>{label}</span>
      <span className="h-px flex-1 bg-sky-200/60" />
      <span className="normal-case tracking-normal text-slate-500">{value}</span>
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
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Engvo Voice Lab</h1>
            <p className="text-sm leading-relaxed text-slate-500">
              Служебная панель клонирования голосов для меню Other.
            </p>
          </div>
          <form onSubmit={onUnlock} className={`${panelClass} space-y-4 p-5`}>
            <label className={labelClass}>
              Access key
              <input
                type="password"
                className={fieldClass}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoComplete="off"
              />
            </label>
            {gateError && <p className={alertErrorClass}>{gateError}</p>}
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
      <header className="mb-8 space-y-5 border-b border-sky-100/80 pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <MetaRow label="module" value="voice-lab / custom-voices" />
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Engvo Voice Lab</h1>
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
        <p className="max-w-xl text-sm leading-relaxed text-slate-500">
          Запись reference-аудио → create / register voice_id → голос появляется в Other.
        </p>
      </header>

      {(error || status) && (
        <div className="mb-6 space-y-2">
          {error && <p className={alertErrorClass}>ERR · {error}</p>}
          {status && <p className={alertOkClass}>OK · {status}</p>}
        </div>
      )}

      {tab === 'record' && (
        <section className="space-y-6">
          <div className="space-y-2">
            <h2 className={sectionLabelClass}>01 · Script</h2>
            <p className="text-sm leading-relaxed text-slate-600">{ENGVO_VOICE_LAB_SCRIPT_HINT}</p>
          </div>

          <ol className="divide-y divide-sky-50/90 overflow-hidden rounded-2xl border border-white/70 bg-white/75 shadow-[0_8px_30px_rgba(80,147,238,0.08)] backdrop-blur-sm">
            {ENGVO_VOICE_LAB_SCRIPT_LINES.map((line, index) => (
              <li key={line.en} className="grid gap-1 px-4 py-3.5 sm:grid-cols-[2.5rem_1fr]">
                <span className="font-mono text-[11px] text-sky-300">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <p className="text-[15px] leading-snug text-slate-800">{line.en}</p>
                  <p className="mt-1 text-sm text-slate-400">{line.ru}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className={`${panelClass} space-y-3`}>
            <h2 className={sectionLabelClass}>02 · Capture</h2>
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
              <span className="font-mono text-sm tabular-nums text-slate-700">
                {elapsedLabel}
                <span className="ml-2 text-slate-400">
                  {elapsedMs >= TARGET_RECORD_MS ? 'ready ≥ 1:30' : 'target ≥ 1:30'}
                </span>
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider text-slate-400">
                <span>level</span>
                <span>progress {progressPct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-sky-50">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-[width]"
                  style={{ width: `${Math.round(level * 100)}%` }}
                />
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-sky-50">
                <div
                  className="h-full rounded-full bg-[#5093EE] transition-[width]"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
            {audioUrl && <audio controls src={audioUrl} className="mt-2 w-full" />}
          </div>

          <div className={`${panelClass} space-y-3`}>
            <h2 className={sectionLabelClass}>03 · Create</h2>
            <label className={labelClass}>
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
        <section className={`${panelClass} space-y-4`}>
          <h2 className={sectionLabelClass}>Register existing voice_id</h2>
          <p className="text-sm leading-relaxed text-slate-600">
            Если create API недоступен: создайте голос в xAI Console, скопируйте voice_id и
            зарегистрируйте здесь.
          </p>
          <label className={labelClass}>
            voice_id
            <input
              className={`${fieldClass} font-mono`}
              value={registerId}
              onChange={(e) => setRegisterId(e.target.value)}
              placeholder="abc123xyz456"
              maxLength={16}
            />
          </label>
          <label className={labelClass}>
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
        <section className={`mt-8 ${panelClass} space-y-3`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={sectionLabelClass}>Manifest · commit payload</h2>
            <button
              type="button"
              className={btnGhost}
              onClick={() => void navigator.clipboard.writeText(manifestSnippet)}
            >
              Copy
            </button>
          </div>
          <pre className="overflow-x-auto rounded-xl border border-sky-50 bg-slate-50/80 p-3 font-mono text-xs leading-relaxed text-slate-600">
            {manifestSnippet}
          </pre>
        </section>
      )}

      <section className="mt-8 space-y-3">
        <div className="flex items-baseline gap-2">
          <h2 className={sectionLabelClass}>Other · roster</h2>
          <span className="font-mono text-[11px] text-sky-300">{voices.length}</span>
        </div>
        {voices.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-sky-200/70 bg-white/40 px-4 py-6 text-sm text-slate-400">
            Пока пусто — создайте или зарегистрируйте голос.
          </p>
        ) : (
          <ul className="divide-y divide-sky-50/90 overflow-hidden rounded-2xl border border-white/70 bg-white/75 shadow-[0_8px_30px_rgba(80,147,238,0.08)] backdrop-blur-sm">
            {voices.map((v) => (
              <li
                key={v.voiceId}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <span className="min-w-0">
                  <span className="font-medium text-slate-800">{v.name}</span>{' '}
                  <span className="font-mono text-sky-400/80">{v.voiceId}</span>
                </span>
                <button
                  type="button"
                  className="shrink-0 font-mono text-xs text-rose-500 hover:underline"
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
