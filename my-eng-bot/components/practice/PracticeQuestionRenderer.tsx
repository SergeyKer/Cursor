'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import LessonChoiceChips from '@/components/LessonChoiceChips'
import VoiceComposerOverlay from '@/components/voice/VoiceComposerOverlay'
import { ensurePracticeChoiceOptions, isChoiceLikePracticeType } from '@/lib/practice/ensurePracticeChoiceOptions'
import {
  chooseFinalSpeechText,
  extractSpeechRecognitionTranscript,
  mergeSpeechDisplayText,
  stabilizeInterimAcrossTicks,
} from '@/lib/voice/useVoiceComposer'
import type { PracticeQuestion } from '@/types/practice'

interface PracticeQuestionRendererProps {
  question: PracticeQuestion
  disabled?: boolean
  correctionMode?: boolean
  onSubmit: (answer: string) => void
}

function inputPlaceholder(question: PracticeQuestion, correctionMode: boolean): string {
  if (correctionMode && question.type === 'choice') return 'Правильный вариант...'
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
  if (question.type === 'voice-shadow')
    return 'Прослушайте и повторите вслух или введите ту же фразу текстом ниже.'
  if (question.type === 'word-builder-pro') return 'Нажимайте слова в правильном порядке.'
  if (question.type === 'dictation') return 'Прослушайте фразу и напишите её по памяти.'
  return ''
}

export default function PracticeQuestionRenderer({
  question,
  disabled = false,
  correctionMode = false,
  onSubmit,
}: PracticeQuestionRendererProps) {
  const [draft, setDraft] = useState('')
  const [voiceTextDraft, setVoiceTextDraft] = useState('')
  const [voiceFinalText, setVoiceFinalText] = useState('')
  const [voiceInterimText, setVoiceInterimText] = useState('')
  const [selectedOption, setSelectedOption] = useState('')
  const [selectedWords, setSelectedWords] = useState<string[]>([])
  const [remainingWords, setRemainingWords] = useState<string[]>(() => wordBank(question))
  const choices = useMemo(() => {
    const raw = question.options ?? []
    if (isChoiceLikePracticeType(question.type) && raw.length < 2) {
      return ensurePracticeChoiceOptions(raw, question.targetAnswer)
    }
    return raw
  }, [question.options, question.targetAnswer, question.type])
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
  const isChoiceCorrectionComposer = correctionMode && question.type === 'choice'
  const BROWSER_SILENCE_MS = 1200
  const CHOICE_CORRECTION_INPUT_MAX_HEIGHT_PX = 132
  const DEFAULT_INPUT_MAX_HEIGHT_PX = 132
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const recognitionSilenceTimeoutRef = useRef<number | null>(null)
  const recognitionIsStoppingRef = useRef(false)
  const latestFinalTextRef = useRef('')
  const latestInterimTextRef = useRef('')
  const defaultAnswerTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const voiceShadowTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [voiceListening, setVoiceListening] = useState(false)

  const clearRecognitionSilenceTimeout = useCallback(() => {
    if (recognitionSilenceTimeoutRef.current != null) {
      window.clearTimeout(recognitionSilenceTimeoutRef.current)
      recognitionSilenceTimeoutRef.current = null
    }
  }, [])

  const resetRecognitionDraftBuffers = useCallback(() => {
    latestFinalTextRef.current = ''
    latestInterimTextRef.current = ''
    setVoiceFinalText('')
    setVoiceInterimText('')
  }, [])

  const hardResetSpeechRecognition = useCallback(() => {
    clearRecognitionSilenceTimeout()
    recognitionIsStoppingRef.current = false
    resetRecognitionDraftBuffers()
    const recognition = recognitionRef.current
    recognitionRef.current = null
    if (!recognition) {
      setVoiceListening(false)
      return
    }
    recognition.onstart = null
    recognition.onresult = null
    recognition.onend = null
    recognition.onerror = null
    try {
      recognition.abort()
    } catch {
      // ignore
    }
    setVoiceListening(false)
  }, [clearRecognitionSilenceTimeout, resetRecognitionDraftBuffers])

  const stopSpeechRecognition = useCallback(() => {
    clearRecognitionSilenceTimeout()
    const recognition = recognitionRef.current
    if (!recognition || recognitionIsStoppingRef.current) return
    recognitionIsStoppingRef.current = true
    try {
      recognition.stop()
    } catch {
      recognitionIsStoppingRef.current = false
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null
      }
      setVoiceListening(false)
    }
  }, [clearRecognitionSilenceTimeout])

  const startSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined' || disabled) return
    const SpeechRecognitionAPI =
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition
    if (!SpeechRecognitionAPI) return

    hardResetSpeechRecognition()
    recognitionIsStoppingRef.current = false
    resetRecognitionDraftBuffers()

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = 'en-US'
    recognition.continuous = true
    recognition.interimResults = true
    ;(recognition as SpeechRecognition & { maxAlternatives?: number }).maxAlternatives = 1
    recognition.onstart = () => {
      setVoiceListening(true)
    }
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const { finalText, interimText } = extractSpeechRecognitionTranscript(event)
      const interimBase = finalText === latestFinalTextRef.current ? latestInterimTextRef.current : ''
      const stableInterimText = stabilizeInterimAcrossTicks(interimBase, interimText)
      latestFinalTextRef.current = finalText
      latestInterimTextRef.current = stableInterimText
      setVoiceFinalText(finalText)
      setVoiceInterimText(stableInterimText)
      const transcript = mergeSpeechDisplayText(finalText, stableInterimText)
      if (!transcript) return
      setDraft(transcript)
      clearRecognitionSilenceTimeout()
      recognitionSilenceTimeoutRef.current = window.setTimeout(() => {
        stopSpeechRecognition()
      }, BROWSER_SILENCE_MS)
    }
    recognition.onerror = () => {
      clearRecognitionSilenceTimeout()
      recognitionIsStoppingRef.current = false
      const resolvedFinalText = chooseFinalSpeechText(latestFinalTextRef.current, latestInterimTextRef.current)
      if (resolvedFinalText) {
        setDraft(resolvedFinalText)
      }
      resetRecognitionDraftBuffers()
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null
      }
      setVoiceListening(false)
    }
    recognition.onend = () => {
      clearRecognitionSilenceTimeout()
      recognitionIsStoppingRef.current = false
      const resolvedFinalText = chooseFinalSpeechText(latestFinalTextRef.current, latestInterimTextRef.current)
      if (resolvedFinalText) {
        setDraft(resolvedFinalText)
      }
      resetRecognitionDraftBuffers()
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null
      }
      setVoiceListening(false)
    }
    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null
      }
      resetRecognitionDraftBuffers()
      setVoiceListening(false)
    }
  }, [
    BROWSER_SILENCE_MS,
    clearRecognitionSilenceTimeout,
    disabled,
    hardResetSpeechRecognition,
    resetRecognitionDraftBuffers,
    stopSpeechRecognition,
  ])

  useEffect(() => {
    hardResetSpeechRecognition()
    setDraft('')
    setVoiceTextDraft('')
    setSelectedOption('')
    setSelectedWords([])
    setRemainingWords(wordBank(question))
  }, [hardResetSpeechRecognition, question])

  useEffect(
    () => () => {
      hardResetSpeechRecognition()
    },
    [hardResetSpeechRecognition]
  )

  useEffect(() => {
    if (isChoiceCorrectionComposer && !disabled) return
    hardResetSpeechRecognition()
  }, [disabled, hardResetSpeechRecognition, isChoiceCorrectionComposer])

  const submitText = () => {
    const answer = draft.trim()
    if (!answer || disabled) return
    hardResetSpeechRecognition()
    setDraft('')
    onSubmit(answer)
  }

  const submitSelectedWords = () => {
    const answer = selectedWords.join(' ').trim()
    if (!answer || disabled) return
    onSubmit(answer)
  }

  const adjustTextareaHeight = useCallback((textarea: HTMLTextAreaElement | null, maxHeightPx: number) => {
    if (!textarea) return
    // Пустое поле: не трогаем scrollHeight — в ряде браузеров он учитывает перенос placeholder,
    // из‑за чего строка визуально «раздвигается» в режиме ожидания (например, коррекция choice).
    if (!textarea.value.trim()) {
      textarea.style.height = ''
      textarea.style.overflowY = 'hidden'
      return
    }
    textarea.style.height = '0px'
    const nextHeight = Math.min(textarea.scrollHeight, maxHeightPx)
    textarea.style.height = `${nextHeight}px`
    textarea.style.overflowY = textarea.scrollHeight > maxHeightPx ? 'auto' : 'hidden'
  }, [])

  const recognitionSupported =
    typeof window !== 'undefined' &&
    Boolean(
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition
    )
  const micButtonDisabled = disabled || !recognitionSupported
  const showVoiceInterimOverlay = isChoiceCorrectionComposer && voiceListening && Boolean(voiceInterimText.trim())

  useEffect(() => {
    if (isChoiceCorrectionComposer) return
    if (question.type === 'roleplay-mini' || question.type === 'boss-challenge' || question.type === 'free-response') return
    adjustTextareaHeight(defaultAnswerTextareaRef.current, DEFAULT_INPUT_MAX_HEIGHT_PX)
  }, [DEFAULT_INPUT_MAX_HEIGHT_PX, adjustTextareaHeight, draft, isChoiceCorrectionComposer, question.type])

  useEffect(() => {
    adjustTextareaHeight(voiceShadowTextareaRef.current, DEFAULT_INPUT_MAX_HEIGHT_PX)
  }, [DEFAULT_INPUT_MAX_HEIGHT_PX, adjustTextareaHeight, voiceTextDraft])

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
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const text = voiceTextDraft.trim()
            if (!text || disabled) return
            setVoiceTextDraft('')
            onSubmit(text)
          }}
          className="flex flex-col gap-2 border-t border-[var(--chat-shell-border)] pt-2"
        >
          <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">Или введите ту же фразу текстом:</p>
          <div className="flex items-end gap-2">
            <textarea
              ref={voiceShadowTextareaRef}
              value={voiceTextDraft}
              onChange={(event) => {
                setVoiceTextDraft(event.target.value)
                adjustTextareaHeight(voiceShadowTextareaRef.current, DEFAULT_INPUT_MAX_HEIGHT_PX)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  const text = voiceTextDraft.trim()
                  if (!text || disabled) return
                  setVoiceTextDraft('')
                  onSubmit(text)
                }
              }}
              disabled={disabled}
              rows={1}
              className="chat-input-field lesson-chat-input-field min-w-0 flex-1 resize-none overflow-y-hidden rounded-2xl border border-[var(--chat-input-border)] bg-[var(--chat-input-bg)] px-4 py-2 min-h-[44px] text-base leading-[1.45rem] text-[var(--text)] outline-none disabled:opacity-70"
              placeholder="Напечатайте фразу на английском..."
              autoComplete="off"
              style={{ maxHeight: `${DEFAULT_INPUT_MAX_HEIGHT_PX}px` }}
            />
            <SubmitRoundButton disabled={disabled || !voiceTextDraft.trim()} />
          </div>
        </form>
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
      <div className={`flex gap-2 ${isChoiceCorrectionComposer ? 'items-center' : 'items-end'}`}>
        {isChoiceCorrectionComposer ? (
          <button
            type="button"
            disabled={micButtonDisabled}
            onClick={() => {
              if (voiceListening) {
                stopSpeechRecognition()
                return
              }
              startSpeechRecognition()
            }}
            aria-label={
              !recognitionSupported
                ? 'Голосовой ввод недоступен'
                : voiceListening
                  ? 'Остановить запись'
                  : 'Голосовой ввод'
            }
            title={
              !recognitionSupported
                ? 'Голосовой ввод недоступен в этом браузере'
                : voiceListening
                  ? 'Остановить'
                  : 'Голосовой ввод'
            }
            className={`chat-action-button chat-control-surface relative isolate hidden h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center overflow-hidden rounded-full p-2.5 touch-manipulation sm:flex ${
              voiceListening ? 'text-[var(--chat-control-active-text)]' : 'text-[var(--chat-control-text)]'
            }`}
            style={{
              background: voiceListening ? 'var(--chat-control-active-bg)' : 'var(--chat-control-bg)',
              boxShadow: voiceListening ? 'var(--chat-control-shadow)' : undefined,
            }}
            onMouseEnter={(event) => {
              if (!voiceListening) {
                event.currentTarget.style.background = 'var(--chat-control-hover)'
              }
            }}
            onMouseLeave={(event) => {
              if (!voiceListening) {
                event.currentTarget.style.background = 'var(--chat-control-bg)'
              }
            }}
          >
            {voiceListening ? (
              <span className="relative z-10 h-5 w-5 rounded-full bg-[var(--chat-control-dot)]" />
            ) : (
              <span className="relative z-10">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Z" />
                  <path d="M19 11a7 7 0 0 1-14 0" />
                  <path d="M12 18v3" />
                  <path d="M8 21h8" />
                </svg>
              </span>
            )}
          </button>
        ) : null}
        {question.type === 'roleplay-mini' || question.type === 'boss-challenge' || question.type === 'free-response' ? (
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={disabled}
            rows={question.type === 'boss-challenge' ? 3 : 2}
            className="chat-input-field lesson-chat-input-field min-w-0 w-full resize-none rounded-2xl border border-[var(--chat-input-border)] bg-[var(--chat-input-bg)] px-4 py-2 min-h-[44px] text-base leading-[1.45rem] text-[var(--text)] outline-none focus:placeholder:text-transparent disabled:cursor-not-allowed disabled:opacity-70"
            placeholder={inputPlaceholder(question, correctionMode)}
          />
        ) : isChoiceCorrectionComposer ? (
          <div className="relative isolate min-w-0 flex-1">
            {showVoiceInterimOverlay ? (
              <VoiceComposerOverlay
                draftBeforeVoiceText={voiceFinalText}
                livePreviewText={voiceInterimText}
                webTextMetricsFix
              />
            ) : null}
            <textarea
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value)
                setVoiceFinalText('')
                setVoiceInterimText('')
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  submitText()
                }
              }}
              disabled={disabled}
              rows={1}
              className={`chat-input-field lesson-chat-input-field min-w-0 w-full resize-none overflow-y-hidden rounded-2xl border border-[var(--chat-input-border)] bg-[var(--chat-input-bg)] px-4 py-2 min-h-[44px] text-base leading-[1.45rem] outline-none focus:placeholder:text-transparent disabled:cursor-not-allowed disabled:opacity-70 ${
                showVoiceInterimOverlay
                  ? 'chat-input-voice-web-metrics text-transparent caret-transparent placeholder:text-transparent'
                  : 'text-[var(--text)]'
              }`}
              placeholder={inputPlaceholder(question, correctionMode)}
              style={{ height: '44px' }}
            />
          </div>
        ) : (
          <textarea
            ref={defaultAnswerTextareaRef}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
              adjustTextareaHeight(defaultAnswerTextareaRef.current, DEFAULT_INPUT_MAX_HEIGHT_PX)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                submitText()
              }
            }}
            disabled={disabled}
            rows={1}
            className="chat-input-field lesson-chat-input-field min-w-0 flex-1 resize-none overflow-y-hidden rounded-2xl border border-[var(--chat-input-border)] bg-[var(--chat-input-bg)] px-4 py-2 min-h-[44px] text-base leading-[1.45rem] text-[var(--text)] outline-none focus:placeholder:text-transparent disabled:cursor-not-allowed disabled:opacity-70"
            placeholder={inputPlaceholder(question, correctionMode)}
            style={{ maxHeight: `${DEFAULT_INPUT_MAX_HEIGHT_PX}px` }}
          />
        )}
        {isChoiceCorrectionComposer ? (
          <button
            type="submit"
            disabled={disabled || !draft.trim()}
            aria-label="Отправить ответ"
            title="Отправить"
            className="chat-action-button chat-send-surface inline-flex h-11 w-11 min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-full p-0 font-semibold text-[var(--accent-text)]"
            style={{ background: 'var(--chat-send-bg)' }}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" fill="none">
              <path
                d="M21.4 11.6C21.7 11.8 21.7 12.2 21.4 12.4L5.9 19.4C5.2 19.7 4.4 19.2 4.5 18.4L5.3 14.2C5.4 13.9 5.6 13.6 5.9 13.5L12.8 12L5.9 10.5C5.6 10.4 5.4 10.1 5.3 9.8L4.5 5.6C4.4 4.8 5.2 4.3 5.9 4.6L21.4 11.6Z"
                stroke="#FFFFFF"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : (
          <SubmitRoundButton disabled={disabled || !draft.trim()} />
        )}
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
