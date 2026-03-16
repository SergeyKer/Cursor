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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const t = input.trim()
    if (!t || loading || atLimit) return
    onSend(t)
    setInput('')
  }

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return
    const SpeechRecognitionAPI =
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      setInput('[Распознавание речи не поддерживается в этом браузере]')
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
    rec.onerror = () => setListening(false)
    recognitionRef.current = rec
    rec.start()
    setListening(true)
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

  const formRef = useRef<HTMLFormElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const INPUT_MAX_HEIGHT_PX = 260

  const adjustInputHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const h = Math.min(el.scrollHeight, INPUT_MAX_HEIGHT_PX)
    el.style.height = `${h}px`
  }, [])

  React.useEffect(() => {
    adjustInputHeight()
  }, [input, adjustInputHeight])

  React.useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages])

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 sm:px-4 sm:py-3"
      >
        <div className="mx-auto max-w-xl">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-sm min-h-[min(50vh,320px)]">
        {messages.length === 0 && (
          <p className="text-center text-[var(--text-muted)]">
            Загрузка первого сообщения…
          </p>
        )}
        {messages.map((msg, i) => (
          <React.Fragment key={i}>
            <MessageBubble
              message={msg}
              messageIndex={i}
              voiceId={settings.voiceId}
              mode={settings.mode}
              onRequestTranslation={onRequestTranslation}
              isLoadingTranslation={loadingTranslationIndex === i}
              translationRetryMessage={loadingTranslationIndex === i ? translationRetryMessage : null}
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
                  <ol className="mb-3 list-inside list-decimal text-xs text-[var(--text-muted)] space-y-1">
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
        ))}
        {loading && messages.length > 0 && (
          <div className="mt-1.5 flex justify-start">
            <span
              className="rounded-lg bg-[var(--border)] px-2.5 py-1.5 text-sm text-[var(--text-muted)]"
              title="Ожидание ответа от ИИ"
            >
              ИИ печатает{retryMessage ? `… ${retryMessage}` : '…'}
            </span>
          </div>
        )}
        <div ref={bottomRef} />
          </div>

          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="sticky bottom-0 z-10 mt-3 flex shrink-0 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]"
            style={{
              paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 72px))',
            }}
          >
        <button
          type="button"
          onClick={listening ? stopListening : startListening}
          className={`btn-3d flex h-12 min-h-[44px] shrink-0 items-center justify-center rounded-lg p-3 touch-manipulation ${
            listening
              ? 'bg-red-500/20 text-red-600'
              : 'bg-[var(--border)] text-[var(--text)] hover:bg-[var(--border)]/80'
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
          className="min-w-0 flex-1 resize-none overflow-y-hidden rounded-lg border border-[var(--border)] bg-white px-4 py-2 min-h-[44px] text-[var(--text)] placeholder:text-[var(--text-muted)] text-base leading-[1.5rem] focus:outline-none focus:ring-0"
          style={{ maxHeight: INPUT_MAX_HEIGHT_PX }}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading || atLimit}
          className="btn-3d touch-manipulation rounded-lg bg-[var(--accent)] px-4 py-2 min-h-[44px] font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:hover:bg-[var(--accent)]"
        >
          Отправить
        </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function isErrorLikeMessage(content: string): boolean {
  return (
    content === 'Не удалось загрузить ответ. Проверьте сеть и настройки сервера.' ||
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

function MessageBubble({
  message,
  messageIndex,
  voiceId,
  mode,
  onRequestTranslation,
  isLoadingTranslation,
  translationRetryMessage,
}: {
  message: ChatMessageType
  messageIndex: number
  voiceId: string
  mode: 'dialogue' | 'translation'
  onRequestTranslation?: (index: number, text: string) => void
  isLoadingTranslation?: boolean
  translationRetryMessage?: string | null
}) {
  const isUser = message.role === 'user'
  const [showTranslation, setShowTranslation] = React.useState(false)
  const translationRequestedRef = useRef(false)
  const { correction, comment, rest } =
    message.role === 'assistant' ? parseCorrection(message.content) : { correction: null, comment: null, rest: message.content }

  const displayText = message.role === 'assistant' ? rest : message.content
  const isTranslationMode = mode === 'translation' && !isUser
  const { mainBefore, invitation: invitationText, mainAfter } =
    isTranslationMode && displayText
      ? splitInvitation(displayText)
      : { mainBefore: displayText ?? '', invitation: null as string | null, mainAfter: '' }

  const handleSpeak = () => {
    // Для озвучки:
    // 1) если есть корректный вариант, озвучиваем только его (без комментариев и "Повтори");
    // 2) иначе озвучиваем основной текст, убрав служебные префиксы Скажи/Повтори/Say/Repeat.
    let text = correction || rest || message.content
    if (text) {
      text = text.replace(/^(Скажи|Повтори|Say|Repeat)\s*:?\s*/i, '').trim()
    }
    if (text) speak(text, voiceId)
  }

  const textToTranslate = rest || (correction ?? '') || message.content
  const errorLike = !isUser && isErrorLikeMessage(message.content)
  const hasSpeakableText = !isUser && Boolean(textToTranslate) && !errorLike
  const hasTranslationData = !isUser && Boolean(message.translation)
  const hasTranslationError = !isUser && Boolean(message.translationError)
  const hasTranslationButton = !isUser && mode !== 'translation' && !errorLike
  const hasContent = isUser ? Boolean(message.content) : Boolean(correction || comment || mainBefore || mainAfter || invitationText || rest || message.content || message.translation)
  if (!hasContent) return null

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

  return (
    <div
      className={`mb-2 flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`flex min-w-0 max-w-[90%] flex-col rounded-2xl px-3 py-2 ${
          isUser
            ? 'bg-[var(--accent)] text-white shadow-sm'
            : 'bg-white border border-gray-200/80 text-[var(--text)] shadow-sm'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <>
            {(correction || comment || mainBefore || invitationText || mainAfter) && (
              <div
                className="mb-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-[var(--text)]"
                role="alert"
              >
                {correction && (
                  <p className="flex items-center gap-1.5">
                    <span className="font-semibold text-green-700">Правильно:</span>{' '}
                    <span className="text-gray-800 flex-1">{correction}</span>
                    <button
                      type="button"
                      onClick={() => speak(correction, voiceId)}
                      className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-gray-500 hover:text-gray-800"
                      title="Озвучить правильный вариант"
                      aria-label="Озвучить правильный вариант"
                    >
                      <SpeakerIcon />
                    </button>
                  </p>
                )}
                {comment && (
                  <p className="mt-2 pt-2 border-t border-gray-200">
                    <span className="font-semibold text-blue-700">Комментарий:</span>{' '}
                    <span className="text-gray-800">{comment}</span>
                  </p>
                )}
                {mainBefore && (
                  <p className={`whitespace-pre-wrap text-gray-800 ${correction || comment ? 'mt-2 pt-2 border-t border-gray-200' : ''}`}>
                    {(() => {
                      const trimmed = mainBefore.trim()
                      const repeatMatch = /^(Скажи|Say|Repeat)\s*:?\s*(.+)$/i.exec(trimmed)
                      if (repeatMatch) {
                        // Приглашение повторить: показываем только первую фразу после ключевого слова,
                        // без какого‑либо дополнительного вопроса и без метки AI ask.
                        const afterKeyword = repeatMatch[2].trim()
                        const firstSentenceMatch = afterKeyword.match(/^[^.!?]+[.!?]?/)
                        const repeatText = (firstSentenceMatch ? firstSentenceMatch[0] : afterKeyword).trim()
                        return (
                          <>
                            <span className="font-semibold">Повтори:</span>{' '}
                            {repeatText}
                          </>
                        )
                      }
                      // Это не "Скажи"/"Repeat" — обычный текст/следующий вопрос.
                      if (mode === 'dialogue' && comment) {
                        return (
                          <>
                            <span className="mr-1 font-semibold text-gray-700">AI ask:</span>
                            {mainBefore}
                          </>
                        )
                      }
                      return <>{mainBefore}</>
                    })()}
                  </p>
                )}
                {invitationText && (
                  <p className="mt-1.5 whitespace-pre-wrap font-serif italic text-[var(--invitation)]">
                    {invitationText}
                  </p>
                )}
                {mainAfter && (
                  <p className={`whitespace-pre-wrap text-gray-800 ${mainBefore || invitationText ? 'mt-1.5' : correction || comment ? 'mt-2 pt-2 border-t border-gray-200' : ''}`}>
                    {mainAfter.replace(/\b(Say|Repeat|Повтори):\s*/gi, 'Скажи: ')}
                  </p>
                )}
              </div>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {hasSpeakableText && (
                <button
                  type="button"
                  onClick={handleSpeak}
                  className="btn-3d flex w-fit items-center gap-1 rounded-md bg-[var(--bg)]/80 px-2 py-0.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
                  title="Озвучить"
                >
                  <SpeakerIcon /> Озвучить
                </button>
              )}
              {hasTranslationButton && (
                <button
                  type="button"
                  onClick={() => setShowTranslation((v) => !v)}
                  className="btn-3d flex w-fit items-center gap-1.5 rounded-md bg-[var(--bg)]/80 px-2 py-0.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
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
            {showTranslation && (
              <p className="mt-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-700">
                {hasTranslationData ? (
                  <>
                    <span className="font-medium text-gray-600">Перевод:</span> {message.translation}
                  </>
                ) : hasTranslationError ? (
                  <span className="text-amber-700">{message.translationError}</span>
                ) : (
                  <span className="text-gray-500">
                    {onRequestTranslation && textToTranslate.trim()
                      ? (translationRetryMessage ?? 'Загрузка перевода…')
                      : 'Перевод для этого сообщения недоступен.'}
                  </span>
                )}
              </p>
            )}
          </>
        )}
      </div>
    </div>
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
