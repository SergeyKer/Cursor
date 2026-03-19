'use client'

import React, { useRef, useCallback } from 'react'
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
  translationRetryMessage?: string | null
}

type BubblePosition = 'solo' | 'first' | 'middle' | 'last'

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
  translationRetryMessage,
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

    // В некоторых браузерах распознавание речи не запрашивает разрешение явно.
    // Запрос getUserMedia даёт понятный prompt и более детальную ошибку.
    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach((t) => t.stop())
      }
    } catch (e) {
      const name = e instanceof Error ? e.name : ''
      if (/NotAllowedError|PermissionDeniedError/i.test(name)) {
        setInput('[Нет доступа к микрофону. Разрешите микрофон для этого сайта и попробуйте снова.]')
      } else {
        setInput('[Не удалось получить доступ к микрофону. Проверьте разрешения браузера.]')
      }
      setListening(false)
      return
    }

    if (recognitionRef.current) {
      recognitionRef.current.abort()
    }
    setInput('')
    const rec = new SpeechRecognitionAPI()
    rec.lang = 'en-US'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results.length - 1
      const text = event.results[last]?.[0]?.transcript ?? ''
      if (text) setInput(text)
    }
    rec.onend = () => setListening(false)
    rec.onerror = (event: Event) => {
      // SpeechRecognitionErrorEvent есть не во всех TS lib, поэтому берём как any.
      const err = (event as unknown as { error?: string; message?: string }).error
      const msg = (event as unknown as { message?: string }).message
      const code = (err ?? msg ?? '').toString()
      // "aborted" — нормальная ситуация: распознавание прервали (стоп, потеря фокуса, повторный старт).
      // Не показываем это как ошибку пользователю.
      if (/^aborted$/i.test(code)) {
        setListening(false)
        return
      }
      if (/not-allowed|permission/i.test(code)) {
        setInput('[Нет доступа к микрофону. Разрешите микрофон для этого сайта и попробуйте снова.]')
      } else if (/no-speech/i.test(code)) {
        setInput('[Речь не распознана. Скажите фразу ещё раз чуть громче.]')
      } else if (/network/i.test(code)) {
        setInput('[Ошибка сети при распознавании речи. Попробуйте ещё раз.]')
      } else if (code) {
        setInput(`[Ошибка распознавания речи: ${code}]`)
      }
      setListening(false)
    }
    recognitionRef.current = rec
    try {
      rec.start()
      setListening(true)
    } catch {
      setInput('[Не удалось запустить распознавание речи. Попробуйте ещё раз.]')
      setListening(false)
    }
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch {
        // ignore
      }
      recognitionRef.current = null
    }
    setListening(false)
  }, [])

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const INPUT_MAX_HEIGHT_PX = 260
  const INPUT_GAP_PX = 10
  const INPUT_BOTTOM_RESERVE =
    'calc(max(0.5rem, env(safe-area-inset-bottom, 0px)) + 1rem)'

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
                      voiceId={settings.voiceId}
                      mode={settings.mode}
                      bubblePosition={bubblePosition}
                      onRequestTranslation={onRequestTranslation}
                      isLoadingTranslation={loadingTranslationIndex === i}
                      translationRetryMessage={
                        loadingTranslationIndex === i ? translationRetryMessage : null
                      }
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
              {loading && messages.length > 0 && (
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
              className="shrink-0 border-t border-white/55 bg-[rgba(255,255,255,0.22)] px-2.5 py-2.5 sm:px-3"
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
                  title={listening ? 'Остановить' : 'Голосовой ввод (англ.)'}
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

/** Выделяет приглашение «Переведи на английский» для курсива (режим «Тренировка перевода»). Ищет в любом месте текста. */
function splitInvitation(text: string): {
  mainBefore: string
  invitation: string | null
  mainAfter: string
} {
  const match = text.match(/\s+((?:Переведи|Переведите)[^.]*\.)/i)
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
  voiceId,
  mode,
  bubblePosition,
  onRequestTranslation,
  isLoadingTranslation,
  translationRetryMessage,
}: {
  message: ChatMessageType
  messageIndex: number
  voiceId: string
  mode: 'dialogue' | 'translation'
  bubblePosition: BubblePosition
  onRequestTranslation?: (index: number, text: string) => void
  isLoadingTranslation?: boolean
  translationRetryMessage?: string | null
}) {
  const isUser = message.role === 'user'
  const [showTranslation, setShowTranslation] = React.useState(false)
  const translationRequestedRef = useRef(false)
  const prevTranslationErrorRef = useRef<string | undefined>(undefined)
  const { comment, rest } =
    message.role === 'assistant' ? parseCorrection(message.content) : { comment: null, rest: message.content }

  const displayText = message.role === 'assistant' ? rest : message.content
  const isTranslationMode = mode === 'translation' && !isUser
  const { mainBefore, invitation: invitationText, mainAfter } =
    isTranslationMode && displayText
      ? splitInvitation(displayText)
      : { mainBefore: displayText ?? '', invitation: null as string | null, mainAfter: '' }

  // При правильном ответе ИИ пишет похвалу (Комментарий: Отлично! / Молодец! и т.д.) — блок "Правильно:" не показываем
  const isCorrectAnswerPraise = Boolean(comment && /^(Отлично|Молодец|Верно|Хорошо|Супер|Правильно)[!.]?\s*/i.test(comment.trim()))
  const repeatPrompt = !isUser ? extractRepeatPrompt(mainBefore) : null
  // Если это похвала (ответ правильный), игнорируем "Повтори:" даже если модель его вывела.
  // Иначе UI может зациклиться на повторении.
  const effectiveRepeatPrompt = isCorrectAnswerPraise ? null : repeatPrompt
  const repeatTextForCard = effectiveRepeatPrompt?.repeatText ?? null
  const showOnlyRepeat = Boolean(repeatTextForCard)

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
  const hasSpeakableText = !isUser && Boolean(textToTranslate) && !errorLike
  const hasTranslationData = !isUser && Boolean(message.translation)
  const hasTranslationError = !isUser && Boolean(message.translationError)
  const hasTranslationButton = !isUser && mode !== 'translation' && !errorLike
  // Дополнительная UI-страховка: если модель нарушила формат и выдала русскую "мета" строку
  // (кириллица, без вопроса) — не показываем её как "AI: ...".
  const hideRussianNonQuestionMainBefore =
    !isUser &&
    !errorLike &&
    isCorrectAnswerPraise &&
    Boolean(mainBefore) &&
    /[А-Яа-яЁё]/.test(mainBefore) &&
    !/\?\s*$/.test(mainBefore)
  const hasContent = isUser ? Boolean(message.content) : Boolean(comment || mainBefore || mainAfter || invitationText || rest || message.content || message.translation)
  const isBubbleEnd = bubblePosition === 'solo' || bubblePosition === 'last'
  const rowSpacingClass = isBubbleEnd ? 'mb-2.5' : 'mb-0.5'
  const radius = bubbleRadiusClass(isUser, bubblePosition)

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
            {(comment || mainBefore || invitationText || mainAfter) && (
              <div className="space-y-1.5" role="alert">
                {comment && <SectionCard tone="amber" label="Комментарий" text={comment} singleLine />}
                {showOnlyRepeat && repeatTextForCard && (
                  <SectionCard tone="emerald" label="Повтори" text={repeatTextForCard} singleLine />
                )}
                {mainBefore && !showOnlyRepeat && !hideRussianNonQuestionMainBefore && (
                  <SectionCard
                    tone="neutral"
                    label="AI"
                    text={mainBefore}
                    singleLine
                  />
                )}
                {invitationText && (
                  <SectionCard tone="slate" label="Подсказка" text={invitationText} italic />
                )}
                {mainAfter && (
                  <SectionCard
                    tone="neutral"
                    label={mainBefore || invitationText ? 'Доп. комментарий' : 'AI'}
                    text={mainAfter.replace(/\b(Say|Repeat|Скажи):\s*/gi, 'Повтори: ')}
                  />
                )}
              </div>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {hasSpeakableText && (
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
                    text={
                      onRequestTranslation && textToTranslate.trim()
                        ? (translationRetryMessage ?? 'Загрузка перевода…')
                        : 'Перевод для этого сообщения недоступен.'
                    }
                    small
                    singleLine
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
  small,
  singleLine,
}: {
  tone: 'neutral' | 'amber' | 'emerald' | 'slate'
  label: string
  text: string
  italic?: boolean
  small?: boolean
  singleLine?: boolean
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

  return (
    <section
      className={`min-w-0 rounded-xl border px-3 py-2 shadow-sm ${
        singleLine ? 'flex w-full items-start' : ''
      } ${toneClass}`}
      role="note"
    >
      {singleLine ? (
        <p
          className={`w-full min-w-0 whitespace-normal break-words leading-snug ${
            small ? 'text-[14px]' : 'text-[15px]'
          } ${italic ? 'font-serif italic text-[var(--invitation)]' : 'text-[var(--text)]'}`}
          title={`${label}: ${text}`}
        >
          <span
            className={`${isAiInline ? 'font-semibold text-gray-700' : `font-medium ${labelClass}`}`}
          >
            {label}:
          </span>{' '}
          <span
            className={
              isAiInline ? 'text-gray-900' : italic ? 'text-[var(--invitation)]' : 'text-[var(--text)]'
            }
          >
            {text}
          </span>
        </p>
      ) : (
        <>
          <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${labelClass}`}>{label}</p>
          <p
            className={`mt-0.5 whitespace-pre-wrap break-words leading-snug ${
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
