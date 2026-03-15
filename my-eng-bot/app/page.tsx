'use client'

import React, { useCallback, useEffect, useState } from 'react'
import SlideOutMenu, { MenuIcon } from '@/components/SlideOutMenu'
import Chat from '@/components/Chat'
import { loadState, saveState, getUsageCountToday, incrementUsageToday, DEFAULT_SETTINGS } from '@/lib/storage'
import { TOPICS, LEVELS, TENSES, SENTENCE_TYPES } from '@/lib/constants'
import type { ChatMessage, Settings, UsageInfo } from '@/lib/types'

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [usage, setUsage] = useState<UsageInfo>({ used: 0, limit: 50 })
  const [initialized, setInitialized] = useState(false)
  const [dialogStarted, setDialogStarted] = useState(false)
  const [storageLoaded, setStorageLoaded] = useState(false)
  const initialLoadDoneRef = React.useRef(false)
  const newDialogRef = React.useRef(false)
  const firstMessageRequestIdRef = React.useRef(0)
  /** Не запускать второй запрос первого сообщения, пока первый в полёте (защита от двойного вызова из эффекта). */
  const firstMessageInFlightRef = React.useRef(false)

  React.useEffect(() => {
    if (!dialogStarted || typeof window === 'undefined') return
    const id = requestAnimationFrame(() => {
      window.scrollTo(0, 0)
    })
    return () => cancelAnimationFrame(id)
  }, [dialogStarted])

  const atLimit = usage.limit > 0 && usage.used >= usage.limit

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/usage')
      const data = (await res.json()) as UsageInfo
      const limit = data.limit ?? 50
      const used = getUsageCountToday()
      setUsage({ used, limit })
    } catch {
      setUsage((prev) => ({ ...prev, used: getUsageCountToday() }))
    }
  }, [])

  const API_TIMEOUT_MS = 60_000
  const ERROR_FIRST_MESSAGE =
    'Не удалось загрузить ответ. Проверьте сеть и настройки сервера.'
  const EMPTY_RESPONSE_FALLBACK =
    'ИИ не отвечает. Проверьте сеть и попробуйте снова.'

  const sendToApi = useCallback(
    async (apiMessages: ChatMessage[]) => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: apiMessages.map((m) => ({ role: m.role, content: m.content })),
            topic: settings.topic,
            level: settings.level,
            tense: settings.tense,
            mode: settings.mode,
            sentenceType: settings.sentenceType,
          }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        let data: { content?: string; error?: string }
        try {
          data = (await res.json()) as { content?: string; error?: string }
        } catch {
          throw new Error(res.ok ? 'Неверный ответ сервера.' : `Ошибка ${res.status}: ${res.statusText}`)
        }
        const text = (data.content ?? '').trim()
        if (!res.ok) {
          throw new Error((data as { error?: string }).error || res.statusText)
        }
        if (data.error && !text) {
          throw new Error(data.error)
        }
        if (text) return text
        return EMPTY_RESPONSE_FALLBACK
      } catch (e) {
        clearTimeout(timeoutId)
        if (e instanceof Error) {
          if (e.name === 'AbortError') {
            throw new Error('Ответ занял слишком много времени. Проверьте сеть и попробуйте снова.')
          }
          if (e.message === 'Failed to fetch' || e.name === 'TypeError') {
            throw new Error('Нет связи с сервером. Проверьте интернет и ключ в меню.')
          }
          throw e
        }
        throw e
      }
    },
    [settings]
  )

  const isErrorMessage = useCallback((content: string) => {
    return (
      content === ERROR_FIRST_MESSAGE ||
      content.startsWith('ИИ не отвечает') ||
      content.startsWith('Модель вернула пустой ответ') ||
      content.startsWith('Диалог слишком длинный') ||
      content.startsWith('Ответ занял слишком много времени') ||
      content.startsWith('Не удалось получить ответ') ||
      content.includes('OPENROUTER_API_KEY') ||
      content.startsWith('Неверный ключ') ||
      content.startsWith('Превышен лимит') ||
      content.startsWith('Сервис ИИ временно')
    )
  }, [])

  const lastMessageIsError =
    messages.length >= 1 &&
    messages[messages.length - 1]?.role === 'assistant' &&
    isErrorMessage(messages[messages.length - 1].content)

  const retryLastMessage = useCallback(async () => {
    const toSend = messages.slice(0, -1)
    setMessages(toSend)
    setLoading(true)
    try {
      const content = await sendToApi(toSend)
      incrementUsageToday()
      setMessages((prev) => [...prev, { role: 'assistant', content }])
      await fetchUsage()
    } catch (e) {
      console.error(e)
      const errText = e instanceof Error ? e.message : 'Не удалось получить ответ. Попробуйте снова.'
      setMessages((prev) => [...prev, { role: 'assistant', content: errText }])
    } finally {
      setLoading(false)
    }
  }, [messages, sendToApi, fetchUsage])

  const ensureFirstMessage = useCallback(async () => {
    if (firstMessageInFlightRef.current) return
    firstMessageInFlightRef.current = true
    const requestId = ++firstMessageRequestIdRef.current
    const isNewDialog = newDialogRef.current
    setLoading(true)
    try {
      const content = await sendToApi([])
      if (requestId !== firstMessageRequestIdRef.current) return
      incrementUsageToday()
      const firstContent = (content ?? '').trim() || EMPTY_RESPONSE_FALLBACK
      setMessages([{ role: 'assistant', content: firstContent }])
      setDialogStarted(true)
      if (isNewDialog) newDialogRef.current = false
      await fetchUsage()
    } catch (e) {
      console.error(e)
      if (requestId !== firstMessageRequestIdRef.current) return
      const errMsg = e instanceof Error ? e.message : ERROR_FIRST_MESSAGE
      setMessages([{ role: 'assistant', content: errMsg }])
      setDialogStarted(true)
      if (isNewDialog) newDialogRef.current = false
    } finally {
      firstMessageInFlightRef.current = false
      if (requestId === firstMessageRequestIdRef.current) setLoading(false)
    }
  }, [sendToApi, fetchUsage])

  const retryFirstMessage = useCallback(async () => {
    const requestId = ++firstMessageRequestIdRef.current
    setMessages([])
    setLoading(true)
    try {
      const content = await sendToApi([])
      if (requestId !== firstMessageRequestIdRef.current) return
      incrementUsageToday()
      setMessages([{ role: 'assistant', content }])
      await fetchUsage()
    } catch (e) {
      console.error(e)
      if (requestId !== firstMessageRequestIdRef.current) return
      const errMsg = e instanceof Error ? e.message : ERROR_FIRST_MESSAGE
      setMessages([{ role: 'assistant', content: errMsg }])
    } finally {
      if (requestId === firstMessageRequestIdRef.current) setLoading(false)
    }
  }, [sendToApi, fetchUsage])

  useEffect(() => {
    const state = loadState()
    if (!initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true
      setMessages([])
      setSettings(state.settings)
      setDialogStarted(false)
    }
    fetchUsage()
    setInitialized(true)
    setStorageLoaded(true)
  }, [fetchUsage])

  useEffect(() => {
    if (!storageLoaded) return
    if (newDialogRef.current) return
    if (loading) return
    if (initialized && dialogStarted && messages.length === 0) ensureFirstMessage()
  }, [storageLoaded, initialized, dialogStarted, messages.length, loading, ensureFirstMessage])

  useEffect(() => {
    if (!storageLoaded) return
    if (messages.length === 0 && !dialogStarted) return
    saveState(messages, settings)
  }, [storageLoaded, messages, settings, dialogStarted])

  const handleSend = useCallback(
    async (text: string) => {
      if (atLimit) return
      const userMsg: ChatMessage = { role: 'user', content: text }
      const nextMessages = [...messages, userMsg]
      setMessages(nextMessages)
      setLoading(true)
      try {
        const content = await sendToApi(nextMessages)
        incrementUsageToday()
        setMessages((prev) => [...prev, { role: 'assistant', content }])
        await fetchUsage()
      } catch (e) {
        console.error(e)
        const errText = e instanceof Error ? e.message : 'Не удалось получить ответ. Попробуйте снова.'
        setMessages((prev) => [...prev, { role: 'assistant', content: errText }])
      } finally {
        setLoading(false)
      }
    },
    [messages, atLimit, sendToApi, fetchUsage]
  )

  const handleNewDialog = useCallback(() => {
    newDialogRef.current = true
    setMessages([])
    setTimeout(() => {
      ensureFirstMessage()
    }, 50)
  }, [ensureFirstMessage])

  const pageTitle = !dialogStarted
    ? 'My Eng Bot — мой английский друг'
    : storageLoaded
      ? settings.mode === 'dialogue'
        ? 'Диалог'
        : 'Тренировка перевода'
      : 'My Eng Bot'

  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col">
      <header
        className="fixed left-0 right-0 top-0 z-[60] flex shrink-0 items-center border-b border-[var(--border)] bg-[var(--bg)]"
        style={{
          paddingLeft: 'env(safe-area-inset-left)',
          paddingTop: 'env(safe-area-inset-top)',
          minHeight: 'calc(2.5rem + env(safe-area-inset-top, 0px))',
        }}
      >
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-10 w-10 min-h-[36px] min-w-[36px] shrink-0 items-center justify-center rounded-r-md border border-l-0 border-[var(--border)] bg-[var(--bg)] text-[var(--text)] shadow-sm transition-colors hover:bg-[var(--border)] touch-manipulation"
          aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
          title={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
        >
          <MenuIcon />
        </button>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <h1 className="text-sm font-medium text-[var(--text)] sm:text-base">
            {pageTitle}
          </h1>
        </div>
      </header>

      <main
        className="flex min-h-0 flex-1 flex-col"
        style={{ paddingTop: 'calc(2.5rem + env(safe-area-inset-top, 0px))' }}
      >
        {!storageLoaded ? (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <p className="text-[var(--text-muted)]">Загрузка…</p>
          </div>
        ) : !dialogStarted ? (
          <div className="flex min-h-0 flex-1 flex-col items-center gap-6 bg-white px-4 pt-6 pb-8">
            <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-6 py-4 shadow-sm">
              <p className="text-center text-[var(--text)] text-[15px] leading-relaxed">
                Помощник для практики английского: диалог или тренировка перевода.
              </p>
            </div>
            <div className="w-full max-w-xs rounded-2xl border border-[var(--border)] bg-[#e8ecf0] px-4 py-4 shadow-sm space-y-3">
              <h2 className="text-sm font-semibold text-[var(--text)] mb-0.5">Выбери режим</h2>
              <div>
                <label className="mb-0.5 block text-xs font-medium text-[var(--text-muted)]">Режим</label>
                <select
                  value={settings.mode}
                  onChange={(e) => setSettings((s) => ({ ...s, mode: e.target.value as Settings['mode'] }))}
                  className="w-full rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 min-h-[36px] text-sm text-[var(--text)]"
                >
                  <option value="dialogue">Диалог</option>
                  <option value="translation">Тренировка перевода</option>
                </select>
              </div>
              {settings.mode === 'translation' && (
                <div>
                  <label className="mb-0.5 block text-xs font-medium text-[var(--text-muted)]">Тип предложений</label>
                  <select
                    value={settings.sentenceType}
                    onChange={(e) => setSettings((s) => ({ ...s, sentenceType: e.target.value as Settings['sentenceType'] }))}
                    className="w-full rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 min-h-[36px] text-sm text-[var(--text)]"
                  >
                    {SENTENCE_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-0.5 block text-xs font-medium text-[var(--text-muted)]">Тема</label>
                <select
                  value={settings.topic}
                  onChange={(e) => setSettings((s) => ({ ...s, topic: e.target.value as Settings['topic'] }))}
                  className="w-full rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 min-h-[36px] text-sm text-[var(--text)]"
                >
                  {TOPICS.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-0.5 block text-xs font-medium text-[var(--text-muted)]">Уровень</label>
                <select
                  value={settings.level}
                  onChange={(e) => setSettings((s) => ({ ...s, level: e.target.value as Settings['level'] }))}
                  className="w-full rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 min-h-[36px] text-sm text-[var(--text)]"
                >
                  {LEVELS.map((l) => (
                    <option key={l.id} value={l.id}>{l.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-0.5 block text-xs font-medium text-[var(--text-muted)]">Время</label>
                <select
                  value={settings.tense}
                  onChange={(e) => setSettings((s) => ({ ...s, tense: e.target.value as Settings['tense'] }))}
                  className="w-full rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 min-h-[36px] text-sm text-[var(--text)]"
                >
                  {TENSES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDialogStarted(true)}
              className="flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[var(--accent)] to-[var(--accent-hover)] px-8 py-3 text-lg font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            >
              {settings.mode === 'dialogue' ? 'Начать диалог' : 'Начать тренировку перевода'}
            </button>
          </div>
        ) : (
          <div className="min-h-0 flex-1">
          <Chat
            messages={messages}
            settings={settings}
            loading={loading}
            atLimit={atLimit}
            onSend={handleSend}
            firstMessageError={ERROR_FIRST_MESSAGE}
            onRetryFirstMessage={retryFirstMessage}
            lastMessageIsError={lastMessageIsError}
            onRetryLastMessage={retryLastMessage}
          />
          </div>
        )}
      </main>

      <SlideOutMenu
        open={menuOpen}
        onToggle={() => setMenuOpen((v) => !v)}
        hideButton
        settings={settings}
        onSettingsChange={setSettings}
        usage={usage}
        onNewDialog={handleNewDialog}
      />
    </div>
  )
}

