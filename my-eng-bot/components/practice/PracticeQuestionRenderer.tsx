'use client'

import { useEffect, useMemo, useState } from 'react'
import LessonChoiceChips from '@/components/LessonChoiceChips'
import type { PracticeQuestion } from '@/types/practice'

interface PracticeQuestionRendererProps {
  question: PracticeQuestion
  disabled?: boolean
  correctionMode?: boolean
  onSubmit: (answer: string) => void
}

function inputPlaceholder(question: PracticeQuestion, correctionMode: boolean): string {
  if (correctionMode) return 'Напиши правильный вариант...'
  if (question.type === 'dictation') return 'Напиши то, что услышал...'
  if (question.type === 'roleplay-mini') return 'Ответь как в мини-диалоге...'
  if (question.type === 'free-response' || question.type === 'boss-challenge') return 'Напиши ответ предложением...'
  return 'Напиши ответ...'
}

function speak(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = 0.9
  window.speechSynthesis.speak(utterance)
}

function wordBank(question: PracticeQuestion): string[] {
  const words =
    question.shuffledWords && question.shuffledWords.length > 0
      ? question.shuffledWords
      : question.targetAnswer
          .replace(/[.!?]$/g, '')
          .split(/\s+/)
          .filter(Boolean)
  return [...words, ...(question.extraWords ?? [])]
}

function helperText(question: PracticeQuestion): string {
  if (question.type === 'dropdown-fill') return 'Выберите вариант и отправьте ответ.'
  if (question.type === 'listening-select') return 'Сначала прослушайте фразу, затем выберите ответ.'
  if (question.type === 'voice-shadow') return 'Прослушайте и повторите вслух. Затем подтвердите повтор.'
  if (question.type === 'word-builder-pro') return 'Нажимайте слова в правильном порядке.'
  if (question.type === 'dictation') return 'Прослушайте фразу и напишите её по памяти.'
  if (question.type === 'roleplay-mini') return 'Ответьте коротко, как в настоящем диалоге.'
  if (question.type === 'boss-challenge') return 'Финальное задание: используйте тему в полном ответе.'
  if (question.type === 'speed-round') return 'Быстрый раунд: выбирайте первый уверенный ответ.'
  if (question.type === 'context-clue') return question.hint ?? 'Используйте контекст из задания.'
  return question.hint ?? ''
}

export default function PracticeQuestionRenderer({
  question,
  disabled = false,
  correctionMode = false,
  onSubmit,
}: PracticeQuestionRendererProps) {
  const [draft, setDraft] = useState('')
  const [selectedOption, setSelectedOption] = useState('')
  const [selectedWords, setSelectedWords] = useState<string[]>([])
  const [remainingWords, setRemainingWords] = useState<string[]>(() => wordBank(question))
  const choices = useMemo(() => question.options ?? [], [question.options])
  const canUseChoices =
    choices.length > 0 &&
    !correctionMode &&
    (question.type === 'choice' ||
      question.type === 'speed-round' ||
      question.type === 'context-clue' ||
      question.type === 'listening-select')
  const canUseDropdown = choices.length > 0 && !correctionMode && question.type === 'dropdown-fill'
  const canUseWordBank =
    !correctionMode && (question.type === 'sentence-surgery' || question.type === 'word-builder-pro')
  const canUseAudio =
    question.type === 'dictation' || question.type === 'listening-select' || question.type === 'voice-shadow'

  useEffect(() => {
    setDraft('')
    setSelectedOption('')
    setSelectedWords([])
    setRemainingWords(wordBank(question))
  }, [question])

  const submitText = () => {
    const answer = draft.trim()
    if (!answer || disabled) return
    setDraft('')
    onSubmit(answer)
  }

  const submitSelectedWords = () => {
    const answer = selectedWords.join(' ').trim()
    if (!answer || disabled) return
    onSubmit(answer)
  }

  if (canUseChoices) {
    return (
      <div className="space-y-2 pt-0">
        {canUseAudio && (
          <AudioPracticeButton text={question.audioText ?? question.targetAnswer} disabled={disabled} />
        )}
        {helperText(question) && (
          <p className="px-1 text-[13px] leading-relaxed text-[var(--text-muted)]">{helperText(question)}</p>
        )}
        <LessonChoiceChips
          key={question.id}
          choices={choices}
          onChoose={onSubmit}
          disabled={disabled}
          resetKey={`${question.id}-${correctionMode ? 'correction' : 'answer'}`}
        />
      </div>
    )
  }

  if (canUseDropdown) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (!selectedOption || disabled) return
          onSubmit(selectedOption)
        }}
        className="glass-surface flex w-full flex-col gap-2 rounded-[1.1rem] border border-[var(--chat-composer-border)] bg-[var(--chat-composer-bg)] px-3 py-3"
        style={{ boxShadow: 'var(--chat-composer-shadow)' }}
      >
        <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">{helperText(question)}</p>
        <div className="flex gap-2">
          <select
            value={selectedOption}
            onChange={(event) => setSelectedOption(event.target.value)}
            disabled={disabled}
            className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-[var(--chat-input-border)] bg-[var(--chat-input-bg)] px-3 py-2 text-base text-[var(--text)] outline-none disabled:opacity-70"
          >
            <option value="">Выберите ответ</option>
            {choices.map((choice) => (
              <option key={choice} value={choice}>
                {choice}
              </option>
            ))}
          </select>
          <SubmitRoundButton disabled={disabled || !selectedOption} />
        </div>
      </form>
    )
  }

  if (canUseWordBank) {
    return (
      <div
        className="glass-surface flex w-full flex-col gap-2 rounded-[1.1rem] border border-[var(--chat-composer-border)] bg-[var(--chat-composer-bg)] px-3 py-3"
        style={{ boxShadow: 'var(--chat-composer-shadow)' }}
      >
        <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">{helperText(question)}</p>
        <div className="min-h-[44px] rounded-xl border border-[var(--chat-input-border)] bg-[var(--chat-input-bg)] px-3 py-2 text-[15px] text-[var(--text)]">
          {selectedWords.length > 0 ? selectedWords.join(' ') : 'Соберите ответ из слов ниже'}
        </div>
        <div className="flex flex-wrap gap-2">
          {remainingWords.map((word, index) => (
            <button
              key={`${word}-${index}`}
              type="button"
              disabled={disabled}
              onClick={() => {
                setSelectedWords((current) => [...current, word])
                setRemainingWords((current) => current.filter((_, itemIndex) => itemIndex !== index))
              }}
              className="rounded-full border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-[var(--text)] disabled:opacity-60"
            >
              {word}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedWords([])
              setRemainingWords(wordBank(question))
            }}
            disabled={disabled || selectedWords.length === 0}
            className="min-h-[44px] flex-1 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text)] disabled:opacity-50"
          >
            Сбросить
          </button>
          <button
            type="button"
            onClick={submitSelectedWords}
            disabled={disabled || selectedWords.length === 0}
            className="min-h-[44px] flex-1 rounded-xl bg-[var(--chat-send-bg)] px-3 py-2 text-sm font-semibold text-[var(--chat-send-text)] disabled:opacity-50"
          >
            Проверить
          </button>
        </div>
      </div>
    )
  }

  if (!correctionMode && question.type === 'voice-shadow') {
    return (
      <div
        className="glass-surface flex w-full flex-col gap-2 rounded-[1.1rem] border border-[var(--chat-composer-border)] bg-[var(--chat-composer-bg)] px-3 py-3"
        style={{ boxShadow: 'var(--chat-composer-shadow)' }}
      >
        <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">{helperText(question)}</p>
        <AudioPracticeButton text={question.audioText ?? question.targetAnswer} disabled={disabled} />
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSubmit(question.targetAnswer)}
          className="min-h-[44px] rounded-xl bg-[var(--chat-send-bg)] px-4 py-2 text-sm font-semibold text-[var(--chat-send-text)] disabled:opacity-50"
        >
          Я повторил вслух
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submitText()
      }}
      className="glass-surface flex w-full flex-col gap-2 rounded-[1.1rem] border border-[var(--chat-composer-border)] bg-[var(--chat-composer-bg)] px-2.5 py-2 sm:px-3"
      style={{ boxShadow: 'var(--chat-composer-shadow)' }}
    >
      {(helperText(question) || question.keywords?.length || canUseAudio) && !correctionMode && (
        <div className="space-y-1 px-1">
          {canUseAudio && <AudioPracticeButton text={question.audioText ?? question.targetAnswer} disabled={disabled} />}
          {helperText(question) && (
            <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">{helperText(question)}</p>
          )}
          {question.keywords?.length ? (
            <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">Ключевые слова: {question.keywords.join(', ')}</p>
          ) : null}
        </div>
      )}
      <div className="flex items-end gap-2">
        {question.type === 'roleplay-mini' || question.type === 'boss-challenge' || question.type === 'free-response' ? (
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={disabled}
            rows={question.type === 'boss-challenge' ? 3 : 2}
            className="chat-input-field lesson-chat-input-field min-w-0 w-full resize-none rounded-2xl border border-[var(--chat-input-border)] bg-[var(--chat-input-bg)] px-4 py-2 min-h-[44px] text-base leading-[1.45rem] text-[var(--text)] outline-none focus:placeholder:text-transparent disabled:cursor-not-allowed disabled:opacity-70"
            placeholder={inputPlaceholder(question, correctionMode)}
          />
        ) : (
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={disabled}
            className="chat-input-field lesson-chat-input-field min-w-0 w-full rounded-2xl border border-[var(--chat-input-border)] bg-[var(--chat-input-bg)] px-4 py-2 min-h-[44px] text-base leading-[1.45rem] text-[var(--text)] outline-none focus:placeholder:text-transparent disabled:cursor-not-allowed disabled:opacity-70"
            placeholder={inputPlaceholder(question, correctionMode)}
          />
        )}
        <SubmitRoundButton disabled={disabled || !draft.trim()} />
      </div>
    </form>
  )
}

function AudioPracticeButton({ text, disabled }: { text: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => speak(text)}
      disabled={disabled || !text.trim()}
      className="min-h-[44px] rounded-xl border border-[var(--status-info-border)] bg-[var(--status-info-bg)] px-3 py-2 text-sm font-semibold text-[var(--status-info-text)] disabled:opacity-50"
    >
      Прослушать
    </button>
  )
}

function SubmitRoundButton({ disabled }: { disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="chat-send-button flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full bg-[var(--chat-send-bg)] text-[var(--chat-send-text)] disabled:cursor-not-allowed disabled:opacity-50"
      aria-label="Отправить ответ"
      title="Отправить"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    </button>
  )
}
