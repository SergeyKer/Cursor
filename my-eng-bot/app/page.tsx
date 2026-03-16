'use client'

import React, { useCallback, useEffect, useState } from 'react'
import SlideOutMenu, { MenuIcon } from '@/components/SlideOutMenu'
import Chat from '@/components/Chat'
import { loadState, saveState, getUsageCountToday, incrementUsageToday, DEFAULT_SETTINGS } from '@/lib/storage'
import { TOPICS, LEVELS, TENSES, SENTENCE_TYPES } from '@/lib/constants'
import type { ChatMessage, Settings, UsageInfo } from '@/lib/types'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [usage, setUsage] = useState<UsageInfo>({ used: 0, limit: 50 })
  const [initialized, setInitialized] = useState(false)
  const [dialogStarted, setDialogStarted] = useState(false)
  const [storageLoaded, setStorageLoaded] = useState(false)
  const [retryMessage, setRetryMessage] = useState<string | null>(null)
  const [loadingTranslationIndex, setLoadingTranslationIndex] = useState<number | null>(null)
  const [translationRetryMessage, setTranslationRetryMessage] = useState<string | null>(null)
  const initialLoadDoneRef = React.useRef(false)
  const newDialogRef = React.useRef(false)
  const firstMessageRequestIdRef = React.useRef(0)
  /** Не запускать второй запрос первого сообщения, пока первый в полёте (защита от двойного вызова из эффекта). */
  const firstMessageInFlightRef = React.useRef(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (!dialogStarted || typeof window === 'undefined') return
    const id = requestAnimationFrame(() => {
      window.scrollTo(0, 0)
    })
    return () => cancelAnimationFrame(id)
  }, [dialogStarted])

  /** Ограничение лимитов отключено: отправка и перевод всегда доступны. */
  const atLimit = false

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
  const MAX_ATTEMPTS = 3
  const RETRY_DELAY_MS = 2500
  /** При 429 OpenRouter даёт 20 запросов в минуту — пауза должна увести попытку в следующую минуту. */
  const RETRY_DELAY_RATE_LIMIT_MS = 20_000
  const RETRY_MESSAGES = ['Пробую ещё раз…', 'Вот-вот, почти!']

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
  const ERROR_FIRST_MESSAGE =
    'Не удалось загрузить ответ. Проверьте сеть и настройки сервера.'
  const EMPTY_RESPONSE_FALLBACK =
    'ИИ не отвечает. Проверьте сеть и попробуйте снова.'

  /** Убирает из текста буквальные \n (модель иногда выводит их как символы). */
  function cleanNewlines(text: string): string {
    return text.replace(/\\n/g, '\n').trim()
  }

  /** Выделяет из ответа ИИ основной текст.
   * Перевод от ИИ для диалога больше не используем (только по кнопке /api/translate),
   * поэтому здесь просто чистим служебные строки вроде `RU:` если модель всё же их вернула.
   */
  function parseContentWithTranslation(raw: string): { content: string; translation?: string } {
    const s = raw.trim()
    // Удаляем любую строку, начинающуюся с RU:/Russian:/Перевод:, если модель всё же её вывела.
    const lines = s.split(/\r?\n/)
    const filtered = lines.filter(
      (line) => !/^\s*(RU|Russian|Перевод)\s*:?/i.test(line.trim())
    )
    return { content: cleanNewlines(filtered.join('\n')) }
  }

  function isRetryableError(message: string): boolean {
    return (
      message.startsWith('Превышен лимит') ||
      message.startsWith('Модель вернула пустой ответ') ||
      message.startsWith('ИИ не отвечает') ||
      message.startsWith('Ответ занял слишком много времени') ||
      message.startsWith('Загрузка занимает слишком много времени') ||
      message.startsWith('ИИ сейчас перегружен и немного «ушёл отдыхать»') ||
      message.startsWith('Слишком много запросов к ИИ') ||
      message.startsWith('Сейчас ИИ недоступен') ||
      message.startsWith('Нет связи с сервером')
    )
  }

  const sendToApi = useCallback(
    async (
      apiMessages: ChatMessage[],
      options?: { onRetryStatus?: (message: string | null) => void }
    ) => {
      const onRetryStatus = options?.onRetryStatus
      let lastError: Error | null = null
      try {
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
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
              const errMsg = (data as { error?: string }).error || res.statusText
              throw new Error(errMsg)
            }
            if (data.error && !text) {
              throw new Error(data.error)
            }
            if (text) return text
            lastError = new Error(EMPTY_RESPONSE_FALLBACK)
            const canRetryEmpty =
              attempt < MAX_ATTEMPTS - 1 && isRetryableError(lastError.message)
            if (!canRetryEmpty) throw lastError
            onRetryStatus?.(RETRY_MESSAGES[attempt] ?? RETRY_MESSAGES[0])
            await sleep(150)
            await sleep(lastError.message.startsWith('Превышен лимит') ? RETRY_DELAY_RATE_LIMIT_MS : RETRY_DELAY_MS)
            continue
          } catch (e) {
            clearTimeout(timeoutId)
            const err =
              e instanceof Error
                ? e
                : new Error(typeof e === 'string' ? e : 'Unknown error')
            if (err.name === 'AbortError') {
              lastError = new Error('Ответ занял слишком много времени. Проверьте сеть и попробуйте снова.')
            } else if (
              err.name === 'TypeError' ||
              err.message === 'Failed to fetch' ||
              /^fetch\s*failed$/i.test(err.message)
            ) {
              lastError = new Error('Нет связи с сервером. Проверьте интернет и ключ в меню.')
            } else {
              lastError = err
            }
            const canRetry =
              attempt < MAX_ATTEMPTS - 1 && isRetryableError(lastError.message)
            if (!canRetry) throw lastError
            onRetryStatus?.(RETRY_MESSAGES[attempt] ?? RETRY_MESSAGES[0])
            await sleep(150)
            const delayMs = lastError.message.startsWith('Превышен лимит') ? RETRY_DELAY_RATE_LIMIT_MS : RETRY_DELAY_MS
            await sleep(delayMs)
          }
        }
        throw lastError ?? new Error('Не удалось получить ответ.')
      } finally {
        onRetryStatus?.(null)
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
      content.startsWith('Загрузка занимает слишком много времени') ||
      content.startsWith('Не удалось получить ответ') ||
      content.includes('OPENROUTER_API_KEY') ||
      content.startsWith('Неверный ключ') ||
      content.startsWith('Превышен лимит') ||
      content.startsWith('Сервис ИИ временно') ||
      content.startsWith('ИИ сейчас перегружен и немного «ушёл отдыхать»') ||
      content.startsWith('Слишком много запросов к ИИ') ||
      content.startsWith('Сейчас ИИ недоступен')
    )
  }, [])

  const lastMessageIsError =
    messages.length >= 1 &&
    messages[messages.length - 1]?.role === 'assistant' &&
    isErrorMessage(messages[messages.length - 1].content)

  const retryLastMessage = useCallback(async () => {
    // Если это самый первый экран и вместо первого вопроса пришла ошибка
    // «Слишком много запросов к ИИ…», то «Повторить» должен запустить
    // новый диалог без старого контекста.
    if (
      messages.length === 1 &&
      messages[0]?.role === 'assistant' &&
      messages[0].content.startsWith('Слишком много запросов к ИИ')
    ) {
      newDialogRef.current = true
      setMessages([])
      setTimeout(() => {
        ensureFirstMessage()
      }, 50)
      return
    }

    const toSend = messages.slice(0, -1)
    setMessages(toSend)
    setLoading(true)
    setRetryMessage(null)
    try {
      const content = await sendToApi(toSend, { onRetryStatus: setRetryMessage })
      incrementUsageToday()
      const { content: main, translation } = parseContentWithTranslation(content)
      setMessages((prev) => [...prev, { role: 'assistant', content: main, translation }])
      await fetchUsage()
    } catch (e) {
      console.error(e)
      const errText = e instanceof Error ? e.message : 'Не удалось получить ответ. Попробуйте снова.'
      if (
        errText.startsWith('Диалог слишком длинный') ||
        errText.startsWith('ИИ сейчас перегружен и немного «ушёл отдыхать»')
      ) {
        // Если диалог перерос лимит или модель перегружена, автоматически
        // начинаем новый диалог и запрашиваем первый вопрос, но остаёмся
        // в экране диалога (без возврата к стартовому меню).
        newDialogRef.current = true
        setMessages([])
        setTimeout(() => {
          ensureFirstMessage()
        }, 50)
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: errText }])
      }
    } finally {
      setLoading(false)
      setRetryMessage(null)
    }
  }, [messages, sendToApi, fetchUsage])

  const ensureFirstMessage = useCallback(async () => {
    if (firstMessageInFlightRef.current) return
    firstMessageInFlightRef.current = true
    const requestId = ++firstMessageRequestIdRef.current
    const isNewDialog = newDialogRef.current
    setLoading(true)
    setRetryMessage(null)
    try {
      const content = await sendToApi([], { onRetryStatus: setRetryMessage })
      if (requestId !== firstMessageRequestIdRef.current) return
      incrementUsageToday()
      const firstContent = (content ?? '').trim() || EMPTY_RESPONSE_FALLBACK
      const { content: main, translation } = parseContentWithTranslation(firstContent)
      setMessages([{ role: 'assistant', content: main, translation }])
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
      if (requestId === firstMessageRequestIdRef.current) {
        setLoading(false)
        setRetryMessage(null)
      }
    }
  }, [sendToApi, fetchUsage])

  const retryFirstMessage = useCallback(async () => {
    const requestId = ++firstMessageRequestIdRef.current
    setMessages([])
    setLoading(true)
    setRetryMessage(null)
    try {
      const content = await sendToApi([], { onRetryStatus: setRetryMessage })
      if (requestId !== firstMessageRequestIdRef.current) return
      incrementUsageToday()
      const { content: main, translation } = parseContentWithTranslation(content)
      setMessages([{ role: 'assistant', content: main, translation }])
      await fetchUsage()
    } catch (e) {
      console.error(e)
      if (requestId !== firstMessageRequestIdRef.current) return
      const errMsg = e instanceof Error ? e.message : ERROR_FIRST_MESSAGE
      setMessages([{ role: 'assistant', content: errMsg }])
    } finally {
      if (requestId === firstMessageRequestIdRef.current) {
        setLoading(false)
        setRetryMessage(null)
      }
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
        const content = await sendToApi(nextMessages, { onRetryStatus: setRetryMessage })
        incrementUsageToday()
        const { content: main, translation } = parseContentWithTranslation(content)
        setMessages((prev) => [...prev, { role: 'assistant', content: main, translation }])
        await fetchUsage()
      } catch (e) {
        console.error(e)
        const errText = e instanceof Error ? e.message : 'Не удалось получить ответ. Попробуйте снова.'
        if (
          errText.startsWith('Диалог слишком длинный') ||
          errText.startsWith('ИИ сейчас перегружен и немного «ушёл отдыхать»')
        ) {
          // Автоматический мягкий сброс слишком длинного диалога или перегрузки:
          // очищаем историю и сразу запрашиваем новый вопрос.
          newDialogRef.current = true
          setMessages([])
          setDialogStarted(false)
          setTimeout(() => {
            ensureFirstMessage()
          }, 50)
        } else {
          setMessages((prev) => [...prev, { role: 'assistant', content: errText }])
        }
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

  function isRetryableTranslationError(message: string): boolean {
    return (
      message.startsWith('Превышен лимит') ||
      message.startsWith('Модель вернула пустой перевод') ||
      message.startsWith('Ответ занял слишком много времени') ||
      message.startsWith('Нет связи с сервером') ||
      message.startsWith('Не удалось загрузить перевод')
    )
  }

  const handleRequestTranslation = useCallback(async (index: number, text: string) => {
    if (!text.trim()) return
    const setResult = (translation?: string, translationError?: string) => {
      setMessages((prev) => {
        const next = [...prev]
        if (next[index]?.role === 'assistant') {
          next[index] = { ...next[index], translation, translationError }
        }
        return next
      })
    }
    setResult(undefined, undefined)
    setLoadingTranslationIndex(index)
    setTranslationRetryMessage(null)
    let lastError: string = 'Не удалось загрузить перевод.'
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) {
        setTranslationRetryMessage(RETRY_MESSAGES[attempt - 1] ?? RETRY_MESSAGES[0])
      }
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text.trim() }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        let data: { content?: string; error?: string }
        try {
          data = (await res.json()) as { content?: string; error?: string }
        } catch {
          lastError = res.status === 502 ? 'Модель вернула пустой перевод.' : 'Не удалось загрузить перевод.'
          data = { error: lastError }
        }
        const content = data.content?.trim()
        if (content && res.ok) {
          setLoadingTranslationIndex(null)
          setTranslationRetryMessage(null)
          setResult(content)
          return
        }
        lastError = data.error ?? (res.status === 502 ? 'Модель вернула пустой перевод.' : 'Не удалось загрузить перевод.')
      } catch (e) {
        clearTimeout(timeoutId)
        const err = e instanceof Error ? e : new Error('Unknown error')
        lastError =
          err.name === 'AbortError'
            ? 'Ответ занял слишком много времени. Проверьте сеть и попробуйте снова.'
            : err.message === 'Failed to fetch' || err.name === 'TypeError'
              ? 'Нет связи с сервером. Проверьте интернет и ключ в меню.'
              : 'Не удалось загрузить перевод.'
      }
      const canRetry = attempt < MAX_ATTEMPTS - 1 && isRetryableTranslationError(lastError)
      if (!canRetry) break
      await sleep(150)
      await sleep(RETRY_DELAY_MS)
    }
    setLoadingTranslationIndex(null)
    setTranslationRetryMessage(null)
    setResult(undefined, lastError)
  }, [])

  /** Строка выбранного меню для шапки: с темой "Диалог — Повседневная жизнь, Present Perfect, C2" или без "Диалог — Present Perfect, C2" */
  function getMenuSummary(includeTopic: boolean = true): string {
    const modeLabel = settings.mode === 'dialogue' ? 'Диалог' : 'Тренировка перевода'
    const tense = TENSES.find((t) => t.id === settings.tense)?.label ?? settings.tense
    const levelEntry = LEVELS.find((l) => l.id === settings.level)
    const levelShort = levelEntry ? (levelEntry.label.split(' — ')[0]?.trim() ?? levelEntry.label) : settings.level
    const topicLabel = TOPICS.find((t) => t.id === settings.topic)?.label
    if (includeTopic && settings.mode === 'dialogue' && topicLabel) {
      return `${modeLabel} — ${topicLabel}, ${tense}, ${levelShort}`
    }
    return `${modeLabel} — ${tense}, ${levelShort}`
  }

  const pageTitle = !dialogStarted
    ? 'MyEng Bot — мой английский друг'
    : storageLoaded
      ? getMenuSummary(true)
      : 'MyEng Bot'

  if (!mounted) {
    return (
      <div className="flex h-screen min-h-[100dvh] items-center justify-center">
        <p className="text-[var(--text-muted)]">Загрузка…</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen min-h-[100dvh] flex-col">
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
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-12">
          <h1 className="text-sm font-medium text-[var(--text)] sm:text-base truncate max-w-full" title={pageTitle}>
            {!dialogStarted || !storageLoaded ? (
              pageTitle
            ) : (
              <>
                <span className="hidden sm:inline">{getMenuSummary(true)}</span>
                <span className="sm:hidden">{getMenuSummary(false)}</span>
              </>
            )}
          </h1>
        </div>
      </header>

      <main
        className="flex min-h-0 flex-1 flex-col"
        style={{
          paddingTop: 'calc(2.5rem + env(safe-area-inset-top, 0px))',
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 16px))',
        }}
      >
        {!storageLoaded ? (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <p className="text-[var(--text-muted)]">Загрузка…</p>
          </div>
        ) : !dialogStarted ? (
          <div className="flex min-h-0 flex-1 flex-col items-center gap-6 bg-white px-4 pt-6 pb-8">
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
            retryMessage={retryMessage}
            onRequestTranslation={handleRequestTranslation}
            loadingTranslationIndex={loadingTranslationIndex}
            translationRetryMessage={translationRetryMessage}
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

