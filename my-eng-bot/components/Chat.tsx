'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { parseCorrection } from '@/lib/parseCorrection'
import { speak } from '@/lib/speech'
import type { ChatMessage as ChatMessageType, Settings } from '@/lib/types'

interface ChatProps {
  messages: ChatMessageType[]
  settings: Settings
  loading: boolean
  atLimit: boolean
  onSend: (text: string) => void
  firstMessageError?: string
  onRetryFirstMessage?: () => void
  lastMessageIsError?: boolean
  onRetryLastMessage?: () => void
  retryMessage?: string | null
  onRequestTranslation?: (index: number, text: string) => void
  loadingTranslationIndex?: number | null
}

type BubblePosition = 'solo' | 'first' | 'middle' | 'last'
type SectionTone = 'neutral' | 'amber' | 'emerald' | 'slate'
type AssistantSection = {
  key: string
  tone: SectionTone
  label: string
  text: string
  italic?: boolean
  small?: boolean
  singleLine?: boolean
  trailingAction?: 'speak'
}

function getBubblePosition(
  previousRole: ChatMessageType['role'] | undefined,
  currentRole: ChatMessageType['role'],
  nextRole: ChatMessageType['role'] | undefined
): BubblePosition {
  const sameAsPrev = previousRole === currentRole
  const sameAsNext = nextRole === currentRole
  if (!sameAsPrev && !sameAsNext) return 'solo'
  if (!sameAsPrev && sameAsNext) return 'first'
  if (sameAsPrev && sameAsNext) return 'middle'
  return 'last'
}

function bubbleRadiusClass(isUser: boolean, pos: BubblePosition): string {
  // WhatsApp-логика: в группе скругления на стороне "стыка" уменьшаются.
  // Хвостики не используем: вместо этого делаем один угол более "острым".
  if (isUser) {
    // User справа
    // Три угла максимально круглые, нижний правый — чуть острее (как «ИИ печатает…»)
    if (pos === 'solo') return 'rounded-[1.2825rem] rounded-br-md'
    if (pos === 'first') return 'rounded-[1.2825rem] rounded-br-md'
    // Внутри группы чуть «сцепляем» верхний правый
    if (pos === 'middle') return 'rounded-[1.2825rem] rounded-tr-lg rounded-br-md'
    return 'rounded-[1.2825rem] rounded-tr-lg rounded-br-md'
  }

  // Assistant слева
  // Три угла максимально круглые, нижний левый — чуть острее (как «ИИ печатает…»)
  if (pos === 'solo') return 'rounded-[1.2825rem] rounded-bl-md'
  if (pos === 'first') return 'rounded-[1.2825rem] rounded-bl-md'
  // Внутри группы чуть «сцепляем» верхний левый
  if (pos === 'middle') return 'rounded-[1.2825rem] rounded-tl-lg rounded-bl-md'
  return 'rounded-[1.2825rem] rounded-tl-lg rounded-bl-md'
}

function buildAssistantSections(params: {
  comment: string | null
  tenseRef?: string | null
  constructionHint?: string | null
  showOnlyRepeat: boolean
  hidePromptBlocks?: boolean
  repeatTextForCard: string | null
  mainBefore: string
  hideRussianNonQuestionMainBefore: boolean
  invitationText: string | null
  mainAfter: string
}): AssistantSection[] {
  const {
    comment,
    tenseRef,
    constructionHint,
    showOnlyRepeat,
    hidePromptBlocks = false,
    repeatTextForCard,
    mainBefore,
    hideRussianNonQuestionMainBefore,
    invitationText,
    mainAfter,
  } = params

  const sections: AssistantSection[] = []
  if (comment) {
    sections.push({ key: 'comment', tone: 'amber', label: 'Комментарий', text: comment, singleLine: true })
  }
  if (tenseRef) {
    sections.push({ key: 'tense-ref', tone: 'slate', label: 'Время', text: tenseRef, singleLine: true })
  }
  if (constructionHint) {
    sections.push({ key: 'construction', tone: 'slate', label: 'Конструкция', text: constructionHint })
  }
  if (showOnlyRepeat && repeatTextForCard) {
    sections.push({
      key: 'repeat',
      tone: 'emerald',
      label: 'Повтори',
      text: repeatTextForCard,
      singleLine: true,
    })
  } else if (!hidePromptBlocks && mainBefore && !hideRussianNonQuestionMainBefore) {
    sections.push({ key: 'main', tone: 'neutral', label: 'AI', text: mainBefore, singleLine: true })
  }
  if (!showOnlyRepeat && repeatTextForCard) {
    sections.push({
      key: 'repeat-inline',
      tone: 'emerald',
      label: 'Повтори',
      text: repeatTextForCard,
      singleLine: true,
    })
  }
  if (!hidePromptBlocks && invitationText) {
    sections.push({
      key: 'invitation',
      tone: 'slate',
      label: '',
      text: invitationText,
      italic: true,
      small: true,
      singleLine: true,
    })
  }
  if (!hidePromptBlocks && mainAfter) {
    sections.push({
      key: 'main-after',
      tone: 'neutral',
      label: mainBefore || invitationText ? 'Доп. комментарий' : 'AI',
      text: mainAfter.replace(/\b(Say|Repeat|Скажи):\s*/gi, 'Повтори: '),
    })
  }
  return sections
}

function parseTranslationCoachBlocks(text: string): {
  comment: string | null
  tenseRef: string | null
  constructionHint: string | null
  repeat: string | null
  nextSentence: string
  invitation: string | null
} {
  const cleaned = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim())
    .filter(Boolean)

  let comment: string | null = null
  let tenseRef: string | null = null
  let constructionHint: string | null = null
  let repeat: string | null = null
  let invitation: string | null = null
  const body: string[] = []
  const constructionLines: string[] = []
  let collectingConstruction = false

  const isHeaderLine = (line: string): boolean =>
    /^\s*(?:\d+\)\s*)?(Комментарий|Время|Конструкция|Повтори|Repeat|Say)\s*:/i.test(line) ||
    /^\s*(?:\d+\)\s*)?(?:Переведи|Переведите)\b/i.test(line)

  for (const line of cleaned) {
    const pureInvitation = /^\s*(?:\d+\)\s*)?((?:Переведи|Переведите)[^.]*\.)\s*$/i.exec(line)
    if (pureInvitation?.[1]) {
      invitation = pureInvitation[1].trim()
      collectingConstruction = false
      continue
    }

    if (/^Комментарий\s*:/i.test(line)) {
      comment = line.replace(/^Комментарий\s*:\s*/i, '').trim() || null
      collectingConstruction = false
      continue
    }
    if (/^Время\s*:/i.test(line)) {
      tenseRef = line.replace(/^Время\s*:\s*/i, '').trim() || null
      collectingConstruction = false
      continue
    }
    if (/^Конструкция\s*:/i.test(line)) {
      constructionLines.length = 0
      const first = line.replace(/^Конструкция\s*:\s*/i, '').trim()
      if (first) constructionLines.push(first)
      collectingConstruction = true
      continue
    }
    if (/^(Повтори|Repeat|Say)\s*:/i.test(line)) {
      repeat = line.replace(/^(Повтори|Repeat|Say)\s*:\s*/i, '').trim() || null
      collectingConstruction = false
      continue
    }
    const inlineInvitation = /((?:\d+\)\s*)?(?:Переведи|Переведите)[^.]*\.)\s*$/i.exec(line)
    if (inlineInvitation?.[1] && inlineInvitation.index !== undefined) {
      const before = line.slice(0, inlineInvitation.index).trim().replace(/^\d+\)\s*/i, '')
      const inv = inlineInvitation[1].replace(/^\s*\d+\)\s*/i, '').trim()
      if (inv) invitation = inv
      if (before) body.push(before)
      collectingConstruction = false
      continue
    }

    if (collectingConstruction && !isHeaderLine(line)) {
      constructionLines.push(line)
      continue
    }

    collectingConstruction = false
    body.push(line.replace(/^\d+\)\s*/i, ''))
  }

  if (constructionLines.length > 0) {
    constructionHint = constructionLines.join('\n').trim() || null
  }

  return {
    comment,
    tenseRef,
    constructionHint,
    repeat,
    nextSentence: body.join('\n').trim(),
    invitation,
  }
}

function extractTranslationCommentAndPrompt(text: string): { comment: string | null; promptText: string } {
  const trimmed = text.trim()
  if (!trimmed) return { comment: null, promptText: '' }
  const m = /^(.*?[.!?])\s+([\s\S]+)$/.exec(trimmed)
  if (!m) return { comment: null, promptText: trimmed }
  const first = (m[1] ?? '').trim()
  const tail = (m[2] ?? '').trim()
  if (!first || !tail) return { comment: null, promptText: trimmed }

  const looksLikeFeedback =
    /^(Комментарий\s*:|Отлично|Молодец|Верно|Хорошо|Супер|Правильно|Почти|Нужно|Попробуй|Исправ)/i.test(first)
  const looksLikeRuSentence = /[А-Яа-яЁё]/.test(tail)
  const looksLikeEnFeedback = /[A-Za-z]/.test(first) && /^[A-Za-z0-9 ,.'!?-]+$/.test(first)
  const tailStartsWithRu = /^[\s"'«(]*[А-Яа-яЁё]/.test(tail)
  if (looksLikeFeedback && looksLikeRuSentence) {
    const normalized = first.replace(/^Комментарий\s*:\s*/i, '').trim()
    return { comment: normalized || first, promptText: tail }
  }
  // Частый кейс translation: "Try again. Кошка ест."
  if (looksLikeEnFeedback && looksLikeRuSentence && tailStartsWithRu) {
    return { comment: first, promptText: tail }
  }
  return { comment: null, promptText: trimmed }
}

function condenseTranslationCommentToErrors(comment: string): string {
  const compact = comment.replace(/\s+/g, ' ').trim()
  // Достаём только предложения, которые выглядят как перечисление ошибок.
  const sentences = compact.split(/(?<=[.!?])\s+/).map((s) => s.trim())
  const errorSentences = sentences.filter((s) => /^(Ошибка\b|Лексическая ошибка\b)/i.test(s))
  const normalizeSmotri = (s: string) =>
    s
      // Приводим: "Ошибка ... . Смотри — ..." -> "Ошибка ... — ..."
      .replace(/(Ошибка[^.!?]*?)\.\s*(Смотри|Смотрите)\s*—/gi, '$1 —')
      .replace(/(Ошибка[^.!?]*?)\s*(Смотри|Смотрите)\s*—/gi, '$1 —')

  if (errorSentences.length > 0) return normalizeSmotri(errorSentences.join(' '))

  // Fallback: если модель выдала без точек/с вопросами, пробуем вытащить куски,
  // которые начинаются с "Ошибка..." или "Лексическая ошибка...".
  const m = compact.match(/(?:^|[;]\s*)(Ошибка[^;.!?]+|Лексическая ошибка[^;.!?]+)(?=[;.!?]|$)/gi)
  if (m && m.length > 0) return normalizeSmotri(m.map((x) => x.trim()).join(' '))

  return comment
}

export default function Chat({
  messages,
  settings,
  loading,
  atLimit,
  onSend,
  firstMessageError,
  onRetryFirstMessage,
  lastMessageIsError,
  onRetryLastMessage,
  retryMessage,
  onRequestTranslation,
  loadingTranslationIndex,
}: ChatProps) {
  const [input, setInput] = React.useState('')
  const [inputFocused, setInputFocused] = React.useState(false)
  const [listening, setListening] = React.useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const t = input.trim()
    if (!t || loading || atLimit) return
    onSend(t)
    setInput('')
  }

  const startListening = useCallback(async () => {
    if (typeof window === 'undefined') return
    const SpeechRecognitionAPI =
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      setInput('[Распознавание речи не поддерживается в этом браузере]')
      return
    }

    if (recognitionRef.current) {
      // Останавливаем предыдущую сессию мягко, без abort().
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setInput('')
    type DetectedLang = 'ru' | 'en'

    const detectLangFromText = (text: string): DetectedLang => {
      const cyrCount = (text.match(/[А-Яа-яЁё]/g) ?? []).length
      const latCount = (text.match(/[A-Za-z]/g) ?? []).length
      if (cyrCount > latCount) return 'ru'
      if (latCount > cyrCount) return 'en'
      return 'ru'
    }

    let attempt = 0

    const startAttempt = (lang: 'ru-RU' | 'en-US') => {
      attempt += 1
      const rec = new SpeechRecognitionAPI()
      rec.lang = lang
      rec.continuous = false
      rec.interimResults = false
      let gotTranscript = false

      rec.addEventListener('start', () => {
        setListening(true)
      })

      rec.onresult = (event: SpeechRecognitionEvent) => {
        const last = event.results.length - 1
        const text = event.results[last]?.[0]?.transcript ?? ''
        const trimmed = text.trim()
        if (!trimmed) return
        gotTranscript = true

        if (settings.mode === 'communication') {
          const detected = detectLangFromText(trimmed)

          // Первый проход: если распознавание ушло в другую сторону — один ретрай.
          if (attempt === 1 && trimmed.length >= 3) {
            const shouldRetry =
              (lang === 'ru-RU' && detected === 'en') || (lang === 'en-US' && detected === 'ru')

            if (shouldRetry) {
              try {
                rec.stop()
              } catch {
                // ignore
              }
              setInput('')
              startAttempt(detected === 'ru' ? 'ru-RU' : 'en-US')
              return
            }
          }
        }

        setInput(trimmed)
      }

      rec.onend = () => {
        if (recognitionRef.current === rec) {
          // Если в первой попытке не получили транскрипт — попробуем противоположный язык.
          if (settings.mode === 'communication' && attempt === 1 && !gotTranscript) {
            const other = lang === 'ru-RU' ? 'en-US' : 'ru-RU'
            setInput('')
            startAttempt(other)
            return
          }
          recognitionRef.current = null
          setListening(false)
        }
      }

      rec.onerror = (event: Event) => {
        // SpeechRecognitionErrorEvent есть не во всех TS lib, поэтому берём как any.
        const err = (event as unknown as { error?: string; message?: string }).error
        const msg = (event as unknown as { message?: string }).message
        const code = (err ?? msg ?? '').toString()
        // "aborted" — нормальная ситуация: распознавание прервали (стоп, потеря фокуса, повторный старт).
        // Не показываем это как ошибку пользователю.
        if (/^aborted$/i.test(code)) {
          if (recognitionRef.current === rec) {
            recognitionRef.current = null
            setListening(false)
          }
          return
        }
        if (/not-allowed|permission/i.test(code)) {
          setInput('[Нет доступа к микрофону. Разрешите микрофон для этого сайта и попробуйте снова.]')
        } else if (/no-speech/i.test(code)) {
          // Если первая попытка была на одном языке, но речь не распознана — попробуем другой один раз.
          if (settings.mode === 'communication' && attempt === 1) {
            const other = lang === 'ru-RU' ? 'en-US' : 'ru-RU'
            setInput('')
            startAttempt(other)
            return
          }

          setInput('[Речь не распознана. Скажите фразу ещё раз чуть громче.]')
        } else if (/network/i.test(code)) {
          setInput('[Ошибка сети при распознавании речи. Попробуйте ещё раз.]')
        } else if (code) {
          setInput(`[Ошибка распознавания речи: ${code}]`)
        }
        if (recognitionRef.current === rec) {
          recognitionRef.current = null
          setListening(false)
        }
      }

      recognitionRef.current = rec
      try {
        rec.start()
      } catch {
        setInput('[Не удалось запустить распознавание речи. Попробуйте ещё раз.]')
        setListening(false)
      }
    }

    if (settings.mode === 'communication') {
      // Язык первого распознавания выбираем по последнему сообщению пользователя.
      // Если это старт диалога (нет user-ввода) — всегда ru-RU.
      const lastUserText = messages
        .filter((m) => m.role === 'user')
        .map((m) => m.content)
        .slice(-1)[0]

      attempt = 0

      if (!lastUserText || !lastUserText.trim()) {
        startAttempt('ru-RU')
      } else {
        startAttempt(detectLangFromText(lastUserText) === 'ru' ? 'ru-RU' : 'en-US')
      }
      return
    }

    // Остальные режимы оставляем как раньше (английский).
    attempt = 0
    startAttempt('en-US')
  }, [settings.mode, messages])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
      recognitionRef.current = null
    }
    setListening(false)
  }, [])

  const SHOW_TYPING_DELAY_MS = 220
  const [showTypingIndicator, setShowTypingIndicator] = useState(false)
  const typingDelayTimerRef = useRef<number | null>(null)

  // Чтобы индикатор "ИИ печатает…" не мигал при очень быстром ответе от сервера,
  // показываем его только после небольшой задержки, если loading всё ещё true.
  useEffect(() => {
    if (!loading || messages.length === 0) {
      if (typingDelayTimerRef.current) window.clearTimeout(typingDelayTimerRef.current)
      typingDelayTimerRef.current = null
      setShowTypingIndicator(false)
      return
    }

    if (typingDelayTimerRef.current) window.clearTimeout(typingDelayTimerRef.current)
    typingDelayTimerRef.current = window.setTimeout(() => {
      setShowTypingIndicator(true)
    }, SHOW_TYPING_DELAY_MS)

    return () => {
      if (typingDelayTimerRef.current) window.clearTimeout(typingDelayTimerRef.current)
      typingDelayTimerRef.current = null
    }
  }, [loading, messages.length])

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const INPUT_MAX_HEIGHT_PX = 260
  const INPUT_GAP_PX = 10
  const INPUT_BOTTOM_RESERVE =
    // Чтобы нижний зазор у композера был сопоставим с боковыми отступами сообщения (`px-2.5` = 0.625rem).
    // На iOS клавиатура влияет на visualViewport, поэтому учитываем и `--vv-bottom-inset`.
    'calc(max(env(safe-area-inset-bottom, 0px), var(--vv-bottom-inset)))'

  const adjustInputHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const h = Math.min(el.scrollHeight, INPUT_MAX_HEIGHT_PX)
    el.style.height = `${h}px`
  }, [])

  const syncComposerHeight = useCallback(() => {
    const form = formRef.current
    if (!form || typeof window === 'undefined') return
    const root = document.documentElement
    const rect = form.getBoundingClientRect()
    const height = Math.max(0, Math.round(rect.height))
    root.style.setProperty('--chat-input-height', `${height}px`)
  }, [])

  React.useEffect(() => {
    adjustInputHeight()
  }, [input, adjustInputHeight])

  React.useEffect(() => {
    syncComposerHeight()
    const form = formRef.current
    if (!form || typeof window === 'undefined') return

    let raf = 0
    const scheduleSync = () => {
      if (raf) return
      raf = window.requestAnimationFrame(() => {
        raf = 0
        syncComposerHeight()
      })
    }

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleSync) : null
    observer?.observe(form)

    window.addEventListener('resize', scheduleSync, { passive: true })
    window.addEventListener('orientationchange', scheduleSync, { passive: true })

    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      observer?.disconnect()
      window.removeEventListener('resize', scheduleSync)
      window.removeEventListener('orientationchange', scheduleSync)
    }
  }, [syncComposerHeight])

  React.useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages])

  // Индекс последнего assistant-сообщения нужен, чтобы автоскрывать
  // карточку перевода у предыдущих сообщений.
  const lastAssistantIndex = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === 'assistant') return i
    }
    return -1
  }, [messages])

  const lastMessageRole = messages[messages.length - 1]?.role ?? null
  const canShowTypingIndicator = showTypingIndicator && loading && lastMessageRole === 'user'

  return (
    <div className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,var(--chat-wallpaper)_0%,var(--chat-wallpaper-soft)_100%)]">
      <div
        className="flex min-h-0 flex-1 flex-col py-2 sm:py-3"
        style={{
          paddingLeft: 'max(0.5rem, env(safe-area-inset-left, 0px), var(--vv-left-inset))',
          paddingRight: 'max(0.5rem, env(safe-area-inset-right, 0px), var(--vv-right-inset))',
        }}
      >
        <div className="mx-auto flex min-h-0 flex-1 w-full max-w-[29rem] flex-col">
          <div className="flex min-h-0 flex-1 w-full flex-col overflow-hidden rounded-[1.15rem] border border-white/55 bg-[rgba(255,255,255,0.28)] shadow-sm backdrop-blur-[2px]">
            <div
              ref={scrollContainerRef}
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[linear-gradient(180deg,var(--chat-message-wallpaper)_0%,var(--chat-message-wallpaper-soft)_100%)] p-2.5 sm:p-3"
              style={{
                paddingBottom: `calc(0.625rem + var(--chat-input-height) + ${INPUT_GAP_PX}px)`,
                scrollPaddingBottom: `calc(0.625rem + var(--chat-input-height) + ${INPUT_GAP_PX}px)`,
              }}
            >
              {messages.length === 0 && (
                <p className="text-center text-[var(--text-muted)]">
                  Загрузка первого сообщения…
                </p>
              )}
              {messages.map((msg, i) => {
                const bubblePosition = getBubblePosition(messages[i - 1]?.role, msg.role, messages[i + 1]?.role)

                return (
                  <React.Fragment key={i}>
                    <MessageBubble
                      message={msg}
                      messageIndex={i}
                      activeAssistantIndex={lastAssistantIndex}
                      voiceId={settings.voiceId}
                      mode={settings.mode}
                      bubblePosition={bubblePosition}
                      onRequestTranslation={onRequestTranslation}
                      isLoadingTranslation={loadingTranslationIndex === i}
                    />
                    {firstMessageError &&
                      onRetryFirstMessage &&
                      messages.length === 1 &&
                      msg.role === 'assistant' &&
                      msg.content === firstMessageError && (
                        <div className="mt-2 rounded-lg border border-amber-500/50 bg-amber-50 p-2.5">
                          <p className="mb-2 text-sm font-medium text-[var(--text)]">
                            Что сделать:
                          </p>
                          <ol className="mb-3 list-inside list-decimal space-y-1 text-xs text-[var(--text-muted)]">
                            <li>Нажмите кнопку меню (три полоски) слева.</li>
                            <li>Вставьте ключ с сайта openrouter.ai в поле «Ключ OpenRouter».</li>
                            <li>Нажмите «Сохранить».</li>
                            <li>Нажмите «Попробовать снова» ниже.</li>
                          </ol>
                          <button
                            type="button"
                            onClick={onRetryFirstMessage}
                            disabled={loading}
                            className="btn-3d rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
                          >
                            Попробовать снова
                          </button>
                        </div>
                      )}
                    {i === messages.length - 1 &&
                      lastMessageIsError &&
                      onRetryLastMessage &&
                      !(messages.length === 1 && msg.content === firstMessageError) && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={onRetryLastMessage}
                            disabled={loading}
                            className="btn-3d rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
                          >
                            Повторить
                          </button>
                        </div>
                      )}
                  </React.Fragment>
                )
              })}
              {canShowTypingIndicator && messages.length > 0 && (
                <div className="mt-1.5 flex justify-start">
                  <span
                    className="rounded-xl border border-gray-200 bg-[var(--chat-section-neutral)] px-3 py-2 text-[14px] italic text-[var(--text)] shadow-sm"
                    title="Ожидание ответа от ИИ"
                  >
                    ИИ печатает{retryMessage ? `… ${retryMessage}` : '…'}
                  </span>
                </div>
              )}
            </div>
            <div
              // Важно для iOS: paddingBottom может оставаться (safe-area / visual viewport),
              // и если фон полупрозрачный — пользователь видит "серую панель".
              // Делаем обёртку прозрачной, чтобы в резерве просвечивал фон чата.
              className="shrink-0 border-t border-white/55 bg-transparent px-2.5 py-2.5 sm:px-3"
              style={{
                paddingBottom: INPUT_BOTTOM_RESERVE,
              }}
            >
              <form
                ref={formRef}
                onSubmit={handleSubmit}
                className="flex w-full items-center gap-1.5 rounded-[1.1rem] border border-white/70 bg-white/90 px-2.5 py-1.5 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] sm:px-3"
              >
                <button
                  type="button"
                  onClick={listening ? stopListening : startListening}
                  className={`btn-3d flex h-11 min-h-[44px] shrink-0 items-center justify-center rounded-lg p-2.5 touch-manipulation ${
                    listening
                      ? 'bg-red-500/20 text-red-600'
                      : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  }`}
                  title={listening ? 'Остановить' : 'Голосовой ввод'}
                  aria-label={listening ? 'Остановить запись' : 'Голосовой ввод'}
                >
                  {listening ? (
                    <span className="h-5 w-5 rounded-full bg-red-500 animate-pulse" />
                  ) : (
                    <MicIcon />
                  )}
                </button>
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      formRef.current?.requestSubmit()
                    }
                  }}
                  placeholder={inputFocused ? '' : 'Ответ...'}
                  className="min-w-0 flex-1 resize-none overflow-y-hidden rounded-[1rem] border border-emerald-100 bg-white px-3 py-2 min-h-[44px] text-[var(--text)] placeholder:text-[var(--text-muted)] text-base leading-[1.45rem] focus:outline-none focus:ring-0"
                  style={{ maxHeight: INPUT_MAX_HEIGHT_PX }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading || atLimit}
                  className="btn-3d touch-manipulation rounded-lg bg-emerald-600 px-3.5 py-1.5 min-h-[44px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600"
                >
                  <span className="sm:hidden">Отпр.</span>
                  <span className="hidden sm:inline">Отправить</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function isErrorLikeMessage(content: string): boolean {
  return (
    content === 'Не удалось загрузить ответ. Проверьте сеть и настройки сервера.' ||
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
}

function detectTextLang(text: string): 'ru' | 'en' {
  const cyrCount = (text.match(/[А-Яа-яЁё]/g) ?? []).length
  const latCount = (text.match(/[A-Za-z]/g) ?? []).length
  return latCount > cyrCount ? 'en' : 'ru'
}

/** Выделяет приглашение «Переведи на английский» для курсива (режим «Тренировка перевода»). Ищет в любом месте текста. */
function splitInvitation(text: string): {
  mainBefore: string
  invitation: string | null
  mainAfter: string
} {
  const match = text.match(/\s+(?:\d+\)\s*)?((?:Переведи|Переведите)[^.]*\.)/i)
  if (!match || match.index === undefined) {
    return { mainBefore: text, invitation: null, mainAfter: '' }
  }
  const invitation = match[1].trim()
  const mainBefore = text.slice(0, match.index).trimEnd()
  const mainAfter = text.slice(match.index + match[0].length).trimStart()
  return { mainBefore, invitation, mainAfter }
}

function extractRepeatPrompt(text: string): { repeatText: string } | null {
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    // Модель иногда добавляет префиксы "AI:"/"Assistant:" перед служебными строками.
    const line = lines[i].replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim()
    if (!line) continue
    const m = /^(Скажи|Повтори|Say|Repeat)\s*:?\s*(.*)$/i.exec(line)
    if (!m) continue
    let afterKeyword = (m[2] ?? '').trim()
    // Если после "Повтори:" на этой строке пусто или только ":", смотрим следующую непустую строку
    if (!afterKeyword || /^[:.]$/.test(afterKeyword)) {
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j].trim()
        if (next) {
          afterKeyword = next
          break
        }
      }
    }
    const firstSentenceMatch = afterKeyword.match(/^[^.!?]+[.!?]?/)
    const repeatText = (firstSentenceMatch ? firstSentenceMatch[0] : afterKeyword).trim()
    if (!repeatText || repeatText.length < 2 || /^[:\s.]*$/.test(repeatText)) return null
    return { repeatText }
  }
  return null
}

function MessageBubble({
  message,
  messageIndex,
  activeAssistantIndex,
  voiceId,
  mode,
  bubblePosition,
  onRequestTranslation,
  isLoadingTranslation,
}: {
  message: ChatMessageType
  messageIndex: number
  activeAssistantIndex: number
  voiceId: string
  mode: 'dialogue' | 'translation' | 'communication'
  bubblePosition: BubblePosition
  onRequestTranslation?: (index: number, text: string) => void
  isLoadingTranslation?: boolean
}) {
  const isUser = message.role === 'user'
  const [showTranslation, setShowTranslation] = React.useState(false)
  const translationRequestedRef = useRef(false)
  const prevTranslationErrorRef = useRef<string | undefined>(undefined)
  const prevActiveAssistantIndexRef = useRef(activeAssistantIndex)
  const { comment, rest } =
    message.role === 'assistant' ? parseCorrection(message.content) : { comment: null, rest: message.content }

  const displayText = message.role === 'assistant' ? rest : message.content
  const isTranslationMode = mode === 'translation' && !isUser
  const { mainBefore, invitation: invitationText, mainAfter } =
    isTranslationMode && displayText
      ? splitInvitation(displayText)
      : { mainBefore: displayText ?? '', invitation: null as string | null, mainAfter: '' }
  const isCommunicationEnglish = !isUser && mode === 'communication' && detectTextLang(displayText ?? '') === 'en'

  // При правильном ответе ИИ пишет похвалу (Комментарий: Отлично! / Молодец! и т.д.) — блок "Правильно:" не показываем
  const isCorrectAnswerPraise = Boolean(comment && /^(Отлично|Молодец|Верно|Хорошо|Супер|Правильно)[!.]?\s*/i.test(comment.trim()))
  const repeatPrompt = !isUser && !isTranslationMode ? extractRepeatPrompt(mainBefore) : null
  // Если это похвала (ответ правильный), игнорируем "Повтори:" даже если модель его вывела.
  // Иначе UI может зациклиться на повторении.
  const effectiveRepeatPrompt = isCorrectAnswerPraise ? null : repeatPrompt
  let repeatTextForCard = effectiveRepeatPrompt?.repeatText ?? null

  const handleSpeak = () => {
    // Для озвучки:
    // 1) если есть "Повтори", озвучиваем только его;
    // 2) иначе озвучиваем основной текст, убрав служебные префиксы Скажи/Повтори/Say/Repeat.
    const base = repeatTextForCard || rest || message.content
    const speakText = base
      ? base.replace(/^(Скажи|Повтори|Say|Repeat)\s*:?\s*/i, '').trim()
      : ''
    if (speakText) speak(speakText, voiceId)
  }

  const textToTranslate = repeatTextForCard || rest || message.content
  const errorLike = !isUser && isErrorLikeMessage(message.content)
  const hasSpeakableText =
    !isUser && mode !== 'translation' && Boolean(textToTranslate) && !errorLike && (mode !== 'communication' || isCommunicationEnglish)
  const hasTranslationData = !isUser && Boolean(message.translation)
  const hasTranslationError = !isUser && Boolean(message.translationError)
  const hasTranslationButton = !isUser && mode !== 'translation' && !errorLike && (mode === 'dialogue' || isCommunicationEnglish)
  const showSpeakButton = hasSpeakableText
  // Дополнительная UI-страховка: если модель нарушила формат и выдала русскую "мета" строку
  // (кириллица, без вопроса) — не показываем её как "AI: ...".
  const hideRussianNonQuestionMainBefore =
    !isUser &&
    !errorLike &&
    isCorrectAnswerPraise &&
    Boolean(mainBefore) &&
    /[А-Яа-яЁё]/.test(mainBefore) &&
    !/\?\s*$/.test(mainBefore)
  let effectiveComment = comment
  let effectiveTenseRef: string | null = null
  let effectiveConstructionHint: string | null = null
  let effectiveMainBefore = mainBefore
  let effectiveInvitationText = invitationText
  if (!isUser && isTranslationMode) {
    const blocks = parseTranslationCoachBlocks(displayText)
    if (blocks.comment) effectiveComment = condenseTranslationCommentToErrors(blocks.comment)
    if (blocks.tenseRef) effectiveTenseRef = blocks.tenseRef
    if (blocks.constructionHint) effectiveConstructionHint = blocks.constructionHint
    if (blocks.repeat) repeatTextForCard = blocks.repeat
    if (blocks.nextSentence) {
      effectiveMainBefore = blocks.nextSentence
    } else {
      const extracted = extractTranslationCommentAndPrompt(mainBefore)
      if (!effectiveComment && extracted.comment) {
        effectiveComment = condenseTranslationCommentToErrors(extracted.comment)
      }
      effectiveMainBefore = extracted.promptText
    }
    if (blocks.invitation) effectiveInvitationText = blocks.invitation
  }
  const showOnlyRepeat = !isTranslationMode && Boolean(repeatTextForCard)
  const hideTranslationPromptBlocks = isTranslationMode && Boolean(repeatTextForCard)

  const hasContent = isUser
    ? Boolean(message.content)
    : Boolean(effectiveComment || effectiveTenseRef || effectiveConstructionHint || effectiveMainBefore || mainAfter || effectiveInvitationText || rest || message.content || message.translation)
  const isBubbleEnd = bubblePosition === 'solo' || bubblePosition === 'last'
  const rowSpacingClass = isBubbleEnd ? 'mb-2.5' : 'mb-0.5'
  const radius = bubbleRadiusClass(isUser, bubblePosition)
  const assistantSections = isUser
    ? []
    : buildAssistantSections({
        comment: effectiveComment,
        tenseRef: effectiveTenseRef,
        constructionHint: effectiveConstructionHint,
        showOnlyRepeat,
        hidePromptBlocks: hideTranslationPromptBlocks,
        repeatTextForCard,
        mainBefore: effectiveMainBefore,
        hideRussianNonQuestionMainBefore,
        invitationText: effectiveInvitationText,
        mainAfter,
      })

  React.useEffect(() => {
    if (!showTranslation) {
      translationRequestedRef.current = false
      return
    }
    if (hasTranslationData || !onRequestTranslation || !textToTranslate.trim()) return
    if (translationRequestedRef.current) return
    translationRequestedRef.current = true
    onRequestTranslation(messageIndex, textToTranslate)
  }, [showTranslation, hasTranslationData, onRequestTranslation, textToTranslate, messageIndex])

  React.useEffect(() => {
    const currentError = message.translationError
    const prevError = prevTranslationErrorRef.current
    prevTranslationErrorRef.current = currentError

    if (!showTranslation) return

    // Авто-сворачивание при любой ошибке перевода (пустой ответ, таймаут, сеть),
    // только в момент появления ошибки, чтобы при повторном клике "Перевод"
    // панель не схлопывалась и пользователь увидел результат.
    const isTranslationError = typeof currentError === 'string' && currentError.length > 0
    const justAppeared = prevError !== currentError
    if (isTranslationError && justAppeared) {
      setShowTranslation(false)
    }
  }, [showTranslation, message.translationError])

  // При появлении нового assistant-сообщения закрываем переводы
  // у всех предыдущих карточек.
  React.useEffect(() => {
    const prevActiveAssistantIndex = prevActiveAssistantIndexRef.current
    prevActiveAssistantIndexRef.current = activeAssistantIndex

    if (!showTranslation) return
    if (prevActiveAssistantIndex === activeAssistantIndex) return
    if (activeAssistantIndex < 0) return
    if (messageIndex !== activeAssistantIndex) setShowTranslation(false)
  }, [activeAssistantIndex, messageIndex, showTranslation])

  if (!hasContent) return null

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${rowSpacingClass}`}
    >
      <div
        className={`relative flex min-w-0 max-w-[90%] flex-col px-3 py-2 text-[15px] leading-[1.45] shadow-sm ${radius} ${
          isUser
            ? 'border border-[var(--chat-user-bubble-border)] bg-[var(--chat-user-bubble)] text-[var(--chat-user-text)]'
            : 'border border-[var(--chat-assistant-border)] bg-[var(--chat-assistant-shell)] text-[var(--text)] backdrop-blur-[2px]'
        }`}
      >
        {isUser ? (
          <>
            <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.45] font-normal">
              {message.content}
            </p>
          </>
        ) : (
          <>
            {assistantSections.length > 0 && (
              <div className="space-y-1.5" role="alert">
                {assistantSections.map((section) => (
                  <SectionCard
                    key={section.key}
                    tone={section.tone}
                    label={section.label}
                    text={section.text}
                    italic={section.italic}
                    small={section.small}
                    singleLine={section.singleLine}
                    trailingAction={section.trailingAction}
                    onSpeak={section.trailingAction === 'speak' ? handleSpeak : undefined}
                  />
                ))}
              </div>
            )}
            {(showSpeakButton || hasTranslationButton) && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {showSpeakButton && (
                  <button
                    type="button"
                    onClick={handleSpeak}
                    className="btn-3d-subtle flex w-fit items-center justify-center gap-1 rounded-full border border-[var(--border)] bg-white/80 px-2.5 py-0.5 text-xs text-[var(--text-muted)] hover:bg-white hover:text-[var(--text)]"
                    title="Озвучить"
                  >
                    <SpeakerIcon /> Озвучить
                  </button>
                )}
                {hasTranslationButton && (
                  <button
                    type="button"
                    onClick={() => setShowTranslation((v) => !v)}
                    className="btn-3d-subtle flex w-fit items-center justify-center gap-1.5 rounded-full border border-[var(--border)] bg-white/80 px-2.5 py-0.5 text-xs text-[var(--text-muted)] hover:bg-white hover:text-[var(--text)]"
                    title={showTranslation ? 'Скрыть перевод' : 'Показать перевод'}
                  >
                    {!showTranslation && (
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          hasTranslationData ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        aria-hidden
                      />
                    )}
                    {showTranslation ? 'Скрыть перевод' : 'Перевод'}
                  </button>
                )}
              </div>
            )}
            {(showTranslation && hasTranslationData && message.translation) || hasTranslationError || (showTranslation && !hasTranslationData && !hasTranslationError) ? (
              <div className="mt-2">
                {showTranslation && hasTranslationData && message.translation && (
                  <SectionCard tone="slate" label="Перевод" text={message.translation} small singleLine />
                )}
                {hasTranslationError && (
                  <SectionCard tone="amber" label="Перевод" text="Перевод не пришёл, нажми ещё раз." small singleLine />
                )}
                {showTranslation && !hasTranslationData && !hasTranslationError && (
                  <SectionCard
                    tone="slate"
                    label="Перевод"
                    text="Загрузка перевода…"
                    small
                    singleLine
                    textItalic
                  />
                )}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

function SectionCard({
  tone,
  label,
  text,
  italic,
  textItalic,
  small,
  singleLine,
  trailingAction,
  onSpeak,
}: {
  tone: 'neutral' | 'amber' | 'emerald' | 'slate'
  label: string
  text: string
  italic?: boolean
  textItalic?: boolean
  small?: boolean
  singleLine?: boolean
  trailingAction?: 'speak'
  onSpeak?: () => void
}) {
  const toneClass =
    tone === 'amber'
      ? 'border-amber-100 bg-[var(--chat-section-amber)]'
      : tone === 'emerald'
        ? 'border-emerald-100 bg-[var(--chat-section-emerald)]'
        : tone === 'slate'
          ? 'border-slate-200 bg-[var(--chat-section-slate)]'
          : 'border-gray-200 bg-[var(--chat-section-neutral)]'

  const labelClass =
    tone === 'amber'
      ? 'text-amber-700'
      : tone === 'emerald'
        ? 'text-emerald-700'
        : tone === 'slate'
          ? 'text-slate-600'
          : 'text-gray-600'

  const isAiInline = singleLine && label === 'AI'
  const hasLabel = label.trim().length > 0
  const isCompactServiceLine = singleLine && italic && !hasLabel
  const isTextItalic = textItalic ?? italic

  return (
    <section
      className={`block min-w-0 w-fit max-w-full self-start rounded-xl border shadow-sm ${
        isCompactServiceLine ? 'px-2.5 py-1.5' : 'px-3 py-2'
      } ${
        singleLine ? 'flex items-start' : ''
      } ${toneClass}`}
      role="note"
    >
      {singleLine ? (
        <div
          className={`min-w-0 max-w-full whitespace-normal break-words leading-snug ${
            small ? 'text-[14px]' : 'text-[15px]'
          } text-[var(--text)]`}
          title={`${label}: ${text}`}
        >
          {hasLabel && (
            <>
              <span
                className={`${isAiInline ? 'font-semibold text-gray-700' : `font-medium ${labelClass}`}`}
              >
                {label}:
              </span>{' '}
            </>
          )}
          <span
            className={
              isAiInline
                ? 'text-gray-900'
                : isTextItalic
                  ? 'font-serif italic text-[var(--invitation)]'
                  : 'text-[var(--text)]'
            }
          >
            {text}
          </span>
          {trailingAction === 'speak' && onSpeak && (
            <button
              type="button"
              onClick={onSpeak}
              className="ml-1 inline-flex h-6 w-6 translate-y-[1px] items-center justify-center rounded-full border border-emerald-200 bg-white/80 text-emerald-700 hover:bg-white hover:text-emerald-800"
              title="Озвучить"
              aria-label="Озвучить"
            >
              <SpeakerIcon />
            </button>
          )}
        </div>
      ) : (
        <>
          {hasLabel && <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${labelClass}`}>{label}</p>}
          <p
            className={`${hasLabel ? 'mt-0.5' : ''} whitespace-pre-wrap break-words leading-snug ${
              small ? 'text-xs' : 'text-sm'
            } ${italic ? 'font-serif italic text-[var(--invitation)]' : 'text-[var(--text)]'}`}
          >
            {text}
          </p>
        </>
      )}
    </section>
  )
}

function MicIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
      />
    </svg>
  )
}

function SpeakerIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
      />
    </svg>
  )
}
