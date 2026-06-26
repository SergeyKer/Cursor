'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import LessonChoiceChips from '@/components/LessonChoiceChips'
import { APP_BTN_SECONDARY_SUBMIT } from '@/lib/homeCtaStyles'
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
  CHAT_COMPOSER_COLUMN_SHELL_CLASS,
  CHAT_COMPOSER_FORM_CLASS,
  CHAT_COMPOSER_INPUT_ROW_CLASS,
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
import {
  showVoiceCorrectionComposer,
  type PracticeChoiceCorrectionPhase,
} from '@/lib/practice/practiceChoiceCorrectionPhase'
import type { PracticeQuestion } from '@/types/practice'

interface PracticeQuestionRendererProps {
  question: PracticeQuestion
  disabled?: boolean
  choicePanelFrozen?: boolean
  answerPanelLocked?: boolean
  correctionMode?: boolean
  choiceCorrectionPhase?: PracticeChoiceCorrectionPhase
  wrongAttemptsOnCurrentQuestion?: number
  audience?: Audience
  onSubmit: (answer: string) => void
  suppressChoiceChipEnterAnimation?: boolean
  choiceChipsVisible?: boolean
  wrongChoiceText?: string | null
  clearSelectionSignal?: number
  prefersReducedMotion?: boolean
}

function inputPlaceholder(
  question: PracticeQuestion,
  options: {
    isChoiceCorrection: boolean
    isVoiceFirstComposer: boolean
    isTextEditUnlocked: boolean
    correctionMode: boolean
    audience: Audience
  }
): string {
  if (options.isChoiceCorrection && question.type === 'choice') {
    return choiceCorrectionPlaceholder({
      targetAnswer: question.targetAnswer,
      isTextEditUnlocked: options.isTextEditUnlocked,
      audience: options.audience,
    })
  }
  if (options.isVoiceFirstComposer && question.type === 'voice-shadow' && options.isTextEditUnlocked) {
    return options.audience === 'child' ? 'Поправь и отправь' : 'Поправьте и отправьте'
  }
  if (options.isVoiceFirstComposer && question.type === 'voice-shadow') return ''
  if (options.correctionMode) return 'Напиши правильный вариант...'
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

const ANSWER_PANEL_LOCK_CLASS = 'pointer-events-none opacity-60'

/** Voice correction choice: soft fade (в такт с «Скажите»); text correction: practice-section-appear. */
function getPracticeComposerEnterClass(options: {
  isChoiceVoiceCorrection: boolean
  isVoiceShadowCorrection: boolean
  correctionMode: boolean
  prefersReducedMotion: boolean
}): string {
  if (options.prefersReducedMotion) return ''
  if (options.isChoiceVoiceCorrection || options.isVoiceShadowCorrection) return 'lesson-text-soft-enter'
  return options.correctionMode ? 'practice-section-appear' : 'lesson-enter'
}
const PRACTICE_MULTI_ROW_INPUT_ROW_CLASS = 'flex w-full items-stretch gap-2'

function withAnswerPanelLockClass(className: string, answerPanelLocked: boolean): string {
  return answerPanelLocked ? `${className} ${ANSWER_PANEL_LOCK_CLASS}` : className
}

function helperText(question: PracticeQuestion): string {
  if (question.type === 'dropdown-fill') return 'Выберите вариант и отправьте ответ.'
  if (question.type === 'listening-select') return 'Сначала прослушайте фразу, затем выберите ответ.'
  if (question.type === 'word-builder-pro') return 'Нажимайте слова в правильном порядке.'
  if (question.type === 'dictation') return 'Прослушайте фразу и напишите её по памяти.'
  return ''
}

/** Метрики как communication в Chat; при STT - web-metrics через chatComposerMetrics. */
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
  choiceCorrectionPhase = 'idle',
  wrongAttemptsOnCurrentQuestion = 0,
  audience = 'adult',
  onSubmit,
  suppressChoiceChipEnterAnimation = false,
  choiceChipsVisible = true,
  wrongChoiceText = null,
  clearSelectionSignal = 0,
  prefersReducedMotion = false,
}: PracticeQuestionRendererProps) {
  const [draft, setDraft] = useState('')
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
  const isVoiceShadowPrimaryRef = useRef(false)
  const isChoiceVoiceCorrectionComposer = showVoiceCorrectionComposer(
    choiceCorrectionPhase,
    question.type
  )
  const isVoiceShadowCorrection =
    question.type === 'voice-shadow' && isChoiceVoiceCorrectionComposer
  const isVoiceShadowInCorrectionPause =
    question.type === 'voice-shadow' &&
    wrongAttemptsOnCurrentQuestion >= 1 &&
    choiceCorrectionPhase !== 'voiceReady'
  const isVoiceShadowPrimary =
    question.type === 'voice-shadow' &&
    wrongAttemptsOnCurrentQuestion === 0 &&
    !isVoiceShadowCorrection
  const isVoiceFirstComposer =
    isChoiceVoiceCorrectionComposer ||
    isVoiceShadowPrimary ||
    isVoiceShadowCorrection ||
    isVoiceShadowInCorrectionPause
  isVoiceShadowPrimaryRef.current = isVoiceShadowPrimary
  const composerEnterClass = getPracticeComposerEnterClass({
    isChoiceVoiceCorrection: isChoiceVoiceCorrectionComposer && question.type === 'choice',
    isVoiceShadowCorrection: isVoiceShadowCorrection || isVoiceShadowInCorrectionPause,
    correctionMode,
    prefersReducedMotion,
  })
  const canUseChoices =
    choices.length > 0 &&
    !correctionMode &&
    (question.type === 'choice' ||
      question.type === 'speed-round' ||
      question.type === 'context-clue' ||
      question.type === 'listening-select') &&
    (choiceCorrectionPhase === 'idle' || choiceCorrectionPhase === 'chips')
  const canUseDropdown = choices.length > 0 && !correctionMode && question.type === 'dropdown-fill'
  const canUseWordBank =
    !correctionMode && (question.type === 'sentence-surgery' || question.type === 'word-builder-pro')
  const canUseAudio =
    question.type === 'dictation' || question.type === 'listening-select' || question.type === 'voice-shadow'
  const isChoiceCorrectionComposer = isChoiceVoiceCorrectionComposer
  const isDictationLikeComposer = !correctionMode && question.type === 'dictation'
  const isMultiRowTextComposer =
    question.type === 'roleplay-mini' ||
    question.type === 'boss-challenge' ||
    question.type === 'free-response'
  const BROWSER_SILENCE_MS = 1200
  const CHOICE_CORRECTION_INPUT_MAX_HEIGHT_PX = 132
  const DEFAULT_INPUT_MAX_HEIGHT_PX = 132
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const recognitionSilenceTimeoutRef = useRef<number | null>(null)
  const recognitionIsStoppingRef = useRef(false)
  const latestFinalTextRef = useRef('')
  const latestInterimTextRef = useRef('')
  const defaultAnswerTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const choiceCorrectionTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [voiceListening, setVoiceListening] = useState(false)
  const choiceVoiceActive = voiceListening || isChoiceVoiceActive
  const choiceComposerText = isChoiceVoiceActive ? choiceVoiceDisplayText : draft
  const showChoiceVoiceOverlay =
    isVoiceFirstComposer && isChoiceVoiceActive && choiceComposerText.length > 0
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
  const isComposerFrozen = answerPanelLocked
  const choiceTextareaReadOnly =
    isComposerFrozen || isChoiceCorrectionTextareaReadOnly(choiceInputMode)
  const choiceVoiceFrozenDisplay =
    isComposerFrozen ||
    isChoiceCorrectionVoiceFrozenDisplay({
      isTextEditUnlocked,
      inputMode: choiceInputMode,
    })
  const showMicOffInline = shouldShowMicOffInlineButton({
    isChoiceCorrection: isVoiceFirstComposer,
    textFallbackUnlocked,
    isTextEditUnlocked,
    fieldTapHintVisible: fieldTapEngaged,
    voiceCapability,
  })
  const showChoiceInviteOverlay =
    isVoiceFirstComposer &&
    shouldShowChoiceCorrectionInviteOverlay({
      isFrozenDisplay: choiceVoiceFrozenDisplay,
      showVoiceOverlay: showChoiceVoiceOverlay,
      composerText: choiceComposerText,
      showTapHint: choiceTapHintVisible,
    })
  const choiceInviteOverlayLine = isVoiceFirstComposer
    ? getChoiceCorrectionOverlayLine({
        showTapHint: choiceTapHintVisible,
        showTextEditButton: showMicOffInline,
        audience,
      })
    : ''
  const hideChoiceComposerTextForTapHint =
    showChoiceInviteOverlay && choiceTapHintVisible && Boolean(choiceComposerText.trim())
  const micInviteAllowed =
    isVoiceShadowPrimary ||
    (choiceCorrectionPhase === 'voiceReady' &&
      (isChoiceVoiceCorrectionComposer || isVoiceShadowCorrection))
  const resolvedPlaceholder = inputPlaceholder(question, {
    isChoiceCorrection: isChoiceCorrectionComposer,
    isVoiceFirstComposer,
    isTextEditUnlocked,
    correctionMode,
    audience,
  })
  const { micVisualState, resetMicAnimation } = useMicInviteAnimation({
    inviteKey:
      isVoiceFirstComposer && micInviteAllowed && !disabled
        ? `${question.id}-${isVoiceShadowPrimary ? 'primary' : 'correction'}-${wrongAttemptsOnCurrentQuestion}`
        : null,
    pauseInvite: isVoiceShadowPrimary
      ? choiceVoiceActive
      : choiceCorrectionPhase !== 'voiceReady' || choiceVoiceActive,
  })

  useAutoGrowTextarea({
    textareaRef: choiceCorrectionTextareaRef,
    value: choiceComposerText,
    enabled: isVoiceFirstComposer,
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
        if (isVoiceShadowPrimaryRef.current) setTextFallbackUnlocked(true)
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
        if (isVoiceShadowPrimaryRef.current) setTextFallbackUnlocked(true)
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
    if (isVoiceFirstComposer && !disabled) return
    hardResetSpeechRecognition()
  }, [disabled, hardResetSpeechRecognition, isVoiceFirstComposer])

  useLayoutEffect(() => {
    if (!isChoiceVoiceCorrectionComposer && !isVoiceShadowCorrection) return
    setTextFallbackUnlocked(false)
    setFieldTapEngaged(false)
    setChoiceTapHintVisible(false)
    resetChoiceVoiceComposer()
    hardResetSpeechRecognition()
    resetMicAnimation()
  }, [
    hardResetSpeechRecognition,
    isChoiceVoiceCorrectionComposer,
    isVoiceShadowCorrection,
    question.id,
    resetChoiceVoiceComposer,
    resetMicAnimation,
    wrongAttemptsOnCurrentQuestion,
  ])

  const submitText = () => {
    const answer = (isVoiceFirstComposer ? choiceComposerText : draft).trim()
    if (!answer || disabled) return
    hardResetSpeechRecognition()
    setChoiceTapHintVisible(false)
    setFieldTapEngaged(false)
    if (!correctionMode) {
      setDraft('')
      resetChoiceVoiceComposer()
    }
    onSubmit(answer)
  }

  const submitSelectedWords = () => {
    const answer = selectedWords.join(' ').trim()
    if (!answer || disabled) return
    onSubmit(answer)
  }

  const adjustTextareaHeight = useCallback((textarea: HTMLTextAreaElement | null, maxHeightPx: number) => {
    if (!textarea) return
    // Пустое поле: не трогаем scrollHeight - в ряде браузеров он учитывает перенос placeholder,
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
    if (isVoiceFirstComposer) return
    if (question.type === 'roleplay-mini' || question.type === 'boss-challenge' || question.type === 'free-response') return
    adjustTextareaHeight(defaultAnswerTextareaRef.current, DEFAULT_INPUT_MAX_HEIGHT_PX)
  }, [DEFAULT_INPUT_MAX_HEIGHT_PX, adjustTextareaHeight, draft, isVoiceFirstComposer, question.type])

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
    if (!isVoiceFirstComposer || !choiceVoiceFrozenDisplay || isTextEditUnlocked) return
    setFieldTapEngaged(true)
    setChoiceTapHintVisible(true)
  }, [choiceVoiceFrozenDisplay, isVoiceFirstComposer, isTextEditUnlocked])

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
    const chips = (
      <LessonChoiceChips
        key={question.id}
        choices={choices}
        onChoose={onSubmit}
        disabled={disabled || !choiceChipsVisible}
        frozen={choicePanelFrozen}
        wrongChoiceText={wrongChoiceText}
        clearSelectionSignal={clearSelectionSignal}
        resetKey={`${question.id}-${choiceCorrectionPhase !== 'idle' ? 'correction' : 'answer'}`}
        suppressEnterAnimation={suppressChoiceChipEnterAnimation}
      />
    )

    if (canUseAudio) {
      return (
        <div className={`${composerEnterClass} space-y-1`}>
          <AudioPracticeButton text={question.audioText ?? question.targetAnswer} disabled={disabled} />
          <div
            className={!choiceChipsVisible ? 'pointer-events-none invisible' : undefined}
            aria-hidden={!choiceChipsVisible}
          >
            {chips}
          </div>
        </div>
      )
    }

    return (
      <div
        className={!choiceChipsVisible ? 'pointer-events-none invisible' : undefined}
        aria-hidden={!choiceChipsVisible}
      >
        {chips}
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
          `${composerEnterClass} ${CHAT_COMPOSER_COLUMN_SHELL_CLASS}`,
          answerPanelLocked
        )}
        style={{ boxShadow: 'var(--chat-composer-shadow)' }}
      >
        <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">{helperText(question)}</p>
        <div className={CHAT_COMPOSER_INPUT_ROW_CLASS}>
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
          <ComposerSendButton disabled={disabled || !selectedOption} />
        </div>
      </form>
    )
  }

  if (canUseWordBank) {
    return (
      <div
        className={withAnswerPanelLockClass(
          `${composerEnterClass} ${CHAT_COMPOSER_COLUMN_SHELL_CLASS}`,
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

  const isVoiceShadowComposer = question.type === 'voice-shadow'
  const hasComposerHeader =
    !correctionMode && Boolean(helperText(question) || canUseAudio)
  const composerShellClass = hasComposerHeader
    ? `${CHAT_COMPOSER_COLUMN_SHELL_CLASS}${isDictationLikeComposer ? ' gap-1' : ''}`
    : CHAT_COMPOSER_FORM_CLASS
  const inputRowClass = isMultiRowTextComposer ? PRACTICE_MULTI_ROW_INPUT_ROW_CLASS : CHAT_COMPOSER_INPUT_ROW_CLASS

  const composerInputRow = (
    <>
      {isVoiceFirstComposer ? (
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
          className={`chat-input-field lesson-chat-input-field min-w-0 w-full flex-1 resize-none rounded-2xl border border-[var(--chat-input-border)] bg-[var(--chat-input-bg)] px-4 ${CHAT_COMPOSER_TYPO_CLASS} ${getChatComposerTextareaVerticalClass(false)} text-[var(--text)] outline-none focus:placeholder:text-transparent disabled:cursor-not-allowed disabled:opacity-70`}
          placeholder={inputPlaceholder(question, {
            isChoiceCorrection: isChoiceCorrectionComposer,
            isVoiceFirstComposer,
            isTextEditUnlocked,
            correctionMode,
            audience,
          })}
        />
      ) : isVoiceFirstComposer ? (
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
              showChoiceVoiceOverlay || hideChoiceComposerTextForTapHint || showChoiceInviteOverlay
                ? 'text-transparent caret-transparent placeholder:text-transparent'
                : choiceVoiceFrozenDisplay
                  ? 'text-[var(--text-muted)]'
                  : 'text-[var(--text)]'
            } ${choiceTextareaReadOnly ? 'cursor-default' : ''}`}
            placeholder={resolvedPlaceholder}
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
        <div className="relative min-w-0 flex-1">
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
            readOnly={isComposerFrozen}
            rows={1}
            className={`chat-input-field lesson-chat-input-field min-w-0 w-full resize-none overflow-y-hidden rounded-2xl border border-[var(--chat-input-border)] bg-[var(--chat-input-bg)] px-4 ${CHAT_COMPOSER_TYPO_CLASS} ${getChatComposerTextareaVerticalClass(false)} outline-none focus:placeholder:text-transparent disabled:cursor-not-allowed disabled:opacity-70 ${
              isComposerFrozen ? 'text-[var(--text-muted)]' : 'text-[var(--text)]'
            }`}
            placeholder={inputPlaceholder(question, {
              isChoiceCorrection: isChoiceCorrectionComposer,
              isVoiceFirstComposer,
              isTextEditUnlocked,
              correctionMode,
              audience,
            })}
            style={{ maxHeight: `${DEFAULT_INPUT_MAX_HEIGHT_PX}px` }}
          />
        </div>
      )}
      <ComposerSendButton
        disabled={disabled || !(isVoiceFirstComposer ? choiceComposerText : draft).trim()}
      />
    </>
  )

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submitText()
      }}
      className={withAnswerPanelLockClass(
        `${composerEnterClass} ${composerShellClass}`,
        answerPanelLocked
      )}
      style={{ boxShadow: 'var(--chat-composer-shadow)' }}
    >
      {hasComposerHeader ? (
        <div className={`space-y-1 px-1${isVoiceShadowComposer ? ' flex w-full flex-col items-end' : ''}`}>
          {canUseAudio && <AudioPracticeButton text={question.audioText ?? question.targetAnswer} disabled={disabled} />}
          {helperText(question) && (
            <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">{helperText(question)}</p>
          )}
        </div>
      ) : null}
      {hasComposerHeader ? <div className={inputRowClass}>{composerInputRow}</div> : composerInputRow}
    </form>
  )
}

function AudioPracticeButton({ text, disabled }: { text: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => speak(text)}
      disabled={disabled || !text.trim()}
      className={APP_BTN_SECONDARY_SUBMIT}
    >
      Прослушать
    </button>
  )
}

function ComposerSendButton({ disabled }: { disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      aria-label="Отправить ответ"
      title="Отправить"
      className="chat-action-button chat-send-surface inline-flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 touch-manipulation items-center justify-center rounded-full p-0 font-semibold text-[var(--accent-text)] disabled:cursor-not-allowed disabled:opacity-50"
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
  )
}
