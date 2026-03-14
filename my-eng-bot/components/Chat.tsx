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
}

export default function Chat({
  messages,
  settings,
  loading,
  atLimit,
  onSend,
  firstMessageError,
  onRetryFirstMessage,
}: ChatProps) {
  const [input, setInput] = React.useState('')
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
    const rec = new SpeechRecognitionAPI()
    rec.lang = 'en-US'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results.length - 1
      const text = event.results[last]?.[0]?.transcript ?? ''
      if (text) setInput((prev) => (prev ? prev + ' ' : '') + text)
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

  const bottomRef = useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 sm:px-4 sm:py-3">
        <div className="mx-auto max-w-xl rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-sm min-h-[min(50vh,320px)]">
        {messages.length === 0 && !loading && (
          <p className="text-center text-[var(--text-muted)]">
            Загрузка первого сообщения…
          </p>
        )}
        {messages.map((msg, i) => (
          <React.Fragment key={i}>
            <MessageBubble
              message={msg}
              voiceId={settings.voiceId}
            />
            {firstMessageError &&
              onRetryFirstMessage &&
              messages.length === 1 &&
              msg.role === 'assistant' &&
              msg.content === firstMessageError && (
                <div className="mt-2 rounded-lg border border-amber-500/50 bg-amber-50 p-2.5 dark:border-amber-500/30 dark:bg-amber-950/30">
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
          </React.Fragment>
        ))}
        {loading && (
          <div className="mt-1.5 flex justify-start">
            <span className="rounded-lg bg-[var(--border)] px-2.5 py-1.5 text-sm text-[var(--text-muted)]" title="Ожидание ответа от ИИ">
              ИИ печатает…
            </span>
          </div>
        )}
        <div ref={bottomRef} />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 z-10 flex shrink-0 gap-2 border-t border-[var(--border)] bg-[var(--bg)] px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_-2px_8px_rgba(0,0,0,0.2)]"
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
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Напишите или нажмите микрофон..."
          className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-2 min-h-[44px] text-[var(--text)] placeholder:text-[var(--text-muted)] text-base"
          disabled={loading || atLimit}
          enterKeyHint="send"
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
  )
}

function MessageBubble({
  message,
  voiceId,
}: {
  message: ChatMessageType
  voiceId: string
}) {
  const isUser = message.role === 'user'
  const { correction, rest } =
    message.role === 'assistant' ? parseCorrection(message.content) : { correction: null, rest: message.content }

  const handleSpeak = () => {
    const text = rest || message.content
    if (text) speak(text, voiceId)
  }

  const hasSpeakableText = !isUser && Boolean(rest || message.content)
  const hasContent = isUser ? Boolean(message.content) : Boolean(correction || rest || message.content)
  if (!hasContent) return null

  return (
    <div
      className={`mb-2 flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`flex min-w-0 max-w-[90%] flex-col rounded-xl px-3 py-1.5 ${
          isUser
            ? 'bg-[var(--accent)] text-white'
            : 'bg-[var(--border)]/60 text-[var(--text)]'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <>
            {correction && (
              <div
                className="mb-1.5 rounded-md border border-amber-500/50 bg-[var(--correction-bg)] px-2.5 py-1.5 text-sm"
                role="alert"
              >
                <strong>Исправление:</strong> {correction}
              </div>
            )}
            {(rest || message.content) && (
              <p className="whitespace-pre-wrap">{rest || message.content}</p>
            )}
            {hasSpeakableText && (
              <button
                type="button"
                onClick={handleSpeak}
                className="btn-3d mt-1.5 flex w-fit items-center gap-1 rounded-md bg-[var(--bg)]/80 px-2 py-0.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
                title="Озвучить"
              >
                <SpeakerIcon /> Озвучить
              </button>
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
