'use client'

import Image from 'next/image'
import React, { useCallback, useEffect, useState } from 'react'
import SlideOutMenu, { MenuIcon } from '@/components/SlideOutMenu'
import MenuSectionPanels, { type MenuView } from '@/components/MenuSectionPanels'
import Chat from '@/components/Chat'
import HomeWelcomeBubble from '@/components/HomeWelcomeBubble'
import { buildCompactGreeting } from '@/lib/homeGreeting'
import { consumeNextGreetingFactLine } from '@/lib/greetingFactRotation'
import { loadState, saveState, getUsageCountToday, incrementUsageToday, DEFAULT_SETTINGS } from '@/lib/storage'
import { countDialogueFinalCorrectAnswers } from '@/lib/dialogueStats'
import { TOPICS, LEVELS, TENSES, CHILD_TENSES } from '@/lib/constants'
import { detectCommunicationUserMessageLang, getExpectedCommunicationReplyLang } from '@/lib/communicationReplyLanguage'
import type {
  AppMode,
  Audience,
  ChatMessage,
  SentenceType,
  Settings,
  TenseId,
  TopicId,
  UsageInfo,
} from '@/lib/types'
import { parseCorrection } from '@/lib/parseCorrection'

const CHILD_TENSE_SET = new Set(CHILD_TENSES)

/** Снимок настроек при открытии меню (для перезапуска чата без смены режима). */
type MenuOpenSnapshot = {
  mode: AppMode
  audience: Audience
  topic?: TopicId
  tensesKey?: string
  sentenceType?: SentenceType
}

function tensesToKey(tenses: TenseId[]): string {
  return [...tenses].sort().join(',')
}

function buildMenuOpenSnapshot(s: Settings): MenuOpenSnapshot {
  if (s.mode === 'communication') {
    return { mode: s.mode, audience: s.audience }
  }
  return {
    mode: s.mode,
    audience: s.audience,
    topic: s.topic,
    tensesKey: tensesToKey(s.tenses),
    sentenceType: s.sentenceType,
  }
}

/** Режим не менялся; нужен ли перезапуск из‑за темы/времён/типа/аудитории (без уровня). */
function menuSettingsRestartNeeded(snap: MenuOpenSnapshot, current: Settings): boolean {
  if (current.mode === 'communication') {
    return snap.audience !== current.audience
  }
  if (current.mode === 'dialogue' || current.mode === 'translation') {
    return (
      snap.topic !== current.topic ||
      snap.tensesKey !== tensesToKey(current.tenses) ||
      snap.sentenceType !== current.sentenceType ||
      snap.audience !== current.audience
    )
  }
  return false
}

/** Перевод в диалоге: актуальный assistant-пузырь после await. */
function findAssistantIndexByTranslationText(
  messages: ChatMessage[],
  requestedIndex: number,
  textToTranslate: string
): number {
  const needle = textToTranslate.trim()
  if (!needle) return requestedIndex

  const bodyMatchesNeedle = (content: string) => {
    const { rest } = parseCorrection(content)
    const r = (rest ?? content).trim()
    if (!r) return false
    if (r.includes(needle)) return true
    if (needle.length >= 6 && r.includes(needle.slice(0, Math.min(needle.length, 120)))) return true
    return false
  }

  if (messages[requestedIndex]?.role === 'assistant' && bodyMatchesNeedle(messages[requestedIndex].content ?? '')) {
    return requestedIndex
  }
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role !== 'assistant') continue
    if (bodyMatchesNeedle(m.content ?? '')) return i
  }
  return requestedIndex
}

function createDialogSeed(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [usage, setUsage] = useState<UsageInfo>({ used: 0, limit: 50 })
  const [initialized, setInitialized] = useState(false)
  const [dialogStarted, setDialogStarted] = useState(false)
  const [homeMenuView, setHomeMenuView] = useState<MenuView>('root')
  /** На стартовом экране при выходе из чата домой сбрасывается в false. */
  const [welcomeCompact, setWelcomeCompact] = useState(false)
  /** Смена «сессии» старта: новый факт из очереди (в т.ч. после выхода из чата домой). */
  const [greetingNonce, setGreetingNonce] = useState(0)
  const [welcomeFactLine, setWelcomeFactLine] = useState<string | null>(null)
  const welcomeFactInitRef = React.useRef<number | null>(null)
  const [storageLoaded, setStorageLoaded] = useState(false)
  const [retryMessage, setRetryMessage] = useState<string | null>(null)
  const [loadingTranslationIndex, setLoadingTranslationIndex] = useState<number | null>(null)
  const [forceNextMicLang, setForceNextMicLang] = useState<'ru' | 'en' | null>(null)
  const dialogueCorrectAnswers = React.useMemo(() => countDialogueFinalCorrectAnswers(messages), [messages])
  /** Настройки на момент последней отправки сообщения; для баннера «настройки изменены». */
  const [settingsAtLastSend, setSettingsAtLastSend] = useState<Settings | null>(null)
  const initialLoadDoneRef = React.useRef(false)
  const newDialogRef = React.useRef(false)
  const firstMessageRequestIdRef = React.useRef(0)
  /** Не запускать второй запрос первого сообщения, пока первый в полёте (защита от двойного вызова из эффекта). */
  const firstMessageInFlightRef = React.useRef(false)
  const dialogSeedRef = React.useRef(createDialogSeed())
  /** Настройки при открытии меню: режим + поля для сравнения при закрытии (без уровня). */
  const menuOpenSnapshotRef = React.useRef<MenuOpenSnapshot | null>(null)
  const prevMenuOpenForSnapshotRef = React.useRef(false)
  /** Не показывать баннер «настройки изменены» сразу после автоперезапуска из меню (до синхронизации с отправкой). */
  const suppressSettingsChangeBannerRef = React.useRef(false)

  function normalizeSettingsForAudience(s: Settings): Settings {
    if (s.audience !== 'child') return s
    const allowed = new Set<Settings['level']>(['all', 'starter', 'a1', 'a2'])
    const childTenseSet = new Set(CHILD_TENSES)
    const topicIds = new Set(TOPICS.map((t) => t.id))
    const normalizedTopic = topicIds.has(s.topic) ? s.topic : 'free_talk'
    const normalizedTenses = s.tenses.filter((t) => childTenseSet.has(t))

    return {
      ...s,
      topic: normalizedTopic,
      level: allowed.has(s.level) ? s.level : 'all',
      tenses:
        normalizedTenses.length > 0
          ? (normalizedTenses as Settings['tenses'])
          : (['present_simple'] as Settings['tenses']),
    }
  }

  React.useEffect(() => {
    if (!dialogStarted || typeof window === 'undefined') return
    const id = requestAnimationFrame(() => {
      window.scrollTo(0, 0)
    })
    return () => cancelAnimationFrame(id)
  }, [dialogStarted])

  React.useLayoutEffect(() => {
    if (dialogStarted) return
    if (welcomeFactInitRef.current === greetingNonce) return
    welcomeFactInitRef.current = greetingNonce
    setWelcomeFactLine(consumeNextGreetingFactLine())
  }, [dialogStarted, greetingNonce])

  const handleHomeMenuViewChange = useCallback(
    (v: MenuView) => {
      if (v === 'root' && homeMenuView !== 'root' && !dialogStarted) {
        setWelcomeCompact(false)
        setGreetingNonce((n) => n + 1)
      }
      setHomeMenuView(v)
    },
    [homeMenuView, dialogStarted]
  )

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
  const RETRY_DELAY_RATE_LIMIT_BASE_MS = 5_000
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

  function getCommunicationInputExpectedFromText(text: string, current: Settings['communicationInputExpectedLang']) {
    return detectCommunicationUserMessageLang(text, current) as Settings['communicationInputExpectedLang']
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
      message.startsWith('Сейчас ИИ недоступен') ||
      message.startsWith('Нет связи с сервером')
    )
  }

  const sendToApi = useCallback(
    async (
      apiMessages: ChatMessage[],
      options?: { onRetryStatus?: (message: string | null) => void }
    ): Promise<{ content: string; dialogueCorrect: boolean }> => {
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
                provider: settings.provider,
                topic: settings.mode === 'communication' ? 'free_talk' : settings.topic,
                level: settings.level,
                tenses: settings.tenses,
                mode: settings.mode,
                sentenceType: settings.sentenceType,
                audience: settings.audience,
                dialogSeed: dialogSeedRef.current,
                ...(settings.mode === 'communication'
                  ? { communicationInputExpectedLang: settings.communicationInputExpectedLang }
                  : {}),
              }),
              signal: controller.signal,
            })
            clearTimeout(timeoutId)
            let data: {
              content?: string
              error?: string
              errorCode?: 'rate_limit' | 'unauthorized' | 'forbidden' | 'upstream_error'
              provider?: 'openrouter' | 'openai'
              dialogueCorrect?: boolean
            }
            try {
              data = (await res.json()) as {
                content?: string
                error?: string
                errorCode?: 'rate_limit' | 'unauthorized' | 'forbidden' | 'upstream_error'
                provider?: 'openrouter' | 'openai'
                dialogueCorrect?: boolean
              }
            } catch {
              throw new Error(res.ok ? 'Неверный ответ сервера.' : `Ошибка ${res.status}: ${res.statusText}`)
            }
            const text = (data.content ?? '').trim()
            const dialogueCorrect = Boolean(data.dialogueCorrect)
            if (!res.ok) {
              const errMsg = data.error || res.statusText
              const errorCode = data.errorCode
              const providerFromServer = data.provider ?? settings.provider

              // 429: ретраим только для OpenRouter (как было), для OpenAI — без ретраев.
              if (
                errorCode === 'rate_limit' &&
                providerFromServer === 'openrouter' &&
                attempt < MAX_ATTEMPTS - 1
              ) {
                lastError = new Error(errMsg)
                onRetryStatus?.(RETRY_MESSAGES[attempt] ?? RETRY_MESSAGES[0])
                await sleep(150)
                const backoffMs = RETRY_DELAY_RATE_LIMIT_BASE_MS * Math.pow(2, attempt)
                await sleep(Math.min(RETRY_DELAY_RATE_LIMIT_MS, backoffMs))
                continue
              }

              throw new Error(errMsg)
            }
            if (data.error && !text) {
              throw new Error(data.error)
            }
            if (text) return { content: text, dialogueCorrect }
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
      content.startsWith('Модель вернула некорректный ответ') ||
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
      setSettingsAtLastSend(null)
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
      const response = await sendToApi(toSend, { onRetryStatus: setRetryMessage })
      incrementUsageToday()
      const { content: main, translation } = parseContentWithTranslation(response.content)
      setMessages((prev) => [...prev, { role: 'assistant', content: main, translation, dialogueCorrect: response.dialogueCorrect }])
      void fetchUsage()
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
        setSettingsAtLastSend(null)
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
      const response = await sendToApi([], { onRetryStatus: setRetryMessage })
      if (requestId !== firstMessageRequestIdRef.current) return
      incrementUsageToday()
      const firstContent = (response.content ?? '').trim() || EMPTY_RESPONSE_FALLBACK
      const { content: main, translation } = parseContentWithTranslation(firstContent)
      setMessages([{ role: 'assistant', content: main, translation, dialogueCorrect: response.dialogueCorrect }])
      // Базовая "точка отсчёта" для баннера «Настройки изменены».
      // Иначе при смене темы/времени после первого вопроса (до первой отправки пользователя)
      // нечего сравнивать и предупреждение не показывается.
      setSettingsAtLastSend(settings)
      setDialogStarted(true)
      if (isNewDialog) newDialogRef.current = false
      void fetchUsage()
    } catch (e) {
      console.error(e)
      if (requestId !== firstMessageRequestIdRef.current) return
      const errMsg = e instanceof Error ? e.message : ERROR_FIRST_MESSAGE
      setMessages([{ role: 'assistant', content: errMsg }])
      setDialogStarted(true)
      if (isNewDialog) newDialogRef.current = false
    } finally {
      firstMessageInFlightRef.current = false
      suppressSettingsChangeBannerRef.current = false
      if (requestId === firstMessageRequestIdRef.current) {
        setLoading(false)
        setRetryMessage(null)
      }
    }
  }, [sendToApi, fetchUsage, settings])

  const restartChatForNewModeFromMenu = useCallback(() => {
    suppressSettingsChangeBannerRef.current = true
    firstMessageRequestIdRef.current += 1
    firstMessageInFlightRef.current = false
    dialogSeedRef.current = createDialogSeed()
    newDialogRef.current = true
    setSettings((prev) => ({ ...prev, communicationInputExpectedLang: 'ru' }))
    setMessages([])
    setSettingsAtLastSend(null)
    setTimeout(() => {
      ensureFirstMessage()
    }, 50)
  }, [ensureFirstMessage])

  const handleStartChatFromMenu = useCallback(() => {
    if (!dialogStarted) {
      if (settings.mode === 'communication') {
        setSettings((prev) => ({ ...prev, communicationInputExpectedLang: 'ru' }))
      }
      setDialogStarted(true)
      setMenuOpen(false)
      return
    }
    restartChatForNewModeFromMenu()
    setMenuOpen(false)
  }, [dialogStarted, restartChatForNewModeFromMenu, settings.mode])

  useEffect(() => {
    const wasOpen = prevMenuOpenForSnapshotRef.current
    prevMenuOpenForSnapshotRef.current = menuOpen
    if (menuOpen && !wasOpen && dialogStarted) {
      menuOpenSnapshotRef.current = buildMenuOpenSnapshot(settings)
    }
  }, [menuOpen, dialogStarted, settings])

  useEffect(() => {
    if (menuOpen) return
    const snap = menuOpenSnapshotRef.current
    menuOpenSnapshotRef.current = null
    if (!dialogStarted) return
    if (snap === null) return
    if (snap.mode !== settings.mode) {
      restartChatForNewModeFromMenu()
      return
    }
    if (menuSettingsRestartNeeded(snap, settings)) {
      restartChatForNewModeFromMenu()
    }
  }, [menuOpen, dialogStarted, settings, restartChatForNewModeFromMenu])

  const goToStartScreen = useCallback(() => {
    firstMessageRequestIdRef.current += 1
    firstMessageInFlightRef.current = false
    setDialogStarted(false)
    setMessages([])
    setSettingsAtLastSend(null)
    setHomeMenuView('root')
    setMenuOpen(false)
    setLoading(false)
    setRetryMessage(null)
    setForceNextMicLang(null)
    setLoadingTranslationIndex(null)
    dialogSeedRef.current = createDialogSeed()
    newDialogRef.current = false
    setWelcomeCompact(false)
    setGreetingNonce((n) => n + 1)
    saveState([], settings)
  }, [settings])

  const retryFirstMessage = useCallback(async () => {
    const requestId = ++firstMessageRequestIdRef.current
    setMessages([])
    setSettingsAtLastSend(null)
    setLoading(true)
    setRetryMessage(null)
    try {
      const response = await sendToApi([], { onRetryStatus: setRetryMessage })
      if (requestId !== firstMessageRequestIdRef.current) return
      incrementUsageToday()
      const { content: main, translation } = parseContentWithTranslation(response.content)
      setMessages([{ role: 'assistant', content: main, translation, dialogueCorrect: response.dialogueCorrect }])
      setSettingsAtLastSend(settings)
      void fetchUsage()
    } catch (e) {
      console.error(e)
      if (requestId !== firstMessageRequestIdRef.current) return
      const errMsg = e instanceof Error ? e.message : ERROR_FIRST_MESSAGE
      setMessages([{ role: 'assistant', content: errMsg }])
    } finally {
      suppressSettingsChangeBannerRef.current = false
      if (requestId === firstMessageRequestIdRef.current) {
        setLoading(false)
        setRetryMessage(null)
      }
    }
  }, [sendToApi, fetchUsage, settings])

  useEffect(() => {
    const state = loadState()
    if (!initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true
      setMessages([])
      setSettings(normalizeSettingsForAudience(state.settings))
      setDialogStarted(false)
    }
    fetchUsage()
    setInitialized(true)
    setStorageLoaded(true)
  }, [fetchUsage])

  // Если пользователь переключил аудиторию на "Ребёнок" — автоматически принудим тему и уровень.
  useEffect(() => {
    if (!storageLoaded) return
    setSettings((prev) => normalizeSettingsForAudience(prev))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageLoaded, settings.audience])

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
      suppressSettingsChangeBannerRef.current = false
      const userMsg: ChatMessage = { role: 'user', content: text }
      if (settings.mode === 'communication') {
        setSettings((prev) => ({
          ...prev,
          communicationInputExpectedLang: getCommunicationInputExpectedFromText(text, prev.communicationInputExpectedLang),
        }))
      }
      const nextMessages = [...messages, userMsg]
      setMessages(nextMessages)
      setLoading(true)
      try {
        const response = await sendToApi(nextMessages, { onRetryStatus: setRetryMessage })
        incrementUsageToday()
        const { content: main, translation } = parseContentWithTranslation(response.content)
        setLoading(false)
        setMessages((prev) => [...prev, { role: 'assistant', content: main, translation, dialogueCorrect: response.dialogueCorrect }])
        setSettingsAtLastSend(settings)
        void fetchUsage()
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
          setSettingsAtLastSend(null)
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
    [messages, atLimit, sendToApi, fetchUsage, settings]
  )

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
        const resolvedIndex = findAssistantIndexByTranslationText(next, index, text)
        if (next[resolvedIndex]?.role === 'assistant') {
          next[resolvedIndex] = { ...next[resolvedIndex], translation, translationError }
        }
        return next
      })
    }
    setMessages((prev) => {
      const resolvedIndex = findAssistantIndexByTranslationText(prev, index, text)
      setLoadingTranslationIndex(resolvedIndex)
      const next = [...prev]
      if (next[resolvedIndex]?.role === 'assistant') {
        next[resolvedIndex] = { ...next[resolvedIndex], translation: undefined, translationError: undefined }
      }
      return next
    })
    let lastError: string = 'Не удалось загрузить перевод.'
    type TranslateErrorCode = 'rate_limit' | 'unauthorized' | 'forbidden' | 'upstream_error' | undefined
    type TranslateProvider = 'openrouter' | 'openai'
    type TranslateResponse = {
      content?: string
      error?: string
      errorCode?: TranslateErrorCode
      provider?: TranslateProvider
    }
    type AttemptResult =
      | { ok: true; content: string }
      | { ok: false; error: string; errorCode?: TranslateErrorCode; provider: TranslateProvider }

    const providerOrder: TranslateProvider[] =
      settings.provider === 'openai' ? ['openai', 'openrouter'] : ['openrouter', 'openai']

    const requestTranslateOnce = async (provider: TranslateProvider): Promise<AttemptResult> => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: text.trim(),
            provider,
            audience: settings.audience,
            ...(settings.mode !== 'translation' ? { tenses: settings.tenses, mode: settings.mode } : {}),
          }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        let data: TranslateResponse
        try {
          data = (await res.json()) as TranslateResponse
        } catch {
          data = {
            error: res.status === 502 ? 'Модель вернула пустой перевод.' : 'Не удалось загрузить перевод.',
            errorCode: res.status === 429 ? 'rate_limit' : 'upstream_error',
            provider,
          }
        }
        const content = data.content?.trim()
        if (content && res.ok) return { ok: true, content }
        return {
          ok: false,
          error: data.error ?? (res.status === 502 ? 'Модель вернула пустой перевод.' : 'Не удалось загрузить перевод.'),
          errorCode: data.errorCode,
          provider: data.provider ?? provider,
        }
      } catch (e) {
        clearTimeout(timeoutId)
        const err = e instanceof Error ? e : new Error('Unknown error')
        const translatedError =
          err.name === 'AbortError'
            ? 'Ответ занял слишком много времени. Проверьте сеть и попробуйте снова.'
            : err.message === 'Failed to fetch' || err.name === 'TypeError'
              ? 'Нет связи с сервером. Проверьте интернет и ключ в меню.'
              : 'Не удалось загрузить перевод.'
        return { ok: false, error: translatedError, provider }
      }
    }

    let translated = false
    let attemptedFallback = false
    let allowProviderFallback = true
    for (let pIdx = 0; pIdx < providerOrder.length && !translated; pIdx++) {
      const provider = providerOrder[pIdx]
      const maxAttemptsForProvider = provider === 'openrouter' ? MAX_ATTEMPTS : 1

      for (let attempt = 0; attempt < maxAttemptsForProvider; attempt++) {
        const result = await requestTranslateOnce(provider)
        if (result.ok) {
          setLoadingTranslationIndex(null)
          setResult(result.content)
          translated = true
          break
        }

        lastError = result.error
        const isRateLimit = result.errorCode === 'rate_limit' || /лимит|Too Many Requests/i.test(lastError)
        const isForbidden = result.errorCode === 'forbidden'
        const isUnauthorized = result.errorCode === 'unauthorized'
        const isNetworkLike = /Нет связи с сервером|занял слишком много времени/i.test(lastError)

        if (provider === 'openai' && (isForbidden || isUnauthorized)) {
          allowProviderFallback = false
          break
        }

        const canRetryThisProvider =
          attempt < maxAttemptsForProvider - 1 && (isRateLimit || isNetworkLike || isRetryableTranslationError(lastError))
        if (!canRetryThisProvider) break

        await sleep(150)
        const backoffMs = isRateLimit ? RETRY_DELAY_RATE_LIMIT_MS : RETRY_DELAY_MS
        await sleep(backoffMs)
      }

      if (!translated && !allowProviderFallback) break
      if (!translated && pIdx < providerOrder.length - 1) {
        attemptedFallback = true
      }
    }

    if (attemptedFallback && !translated && !/Попробуйте снова|Проверьте/i.test(lastError)) {
      lastError = `${lastError} Попробуйте другого провайдера в меню.`
    }

    if (!translated) {
      setLoadingTranslationIndex(null)
      setResult(undefined, lastError)
    }
  }, [settings.provider, settings.audience, settings.mode, settings.tenses])

  /** Сравнение для баннера в шапке: тема, время, уровень, тип предложений (в режиме перевода). Режим не учитываем — при смене режима чат перезапускается из меню без этого предупреждения. */
  function settingsDiffersFromLastSendForBanner(current: Settings, last: Settings | null): boolean {
    if (!last) return false
    const sameTenses =
      current.tenses.length === last.tenses.length &&
      current.tenses.every((t, i) => t === last.tenses[i])
    if (current.topic !== last.topic || !sameTenses || current.level !== last.level) return true
    if (current.mode === 'translation' && last.mode === 'translation' && current.sentenceType !== last.sentenceType)
      return true
    return false
  }

  /** Строка выбранного меню для шапки: единый формат для обоих режимов. */
  function getMenuSummary(includeTopic: boolean = true): string {
    if (settings.mode === 'communication') {
      if (settings.level === 'all') {
        return settings.communicationInputExpectedLang === 'en' ? 'Chat с MyEng' : 'Чат с MyEng'
      }
      const levelEntry = LEVELS.find((l) => l.id === settings.level)
      const levelShort = levelEntry ? (levelEntry.label.split(' - ')[0]?.trim() ?? levelEntry.label) : settings.level
      const lang = getExpectedCommunicationReplyLang(messages, {
        inputPreference: settings.communicationInputExpectedLang,
      })
      const titlePrefix = lang === 'ru' ? 'Чат' : 'Chat'
      return `${titlePrefix} - ${levelShort}`
    }

    const getTenseCountLabel = (count: number): string => {
      const mod10 = count % 10
      const mod100 = count % 100
      if (mod10 === 1 && mod100 !== 11) return `${count} время`
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} времени`
      return `${count} времён`
    }

    const availableTenses: string[] = settings.audience === 'child'
      ? TENSES.filter((t) => CHILD_TENSE_SET.has(t.id)).map((t) => t.id)
      : TENSES.map((t) => t.id)
    const selectedTenses: string[] = settings.tenses.filter((t) => t !== 'all')
    const selectedSet = new Set<string>(selectedTenses)
    const anyTimeSelected =
      settings.tenses.includes('all') ||
      (availableTenses.length > 0 && availableTenses.every((t) => selectedSet.has(t)))

    const modeLabel =
      settings.mode === 'dialogue' ? 'Диалог' : settings.mode === 'translation' ? 'Тренировка перевода' : 'Общение'
    const tenseLabel =
      anyTimeSelected
        ? 'Любое время'
        : settings.tenses.length === 0
          ? 'Все'
        : settings.tenses.length === 1
          ? (TENSES.find((t) => t.id === settings.tenses[0])?.label ?? settings.tenses[0])
          : settings.tenses.length === 2
            ? (TENSES.find((t) => t.id === settings.tenses[0])?.label ?? settings.tenses[0]) +
              ', ' +
              (TENSES.find((t) => t.id === settings.tenses[1])?.label ?? settings.tenses[1])
            : getTenseCountLabel(settings.tenses.length)
    const levelEntry = LEVELS.find((l) => l.id === settings.level)
    const levelShort = levelEntry ? (levelEntry.label.split(' - ')[0]?.trim() ?? levelEntry.label) : settings.level
    const normalizedLevelShort = settings.level === 'all' ? 'Все уровни' : levelShort
    const topicLabel = TOPICS.find((t) => t.id === settings.topic)?.label
    if (includeTopic && topicLabel) {
      return `${modeLabel} - ${topicLabel}, ${tenseLabel}, ${normalizedLevelShort}`
    }
    return `${modeLabel} - ${tenseLabel}, ${normalizedLevelShort}`
  }

  const pageTitle = !dialogStarted
    ? 'MyEng - мой английский друг'
    : storageLoaded
      ? getMenuSummary(true)
      : 'MyEng'

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] flex-col">
      <header
        className="fixed left-0 right-0 top-0 z-[60] border-b border-[var(--border)] bg-[var(--bg)]"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          // iOS: safe-area учитываем только через paddingTop.
          // Иначе safe-area может засчитываться дважды (paddingTop + minHeight),
          // и стартовый экран "уезжает" под верхний край.
          minHeight: '2.75rem',
        }}
      >
        <div className="chat-shell-x flex min-h-[2.75rem] w-full items-center">
          <div
            className={`mx-auto flex w-full items-center justify-between ${
              dialogStarted ? 'max-w-[29rem]' : 'max-w-[23.2rem]'
            }`}
          >
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="btn-3d-menu flex h-10 w-10 min-h-[36px] min-w-[36px] shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] touch-manipulation"
              aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
              title={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
            >
              <MenuIcon />
            </button>
            <div className="pointer-events-auto flex h-10 min-h-[36px] w-12 min-w-[3rem] shrink-0 items-center justify-end">
              {dialogStarted && settings.mode === 'communication' ? (
                <button
                  type="button"
                  onClick={() =>
                    setSettings((s) => {
                      const nextLang = s.communicationInputExpectedLang === 'ru' ? 'en' : 'ru'
                      setForceNextMicLang(nextLang)
                      return {
                        ...s,
                        communicationInputExpectedLang: nextLang,
                      }
                    })
                  }
                  className="btn-3d-menu flex h-10 min-h-[36px] min-w-[3rem] shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg)] px-1 text-[11px] font-semibold leading-none text-[var(--text)] touch-manipulation"
                  aria-label={
                    settings.communicationInputExpectedLang === 'ru'
                      ? 'Ожидается русский ввод. Переключить на английский'
                      : 'Ожидается английский ввод. Переключить на русский'
                  }
                  title={
                    settings.communicationInputExpectedLang === 'ru'
                      ? 'Сейчас ожидается русский ввод. Нажмите для ожидания английского'
                      : 'Сейчас ожидается английский ввод. Нажмите для ожидания русского'
                  }
                >
                  {settings.communicationInputExpectedLang === 'ru' ? 'Ru→En' : 'En→Ru'}
                </button>
              ) : !dialogStarted ? (
                <span
                  className="mr-2 flex h-10 w-10 shrink-0 items-center justify-center"
                  aria-hidden
                >
                  <Image
                    src="/header-robot.png"
                    alt=""
                    width={1024}
                    height={1024}
                    className="h-10 w-10 object-contain"
                    sizes="36px"
                  />
                </span>
              ) : (
                <span className="block h-10 w-12 min-w-[3rem] shrink-0" aria-hidden />
              )}
            </div>
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-14 sm:px-[4.25rem]">
          <h1 className="text-[14px] font-medium leading-snug text-[var(--text)] sm:text-[16px] truncate max-w-full" title={pageTitle}>
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
        className={`flex min-h-0 flex-1 flex-col ${dialogStarted ? 'overflow-hidden' : 'overflow-y-auto'}`}
        style={{
          paddingTop: 'calc(2.75rem + env(safe-area-inset-top, 0px))',
          paddingBottom: dialogStarted
            // iOS: иногда появляется серый зазор снизу, если safe-area не учтён на уровне контейнера.
            // Контент чата тоже учитывает safe-area, но внешний контейнер при dialogStarted=true держим с paddingBottom.
            ? '0px'
            : 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {!dialogStarted ? (
          <div
            className="start-screen chat-shell-x flex min-h-0 flex-1 flex-col items-center bg-[linear-gradient(180deg,var(--chat-wallpaper)_0%,var(--chat-wallpaper-soft)_100%)]"
            style={{
              gap: 'clamp(0.75rem, 2.2vh, 1.5rem)',
              paddingTop: 'clamp(0.75rem, 2vh, 1.5rem)',
              paddingBottom: 'clamp(1rem, 2.6vh, 2rem)',
            }}
          >
            <div className="flex w-full max-w-[23.2rem] shrink-0 justify-center">
              <div className="w-1/4 overflow-hidden rounded-2xl border border-[var(--border)] bg-white/70 shadow-sm">
                <Image
                  src="/home-logo.png"
                  alt="MyEng logo"
                  width={512}
                  height={512}
                  className="block h-auto w-full object-contain"
                  sizes="(max-width: 640px) 25vw, 6rem"
                  priority
                />
              </div>
            </div>
            {homeMenuView === 'root' && (welcomeCompact || welcomeFactLine !== null) && (
              <HomeWelcomeBubble
                text={buildCompactGreeting()}
                actions={
                  <div className="flex justify-end">
                    <div className="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={() => setHomeMenuView('aiChat')}
                        className="btn-3d-menu inline-flex w-fit max-w-full items-center justify-center rounded-xl bg-gradient-to-b from-[var(--accent)] to-[var(--accent-hover)] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:brightness-105 active:brightness-95 touch-manipulation min-h-[44px]"
                      >
                        Чат с MyEng
                      </button>
                      <button
                        type="button"
                        onClick={() => setHomeMenuView('lessons')}
                        className="btn-3d-menu inline-flex w-fit max-w-full items-center justify-center rounded-xl bg-gradient-to-b from-[var(--accent)] to-[var(--accent-hover)] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:brightness-105 active:brightness-95 touch-manipulation min-h-[44px]"
                      >
                        Уроки
                      </button>
                    </div>
                  </div>
                }
              />
            )}
            {homeMenuView !== 'root' && (
              <div className="flex w-full max-w-[23.2rem] shrink-0 flex-col rounded-2xl border border-[var(--border)] bg-[#e8ecf0] px-3 py-3 shadow-sm">
                <MenuSectionPanels
                  menuView={homeMenuView}
                  onMenuViewChange={handleHomeMenuViewChange}
                  settings={settings}
                  onSettingsChange={(s) => setSettings(normalizeSettingsForAudience(s))}
                  usage={usage}
                  dialogueCorrectAnswers={dialogueCorrectAnswers}
                  idPrefix="home-"
                  className="flex min-h-0 flex-col"
                  homeLayout
                  onStartHomeChat={() => setDialogStarted(true)}
                  onGoHome={goToStartScreen}
                />
              </div>
            )}
            {homeMenuView === 'root' && !welcomeCompact && welcomeFactLine && (
              <HomeWelcomeBubble text={welcomeFactLine} />
            )}
          </div>
        ) : (
          <>
            {dialogStarted &&
              messages.length > 0 &&
              settings.mode !== 'communication' &&
              !suppressSettingsChangeBannerRef.current &&
              settingsDiffersFromLastSendForBanner(settings, settingsAtLastSend) && (
              <div className="shrink-0 border-b border-[var(--border)] px-3 py-2">
                <div className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-center text-sm text-[var(--text)] shadow-sm">
                  Настройки изменены. Следующее сообщение будет: <strong>{getMenuSummary(true)}</strong>.
                </div>
              </div>
            )}
            {/* На iOS после закрытия клавиатуры иногда остаётся небольшой технический зазор.
               Чтобы не просвечивал серый фон страницы, держим фон тем же, что и у чата. */}
            <div className="min-h-0 flex-1 bg-[linear-gradient(180deg,var(--chat-wallpaper)_0%,var(--chat-wallpaper-soft)_100%)]">
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
            forceNextMicLang={forceNextMicLang}
            onConsumeForceNextMicLang={() => setForceNextMicLang(null)}
          />
          </div>
          </>
        )}
      </main>

      <SlideOutMenu
        open={menuOpen}
        onToggle={() => setMenuOpen((v) => !v)}
        hideButton
        chatActive={dialogStarted}
        settings={settings}
        onSettingsChange={(s) => setSettings(normalizeSettingsForAudience(s))}
        usage={usage}
        dialogueCorrectAnswers={dialogueCorrectAnswers}
        onStartChat={handleStartChatFromMenu}
        onGoHome={goToStartScreen}
      />
    </div>
  )
}

