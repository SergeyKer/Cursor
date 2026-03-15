'use client'

import React, { useCallback, useEffect, useState } from 'react'
import SlideOutMenu, { MenuIcon } from '@/components/SlideOutMenu'
import Chat from '@/components/Chat'
import { loadState, saveState, getOpenRouterKey, getUsageCountToday, incrementUsageToday } from '@/lib/storage'
import type { ChatMessage, Settings, UsageInfo } from '@/lib/types'

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [settings, setSettings] = useState<Settings>(() => loadState().settings)
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [usage, setUsage] = useState<UsageInfo>({ used: 0, limit: 50 })
  const [initialized, setInitialized] = useState(false)
  const [dialogStarted, setDialogStarted] = useState(false)
  const [storageLoaded, setStorageLoaded] = useState(false)
  const initialLoadDoneRef = React.useRef(false)
  const newDialogRef = React.useRef(false)
  const firstMessageRequestIdRef = React.useRef(0)

  const atLimit = usage.limit > 0 && usage.used >= usage.limit

  const fetchUsage = useCallback(async () => {
    try {
      const key = getOpenRouterKey()
      const res = await fetch('/api/usage', {
        headers: key ? { 'X-OpenRouter-Key': key } : {},
      })
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
    'Не удалось загрузить ответ. Укажите ключ OpenRouter в меню настроек и проверьте сеть.'
  const EMPTY_RESPONSE_FALLBACK =
    'ИИ не отвечает. Проверьте ключ в меню и сеть, попробуйте снова.'

  const sendToApi = useCallback(
    async (apiMessages: ChatMessage[]) => {
      const key = getOpenRouterKey()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (key) headers['X-OpenRouter-Key'] = key
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers,
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
        const data = (await res.json()) as { content?: string; error?: string }
        const text = (data.content ?? '').trim()
        if (!res.ok) {
          const err = data as { error?: string }
          throw new Error(err.error || res.statusText)
        }
        if (text) return text
        return EMPTY_RESPONSE_FALLBACK
      } catch (e) {
        clearTimeout(timeoutId)
        if (e instanceof Error) {
          if (e.name === 'AbortError') {
            throw new Error('Ответ занял слишком много времени. Проверьте сеть и попробуйте снова.')
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
      setMessages([{ role: 'assistant', content: ERROR_FIRST_MESSAGE }])
      setDialogStarted(true)
      if (isNewDialog) newDialogRef.current = false
    } finally {
      if (requestId === firstMessageRequestIdRef.current) setLoading(false)
    }
  }, [sendToApi, fetchUsage])

  const retryFirstMessage = useCallback(async () => {
    setMessages([])
    setLoading(true)
    try {
      const content = await sendToApi([])
      incrementUsageToday()
      setMessages([{ role: 'assistant', content }])
      await fetchUsage()
    } catch (e) {
      console.error(e)
      setMessages([{ role: 'assistant', content: ERROR_FIRST_MESSAGE }])
    } finally {
      setLoading(false)
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
    if (initialized && dialogStarted && messages.length === 0) ensureFirstMessage()
  }, [storageLoaded, initialized, dialogStarted, messages.length, ensureFirstMessage])

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
          className="btn-3d flex h-10 w-10 min-h-[36px] min-w-[36px] shrink-0 items-center justify-center rounded-r-md border-[3px] border-l-0 border-[var(--border)] bg-[var(--bg)] text-[var(--text)] ring-4 ring-neutral-500/80 ring-offset-2 ring-offset-[var(--bg)] hover:bg-[var(--border)] touch-manipulation"
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
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-4">
            <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-6 py-5 shadow-sm">
              <p className="text-center text-[var(--text)] text-[15px] leading-relaxed">
                Помощник для практики английского: диалог или тренировка перевода. Настройте тему и уровень в меню.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDialogStarted(true)}
              className="btn-3d rounded-xl bg-[var(--accent)] px-8 py-3 text-lg font-medium text-white hover:bg-[var(--accent-hover)]"
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
        onKeyChange={fetchUsage}
        onNewDialog={handleNewDialog}
      />
    </div>
  )
}

