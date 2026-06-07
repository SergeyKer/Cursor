'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import LessonChoiceChips from '@/components/LessonChoiceChips'
import VoiceComposerOverlay from '@/components/voice/VoiceComposerOverlay'
import VoiceMicButton, { TextEditIcon } from '@/components/voice/VoiceMicButton'
import {
  choiceCorrectionPlaceholder,
  choiceCorrectionVoiceStatusMessage,
  getChoiceCorrectionInputMode,
  getChoiceCorrectionOverlayLine,
  getInitialPracticeVoiceCapability,
  isChoiceCorrectionTextareaReadOnly,
  isChoiceCorrectionVoiceFrozenDisplay,
  isVoiceCapabilityBlocked,
  mapRecognitionErrorToVoiceCapability,
  shouldShowChoiceCorrectionInviteOverlay,
  shouldShowMicOffInlineButton,
  type PracticeVoiceCapability,
} from '@/lib/practice/choiceCorrectionComposer'
import { ensurePracticeChoiceOptions, isChoiceLikePracticeType } from '@/lib/practice/ensurePracticeChoiceOptions'
import {
  CHAT_COMPOSER_TYPO_CLASS,
  getChatComposerOverlayVerticalClass,
  getChatComposerTextareaVerticalClass,
} from '@/lib/chatComposerMetrics'
import { needsVoiceComposerWebMetrics } from '@/lib/sttClient'
import { useAutoGrowTextarea } from '@/lib/voice/useAutoGrowTextarea'
import { useMicInviteAnimation } from '@/lib/voice/useMicInviteAnimation'
import {
  chooseFinalSpeechText,
  extractSpeechRecognitionTranscript,
  stabilizeInterimAcrossTicks,
  useVoiceComposer,
} from '@/lib/voice/useVoiceComposer'
import type { Audience } from '@/lib/types'
import type { PracticeQuestion } from '@/types/practice'

interface PracticeQuestionRendererProps {
  question: PracticeQuestion
  disabled?: boolean
  choicePanelFrozen?: boolean
  answerPanelLocked?: boolean
  correctionMode?: boolean
  wrongAttemptsOnCurrentQuestion?: number
  audience?: Audience
  onSubmit: (answer: string) => void
}

function inputPlaceholder(
  question: PracticeQuestion,
  correctionMode: boolean,
  audience: Audience,
  choiceTextEditUnlocked?: boolean
): string {
  if (correctionMode && question.type === 'choice') {
    return choiceCorrectionPlaceholder({
      targetAnswer: question.targetAnswer,
      isTextEditUnlocked: Boolean(choiceTextEditUnlocked),
      audience,
    })
  }
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

const PRACTICE_COMPOSER_ENTER_CLASS = 'lesson-enter'
const ANSWER_PANEL_LOCK_CLASS = 'pointer-events-none opacity-60'

function withAnswerPanelLockClass(className: string, answerPanelLocked: boolean): string {
  return answerPanelLocked ? `${className} ${ANSWER_PANEL_LOCK_CLASS}` : className
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

/** Метрики как communication в Chat; при STT — web-metrics через chatComposerMetrics. */
function choiceCorrectionComposerMetricsClass(options: {
  voiceWebMetrics: boolean
  micOffPr12: boolean
}): string {
  const { voiceWebMetrics, micOffPr12 } = options
  const horizontal = micOffPr12 ? 'pr-12 pl-4' : 'px-4'
  return `communication-chat-input-field ${horizontal} ${CHAT_COMPOSER_TYPO_CLASS} ${getChatComposerTextareaVerticalClass(voiceWebMetrics)}`
}

export default function PracticeQuestionRenderer({
  question,
  disabled = false,
  choicePanelFrozen = false,
  answerPanelLocked = false,
  correctionMode = false,
  wrongAttemptsOnCurrentQuestion = 0,
  audience = 'adult',
  onSubmit,
}: PracticeQuestionRendererProps) {
  const [draft, setDraft] = useState('')
  const [voiceTextDraft, setVoiceTextDraft] = useState('')
  const choiceVoice = useVoiceComposer()
  const {
    startRecording: startChoiceVoiceRecording,
    updateTranscript: updateChoiceVoiceTranscript,
    commitVoiceText: commitChoiceVoiceText,
    finishVoiceSession: finishChoiceVoiceSession,
    resetComposer: resetChoiceVoiceComposer,
    isVoiceActive: isChoiceVoiceActive,
    isTextareaReadOnly: isChoiceVoiceTextareaReadOnly,
    displayText: choiceVoiceDisplayText,
    livePreviewText: choiceVoiceLivePreviewText,
    draftBeforeVoiceText: choiceVoiceDraftBefore,
  } = choiceVoice
  const [voiceWebMetricsClient, setVoiceWebMetricsClient] = useState(false)
  const [selectedOption, setSelectedOption] = useState('')
  const [selectedWords, setSelectedWords] = useState<string[]>([])
  const [remainingWords, setRemainingWords] = useState<string[]>(() => wordBank(question))
  const choices = useMemo(() => {
    const raw = question.options ?? []
    if (isChoiceLikePracticeType(question.type)) {
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
  const choiceCorrectionTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [voiceListening, setVoiceListening] = useState(false)
  const choiceVoiceActive = voiceListening || isChoiceVoiceActive
  const choiceComposerText = isChoiceVoiceActive ? choiceVoiceDisplayText : draft
  const showChoiceVoiceOverlay = isChoiceCorrectionComposer && isChoiceVoiceActive && choiceComposerText.length > 0
  const choiceVoiceWebMetricsActive = showChoiceVoiceOverlay && voiceWebMetricsClient
  const [textFallbackUnlocked, setTextFallbackUnlocked] = useState(false)
  const [choiceTapHintVisible, setChoiceTapHintVisible] = useState(false)
  const [fieldTapEngaged, setFieldTapEngaged] = useState(false)
  const [voiceCapability, setVoiceCapability] = useState<PracticeVoiceCapability>(() =>
    getInitialPracticeVoiceCapability()
  )
  const isTextEditUnlocked = textFallbackUnlocked
  const choiceInputMode = getChoiceCorrectionInputMode({
    isTextEditUnlocked,
    voiceListening: choiceVoiceActive,
  })
  const choiceTextareaReadOnly = isChoiceCorrectionTextareaReadOnly(choiceInputMode)
  const choiceVoiceFrozenDisplay = isChoiceCorrectionVoiceFrozenDisplay({
    isTextEditUnlocked,
    inputMode: choiceInputMode,
  })
  const showMicOffInline = shouldShowMicOffInlineButton({
    isChoiceCorrection: isChoiceCorrectionComposer,
    textFallbackUnlocked,
    isTextEditUnlocked,
    fieldTapHintVisible: fieldTapEngaged,
    voiceCapability,
  })
  const showChoiceInviteOverlay =
    isChoiceCorrectionComposer &&
    shouldShowChoiceCorrectionInviteOverlay({
      isFrozenDisplay: choiceVoiceFrozenDisplay,
      showVoiceOverlay: showChoiceVoiceOverlay,
      composerText: choiceComposerText,
      showTapHint: choiceTapHintVisible,
    })
  const choiceInviteOverlayLine = isChoiceCorrectionComposer
    ? getChoiceCorrectionOverlayLine({
        showTapHint: choiceTapHintVisible,
        showTextEditButton: showMicOffInline,
        targetAnswer: question.targetAnswer,
        audience,
      })
    : ''
  const hideChoiceComposerTextForTapHint =
    showChoiceInviteOverlay && choiceTapHintVisible && Boolean(choiceComposerText.trim())
  const { micVisualState, resetMicAnimation } = useMicInviteAnimation({
    inviteKey:
      isChoiceCorrectionComposer && !disabled
        ? `${question.id}-correction-${wrongAttemptsOnCurrentQuestion}`
        : null,
    pauseInvite: choiceVoiceActive,
  })

  useAutoGrowTextarea({
    textareaRef: choiceCorrectionTextareaRef,
    value: choiceComposerText,
    enabled: isChoiceCorrectionComposer,
    maxHeightPx: CHOICE_CORRECTION_INPUT_MAX_HEIGHT_PX,
    minHeightPx: 44,
    isVoiceActive: isChoiceVoiceActive,
    showVoiceOverlay: showChoiceVoiceOverlay,
    voiceWebMetricsActive: choiceVoiceWebMetricsActive,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    setVoiceWebMetricsClient(needsVoiceComposerWebMetrics(window.navigator.userAgent))
  }, [])

  const clearRecognitionSilenceTimeout = useCallback(() => {
    if (recognitionSilenceTimeoutRef.current != null) {
      window.clearTimeout(recognitionSilenceTimeoutRef.current)
      recognitionSilenceTimeoutRef.current = null
    }
  }, [])

  const resetRecognitionDraftBuffers = useCallback(() => {
    latestFinalTextRef.current = ''
    latestInterimTextRef.current = ''
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
    finishChoiceVoiceSession()
  }, [clearRecognitionSilenceTimeout, finishChoiceVoiceSession, resetRecognitionDraftBuffers])

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
    startChoiceVoiceRecording()

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
      updateChoiceVoiceTranscript(finalText, stableInterimText)
      clearRecognitionSilenceTimeout()
      recognitionSilenceTimeoutRef.current = window.setTimeout(() => {
        stopSpeechRecognition()
      }, BROWSER_SILENCE_MS)
    }
    recognition.onerror = (event: Event) => {
      clearRecognitionSilenceTimeout()
      recognitionIsStoppingRef.current = false
      const errorCode = (event as unknown as { error?: string }).error ?? ''
      const mappedCapability = mapRecognitionErrorToVoiceCapability(errorCode)
      if (mappedCapability) {
        setVoiceCapability(mappedCapability)
      }
      const resolvedFinalText = chooseFinalSpeechText(latestFinalTextRef.current, latestInterimTextRef.current)
      if (resolvedFinalText) {
        commitChoiceVoiceText(resolvedFinalText)
        setDraft(resolvedFinalText)
      } else {
        finishChoiceVoiceSession()
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
        commitChoiceVoiceText(resolvedFinalText)
        setDraft(resolvedFinalText)
      } else {
        finishChoiceVoiceSession()
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
    commitChoiceVoiceText,
    finishChoiceVoiceSession,
    hardResetSpeechRecognition,
    resetRecognitionDraftBuffers,
    startChoiceVoiceRecording,
    stopSpeechRecognition,
    updateChoiceVoiceTranscript,
  ])

  useEffect(() => {
    hardResetSpeechRecognition()
    setDraft('')
    setVoiceTextDraft('')
    setSelectedOption('')
    setSelectedWords([])
    setRemainingWords(wordBank(question))
    setTextFallbackUnlocked(false)
    setChoiceTapHintVisible(false)
    setFieldTapEngaged(false)
    setVoiceCapability(getInitialPracticeVoiceCapability())
    resetChoiceVoiceComposer()
    resetMicAnimation()
  }, [hardResetSpeechRecognition, question, resetChoiceVoiceComposer, resetMicAnimation])

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

  useLayoutEffect(() => {
    if (!isChoiceCorrectionComposer) return
    setTextFallbackUnlocked(false)
    setFieldTapEngaged(false)
    setChoiceTapHintVisible(false)
    resetChoiceVoiceComposer()
    hardResetSpeechRecognition()
    resetMicAnimation()
  }, [
    hardResetSpeechRecognition,
    isChoiceCorrectionComposer,
    question.id,
    resetChoiceVoiceComposer,
    resetMicAnimation,
    wrongAttemptsOnCurrentQuestion,
  ])

  const submitText = () => {
    const answer = (isChoiceCorrectionComposer ? choiceComposerText : draft).trim()
    if (!answer || disabled) return
    hardResetSpeechRecognition()
    setDraft('')
    setChoiceTapHintVisible(false)
    setFieldTapEngaged(false)
    resetChoiceVoiceComposer()
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

  const recognitionSupported = !isVoiceCapabilityBlocked(voiceCapability)
  const micButtonDisabled = disabled || !recognitionSupported
  const choiceVoiceStatus = choiceCorrectionVoiceStatusMessage({ voiceListening: choiceVoiceActive })

  useEffect(() => {
    if (isChoiceCorrectionComposer) return
    if (question.type === 'roleplay-mini' || question.type === 'boss-challenge' || question.type === 'free-response') return
    adjustTextareaHeight(defaultAnswerTextareaRef.current, DEFAULT_INPUT_MAX_HEIGHT_PX)
  }, [DEFAULT_INPUT_MAX_HEIGHT_PX, adjustTextareaHeight, draft, isChoiceCorrectionComposer, question.type])

  useEffect(() => {
    adjustTextareaHeight(voiceShadowTextareaRef.current, DEFAULT_INPUT_MAX_HEIGHT_PX)
  }, [DEFAULT_INPUT_MAX_HEIGHT_PX, adjustTextareaHeight, voiceTextDraft])

  const handleChoiceCorrectionMicClick = useCallback(() => {
    resetMicAnimation()
    setChoiceTapHintVisible(false)
    setFieldTapEngaged(false)
    if (voiceListening) {
      stopSpeechRecognition()
      return
    }
    startSpeechRecognition()
  }, [resetMicAnimation, startSpeechRecognition, stopSpeechRecognition, voiceListening])

  const showChoiceCorrectionTapHint = useCallback(() => {
    if (!isChoiceCorrectionComposer || !choiceVoiceFrozenDisplay || isTextEditUnlocked) return
    setFieldTapEngaged(true)
    setChoiceTapHintVisible(true)
  }, [choiceVoiceFrozenDisplay, isChoiceCorrectionComposer, isTextEditUnlocked])

  const unlockChoiceTextEdit = useCallback(() => {
    setTextFallbackUnlocked(true)
    setChoiceTapHintVisible(false)
    setFieldTapEngaged(false)
    hardResetSpeechRecognition()
    finishChoiceVoiceSession()
    requestAnimationFrame(() => {
      choiceCorrectionTextareaRef.current?.focus()
    })
  }, [finishChoiceVoiceSession, hardResetSpeechRecognition])

  if (canUseChoices) {
    return (
      <div className={`${PRACTICE_COMPOSER_ENTER_CLASS} space-y-2 pt-0`}>
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
          frozen={choicePanelFrozen}
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
        className={withAnswerPanelLockClass(
          `${PRACTICE_COMPOSER_ENTER_CLASS} glass-surface flex w-full flex-col gap-2 rounded-[1.1rem] border border-[var(--chat-composer-border)] bg-[var(--chat-composer-bg)] px-3 py-3`,
          answerPanelLocked
        )}
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
        className={withAnswerPanelLockClass(
          `${PRACTICE_COMPOSER_ENTER_CLASS} glass-surface flex w-full flex-col gap-2 rounded-[1.1rem] border border-[var(--chat-composer-border)] bg-[var(--chat-composer-bg)] px-3 py-3`,
          answerPanelLocked
        )}
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
        className={withAnswerPanelLockClass(
          `${PRACTICE_COMPOSER_ENTER_CLASS} glass-surface flex w-full flex-col gap-2 rounded-[1.1rem] border border-[var(--chat-composer-border)] bg-[var(--chat-composer-bg)] px-3 py-3`,
          answerPanelLocked
        )}
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
              className={`chat-input-field lesson-chat-input-field min-w-0 flex-1 resize-none overflow-y-hidden rounded-2xl border border-[var(--chat-input-border)] bg-[var(--chat-input-bg)] px-4 ${CHAT_COMPOSER_TYPO_CLASS} ${getChatComposerTextareaVerticalClass(false)} text-[var(--text)] outline-none disabled:opacity-70`}
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
      className={withAnswerPanelLockClass(
        `${PRACTICE_COMPOSER_ENTER_CLASS} glass-surface flex w-full flex-col gap-2 rounded-[1.1rem] border border-[var(--chat-composer-border)] bg-[var(--chat-composer-bg)] px-2.5 py-2 sm:px-3`,
        answerPanelLocked
      )}
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
          <VoiceMicButton
            listening={choiceVoiceActive}
            disabled={micButtonDisabled}
            micVisualState={micVisualState}
            onClick={handleChoiceCorrectionMicClick}
            title={
              !recognitionSupported
                ? 'Голосовой ввод недоступен'
                : choiceVoiceActive
                  ? 'Остановить'
                  : 'Голосовой ввод'
            }
            ariaLabel={
              !recognitionSupported
                ? 'Голосовой ввод недоступен'
                : choiceVoiceActive
                  ? 'Остановить запись'
                  : 'Голосовой ввод'
            }
          />
        ) : null}
        {question.type === 'roleplay-mini' || question.type === 'boss-challenge' || question.type === 'free-response' ? (
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={disabled}
            rows={question.type === 'boss-challenge' ? 3 : 2}
            className={`chat-input-field lesson-chat-input-field min-w-0 w-full resize-none rounded-2xl border border-[var(--chat-input-border)] bg-[var(--chat-input-bg)] px-4 ${CHAT_COMPOSER_TYPO_CLASS} ${getChatComposerTextareaVerticalClass(false)} text-[var(--text)] outline-none focus:placeholder:text-transparent disabled:cursor-not-allowed disabled:opacity-70`}
            placeholder={inputPlaceholder(question, correctionMode, audience)}
          />
        ) : isChoiceCorrectionComposer ? (
          <div className="relative isolate min-w-0 flex-1">
            {choiceVoiceStatus ? (
              <p className="sr-only" aria-live="polite">
                {choiceVoiceStatus}
              </p>
            ) : null}
            {showChoiceVoiceOverlay ? (
              <VoiceComposerOverlay
                draftBeforeVoiceText={choiceVoiceDraftBefore}
                livePreviewText={choiceVoiceLivePreviewText}
                webTextMetricsFix={voiceWebMetricsClient}
              />
            ) : null}
            {showChoiceInviteOverlay ? (
              <>
                {choiceTapHintVisible ? (
                  <p className="sr-only" role="status" aria-live="polite">
                    {choiceInviteOverlayLine}
                  </p>
                ) : null}
                <div
                  aria-hidden={!choiceTapHintVisible}
                  className={`pointer-events-none absolute inset-0 z-10 overflow-hidden whitespace-nowrap rounded-2xl font-sans text-base text-[var(--text-muted)] ${
                    showMicOffInline ? 'pr-12 pl-4' : 'px-4'
                  } ${
                    choiceVoiceWebMetricsActive
                      ? getChatComposerOverlayVerticalClass(true)
                      : `${getChatComposerOverlayVerticalClass(false)} leading-[1.45rem]`
                  }`}
                >
                  <span className="min-w-0 truncate-x block">{choiceInviteOverlayLine}</span>
                </div>
              </>
            ) : null}
            <textarea
              ref={choiceCorrectionTextareaRef}
              value={choiceComposerText}
              readOnly={choiceTextareaReadOnly || isChoiceVoiceTextareaReadOnly}
              onPointerDown={showChoiceCorrectionTapHint}
              onFocus={showChoiceCorrectionTapHint}
              onBlur={() => setChoiceTapHintVisible(false)}
              onChange={(event) => {
                if (choiceTextareaReadOnly || isChoiceVoiceActive) return
                setDraft(event.target.value)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  submitText()
                }
              }}
              disabled={disabled}
              rows={1}
              className={`chat-input-field min-w-0 w-full resize-none overflow-y-hidden rounded-2xl border border-[var(--chat-input-border)] bg-[var(--chat-input-bg)] outline-none focus:placeholder:text-transparent disabled:cursor-not-allowed disabled:opacity-70 ${choiceCorrectionComposerMetricsClass(
                { voiceWebMetrics: choiceVoiceWebMetricsActive, micOffPr12: showMicOffInline }
              )} ${
                showChoiceVoiceOverlay || hideChoiceComposerTextForTapHint
                  ? 'text-transparent caret-transparent placeholder:text-transparent'
                  : choiceVoiceFrozenDisplay
                    ? 'text-[var(--text-muted)]'
                    : 'text-[var(--text)]'
              } ${choiceTextareaReadOnly ? 'cursor-default' : ''}`}
              placeholder={inputPlaceholder(question, correctionMode, audience, isTextEditUnlocked)}
              autoComplete="off"
              style={{ maxHeight: `${CHOICE_CORRECTION_INPUT_MAX_HEIGHT_PX}px` }}
            />
            {showMicOffInline ? (
              <button
                type="button"
                onPointerDown={(event) => {
                  event.preventDefault()
                  unlockChoiceTextEdit()
                }}
                disabled={disabled}
                className="absolute right-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-muted)] touch-manipulation hover:bg-[var(--chat-control-hover)] hover:text-[var(--text)] disabled:opacity-50"
                aria-label="Ввести ответ текстом"
                title="Ввести ответ текстом"
              >
                <TextEditIcon />
              </button>
            ) : null}
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
            className={`chat-input-field lesson-chat-input-field min-w-0 flex-1 resize-none overflow-y-hidden rounded-2xl border border-[var(--chat-input-border)] bg-[var(--chat-input-bg)] px-4 ${CHAT_COMPOSER_TYPO_CLASS} ${getChatComposerTextareaVerticalClass(false)} text-[var(--text)] outline-none focus:placeholder:text-transparent disabled:cursor-not-allowed disabled:opacity-70`}
            placeholder={inputPlaceholder(question, correctionMode, audience)}
            style={{ maxHeight: `${DEFAULT_INPUT_MAX_HEIGHT_PX}px` }}
          />
        )}
        {isChoiceCorrectionComposer ? (
          <button
            type="submit"
            disabled={disabled || !choiceComposerText.trim()}
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
