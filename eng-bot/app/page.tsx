'use client'

import React, { useCallback, useEffect, useState } from 'react'
import SlideOutMenu from '@/components/SlideOutMenu'
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
  const prevModeRef = React.useRef<Settings['mode'] | undefined>(undefined)

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

  const sendToApi = useCallback(
    async (apiMessages: ChatMessage[]) => {
      const key = getOpenRouterKey()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (key) headers['X-OpenRouter-Key'] = key
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
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || res.statusText)
      }
      const data = (await res.json()) as { content: string }
      return data.content
    },
    [settings]
  )

  const ERROR_FIRST_MESSAGE =
    'Не удалось загрузить ответ. Укажите ключ OpenRouter в меню настроек и проверьте сеть.'

  const ensureFirstMessage = useCallback(async () => {
    if (messages.length > 0) return
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
  }, [messages.length, sendToApi, fetchUsage])

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
    setMessages(state.messages)
    setSettings(state.settings)
    prevModeRef.current = state.settings.mode
    setDialogStarted(state.messages.length > 0)
    fetchUsage()
    setInitialized(true)
    setStorageLoaded(true)
  }, [fetchUsage])

  useEffect(() => {
    if (!storageLoaded) return
    if (initialized && dialogStarted && messages.length === 0) ensureFirstMessage()
  }, [storageLoaded, initialized, dialogStarted, messages.length, ensureFirstMessage])

  useEffect(() => {
    if (prevModeRef.current !== undefined && prevModeRef.current !== settings.mode) {
      setMessages([])
    }
    prevModeRef.current = settings.mode
  }, [settings.mode])

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
        setMessages((prev) => prev.slice(0, -1))
      } finally {
        setLoading(false)
      }
    },
    [messages, atLimit, sendToApi, fetchUsage]
  )

  const handleNewDialog = useCallback(() => {
    setMessages([])
  }, [])

  return (
    <div className="flex h-screen flex-col">
      <main className="min-h-0 flex-1 pl-[max(3.5rem,calc(env(safe-area-inset-left)+3.5rem))]">
        {!storageLoaded ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-[var(--text-muted)]">Загрузка…</p>
          </div>
        ) : !dialogStarted ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 px-4">
            <p className="text-center text-[var(--text-muted)]">
              Помощник для практики английского: диалог или тренировка перевода. Настройте тему и уровень в меню.
            </p>
            <button
              type="button"
              onClick={() => setDialogStarted(true)}
              className="btn-3d rounded-xl bg-[var(--accent)] px-8 py-3 text-lg font-medium text-white hover:bg-[var(--accent-hover)]"
            >
              Начать диалог
            </button>
          </div>
        ) : (
          <Chat
            messages={messages}
            settings={settings}
            loading={loading}
            atLimit={atLimit}
            onSend={handleSend}
            firstMessageError={ERROR_FIRST_MESSAGE}
            onRetryFirstMessage={retryFirstMessage}
          />
        )}
      </main>

      <SlideOutMenu
        open={menuOpen}
        onToggle={() => setMenuOpen((v) => !v)}
        settings={settings}
        onSettingsChange={setSettings}
        usage={usage}
        onKeyChange={fetchUsage}
        onNewDialog={handleNewDialog}
      />
    </div>
  )
}

