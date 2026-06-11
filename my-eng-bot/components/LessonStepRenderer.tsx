'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import FeedbackStatusText from '@/components/FeedbackStatusText'
import LessonChoiceChips from '@/components/LessonChoiceChips'
import LessonSentencePuzzle from '@/components/LessonSentencePuzzle'
import LessonMedalFlowInfoStep from '@/components/LessonMedalFlowInfoStep'
import PostLessonMenu from '@/components/PostLessonMenu'
import type { LessonMedalTierOrNull } from '@/lib/lessonScore'
import PracticeQuestionBubble from '@/components/practice/PracticeQuestionBubble'
import UnifiedLessonBubble from '@/components/UnifiedLessonBubble'
import {
  CHAT_FEED_SERVICE_STATUS_ROW_CLASS,
  CHAT_FEED_SERVICE_STATUS_ROW_PUZZLE_CHECKING_CLASS,
  ChatBubbleFrame,
  getBubblePosition,
  type BubbleRole,
} from '@/components/chat/ChatBubble'
import VoiceComposerOverlay from '@/components/voice/VoiceComposerOverlay'
import DialogComposerStack from '@/components/DialogComposerStack'
import { DialogGlassScrollHost } from '@/components/DialogGlassScrollHost'
import {
  CHAT_COMPOSER_FORM_CLASS,
  CHAT_COMPOSER_TYPO_CLASS,
  DIALOG_COMPOSER_PADDING_BOTTOM,
  getChatComposerStackLayout,
  getChatComposerTextareaVerticalClass,
} from '@/lib/chatComposerMetrics'
import LessonRunBanner from '@/components/LessonRunBanner'
import type { BlockProgress, LessonStatus, LessonTimelineEntry } from '@/hooks/useLessonEngine'
import {
  isLessonAnswerPanelLocked,
  isLessonChoiceInteractionDisabled,
  isLessonChoicePanelFrozen,
  LESSON_CHECKING_REVEAL_MS,
} from '@/lib/lessonAnswerPanelLock'
import { useLessonComposerHeightLock } from '@/hooks/useLessonComposerHeightLock'
import {
  estimateLessonComposerMinHeight,
  resolveLessonComposerPanelKind,
} from '@/lib/lessonComposerLayout'
import { ENGVO_SERVICE_TYPEWRITER_CHAR_MS } from '@/lib/practice/practiceRevealTiming'
import TypingText from '@/components/TypingText'
import { buildLessonFeedMessages, type LessonFeedMessage } from '@/lib/buildLessonFeedMessages'
import { shouldHighlightWrongLessonChoice } from '@/lib/lessonChoiceHighlight'
import { injectVariantQuestionIntoTaskBubble } from '@/lib/lessonFeedBubbles'
import {
  isLessonFeedCheckingTailMessageId,
  isLessonFeedScrolledToTail,
  LESSON_SCROLL_VIEWPORT_CLASS,
  resolveLessonFeedScrollMode,
  resolveLessonScrollBehavior,
  resolveLessonShellScrollBehavior,
  resolvePuzzleFeedMessagesStackClass,
  resolveRelaxFeedTailPin,
  resolveScrollBottomPadding,
  scrollLessonFeedToMax,
  scrollLessonFeedToModeIfNeeded,
  scrollLessonFeedToModeWithCompleteIfNeeded,
  shouldMtAutoPinPuzzleCheckingRow,
  shouldPinLessonFeedTailNearComposer,
} from '@/lib/lessonFeedScroll'
import { speak } from '@/lib/speech'
import { seededShuffle } from '@/lib/shuffleSeeded'
import { useLessonVoiceInput } from '@/lib/voice/useLessonVoiceInput'
import type { Bubble, Exercise, PostLessonAction } from '@/types/lesson'
import { validateAnswer } from '@/utils/validateAnswer'
import { useLessonSectionReveal } from '@/hooks/useLessonSectionReveal'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
type LessonStepRendererProps = {
  timeline: LessonTimelineEntry[]
  status: LessonStatus
  blockProgress: BlockProgress
  exerciseErrors?: number
  onAnswer: (answer: string) => void
  onCompleteStep?: (options?: {
    submittedAnswer?: string
    baseMessage?: string
    message?: string
    taskCurrent?: number
    taskTotal?: number
  }) => void
  onPuzzleSubStep?: (params: { subIndex: number; attempts: number }) => void
  onPuzzleAttemptFailed?: (params: {
    subIndex: number
    attempts: number
    submittedAnswer: string
    errorText: string
    hintText: string
    wordCount: number
    correctAnswer: string
  }) => void
  onPuzzleSubSuccess?: (params: {
    subIndex: number
    attempts: number
    submittedAnswer: string
    successText: string
    isLastVariant: boolean
  }) => void
  onPuzzleInteraction?: () => void
  onPuzzleProgressChange?: (progress: { subIndex: number; subTotal: number }) => void
  /** Индекс sub-puzzle на ходе 5 (0 = 1/3) — для доскролла к хвосту ленты при смене пазла. */
  puzzleSubIndex?: number
  /** Сигнал движка: подпазл прошёл checking → можно переключить вариант. */
  puzzleSubAdvanceToken?: number
  lessonMedalReveal?: {
    medal: LessonMedalTierOrNull
    coreXp: number
    comboXp: number
    maxCoreXp: number
    corePercent: number
  } | null
  onPostLessonAction?: (action: PostLessonAction) => void
  onPostLessonMedalNext?: () => void
  postLessonMedalSeen?: boolean
  postLessonBusy?: boolean
  audience: 'child' | 'adult'
  voiceId: string
  /** Новый ключ (например `runKey` урока) — новый порядок вариантов в fill_choice на каждый проход. */
  choiceShuffleSeed?: string
  runBannerText?: string | null
  lessonRevealSessionId?: string
  isAdvancingToNextStep?: boolean
  isAdvancingToNextVariant?: boolean
}

type LessonMessage = LessonFeedMessage

function isServiceCheckingMessage(message?: LessonMessage): boolean {
  return message?.kind === 'status' && message?.tone === 'service'
}

function resolveLessonFeedRowMargin(params: {
  pinLastRowToBottom: boolean
  isBubbleEnd: boolean
  nextMessage?: LessonMessage
}): string {
  if (params.pinLastRowToBottom) return 'mb-0'
  if (isServiceCheckingMessage(params.nextMessage) || params.isBubbleEnd) return 'mb-2.5'
  return 'mb-0.5'
}

const lessonStatusCardClassByTone: Record<'service' | 'success' | 'error', string> = {
  service: 'border-[var(--chat-section-neutral-border)] bg-white/90 text-[var(--text-muted,#6b7280)]',
  success: 'border-green-200/90 bg-green-50/95 text-green-700',
  error: 'border-amber-200/90 bg-amber-50/95 text-amber-800',
}

const CHOICE_REOPEN_DELAY_MS = 900

const LESSON_HIDDEN_VOICE_STATUS_MESSAGES = new Set([
  'Голосовой ввод...',
  '[Распознавание затянулось. Скажите короче или введите текст с клавиатуры (включая цифры и знаки).]',
])

function normalizeLessonChoiceText(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase()
}

export default function LessonStepRenderer({
  timeline,
  status,
  blockProgress,
  exerciseErrors = 0,
  onAnswer,
  onCompleteStep,
  onPuzzleSubStep,
  onPuzzleAttemptFailed,
  onPuzzleSubSuccess,
  onPuzzleInteraction,
  onPuzzleProgressChange,
  puzzleSubIndex,
  puzzleSubAdvanceToken = 0,
  lessonMedalReveal = null,
  onPostLessonAction,
  onPostLessonMedalNext,
  postLessonMedalSeen = false,
  postLessonBusy = false,
  audience,
  voiceId,
  choiceShuffleSeed,
  runBannerText = null,
  lessonRevealSessionId = 'static',
  isAdvancingToNextStep = false,
  isAdvancingToNextVariant = false,
}: LessonStepRendererProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const messagesStackRef = useRef<HTMLDivElement>(null)
  const composerStackRef = useRef<HTMLDivElement>(null)
  const reopenChoicesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wasAnswerPanelLockedRef = useRef(false)
  const lastStepVariantRef = useRef<{ stepNumber?: number; variantIndex: number }>({
    variantIndex: 0,
  })
  const previousStatusRef = useRef<LessonStatus>(status)
  const previousRevealInProgressRef = useRef(false)
  const previousVoicePhaseRef = useRef<'idle' | 'recording' | 'finalizing' | 'error'>('idle')
  const previousScrollSnapshotRef = useRef<{
    messageCount: number
    stepNumber: number
    variantIndex: number
    /** Последнее сообщение в ленте (id), чтобы ловить смену «Проверяем…» → feedback при том же числе сообщений */
    tailMessageId: string
  } | null>(null)
  /** После первой ошибки currentEntry.submittedAnswer = null (ответ в истории попыток). */
  const lastChosenChoiceRef = useRef<string | null>(null)
  /** После choiceClearNonce не поднимать wrongChoiceHighlight снова, пока нет нового клика. */
  const wrongHighlightSuppressedRef = useRef(false)
  const [choiceResetVersion, setChoiceResetVersion] = useState(0)
  const [choiceClearNonce, setChoiceClearNonce] = useState(0)
  const [wrongChoiceHighlight, setWrongChoiceHighlight] = useState<string | null>(null)
  const [frozenChoiceOptions, setFrozenChoiceOptions] = useState<string[] | null>(null)
  const [postLessonPhase, setPostLessonPhase] = useState<'medal' | 'menu'>(() =>
    postLessonMedalSeen ? 'menu' : 'medal'
  )
  const [showCheckingStatusLine, setShowCheckingStatusLine] = useState(false)
  const [showAdvancingStatusLine, setShowAdvancingStatusLine] = useState(false)
  const [isPuzzleFeedOverflowing, setIsPuzzleFeedOverflowing] = useState(false)
  const prefersReducedMotion = usePrefersReducedMotion()
  const currentEntry = timeline.find((entry) => entry.isCurrent) ?? null
  const currentStep = currentEntry?.step ?? null
  const currentFeedback = currentEntry?.feedback ?? null
  const latestFeedback = useMemo(
    () =>
      [...timeline]
        .reverse()
        .map((entry) => entry.feedback)
        .find((feedback): feedback is NonNullable<typeof feedback> => feedback !== null) ?? null,
    [timeline]
  )
  const exercise = currentStep?.exercise ?? null
  const currentVariantIndex = exercise?.currentVariantIndex ?? 0
  const postLesson = currentStep?.stepType === 'completion' ? currentStep.postLesson ?? null : null

  useEffect(() => {
    if (postLessonMedalSeen) {
      setPostLessonPhase('menu')
      return
    }
    setPostLessonPhase('medal')
  }, [
    lessonMedalReveal?.medal,
    lessonMedalReveal?.coreXp,
    lessonMedalReveal?.comboXp,
    lessonMedalReveal?.corePercent,
    postLessonMedalSeen,
  ])
  const rawChoiceOptions = exercise?.options
  const isSentencePuzzle = exercise?.type === 'sentence_puzzle'
  const isChoiceExercise = exercise?.type === 'fill_choice' || exercise?.type === 'micro_quiz'
  const choiceOptions = useMemo(() => {
    const opts = rawChoiceOptions ?? []
    if (
      !exercise ||
      exercise.type !== 'fill_choice' ||
      opts.length < 2 ||
      !choiceShuffleSeed?.trim()
    ) {
      return opts
    }
    return seededShuffle(opts, `${choiceShuffleSeed}:step${currentStep?.stepNumber ?? 0}`)
  }, [choiceShuffleSeed, currentStep?.stepNumber, exercise, rawChoiceOptions])
  const hasChoiceOptions = isChoiceExercise && choiceOptions.length > 0
  const shouldRenderChoiceChips = hasChoiceOptions
  const hasPostLessonOptions = Boolean(postLesson?.options.length)
  /** Пазл и финал: короткая лента + высокая нижняя панель — scrollIntoView липнет к верху. */
  const useFeedScrollToMax = isSentencePuzzle || hasPostLessonOptions
  const relaxFeedTailPin = resolveRelaxFeedTailPin({
    status,
    showAdvancingStatusLine,
    isAdvancingToNextStep,
    isAdvancingToNextVariant,
    isSentencePuzzle,
  })
  const pinFeedTailNearComposer = shouldPinLessonFeedTailNearComposer({
    useFeedScrollToMax,
    relaxFeedTailPin,
  })
  const feedMessagesStackClass = isSentencePuzzle
    ? resolvePuzzleFeedMessagesStackClass({
        pinFeedTailNearComposer,
        isFeedOverflowing: isPuzzleFeedOverflowing,
      })
    : undefined
  const isChoiceDrivenStep = shouldRenderChoiceChips || hasPostLessonOptions || isSentencePuzzle
  const isTextInputAvailable = Boolean(exercise) && !hasPostLessonOptions && !shouldRenderChoiceChips && !isSentencePuzzle
  const revealSourceBubbles = useMemo(() => {
    if (!currentEntry?.step.bubbles?.length) return []
    return injectVariantQuestionIntoTaskBubble(currentEntry.step.bubbles, currentEntry.step.exercise)
  }, [currentEntry])
  const revealSectionCount = revealSourceBubbles.length
  const taskBubbleIndex = useMemo(
    () => revealSourceBubbles.findIndex((bubble) => bubble.type === 'task'),
    [revealSourceBubbles]
  )
  const revealEnabled =
    Boolean(currentEntry?.isCurrent && exercise) && status === 'idle' && revealSectionCount > 0
  const isFirstLessonStep = (currentStep?.stepNumber ?? 0) === 1
  const {
    isShellEnterActive,
    isTextRevealActive,
    textRevealedThroughIndex,
    textAnimatingIndex,
    isRevealInProgress,
    isRevealInitializedForKey,
    onShellScrollComplete,
    onTextSectionRevealComplete,
  } = useLessonSectionReveal({
    sessionId: `lesson:${lessonRevealSessionId}`,
    revealKey: currentStep
      ? `step-${currentStep.stepNumber}-v${currentVariantIndex}`
      : null,
    enabled: revealEnabled,
    sectionCount: revealSectionCount,
    prefersReducedMotion,
  })
  const isTaskSectionVisible = taskBubbleIndex < 0 || textRevealedThroughIndex >= taskBubbleIndex
  const isChecking = status === 'checking'
  const isAnswerPanelLocked = isLessonAnswerPanelLocked(
    status,
    latestFeedback?.type,
    isRevealInProgress
  )
  const isChoicePanelFrozen =
    shouldRenderChoiceChips &&
    isLessonChoicePanelFrozen(status, latestFeedback?.type, isRevealInProgress)
  const isChoiceInteractionDisabled =
    shouldRenderChoiceChips &&
    isLessonChoiceInteractionDisabled(status, latestFeedback?.type, isRevealInProgress)
  const displayChoiceOptions = useMemo(() => {
    if (
      status === 'feedback' &&
      latestFeedback?.type === 'success' &&
      frozenChoiceOptions?.length
    ) {
      return frozenChoiceOptions
    }
    return choiceOptions
  }, [status, latestFeedback?.type, frozenChoiceOptions, choiceOptions])
  const stepTransitionKey = currentStep
    ? `step-${currentStep.stepNumber}-v${currentVariantIndex}`
    : null

  const handleChoiceAnswer = useCallback(
    (answer: string) => {
      const trimmed = answer.trim()
      if (trimmed) {
        lastChosenChoiceRef.current = trimmed
        wrongHighlightSuppressedRef.current = false
      }
      onAnswer(answer)
    },
    [onAnswer]
  )

  const lessonInviteBubble = useMemo(() => {
    if (!currentEntry?.isCurrent || !isTaskSectionVisible) return null
    const visibleBubbles = revealSourceBubbles.slice(0, textRevealedThroughIndex + 1)
    for (let index = visibleBubbles.length - 1; index >= 0; index -= 1) {
      const bubble = visibleBubbles[index]
      if (bubble?.type === 'task') return bubble
    }
    return null
  }, [currentEntry, isTaskSectionVisible, revealSourceBubbles, textRevealedThroughIndex])
  const canUseLessonVoiceInput =
    Boolean(exercise) &&
    !hasPostLessonOptions &&
    !isAnswerPanelLocked &&
    !isRevealInProgress &&
    isTaskSectionVisible &&
    !shouldRenderChoiceChips &&
    !isSentencePuzzle
  const lessonVoiceInput = useLessonVoiceInput({
    inviteKey:
      canUseLessonVoiceInput && lessonInviteBubble
        ? `${currentStep?.stepNumber ?? 'step'}:${lessonInviteBubble.content}`
        : null,
  })
  const { resetVoiceInput } = lessonVoiceInput
  const inputValue =
    lessonVoiceInput.isInputLocked && LESSON_HIDDEN_VOICE_STATUS_MESSAGES.has(lessonVoiceInput.displayText)
      ? ''
      : lessonVoiceInput.isInputLocked
        ? lessonVoiceInput.displayText
        : lessonVoiceInput.draftText
  const showVoiceOverlay = lessonVoiceInput.isVoiceActive && lessonVoiceInput.livePreviewText.length > 0
  const showVoicePlaybackButton =
    isTextInputAvailable &&
    !lessonVoiceInput.isVoiceActive &&
    !isAnswerPanelLocked &&
    Boolean(lessonVoiceInput.lastCommittedVoiceText) &&
    lessonVoiceInput.draftText.trim() === lessonVoiceInput.lastCommittedVoiceText
  const rawVoiceStatusMessage = lessonVoiceInput.voiceStatusMessage ?? ''
  const voiceStatusMessage = LESSON_HIDDEN_VOICE_STATUS_MESSAGES.has(rawVoiceStatusMessage)
    ? ''
    : rawVoiceStatusMessage
  const hasLessonMicrophone =
    Boolean(exercise) && !hasPostLessonOptions && !shouldRenderChoiceChips && !isSentencePuzzle
  const inputPlaceholder = useMemo(() => {
    const verb = hasLessonMicrophone ? 'Скажи' : 'Напиши'
    if (!exercise) return `${verb} ответ...`
    if (exercise.answerFormat === 'full_sentence') {
      return `${verb} предложение...`
    }
    if (exercise.answerFormat === 'single_word') {
      return `${verb} пропущенное слово...`
    }
    return `${verb} ответ...`
  }, [exercise, hasLessonMicrophone])

  const previousFeedbackTypeRef = useRef<'success' | 'error' | undefined>(undefined)

  useLayoutEffect(() => {
    if (status === 'feedback' && latestFeedback?.type === 'success' && choiceOptions.length > 0) {
      const nextSnapshot = [...choiceOptions]
      setFrozenChoiceOptions((current) => {
        if (current?.join('|') === nextSnapshot.join('|')) return current
        return nextSnapshot
      })
    }
    previousStatusRef.current = status
    previousFeedbackTypeRef.current = latestFeedback?.type
  }, [status, latestFeedback?.type, choiceOptions, currentStep?.stepNumber])

  useEffect(() => {
    if (isAnswerPanelLocked) {
      wasAnswerPanelLockedRef.current = true
    }
  }, [isAnswerPanelLocked])

  useEffect(() => {
    if (status === 'feedback' && latestFeedback?.type === 'error') {
      setFrozenChoiceOptions(null)
    }
  }, [status, latestFeedback?.type])

  useEffect(() => {
    if (!shouldRenderChoiceChips || !exercise) {
      setWrongChoiceHighlight(null)
      return
    }

    if (status === 'checking') {
      setWrongChoiceHighlight(null)
      return
    }

    if (!shouldHighlightWrongLessonChoice(status, latestFeedback?.type)) return

    const submitted =
      currentEntry?.submittedAnswer?.trim() || lastChosenChoiceRef.current?.trim() || ''
    if (!submitted) return
    if (wrongHighlightSuppressedRef.current) return
    if (validateAnswer(submitted, exercise as Exercise)) return

    setWrongChoiceHighlight(submitted)
  }, [
    shouldRenderChoiceChips,
    exercise,
    currentEntry?.submittedAnswer,
    status,
    latestFeedback?.type,
    exerciseErrors,
  ])

  useEffect(() => {
    if (!choiceClearNonce) return
    lastChosenChoiceRef.current = null
    wrongHighlightSuppressedRef.current = true
  }, [choiceClearNonce])

  useEffect(() => {
    if (status === 'feedback' && latestFeedback?.type === 'success') {
      setWrongChoiceHighlight(null)
    }
  }, [status, latestFeedback?.type])

  useLayoutEffect(() => {
    const stepNumber = currentStep?.stepNumber
    const variantIndex = currentVariantIndex
    const prev = lastStepVariantRef.current
    const hadPreviousStep = prev.stepNumber !== undefined
    const stepChanged = hadPreviousStep && prev.stepNumber !== stepNumber
    const variantChanged = hadPreviousStep && prev.variantIndex !== variantIndex

    if (stepChanged || variantChanged) {
      setWrongChoiceHighlight(null)
      lastChosenChoiceRef.current = null
      wrongHighlightSuppressedRef.current = false
      wasAnswerPanelLockedRef.current = false
      setFrozenChoiceOptions(null)
      setChoiceResetVersion((current) => current + 1)
      resetVoiceInput()
      if (reopenChoicesTimerRef.current) {
        clearTimeout(reopenChoicesTimerRef.current)
        reopenChoicesTimerRef.current = null
      }
    }

    lastStepVariantRef.current = { stepNumber, variantIndex }
  }, [currentStep?.stepNumber, currentVariantIndex, resetVoiceInput])

  useEffect(() => {
    if (reopenChoicesTimerRef.current) {
      clearTimeout(reopenChoicesTimerRef.current)
      reopenChoicesTimerRef.current = null
    }

    if (!shouldRenderChoiceChips || latestFeedback?.type !== 'error') return

    reopenChoicesTimerRef.current = setTimeout(() => {
      setChoiceClearNonce((current) => current + 1)
      setWrongChoiceHighlight(null)
      reopenChoicesTimerRef.current = null
    }, CHOICE_REOPEN_DELAY_MS)

    return () => {
      if (reopenChoicesTimerRef.current) {
        clearTimeout(reopenChoicesTimerRef.current)
        reopenChoicesTimerRef.current = null
      }
    }
  }, [latestFeedback?.type, exerciseErrors, shouldRenderChoiceChips, currentStep?.stepNumber])

  const submitTextAnswer = useCallback(() => {
    if (
      !exercise ||
      !isTextInputAvailable ||
      isAnswerPanelLocked ||
      lessonVoiceInput.isInputLocked ||
      !lessonVoiceInput.draftText.trim()
    ) {
      return
    }
    onAnswer(inputValue.trim())
  }, [
    exercise,
    inputValue,
    isTextInputAvailable,
    isAnswerPanelLocked,
    lessonVoiceInput.draftText,
    lessonVoiceInput.isInputLocked,
    onAnswer,
  ])

  useEffect(() => {
    previousVoicePhaseRef.current = lessonVoiceInput.voicePhase
  }, [lessonVoiceInput.voicePhase])

  useEffect(() => {
    if (status !== 'checking') {
      setShowCheckingStatusLine(false)
      return
    }

    const timer = setTimeout(() => {
      setShowCheckingStatusLine(true)
    }, LESSON_CHECKING_REVEAL_MS)

    return () => clearTimeout(timer)
  }, [status, currentStep?.stepNumber])

  useEffect(() => {
    if (!isAdvancingToNextStep && !isAdvancingToNextVariant) {
      setShowAdvancingStatusLine(false)
      return
    }

    const timer = setTimeout(() => {
      setShowAdvancingStatusLine(true)
    }, 300)

    return () => clearTimeout(timer)
  }, [isAdvancingToNextStep, isAdvancingToNextVariant, currentStep?.stepNumber])

  const lessonMessages = useMemo<LessonMessage[]>(
    () =>
      buildLessonFeedMessages({
        timeline,
        status,
        latestFeedbackType: latestFeedback?.type,
        showCheckingStatusLine,
        showAdvancingStatusLine,
        isAdvancingToNextStep,
        isAdvancingToNextVariant,
      }),
    [
      timeline,
      status,
      showCheckingStatusLine,
      showAdvancingStatusLine,
      isAdvancingToNextStep,
      isAdvancingToNextVariant,
      latestFeedback?.type,
    ]
  )

  const currentLessonMessage = useMemo(
    () => lessonMessages.find((message) => message.kind === 'lesson' && !message.isHistorical) ?? null,
    [lessonMessages]
  )

  const tailLessonMessageId = lessonMessages.at(-1)?.id ?? ''

  useLayoutEffect(() => {
    if (!isSentencePuzzle || !pinFeedTailNearComposer) {
      setIsPuzzleFeedOverflowing(false)
      return
    }

    const scrollContainer = scrollContainerRef.current
    const messagesStack = messagesStackRef.current
    if (!scrollContainer || !messagesStack) return

    const updateOverflow = () => {
      setIsPuzzleFeedOverflowing(messagesStack.scrollHeight > scrollContainer.clientHeight)
    }

    updateOverflow()

    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(updateOverflow)
    observer.observe(messagesStack)
    observer.observe(scrollContainer)
    return () => observer.disconnect()
  }, [
    isSentencePuzzle,
    pinFeedTailNearComposer,
    lessonMessages.length,
    showCheckingStatusLine,
    status,
    tailLessonMessageId,
  ])

  const scheduleScroll = useCallback(
    (scrollFn: (behavior: ScrollBehavior) => void, behavior: ScrollBehavior = 'auto') => {
      let innerRaf = 0
      let extraRaf = 0
      const needsSafariDialogLayoutPass =
        typeof document !== 'undefined' &&
        document.documentElement.hasAttribute('data-ios-safari-dialog')
      const outerRaf = requestAnimationFrame(() => {
        innerRaf = requestAnimationFrame(() => {
          const run = () => scrollFn(behavior)
          if (needsSafariDialogLayoutPass) {
            extraRaf = requestAnimationFrame(run)
          } else {
            run()
          }
        })
      })
      return () => {
        cancelAnimationFrame(outerRaf)
        if (innerRaf) cancelAnimationFrame(innerRaf)
        if (extraRaf) cancelAnimationFrame(extraRaf)
      }
    },
    []
  )

  const scheduleLessonFeedScroll = useCallback(
    (behavior: ScrollBehavior = 'auto') => {
      const mode = resolveLessonFeedScrollMode({ useFeedScrollToMax, relaxFeedTailPin })
      return scheduleScroll((scrollBehavior) => {
        const scrollContainer = scrollContainerRef.current
        if (!scrollContainer) return
        scrollLessonFeedToModeIfNeeded(scrollContainer, mode, scrollBehavior)
      }, behavior)
    },
    [relaxFeedTailPin, scheduleScroll, useFeedScrollToMax]
  )

  const schedulePuzzleFeedScroll = useCallback(
    (behavior: ScrollBehavior = 'auto') => {
      return scheduleScroll((scrollBehavior) => {
        scrollLessonFeedToMax(scrollContainerRef.current, scrollBehavior)
      }, behavior)
    },
    [scheduleScroll]
  )

  useEffect(() => {
    if (!isShellEnterActive) return

    if (isFirstLessonStep) {
      return scheduleScroll(() => {
        onShellScrollComplete()
      }, 'auto')
    }

    const behavior = resolveLessonShellScrollBehavior({
      prefersReducedMotion,
      isFirstLessonStep,
    })
    const mode = resolveLessonFeedScrollMode({ useFeedScrollToMax, relaxFeedTailPin })

    let cleanupScrollComplete: (() => void) | undefined

    const cleanupSchedule = scheduleScroll((scrollBehavior) => {
      const scrollContainer = scrollContainerRef.current
      if (!scrollContainer) {
        onShellScrollComplete()
        return
      }
      cleanupScrollComplete = scrollLessonFeedToModeWithCompleteIfNeeded(
        scrollContainer,
        mode,
        scrollBehavior,
        onShellScrollComplete
      )
    }, behavior)

    return () => {
      cleanupSchedule()
      cleanupScrollComplete?.()
    }
  }, [
    isShellEnterActive,
    isFirstLessonStep,
    prefersReducedMotion,
    useFeedScrollToMax,
    relaxFeedTailPin,
    onShellScrollComplete,
    scheduleScroll,
  ])

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const nextSnapshot = {
      messageCount: lessonMessages.length,
      stepNumber: currentStep?.stepNumber ?? -1,
      variantIndex: currentVariantIndex,
      tailMessageId: tailLessonMessageId,
    }
    const previousSnapshot = previousScrollSnapshotRef.current

    if (previousSnapshot === null) {
      previousScrollSnapshotRef.current = nextSnapshot
      scheduleLessonFeedScroll(
        resolveLessonScrollBehavior({ prefersReducedMotion, reason: 'initial' })
      )
      return
    }

    const stepOrVariantChanged =
      previousSnapshot.stepNumber !== nextSnapshot.stepNumber ||
      previousSnapshot.variantIndex !== nextSnapshot.variantIndex
    const messageCountIncreased = nextSnapshot.messageCount > previousSnapshot.messageCount
    const tailChanged = previousSnapshot.tailMessageId !== nextSnapshot.tailMessageId

    if (!stepOrVariantChanged && !messageCountIncreased && !tailChanged) {
      previousScrollSnapshotRef.current = nextSnapshot
      return
    }

    const shellScrollHandlesStepChange =
      stepOrVariantChanged &&
      !prefersReducedMotion &&
      revealEnabled &&
      !isFirstLessonStep

    if (shellScrollHandlesStepChange) {
      previousScrollSnapshotRef.current = nextSnapshot
      return
    }

    const scrollBehavior = resolveLessonScrollBehavior({
      prefersReducedMotion,
      reason: stepOrVariantChanged
        ? 'step_change'
        : messageCountIncreased || tailChanged
          ? 'new_message'
          : 'initial',
    })
    scheduleLessonFeedScroll(scrollBehavior)

    previousScrollSnapshotRef.current = nextSnapshot
  }, [
    lessonMessages,
    currentStep?.stepNumber,
    currentVariantIndex,
    tailLessonMessageId,
    prefersReducedMotion,
    scheduleLessonFeedScroll,
    revealEnabled,
    isFirstLessonStep,
  ])

  useEffect(() => {
    if (status !== 'feedback' || !latestFeedback) return

    const mode = resolveLessonFeedScrollMode({ useFeedScrollToMax, relaxFeedTailPin })
    if (isLessonFeedScrolledToTail(scrollContainerRef.current, mode)) return

    return scheduleLessonFeedScroll(
      resolveLessonScrollBehavior({ prefersReducedMotion, reason: 'feedback' })
    )
  }, [
    status,
    latestFeedback,
    lessonMessages.length,
    tailLessonMessageId,
    prefersReducedMotion,
    scheduleLessonFeedScroll,
    useFeedScrollToMax,
    relaxFeedTailPin,
  ])

  useEffect(() => {
    if (!isTextRevealActive) return

    return scheduleLessonFeedScroll(
      resolveLessonScrollBehavior({ prefersReducedMotion, reason: 'reveal' })
    )
  }, [
    isTextRevealActive,
    textRevealedThroughIndex,
    textAnimatingIndex,
    prefersReducedMotion,
    scheduleLessonFeedScroll,
  ])

  useEffect(() => {
    const wasRevealInProgress = previousRevealInProgressRef.current
    previousRevealInProgressRef.current = isRevealInProgress

    if (!wasRevealInProgress || isRevealInProgress) return

    const mode = resolveLessonFeedScrollMode({ useFeedScrollToMax, relaxFeedTailPin })
    if (isLessonFeedScrolledToTail(scrollContainerRef.current, mode)) return

    return scheduleLessonFeedScroll(
      resolveLessonScrollBehavior({ prefersReducedMotion, reason: 'overflow_follow' })
    )
  }, [
    isRevealInProgress,
    prefersReducedMotion,
    scheduleLessonFeedScroll,
    useFeedScrollToMax,
    relaxFeedTailPin,
  ])

  useEffect(() => {
    if (!hasPostLessonOptions) return
    if (status !== 'completed' && postLessonPhase !== 'menu') return
    return schedulePuzzleFeedScroll('auto')
  }, [hasPostLessonOptions, status, postLessonPhase, schedulePuzzleFeedScroll])

  useEffect(() => {
    if (!isSentencePuzzle || puzzleSubIndex == null) return
    return schedulePuzzleFeedScroll('auto')
  }, [isSentencePuzzle, puzzleSubIndex, schedulePuzzleFeedScroll])

  useEffect(() => {
    if (!isSentencePuzzle || status !== 'checking') return
    return schedulePuzzleFeedScroll(
      resolveLessonScrollBehavior({ prefersReducedMotion, reason: 'new_message' })
    )
  }, [
    isSentencePuzzle,
    status,
    showCheckingStatusLine,
    isPuzzleFeedOverflowing,
    tailLessonMessageId,
    prefersReducedMotion,
    schedulePuzzleFeedScroll,
  ])

  useEffect(() => {
    const messagesStack = messagesStackRef.current
    if (!messagesStack || !currentStep || useFeedScrollToMax) return
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => {
      if (isShellEnterActive) return

      scheduleLessonFeedScroll(
        resolveLessonScrollBehavior({ prefersReducedMotion, reason: 'overflow_follow' })
      )
    })
    observer.observe(messagesStack)
    return () => observer.disconnect()
  }, [
    currentStep,
    useFeedScrollToMax,
    prefersReducedMotion,
    scheduleLessonFeedScroll,
    lessonMessages.length,
    textRevealedThroughIndex,
    textAnimatingIndex,
    isShellEnterActive,
  ])

  const deferChoiceChipsUntilCardReveal =
    shouldRenderChoiceChips &&
    Boolean(currentStep && exercise) &&
    !hasPostLessonOptions &&
    status === 'idle' &&
    revealSectionCount > 0 &&
    !prefersReducedMotion
  const isChoiceChipsVisible =
    !deferChoiceChipsUntilCardReveal ||
    (isRevealInitializedForKey && !isRevealInProgress)

  const showPostLessonMedalPhase = Boolean(
    lessonMedalReveal && hasPostLessonOptions && postLessonPhase === 'medal'
  )
  const showPostLessonMenu = hasPostLessonOptions && (!lessonMedalReveal || postLessonPhase === 'menu')
  const composerPanelKind = resolveLessonComposerPanelKind({
    exercise,
    hasPostLessonOptions,
    showPostLessonMedalPhase,
  })
  const shouldLockChoiceComposerHeight =
    shouldRenderChoiceChips || hasPostLessonOptions || showPostLessonMedalPhase
  const choiceComposerMinHeightEstimate = shouldRenderChoiceChips
    ? estimateLessonComposerMinHeight({
        panelKind: 'choice',
        optionCount: displayChoiceOptions.length,
        compact: true,
      })
    : undefined
  /** Пока карточка раскрывается — держим lock, иначе снятие minHeight вместе с показом чипов дёргает ленту. */
  const composerHeightLockReleased =
    prefersReducedMotion || (deferChoiceChipsUntilCardReveal ? false : !isRevealInProgress)
  const lockedComposerMinHeight = useLessonComposerHeightLock({
    stackRef: composerStackRef,
    transitionKey: stepTransitionKey,
    panelKind: composerPanelKind,
    optionCount: displayChoiceOptions.length,
    compact: shouldRenderChoiceChips,
    enabled: shouldLockChoiceComposerHeight,
    lockReleased: composerHeightLockReleased,
  })
  const composerMinHeight =
    lockedComposerMinHeight ??
    (deferChoiceChipsUntilCardReveal ? choiceComposerMinHeightEstimate : undefined)

  const scrollBottomPadding = resolveScrollBottomPadding({
    hasCurrentStep: currentStep != null,
    hasPostLessonOptions,
    isSentencePuzzle,
    bottomStackHeightPx: 0,
    composerOutsideScroll: true,
  })
  const composerStackLayout = getChatComposerStackLayout(shouldRenderChoiceChips)
  const composerStackStyle = {
    ...(composerStackLayout.style
      ? { ...composerStackLayout.style, paddingBottom: DIALOG_COMPOSER_PADDING_BOTTOM }
      : composerStackLayout.style),
    ...(composerMinHeight != null ? { minHeight: composerMinHeight } : {}),
  }

  return (
    <div className="dialog-flex-shell flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,var(--chat-wallpaper)_0%,var(--chat-wallpaper-soft)_100%)]">
      <div className="chat-shell-x flex min-h-0 flex-1 flex-col py-2 sm:py-3">
        <div className="mx-auto flex min-h-0 flex-1 w-full max-w-[29rem] flex-col">
          <div
            className="glass-surface flex min-h-0 flex-1 w-full flex-col overflow-hidden rounded-[1.15rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)]"
            style={{ boxShadow: 'var(--chat-shell-shadow)' }}
          >
            {runBannerText ? <LessonRunBanner text={runBannerText} /> : null}
            <DialogGlassScrollHost>
              <div
                ref={scrollContainerRef}
                className={`${LESSON_SCROLL_VIEWPORT_CLASS} chat-feed-scroll bg-[linear-gradient(180deg,var(--chat-message-wallpaper)_0%,var(--chat-message-wallpaper-soft)_100%)] p-2.5 sm:p-3`}
              style={
                scrollBottomPadding
                  ? {
                      paddingBottom: scrollBottomPadding,
                      scrollPaddingBottom: scrollBottomPadding,
                    }
                  : undefined
              }
            >
              <div ref={messagesStackRef} className={feedMessagesStackClass}>
                {lessonMessages.map((message, index) => {
                  const previousRole = lessonMessages[index - 1]?.role as BubbleRole | undefined
                  const nextRole = lessonMessages[index + 1]?.role as BubbleRole | undefined
                  const position = getBubblePosition(previousRole, message.role, nextRole)
                  const isBubbleEnd = position === 'solo' || position === 'last'
                  const isLastInFeed = index === lessonMessages.length - 1
                  const pinLastRowToBottom = hasPostLessonOptions && isLastInFeed

                  if (message.kind === 'lesson') {
                    const isCurrentLessonMessage = !message.isHistorical
                    const isActiveRevealTarget =
                      isCurrentLessonMessage && message.id === currentLessonMessage?.id
                    const lessonRowMargin = resolveLessonFeedRowMargin({
                      pinLastRowToBottom,
                      isBubbleEnd,
                      nextMessage: lessonMessages[index + 1],
                    })

                    const lessonShellEnterActive =
                      isCurrentLessonMessage && isActiveRevealTarget && isShellEnterActive

                    return (
                      <ChatBubbleFrame
                        key={message.id}
                        role="assistant"
                        position={position}
                        className="w-full"
                        rowClassName={lessonRowMargin}
                      >
                        {isCurrentLessonMessage ? (
                          <PracticeQuestionBubble
                            key={
                              currentStep
                                ? `lesson-soft-${currentStep.stepNumber}-v${currentVariantIndex}`
                                : message.id
                            }
                            bubbles={message.bubbles}
                            visibleSectionCount={message.bubbles.length}
                            revealStyle="softText"
                            shellEnterActive={lessonShellEnterActive}
                            animateSections={isActiveRevealTarget && isTextRevealActive}
                            textRevealedThroughIndex={
                              isActiveRevealTarget && (isShellEnterActive || isTextRevealActive)
                                ? textRevealedThroughIndex
                                : message.bubbles.length - 1
                            }
                            textAnimatingIndex={
                              isActiveRevealTarget && isTextRevealActive ? textAnimatingIndex : null
                            }
                            onTextSectionRevealComplete={
                              isActiveRevealTarget ? onTextSectionRevealComplete : undefined
                            }
                          />
                        ) : (
                          <UnifiedLessonBubble bubbles={message.bubbles} animateSections={false} />
                        )}
                      </ChatBubbleFrame>
                    )
                  }

                  if (message.kind === 'answer') {
                    return (
                      <ChatBubbleFrame
                        key={message.id}
                        role="user"
                        position={position}
                        rowClassName={resolveLessonFeedRowMargin({
                          pinLastRowToBottom,
                          isBubbleEnd,
                          nextMessage: lessonMessages[index + 1],
                        })}
                      >
                        <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.45] font-normal">
                          {message.text}
                        </p>
                      </ChatBubbleFrame>
                    )
                  }

                  if (message.tone === 'service') {
                    const isCheckingServiceRow = isLessonFeedCheckingTailMessageId(message.id)
                    const serviceRowClass = [
                      isCheckingServiceRow
                        ? CHAT_FEED_SERVICE_STATUS_ROW_PUZZLE_CHECKING_CLASS
                        : CHAT_FEED_SERVICE_STATUS_ROW_CLASS,
                      shouldMtAutoPinPuzzleCheckingRow({
                        isSentencePuzzle,
                        status,
                        isFeedOverflowing: isPuzzleFeedOverflowing,
                        isCheckingMessage: isCheckingServiceRow,
                        isLastInFeed,
                      })
                        ? 'mt-auto'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')
                    return (
                      <div key={message.id} dir="ltr" className={serviceRowClass}>
                        <TypingText
                          key={message.id}
                          text={message.text ?? ''}
                          mode="char"
                          speed={ENGVO_SERVICE_TYPEWRITER_CHAR_MS}
                          startDelayMs={0}
                          fadeWhileTyping={false}
                          singleLine
                          className="w-fit text-[14px] italic typing-indicator-text-shimmer"
                        />
                      </div>
                    )
                  }

                  return (
                    <ChatBubbleFrame
                      key={message.id}
                      role="assistant"
                      position={position}
                      rowClassName={
                        pinLastRowToBottom ? 'mb-0' : isBubbleEnd ? 'mb-2.5' : 'mb-0.5'
                      }
                    >
                      <section
                        className={`chat-section-surface glass-surface rounded-xl border px-2.5 py-1.5 ${lessonStatusCardClassByTone[message.tone]}`}
                      >
                        <FeedbackStatusText text={message.text} />
                      </section>
                    </ChatBubbleFrame>
                  )
                })}
              </div>
            </div>
            </DialogGlassScrollHost>

            {currentStep && (
              <DialogComposerStack
                ref={composerStackRef}
                className={composerStackLayout.verticalClass}
                style={composerStackStyle}
              >
                {showPostLessonMedalPhase && lessonMedalReveal ? (
                  <LessonMedalFlowInfoStep
                    medal={lessonMedalReveal.medal}
                    coreXp={lessonMedalReveal.coreXp}
                    comboXp={lessonMedalReveal.comboXp}
                    maxCoreXp={lessonMedalReveal.maxCoreXp}
                    corePercent={lessonMedalReveal.corePercent}
                    audience={audience}
                    onNext={() => {
                      onPostLessonMedalNext?.()
                      setPostLessonPhase('menu')
                    }}
                  />
                ) : showPostLessonMenu ? (
                  <div className="mx-auto flex w-full max-w-[22rem] flex-col gap-2">
                    <div className="px-1 text-center">
                      <h3 className="text-base font-semibold text-slate-900">Что дальше?</h3>
                      {postLesson?.dynamicFooterText ? (
                        <p className="mt-1 text-sm text-[var(--text-muted,#6b7280)]">
                          {postLesson.dynamicFooterText}
                        </p>
                      ) : null}
                    </div>
                    <PostLessonMenu
                      options={postLesson?.options ?? []}
                      onSelect={(action) => onPostLessonAction?.(action)}
                      disabled={postLessonBusy || !onPostLessonAction}
                    />
                  </div>
                ) : isSentencePuzzle && exercise ? (
                  <LessonSentencePuzzle
                    key={`sentence-puzzle-${choiceShuffleSeed ?? 'static'}-${currentStep?.stepNumber ?? 'step'}`}
                    exercise={exercise}
                    disabled={isChecking || isAnswerPanelLocked || !onCompleteStep}
                    progressKey={`${choiceShuffleSeed ?? 'static'}:${currentStep?.stepNumber ?? 'step'}:${currentVariantIndex}`}
                    onSubPuzzleComplete={(summary) =>
                      onPuzzleSubStep?.({ subIndex: summary.subIndex, attempts: summary.attempts })
                    }
                    onAttemptFailed={onPuzzleAttemptFailed}
                    onSubSuccess={onPuzzleSubSuccess}
                    onInteraction={onPuzzleInteraction}
                    onPuzzleProgressChange={onPuzzleProgressChange}
                    subPuzzleAdvanceToken={puzzleSubAdvanceToken}
                    onComplete={(summary) =>
                      onCompleteStep?.({
                        submittedAnswer: summary.submittedAnswer,
                        baseMessage: summary.baseMessage,
                        taskCurrent: summary.taskCurrent,
                        taskTotal: summary.taskTotal,
                      })
                    }
                  />
                ) : shouldRenderChoiceChips ? (
                  <div
                    className={
                      !isChoiceChipsVisible ? 'pointer-events-none invisible' : undefined
                    }
                    aria-hidden={!isChoiceChipsVisible}
                  >
                    <LessonChoiceChips
                      key={`lesson-choice-panel-${stepTransitionKey ?? 'step'}-${choiceResetVersion}`}
                      choices={displayChoiceOptions}
                      onChoose={handleChoiceAnswer}
                      disabled={isChoiceInteractionDisabled || !isChoiceChipsVisible}
                      frozen={isChoicePanelFrozen}
                      clearSelectionSignal={choiceClearNonce}
                      wrongChoiceText={wrongChoiceHighlight}
                      resetKey={`panel-${choiceResetVersion}`}
                      suppressEnterAnimation={!isChoiceChipsVisible}
                    />
                  </div>
                ) : null}

                {exercise &&
                !hasPostLessonOptions &&
                !shouldRenderChoiceChips &&
                !isSentencePuzzle ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault()
                      submitTextAnswer()
                    }}
                    className={`${CHAT_COMPOSER_FORM_CLASS} ${
                      isAnswerPanelLocked ? 'pointer-events-none opacity-60' : ''
                    }`}
                    style={{ boxShadow: 'var(--chat-composer-shadow)' }}
                  >
                    <button
                      type="button"
                      disabled={
                        !isTextInputAvailable ||
                        isAnswerPanelLocked ||
                        lessonVoiceInput.voicePhase === 'finalizing'
                      }
                      onClick={() => {
                        if (!isTextInputAvailable) return
                        lessonVoiceInput.resetMicAnimation()
                        if (lessonVoiceInput.listening) {
                          lessonVoiceInput.stopListening()
                          return
                        }
                        void lessonVoiceInput.startListening()
                      }}
                      aria-label={
                        lessonVoiceInput.listening
                          ? 'Остановить запись'
                          : lessonVoiceInput.voicePhase === 'finalizing'
                            ? 'Распознаю речь'
                            : 'Голосовой ввод'
                      }
                      title={
                        lessonVoiceInput.listening
                          ? 'Остановить'
                          : lessonVoiceInput.voicePhase === 'finalizing'
                            ? 'Распознаю речь'
                            : 'Голосовой ввод'
                      }
                      className={`chat-action-button chat-control-surface relative isolate flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center overflow-hidden rounded-full p-2.5 touch-manipulation ${
                        lessonVoiceInput.micActionActive
                          ? 'text-[var(--chat-control-active-text)]'
                          : 'text-[var(--chat-control-text)]'
                      }`}
                      style={{
                        background: lessonVoiceInput.micActionActive
                          ? 'var(--chat-control-active-bg)'
                          : 'var(--chat-control-bg)',
                      }}
                      onMouseEnter={(event) => {
                        if (!lessonVoiceInput.micActionActive) {
                          event.currentTarget.style.background = 'var(--chat-control-hover)'
                        }
                      }}
                      onMouseLeave={(event) => {
                        if (!lessonVoiceInput.micActionActive) {
                          event.currentTarget.style.background = 'var(--chat-control-bg)'
                        }
                      }}
                    >
                      {lessonVoiceInput.micActionActive ? (
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
                    <div className="relative isolate min-w-0 flex-1">
                      {showVoiceOverlay && (
                        <VoiceComposerOverlay
                          draftBeforeVoiceText=""
                          livePreviewText={lessonVoiceInput.livePreviewText}
                          webTextMetricsFix
                        />
                      )}
                      <input
                        type="text"
                        value={inputValue}
                        onChange={(event) => lessonVoiceInput.setDraftText(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            submitTextAnswer()
                          }
                        }}
                        readOnly={lessonVoiceInput.isInputLocked}
                        disabled={!isTextInputAvailable || isAnswerPanelLocked}
                        className={`chat-input-field lesson-chat-input-field min-w-0 w-full rounded-2xl border border-[var(--chat-input-border)] bg-[var(--chat-input-bg)] px-4 ${CHAT_COMPOSER_TYPO_CLASS} ${getChatComposerTextareaVerticalClass(showVoiceOverlay)} outline-none focus:placeholder:text-transparent disabled:cursor-not-allowed disabled:opacity-70 ${
                          showVoicePlaybackButton ? 'pr-12' : ''
                        } ${
                          showVoiceOverlay
                            ? 'text-transparent caret-transparent placeholder:text-transparent'
                            : 'text-[var(--text)]'
                        }`}
                        placeholder={inputPlaceholder}
                      />
                      {showVoicePlaybackButton && (
                        <div className="pointer-events-none absolute inset-y-0 right-2 z-10 flex items-center">
                          <button
                            type="button"
                            onClick={() => speak(lessonVoiceInput.lastCommittedVoiceText, voiceId)}
                            className="chat-input-inline-speaker-button chat-action-button pointer-events-auto inline-flex h-8 w-8 min-h-8 min-w-8 max-h-8 max-w-8 shrink-0 items-center justify-center rounded-full border border-[var(--chat-speaker-border)] bg-[var(--chat-speaker-bg)] text-[var(--chat-speaker-text)]"
                            title="Прослушать"
                            aria-label="Прослушать распознанный текст"
                          >
                            <LessonSpeakerIcon />
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={
                        !isTextInputAvailable ||
                        isAnswerPanelLocked ||
                        lessonVoiceInput.isInputLocked ||
                        !lessonVoiceInput.draftText.trim()
                      }
                      aria-label="Отправить ответ"
                      className="chat-action-button chat-send-surface inline-flex h-11 w-11 min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-full p-0 font-semibold text-[var(--accent-text)]"
                      style={{ background: 'var(--chat-send-bg)' }}
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-7 w-7"
                        fill="none"
                      >
                        <path
                          d="M21.4 11.6C21.7 11.8 21.7 12.2 21.4 12.4L5.9 19.4C5.2 19.7 4.4 19.2 4.5 18.4L5.3 14.2C5.4 13.9 5.6 13.6 5.9 13.5L12.8 12L5.9 10.5C5.6 10.4 5.4 10.1 5.3 9.8L4.5 5.6C4.4 4.8 5.2 4.3 5.9 4.6L21.4 11.6Z"
                          stroke="#FFFFFF"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </form>
                ) : null}
                {voiceStatusMessage && exercise && !hasPostLessonOptions && !shouldRenderChoiceChips && (
                  <p
                    role="status"
                    aria-live="polite"
                    className={`px-1 pt-2 text-[13px] leading-[1.4] ${
                      lessonVoiceInput.voicePhase === 'error'
                        ? 'text-[var(--status-danger-text,#dc2626)]'
                        : 'text-[var(--text-muted,#6b7280)]'
                    }`}
                  >
                    {voiceStatusMessage}
                  </p>
                )}
              </DialogComposerStack>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function LessonSpeakerIcon() {
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
