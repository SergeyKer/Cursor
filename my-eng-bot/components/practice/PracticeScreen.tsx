'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type AnimationEvent } from 'react'
import FeedbackStatusText from '@/components/FeedbackStatusText'
import LessonFeedbackStatusBubble from '@/components/lesson/LessonFeedbackStatusBubble'
import LessonStepBubble from '@/components/lesson/LessonStepBubble'
import PracticeBriefingScreen from '@/components/practice/PracticeBriefingScreen'
import PracticeFinale from '@/components/practice/PracticeFinale'
import PracticeQuestionRenderer from '@/components/practice/PracticeQuestionRenderer'
import { APP_BTN_PRIMARY_LARGE, APP_BTN_SECONDARY_LARGE } from '@/lib/homeCtaStyles'
import { buildPracticeFeedMessages } from '@/lib/practice/buildPracticeFeedMessages'
import {
  isPracticeAnswerPanelLocked,
  isPracticeChoiceInteractionDisabled,
  isPracticeChoicePanelFrozen,
  PRACTICE_ANSWER_REVEAL_MS,
} from '@/lib/practice/practiceAnswerPanelLock'
import DialogComposerStack from '@/components/DialogComposerStack'
import { DialogGlassScrollHost } from '@/components/DialogGlassScrollHost'
import {
  DIALOG_COMPOSER_PADDING_BOTTOM,
  getChatComposerStackLayout,
  getPracticeComposerStackLayout,
} from '@/lib/chatComposerMetrics'
import { syncDialogComposerStackHeight } from '@/hooks/useDialogComposerStackHeight'
import { ensurePracticeChoiceOptions } from '@/lib/practice/ensurePracticeChoiceOptions'
import { tokensFromTargetAnswer } from '@/lib/practice/rebuildPracticeWordTokensFromAnswer'
import {
  isPracticeChoiceChipsPanel,
  isPracticePuzzlePanel,
  resolvePracticeChoiceComposerLayout,
  resolvePracticePuzzleComposerLayout,
} from '@/lib/practice/practiceComposerLayout'
import {
  shouldHighlightWrongPracticeChoice,
  shouldHighlightWrongQuickTestChoice,
} from '@/lib/lessonChoiceHighlight'
import {
  canCompleteChipPhase,
  PRACTICE_CORRECTION_CHIP_PHASE_MS,
  resolvePracticeSayTextRevealReady,
  shouldResetCorrectionPhase,
  type PracticeChoiceCorrectionPhase,
} from '@/lib/practice/practiceChoiceCorrectionPhase'
import { isPracticeCorrectionSession } from '@/lib/practice/practiceCorrectionMode'
import {
  isPracticeChoiceChipCorrectionType,
  isPracticeRepeatCorrectionType,
  isPracticeVoiceRepeatCorrectionType,
} from '@/lib/practice/practiceCorrectionFamily'
import { shouldSuppressPracticeComposerEnterAnimation } from '@/lib/practice/practiceComposerEnter'
import { useDialogFeedKeyboardScroll } from '@/hooks/useDialogFeedKeyboardScroll'
import { useLessonComposerHeightLock } from '@/hooks/useLessonComposerHeightLock'
import { useLessonSectionReveal } from '@/hooks/useLessonSectionReveal'
import { useLessonFeedTailEnter } from '@/hooks/useLessonFeedTailEnter'
import { resolveTaskBubbleIndex } from '@/lib/lessonBubbleLayout'
import {
  estimateLessonComposerMinHeight,
  estimateListeningSelectComposerMinHeight,
  measureChoiceChipsLaneWidthPx,
} from '@/lib/lessonComposerLayout'
import {
  isLessonFeedScrolledToTail,
  isPracticeFeedCheckingTailMessageId,
  isWithinRevealEndOverflowSettleWindow,
  LESSON_SCROLL_VIEWPORT_CLASS,
  resolveLessonShellScrollBehavior,
  resolvePracticeFeedScrollRequest,
  resolveScrollBottomPadding,
  scrollLessonFeedToModeIfNeeded,
  scrollLessonFeedToModeWithCompleteIfNeeded,
  scrollLessonFeedTailIfNeeded,
  shouldSkipLessonFeedOverflowFollow,
  shouldSkipRevealEndOverflowScroll,
  LESSON_FEED_SCROLL_COMPLETE_FALLBACK_MS,
} from '@/lib/lessonFeedScroll'
import {
  CHAT_FEED_SERVICE_STATUS_ROW_CLASS,
  CHAT_FEED_SERVICE_STATUS_ROW_PUZZLE_CHECKING_CLASS,
  ChatBubbleFrame,
  getBubblePosition,
  type BubbleRole,
} from '@/components/chat/ChatBubble'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import type { PracticeFlowState } from '@/hooks/usePracticeSession'
import EngvoFeedServiceTypingText from '@/components/engvo/EngvoFeedServiceTypingText'
import type { Audience } from '@/lib/types'
import type { PracticeMode, PracticeQuestion, PracticeSession } from '@/types/practice'
import SpeakTranslationControls from '@/components/chat/SpeakTranslationControls'
import { usePhraseTranslation } from '@/hooks/usePhraseTranslation'
import { getPracticeTtsRateByIndex } from '@/lib/practice/practiceTtsSpeedPresets'
import {
  resolveIntroBlockChipsVisible,
  resolveIntroBlockTaskCardReached,
} from '@/lib/lessonIntroBlockReveal'
import { parseInterlocutorFromPrompt } from '@/lib/practice/prompt/roleplayPromptEngine'
import { resolveEffectivePracticeTtsSpeedIndex } from '@/lib/practice/practiceTtsPreferences'
import { speak, stopSpeaking } from '@/lib/speech'
import { resolvePracticeForgivenessBubbleMode } from '@/lib/practice/practiceCoinForgiveness'
import { getPracticeCoinForgivenessCopy } from '@/lib/practice/practiceCoinForgivenessCopy'
import {
  PRACTICE_FINALE_COMPOSER_RESERVE_PX,
} from '@/lib/practice/practiceFinaleLayout'
import type { PracticeGlobalXpReason } from '@/lib/practice/practiceGlobalXpAward'

type PhraseTranslationResult = { translation?: string; error?: string }

interface PracticeScreenProps {
  session: PracticeSession
  voiceId?: string
  ttsSpeedDefaultIndex?: number
  audience?: Audience
  state: PracticeFlowState
  feedback?: { type: 'success' | 'error'; message: string } | null
  pendingAnswer?: string | null
  currentQuestion: PracticeQuestion | null
  canSubmit: boolean
  completionMeta?: {
    tier: 0 | 1 | 2
    globalAmount: number
    globalReason: PracticeGlobalXpReason | 'legacy_flat_30'
    ringCount: number
    ringIncremented: boolean
    canEarnRingToday?: boolean
    coinsAwarded: number
    cupAwarded: number
    pendingPracticeCoins: number
    pendingCup: boolean
    baseBadgeAwarded: boolean
    baseBadgeClaimed: boolean
    badgeLine: string
    badgeRankAwarded: 0 | 1 | 2 | 3 | null
    masteryScore: number
    effectiveMasteryScore: number
    correctedCount: number
    plannedLength: number
    forgivenessUsed: boolean
    gemsPending: boolean
    cupClaimed: boolean
  } | null
  hasTips?: boolean
  otherTopicAvailable?: boolean
  onSubmitAnswer: (answer: string) => void
  onRepeat: () => void
  onStartMode: (mode: PracticeMode) => void
  onOpenLesson: () => void
  onBackToPracticeMenu: () => void
  onOpenTips?: () => void
  onOtherTopic?: () => void
  onOpenAiChat?: () => void
  onRetryAfterError?: () => void
  onAcknowledgeInstruction: () => void
  generationBusy?: boolean
  onChoiceCorrectionPhaseChange?: (phase: PracticeChoiceCorrectionPhase) => void
  forgivenessContext?: {
    tier: 0 | 1 | 2
    ringCount: number
    lastQualifyingDayKey?: string | null
    todayKey: string
    coinBalance: number
  }
  onRequestCoinForgiveness?: () => boolean
  onConfirmCoinForgiveness?: () => boolean
  onCancelCoinForgiveness?: () => void
  onContinueCoinForgiveness?: () => void
  onRequestPhraseTranslation?: (
    text: string,
    signal: AbortSignal
  ) => Promise<PhraseTranslationResult>
}

const statusCardClassByTone: Record<'success' | 'error', string> = {
  success: 'border-green-200/90 bg-green-50/95 text-green-700',
  error: 'border-amber-200/90 bg-amber-50/95 text-amber-800',
}

function nextMode(mode: PracticeMode): PracticeMode {
  if (mode === 'reference') return 'challenge'
  if (mode === 'relaxed') return 'balanced'
  if (mode === 'balanced') return 'challenge'
  return 'challenge'
}

function useLessonUserEnterClass(prefersReducedMotion: boolean) {
  const enteredIdsRef = useRef<Set<string>>(new Set())
  return useCallback(
    (messageId: string) => {
      if (prefersReducedMotion) return ''
      if (enteredIdsRef.current.has(messageId)) return ''
      enteredIdsRef.current.add(messageId)
      return 'lesson-text-soft-enter'
    },
    [prefersReducedMotion]
  )
}

/** Статус «Верно/Неверно» - как в уроках (`.lesson-feed-status-enter`). Id завершается в onAnimationEnd, не при render. */
function useLessonFeedStatusEnterClass(prefersReducedMotion: boolean) {
  const finishedIdsRef = useRef<Set<string>>(new Set())

  const getEnterClass = useCallback(
    (messageId: string) => {
      if (prefersReducedMotion) return ''
      if (finishedIdsRef.current.has(messageId)) return ''
      return 'lesson-feed-status-enter'
    },
    [prefersReducedMotion]
  )

  const markEnterFinished = useCallback((messageId: string) => {
    finishedIdsRef.current.add(messageId)
  }, [])

  return { getEnterClass, markEnterFinished }
}

export default function PracticeScreen({
  session,
  voiceId = '',
  ttsSpeedDefaultIndex = 0,
  audience = 'adult',
  state,
  feedback = null,
  pendingAnswer = null,
  currentQuestion,
  canSubmit,
  completionMeta = null,
  hasTips = false,
  otherTopicAvailable = false,
  onSubmitAnswer,
  onRepeat,
  onStartMode,
  onOpenLesson,
  onBackToPracticeMenu,
  onOpenTips,
  onOtherTopic,
  onOpenAiChat,
  onRetryAfterError,
  onAcknowledgeInstruction,
  generationBusy = false,
  onChoiceCorrectionPhaseChange,
  forgivenessContext,
  onRequestCoinForgiveness,
  onConfirmCoinForgiveness,
  onCancelCoinForgiveness,
  onContinueCoinForgiveness,
  onRequestPhraseTranslation,
}: PracticeScreenProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const messagesStackRef = useRef<HTMLDivElement | null>(null)
  const composerStackRef = useRef<HTMLDivElement | null>(null)
  const previousScrollSnapshotRef = useRef<{
    messageCount: number
    currentIndex: number
    tailMessageId: string
  } | null>(null)
  const previousRevealInProgressRef = useRef(false)
  const revealEndedAtRef = useRef<number | null>(null)
  const shellScrollCompleteInvokedRef = useRef(false)
  const [composerInnerWidthPx, setComposerInnerWidthPx] = useState<number | undefined>()
  const [showCheckingStatusLine, setShowCheckingStatusLine] = useState(false)
  const [correctionPhase, setCorrectionPhase] = useState<PracticeChoiceCorrectionPhase>('idle')
  const [errorSayTextRevealReady, setErrorSayTextRevealReady] = useState(true)
  const [wrongChoiceHighlight, setWrongChoiceHighlight] = useState<string | null>(null)
  const wrongHighlightSuppressedRef = useRef(false)
  const chipTimerDoneRef = useRef(false)
  const scrollDoneRef = useRef(false)
  const voiceRepeatPauseTimerDoneRef = useRef(false)
  const chipPhaseTimerRef = useRef<number | null>(null)
  const voiceRepeatPauseTimerRef = useRef<number | null>(null)
  const correctionPhaseGenerationRef = useRef(0)
  const scrollCleanupOnCompleteRef = useRef<(() => void) | null>(null)
  const [sessionTtsSpeedIndex, setSessionTtsSpeedIndex] = useState<number | null>(null)
  const [translationCloseNonce, setTranslationCloseNonce] = useState(0)

  const roleplayEnglishPhrase = useMemo(() => {
    if (currentQuestion?.type !== 'roleplay-mini') return null
    return parseInterlocutorFromPrompt(currentQuestion.prompt)
  }, [currentQuestion])

  const requestRoleplayTranslation = useCallback(
    async (text: string, signal: AbortSignal): Promise<PhraseTranslationResult> => {
      if (!onRequestPhraseTranslation) {
        return { error: 'Не удалось загрузить перевод.' }
      }
      return onRequestPhraseTranslation(text, signal)
    },
    [onRequestPhraseTranslation]
  )

  const {
    showTranslation,
    toggleTranslation,
    closeTranslation,
    translation,
    translationError,
    isLoadingTranslation,
    translationDotState,
  } = usePhraseTranslation({
    phraseKey: currentQuestion?.type === 'roleplay-mini' ? (currentQuestion?.id ?? '') : 'inactive',
    text: roleplayEnglishPhrase ?? '',
    closeKey:
      currentQuestion?.type === 'roleplay-mini'
        ? `${currentQuestion?.id ?? ''}:${translationCloseNonce}`
        : null,
    onRequest: onRequestPhraseTranslation ? requestRoleplayTranslation : undefined,
  })

  const handleSubmitAnswerWithTranslationClose = useCallback(
    (answer: string) => {
      closeTranslation()
      setTranslationCloseNonce((value) => value + 1)
      stopSpeaking()
      onSubmitAnswer(answer)
    },
    [closeTranslation, onSubmitAnswer]
  )

  useEffect(() => {
    setSessionTtsSpeedIndex(null)
  }, [session.id])

  const effectiveTtsSpeedIndex = resolveEffectivePracticeTtsSpeedIndex(
    sessionTtsSpeedIndex,
    ttsSpeedDefaultIndex
  )

  const handleRoleplaySpeak = useCallback(() => {
    const phrase = roleplayEnglishPhrase?.trim()
    if (!phrase) return
    speak(phrase, voiceId, { rate: getPracticeTtsRateByIndex(effectiveTtsSpeedIndex) })
  }, [roleplayEnglishPhrase, voiceId, effectiveTtsSpeedIndex])

  const handleTtsSpeedIndexChange = useCallback((index: number) => {
    setSessionTtsSpeedIndex(index)
  }, [])

  const prefersReducedMotion = usePrefersReducedMotion()
  const lessonUserEnterClass = useLessonUserEnterClass(prefersReducedMotion)
  const { getEnterClass: lessonFeedStatusEnterClass, markEnterFinished: markStatusEnterFinished } =
    useLessonFeedStatusEnterClass(prefersReducedMotion)

  const resolvedFeedbackType = useMemo(() => {
    if (feedback?.type) return feedback.type
    if (state === 'generating_next' || state === 'feedback') {
      const currentQuestionId = session.questions[session.currentIndex]?.id
      const lastAnswer = session.answers
        .filter((answer) => answer.questionId === currentQuestionId)
        .at(-1)
      return lastAnswer?.feedbackTone
    }
    return undefined
  }, [feedback?.type, session, state])

  const messages = useMemo(
    () =>
      buildPracticeFeedMessages({
        session,
        state,
        audience,
        pendingAnswer,
        feedbackType: resolvedFeedbackType,
        showCheckingStatusLine,
      }),
    [session, state, audience, pendingAnswer, resolvedFeedbackType, showCheckingStatusLine]
  )

  const tailMessageId = messages.at(-1)?.id ?? ''

  const markErrorSayTextRevealReady = useCallback(() => {
    setErrorSayTextRevealReady(true)
  }, [])

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

  const currentLessonMessage = useMemo(
    () => messages.find((message) => message.kind === 'lesson' && !message.isHistorical) ?? null,
    [messages]
  )

  const revealBubbles = useMemo(
    () => currentLessonMessage?.bubbles ?? [],
    [currentLessonMessage]
  )
  const revealSectionCount = revealBubbles.length
  const revealKey = session.questions[session.currentIndex]?.id ?? null
  const taskBubbleIndex = useMemo(() => resolveTaskBubbleIndex(revealBubbles), [revealBubbles])
  const isQuickTestSession = session.entrySource === 'quick_test'
  const revealEnabled =
    state === 'active' &&
    Boolean(currentLessonMessage) &&
    revealSectionCount > 0

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
    sessionId: `practice:${session.id}`,
    revealKey,
    enabled: revealEnabled,
    sectionCount: revealSectionCount,
    prefersReducedMotion,
    extraPauseBeforeIndex: taskBubbleIndex >= 0 ? taskBubbleIndex : undefined,
  })

  const feedMessageIds = useMemo(() => messages.map((message) => message.id), [messages])
  const quickTestFeedTailEnter = useLessonFeedTailEnter({
    scrollContainerRef,
    messageIds: feedMessageIds,
    prefersReducedMotion,
    enabled: isQuickTestSession,
  })

  const handleStatusBubbleAnimationEnd = useCallback(
    (messageId: string, event: AnimationEvent<HTMLDivElement>) => {
      if (event.animationName !== 'lessonSlideIn') return
      if (isQuickTestSession) {
        quickTestFeedTailEnter.markEnterFinished(messageId)
        return
      }
      markStatusEnterFinished(messageId)
    },
    [isQuickTestSession, markStatusEnterFinished, quickTestFeedTailEnter]
  )

  const handleQuickTestUserAnswerAnimationEnd = useCallback(
    (messageId: string, event: AnimationEvent<HTMLDivElement>) => {
      if (event.animationName !== 'lessonSlideIn') return
      quickTestFeedTailEnter.markEnterFinished(messageId)
    },
    [quickTestFeedTailEnter]
  )

  const invokeShellScrollCompleteOnce = useCallback(() => {
    if (shellScrollCompleteInvokedRef.current) return
    shellScrollCompleteInvokedRef.current = true
    onShellScrollComplete()
  }, [onShellScrollComplete])

  useEffect(() => {
    if (state !== 'checking') {
      setShowCheckingStatusLine(false)
      return
    }

    const timer = window.setTimeout(() => {
      setShowCheckingStatusLine(true)
    }, PRACTICE_ANSWER_REVEAL_MS)

    return () => window.clearTimeout(timer)
  }, [state, session.currentIndex, currentQuestion?.id])

  const isCorrectionSession = isPracticeCorrectionSession(
    state,
    session.wrongAttemptsOnCurrentQuestion ?? 0
  )

  const wrongAttemptsOnCurrentQuestion = session.wrongAttemptsOnCurrentQuestion ?? 0

  const questionType = currentQuestion?.type

  const tailChoiceErrorWithRepeat = useMemo(() => {
    const tail = messages.at(-1)
    return (
      tail?.kind === 'status' &&
      tail.tone === 'error' &&
      Boolean(tail.repeatAnswer) &&
      isPracticeChoiceChipCorrectionType(questionType)
    )
  }, [messages, questionType])

  const tailVoiceShadowErrorWithRepeat = useMemo(() => {
    const tail = messages.at(-1)
    return (
      tail?.kind === 'status' &&
      tail.tone === 'error' &&
      Boolean(tail.repeatAnswer) &&
      isPracticeVoiceRepeatCorrectionType(questionType)
    )
  }, [messages, questionType])

  const tailVoiceRepeatError = tailChoiceErrorWithRepeat || tailVoiceShadowErrorWithRepeat

  const isRepeatCorrectionQuestionType = isPracticeRepeatCorrectionType(questionType)

  const isChoiceVoiceCorrectionFlow =
    isPracticeChoiceChipCorrectionType(questionType) &&
    wrongAttemptsOnCurrentQuestion >= 1 &&
    (correctionPhase === 'chips' ||
      correctionPhase === 'voiceLocked' ||
      correctionPhase === 'voiceReady' ||
      (isCorrectionSession && tailChoiceErrorWithRepeat))

  const clearCorrectionPhaseTimers = useCallback(() => {
    if (chipPhaseTimerRef.current != null) {
      window.clearTimeout(chipPhaseTimerRef.current)
      chipPhaseTimerRef.current = null
    }
    if (voiceRepeatPauseTimerRef.current != null) {
      window.clearTimeout(voiceRepeatPauseTimerRef.current)
      voiceRepeatPauseTimerRef.current = null
    }
    if (scrollCleanupOnCompleteRef.current) {
      scrollCleanupOnCompleteRef.current()
      scrollCleanupOnCompleteRef.current = null
    }
  }, [])

  const tryCompleteChipPhase = useCallback(() => {
    if (!canCompleteChipPhase(chipTimerDoneRef.current, scrollDoneRef.current)) return
    wrongHighlightSuppressedRef.current = true
    setWrongChoiceHighlight(null)
    markErrorSayTextRevealReady()
    setCorrectionPhase('voiceReady')
  }, [markErrorSayTextRevealReady])

  const tryCompleteVoiceRepeatPhase = useCallback(() => {
    if (!canCompleteChipPhase(voiceRepeatPauseTimerDoneRef.current, scrollDoneRef.current)) return
    markErrorSayTextRevealReady()
    setCorrectionPhase('voiceReady')
  }, [markErrorSayTextRevealReady])

  const tryCompleteVoiceRepeatPhaseRef = useRef(tryCompleteVoiceRepeatPhase)
  tryCompleteVoiceRepeatPhaseRef.current = tryCompleteVoiceRepeatPhase

  const correctionCycleKeyRef = useRef<string | null>(null)
  const tryCompleteChipPhaseRef = useRef(tryCompleteChipPhase)
  tryCompleteChipPhaseRef.current = tryCompleteChipPhase

  useLayoutEffect(() => {
    if (!tailVoiceRepeatError || state !== 'correction') {
      if (
        shouldResetCorrectionPhase({
          isRepeatCorrectionType: isRepeatCorrectionQuestionType,
          isCorrectionSession,
          wrongAttemptsOnCurrentQuestion,
          correctionPhase,
          state,
        })
      ) {
        correctionCycleKeyRef.current = null
        setCorrectionPhase('idle')
      }
      return
    }

    if (isPracticeVoiceRepeatCorrectionType(questionType)) {
      const cycleKey = `${tailMessageId}:${wrongAttemptsOnCurrentQuestion}:${questionType}`
      if (correctionCycleKeyRef.current === cycleKey) return
      correctionCycleKeyRef.current = cycleKey

      correctionPhaseGenerationRef.current += 1
      const generation = correctionPhaseGenerationRef.current
      clearCorrectionPhaseTimers()
      scrollDoneRef.current = false
      voiceRepeatPauseTimerDoneRef.current = false
      setErrorSayTextRevealReady(prefersReducedMotion)

      if (prefersReducedMotion) {
        setCorrectionPhase('voiceReady')
        return
      }

      setCorrectionPhase('voiceLocked')
      setErrorSayTextRevealReady(false)

      voiceRepeatPauseTimerRef.current = window.setTimeout(() => {
        if (generation !== correctionPhaseGenerationRef.current) return
        voiceRepeatPauseTimerRef.current = null
        voiceRepeatPauseTimerDoneRef.current = true
        tryCompleteVoiceRepeatPhaseRef.current()
      }, PRACTICE_CORRECTION_CHIP_PHASE_MS)
      return
    }

    if (!tailChoiceErrorWithRepeat) return

    if (correctionPhase === 'voiceReady' || correctionPhase === 'voiceLocked') {
      if (tailMessageId) {
        correctionCycleKeyRef.current = tailMessageId
      }
      return
    }

    const cycleKey = tailMessageId ?? ''
    if (correctionCycleKeyRef.current === cycleKey) return
    correctionCycleKeyRef.current = cycleKey

    correctionPhaseGenerationRef.current += 1
    const generation = correctionPhaseGenerationRef.current
    clearCorrectionPhaseTimers()
    chipTimerDoneRef.current = false
    scrollDoneRef.current = false
    wrongHighlightSuppressedRef.current = false
    setErrorSayTextRevealReady(prefersReducedMotion)

    if (prefersReducedMotion) {
      wrongHighlightSuppressedRef.current = true
      setWrongChoiceHighlight(null)
      setCorrectionPhase('voiceReady')
      return
    }

    setCorrectionPhase('chips')
    setErrorSayTextRevealReady(false)

    chipPhaseTimerRef.current = window.setTimeout(() => {
      if (generation !== correctionPhaseGenerationRef.current) return
      chipPhaseTimerRef.current = null
      chipTimerDoneRef.current = true
      tryCompleteChipPhaseRef.current()
    }, PRACTICE_CORRECTION_CHIP_PHASE_MS)
  }, [
    tailMessageId,
    state,
    tailVoiceRepeatError,
    tailChoiceErrorWithRepeat,
    prefersReducedMotion,
    wrongAttemptsOnCurrentQuestion,
    correctionPhase,
    questionType,
    isCorrectionSession,
    isRepeatCorrectionQuestionType,
    clearCorrectionPhaseTimers,
  ])

  useEffect(() => {
    if (!tailVoiceShadowErrorWithRepeat || state !== 'correction' || prefersReducedMotion) return
    if (correctionPhase !== 'voiceLocked') return
    if (!isPracticeVoiceRepeatCorrectionType(questionType)) return

    const generation = correctionPhaseGenerationRef.current

    const onScrollDone = () => {
      if (generation !== correctionPhaseGenerationRef.current) return
      scrollDoneRef.current = true
      tryCompleteVoiceRepeatPhaseRef.current()
    }

    const scrollBehavior = resolvePracticeFeedScrollRequest({
      prefersReducedMotion,
      reason: 'feedback',
      state,
    })

    let cleanupSchedule: (() => void) | undefined
    let cleanupScrollComplete: (() => void) | undefined

    cleanupSchedule = scheduleScroll((scrollBehaviorArg) => {
      const scrollContainer = scrollContainerRef.current
      if (!scrollContainer) {
        scrollDoneRef.current = true
        tryCompleteVoiceRepeatPhaseRef.current()
        return
      }
      cleanupScrollComplete = scrollLessonFeedToModeWithCompleteIfNeeded(
        scrollContainer,
        'tail_if_needed',
        scrollBehaviorArg,
        onScrollDone
      )
      scrollCleanupOnCompleteRef.current = cleanupScrollComplete ?? null
    }, scrollBehavior)

    const fallbackTimer = window.setTimeout(() => {
      if (generation !== correctionPhaseGenerationRef.current) return
      scrollDoneRef.current = true
      tryCompleteVoiceRepeatPhaseRef.current()
    }, LESSON_FEED_SCROLL_COMPLETE_FALLBACK_MS)

    return () => {
      cleanupSchedule?.()
      cleanupScrollComplete?.()
      scrollCleanupOnCompleteRef.current = null
      window.clearTimeout(fallbackTimer)
    }
  }, [
    tailMessageId,
    state,
    correctionPhase,
    tailVoiceShadowErrorWithRepeat,
    prefersReducedMotion,
    scheduleScroll,
    questionType,
  ])

  useEffect(() => {
    if (!tailChoiceErrorWithRepeat || state !== 'correction' || prefersReducedMotion) return
    if (correctionPhase !== 'chips') return

    const generation = correctionPhaseGenerationRef.current

    const onScrollDone = () => {
      if (generation !== correctionPhaseGenerationRef.current) return
      scrollDoneRef.current = true
      tryCompleteChipPhaseRef.current()
    }

    const scrollBehavior = resolvePracticeFeedScrollRequest({
      prefersReducedMotion,
      reason: 'feedback',
      state,
    })

    let cleanupSchedule: (() => void) | undefined
    let cleanupScrollComplete: (() => void) | undefined

    cleanupSchedule = scheduleScroll((scrollBehaviorArg) => {
      const scrollContainer = scrollContainerRef.current
      if (!scrollContainer) {
        scrollDoneRef.current = true
        tryCompleteChipPhaseRef.current()
        return
      }
      cleanupScrollComplete = scrollLessonFeedToModeWithCompleteIfNeeded(
        scrollContainer,
        'tail_if_needed',
        scrollBehaviorArg,
        onScrollDone
      )
      scrollCleanupOnCompleteRef.current = cleanupScrollComplete ?? null
    }, scrollBehavior)

    const fallbackTimer = window.setTimeout(() => {
      if (generation !== correctionPhaseGenerationRef.current) return
      scrollDoneRef.current = true
      tryCompleteChipPhaseRef.current()
    }, LESSON_FEED_SCROLL_COMPLETE_FALLBACK_MS)

    return () => {
      cleanupSchedule?.()
      cleanupScrollComplete?.()
      scrollCleanupOnCompleteRef.current = null
      window.clearTimeout(fallbackTimer)
    }
  }, [
    tailMessageId,
    state,
    correctionPhase,
    tailChoiceErrorWithRepeat,
    prefersReducedMotion,
    scheduleScroll,
  ])

  useEffect(() => {
    if (state !== 'checking' && state !== 'submitting') return
    clearCorrectionPhaseTimers()
    setWrongChoiceHighlight(null)
  }, [state, clearCorrectionPhaseTimers])

  useEffect(() => {
    if (!isPracticeChoiceChipCorrectionType(questionType)) {
      setWrongChoiceHighlight(null)
      return
    }

    if (state === 'checking') {
      setWrongChoiceHighlight(null)
      return
    }

    if (isQuickTestSession) {
      if (!shouldHighlightWrongQuickTestChoice(state, resolvedFeedbackType)) return

      const lastAnswer = session.answers
        .filter((answer) => answer.questionId === currentQuestion?.id)
        .at(-1)
      const submitted = lastAnswer?.userAnswer?.trim() ?? ''
      if (!submitted) return

      setWrongChoiceHighlight(submitted)
      return
    }

    if (!isChoiceVoiceCorrectionFlow) {
      setWrongChoiceHighlight(null)
      return
    }

    if (!shouldHighlightWrongPracticeChoice(state, resolvedFeedbackType)) return

    const lastAnswer = session.answers
      .filter((answer) => answer.questionId === currentQuestion?.id)
      .at(-1)
    const submitted = lastAnswer?.userAnswer?.trim() ?? ''
    if (!submitted) return
    if (wrongHighlightSuppressedRef.current) return

    setWrongChoiceHighlight(submitted)
  }, [
    isQuickTestSession,
    isChoiceVoiceCorrectionFlow,
    currentQuestion?.id,
    questionType,
    session.answers,
    state,
    resolvedFeedbackType,
  ])

  useEffect(() => {
    onChoiceCorrectionPhaseChange?.(correctionPhase)
  }, [correctionPhase, onChoiceCorrectionPhaseChange])

  useEffect(() => {
    correctionCycleKeyRef.current = null
    setCorrectionPhase('idle')
    setWrongChoiceHighlight(null)
  }, [currentQuestion?.id])

  useEffect(() => {
    return () => {
      onChoiceCorrectionPhaseChange?.('idle')
    }
  }, [onChoiceCorrectionPhaseChange])

  const showQuestionComposer =
    currentQuestion != null &&
    state !== 'completed' &&
    state !== 'error'

  const isChoiceChipsPanel =
    showQuestionComposer && isPracticeChoiceChipsPanel(currentQuestion, correctionPhase)

  const isPuzzlePanel =
    showQuestionComposer && isPracticePuzzlePanel(currentQuestion, correctionPhase)

  const deferChoiceChipsUntilCardReveal =
    isChoiceChipsPanel &&
    state === 'active' &&
    revealSectionCount > 0 &&
    !prefersReducedMotion

  const isChoiceChipsVisible =
    !deferChoiceChipsUntilCardReveal ||
    (isRevealInitializedForKey && !isRevealInProgress)

  const deferPuzzleUntilCardReveal =
    isPuzzlePanel &&
    state === 'active' &&
    revealSectionCount > 0 &&
    !prefersReducedMotion

  const isPuzzleVisible =
    !deferPuzzleUntilCardReveal ||
    (isRevealInitializedForKey && !isRevealInProgress)

  const choiceOptions = useMemo(
    () =>
      currentQuestion && isChoiceChipsPanel
        ? ensurePracticeChoiceOptions(currentQuestion.options, currentQuestion.targetAnswer)
        : [],
    [currentQuestion, isChoiceChipsPanel]
  )

  const choiceComposerLayout = isChoiceChipsPanel
    ? resolvePracticeChoiceComposerLayout({
        isChoicePanel: true,
        deferUntilReveal: deferChoiceChipsUntilCardReveal,
        isRevealInProgress,
        isRevealInitializedForKey,
        isChoiceChipsVisible,
        prefersReducedMotion,
      })
    : null

  const puzzleSlotWords = useMemo(() => {
    if (!currentQuestion || !isPuzzlePanel) return []
    return currentQuestion.shuffledWords ?? tokensFromTargetAnswer(currentQuestion.targetAnswer)
  }, [currentQuestion, isPuzzlePanel])

  const puzzleBankWords = useMemo(() => {
    if (!currentQuestion || !isPuzzlePanel) return []
    if (currentQuestion.type === 'word-builder-pro') {
      return [...puzzleSlotWords, ...(currentQuestion.extraWords ?? [])]
    }
    return puzzleSlotWords
  }, [currentQuestion, isPuzzlePanel, puzzleSlotWords])

  const puzzleComposerLayout = isPuzzlePanel
    ? resolvePracticePuzzleComposerLayout({
        isPuzzlePanel: true,
        deferUntilReveal: deferPuzzleUntilCardReveal,
        isRevealInProgress,
        isRevealInitializedForKey,
        isPuzzleVisible,
        prefersReducedMotion,
      })
    : null

  const puzzleComposerMinHeightEstimate =
    isPuzzlePanel && puzzleComposerLayout?.reserveMinHeight
      ? estimateLessonComposerMinHeight({
          panelKind: 'puzzle',
          puzzleSlotTokens: puzzleSlotWords,
          puzzleBankWords,
          puzzleHasTitle: false,
          puzzleHasInstruction: false,
          containerWidthPx: composerInnerWidthPx,
          compact: true,
        })
      : undefined

  const choiceComposerMinHeightEstimate =
    isChoiceChipsPanel && choiceComposerLayout?.reserveMinHeight
      ? currentQuestion?.type === 'listening-select'
        ? estimateListeningSelectComposerMinHeight({
            optionCount: choiceOptions.length,
            choiceOptions,
            containerWidthPx: composerInnerWidthPx,
          })
        : estimateLessonComposerMinHeight({
            panelKind: 'choice',
            optionCount: choiceOptions.length,
            choiceOptions,
            containerWidthPx: composerInnerWidthPx,
            compact: true,
          })
      : undefined

  const quickTestComposerMinHeight = useMemo(() => {
    if (!isQuickTestSession || !currentQuestion) return undefined
    const options = ensurePracticeChoiceOptions(
      currentQuestion.options,
      currentQuestion.targetAnswer
    )
    const height = estimateLessonComposerMinHeight({
      panelKind: 'choice',
      choiceOptions: options,
      containerWidthPx: composerInnerWidthPx,
      compact: true,
    })
    return height > 0 ? height : undefined
  }, [isQuickTestSession, currentQuestion, composerInnerWidthPx])

  const composerHeightLockReleased =
    prefersReducedMotion ||
    (session.entrySource === 'quick_test' &&
      isChoiceChipsPanel &&
      (state === 'checking' || state === 'feedback'))
      ? false
      : isPuzzlePanel
        ? false
        : choiceComposerLayout
          ? choiceComposerLayout.lockReleased
          : !isRevealInProgress

  const composerPanelKind =
    correctionPhase === 'voiceLocked' || correctionPhase === 'voiceReady'
      ? ('text-input' as const)
      : isPuzzlePanel
        ? ('puzzle' as const)
        : isChoiceChipsPanel
          ? ('choice' as const)
          : ('text-input' as const)

  const isQuestionRevealGateActive =
    state === 'active' &&
    revealEnabled &&
    (!isRevealInitializedForKey || isRevealInProgress)

  const composerFreezeCycleActive =
    state === 'submitting' ||
    state === 'checking' ||
    (state === 'feedback' && resolvedFeedbackType === 'success') ||
    state === 'generating_next' ||
    isQuestionRevealGateActive

  const suppressComposerEnterAnimation =
    currentQuestion != null &&
    (shouldSuppressPracticeComposerEnterAnimation({
      questionType: currentQuestion.type,
      questionIndex: session.currentIndex,
    }) ||
      composerFreezeCycleActive)

  const lockedComposerMinHeight = useLessonComposerHeightLock({
    stackRef: composerStackRef,
    transitionKey: `${currentQuestion?.id ?? ''}-${composerPanelKind}`,
    panelKind: composerPanelKind,
    optionCount: choiceOptions.length,
    choiceOptions,
    containerWidthPx: composerInnerWidthPx,
    puzzleSlotTokens: puzzleSlotWords,
    puzzleBankWords,
    puzzleHasTitle: false,
    puzzleHasInstruction: false,
    compact: isChoiceChipsPanel || isPuzzlePanel,
    enabled:
      (isChoiceChipsPanel || isPuzzlePanel || isChoiceVoiceCorrectionFlow) && !isQuickTestSession,
    lockReleased: composerHeightLockReleased,
  })

  const composerMinHeight =
    state === 'completed'
      ? PRACTICE_FINALE_COMPOSER_RESERVE_PX
      : quickTestComposerMinHeight ??
        lockedComposerMinHeight ??
        (choiceComposerLayout?.reserveMinHeight && !isChoiceChipsVisible
          ? choiceComposerMinHeightEstimate
          : puzzleComposerLayout?.reserveMinHeight && !isPuzzleVisible
            ? puzzleComposerMinHeightEstimate
            : undefined)

  const baseAnswerPanelLocked = isPracticeAnswerPanelLocked(
    state,
    resolvedFeedbackType,
    isQuestionRevealGateActive
  )

  const isAnswerPanelLocked = baseAnswerPanelLocked
  const isChoicePanelFrozen = isPracticeChoicePanelFrozen(
    state,
    resolvedFeedbackType,
    isQuestionRevealGateActive
  )
  const isChoiceInteractionDisabled = isPracticeChoiceInteractionDisabled(
    state,
    resolvedFeedbackType,
    isQuestionRevealGateActive
  )
  const isChoiceChipsCorrectionFrozen =
    isPracticeChoiceChipCorrectionType(questionType) &&
    state === 'correction' &&
    correctionPhase !== 'voiceReady'

  const isVoiceShadowCorrectionFrozen =
    isPracticeVoiceRepeatCorrectionType(questionType) &&
    state === 'correction' &&
    correctionPhase !== 'voiceReady'

  const isComposerCorrectionPaused =
    isChoiceChipsCorrectionFrozen || isVoiceShadowCorrectionFrozen

  const scrollBottomPadding = resolveScrollBottomPadding({
    hasCurrentStep: state !== 'completed',
    hasPostLessonOptions: false,
    isSentencePuzzle: isPuzzlePanel,
    bottomStackHeightPx: 0,
    composerOutsideScroll: true,
  })

  const scheduleScrollPracticeFeedTail = useCallback(
    (behavior: ScrollBehavior = 'auto') => {
      const resolvedBehavior: ScrollBehavior =
        session.entrySource === 'quick_test' && (state === 'checking' || state === 'feedback')
          ? 'auto'
          : behavior
      return scheduleScroll((scrollBehavior) => {
        const scrollContainer = scrollContainerRef.current
        if (!scrollContainer) return
        scrollLessonFeedToModeIfNeeded(scrollContainer, 'tail_if_needed', scrollBehavior)
      }, resolvedBehavior)
    },
    [scheduleScroll, session.entrySource, state]
  )

  useEffect(() => {
    if (!isShellEnterActive) return

    shellScrollCompleteInvokedRef.current = false

    const completeShellScroll = () => {
      invokeShellScrollCompleteOnce()
    }

    const behavior = resolveLessonShellScrollBehavior({
      prefersReducedMotion,
      isFirstLessonStep: false,
      deferLayoutSettling: false,
    })

    let cleanupScrollComplete: (() => void) | undefined

    const cleanupSchedule = scheduleScroll((scrollBehavior) => {
      const scrollContainer = scrollContainerRef.current
      if (!scrollContainer) {
        completeShellScroll()
        return
      }
      cleanupScrollComplete = scrollLessonFeedToModeWithCompleteIfNeeded(
        scrollContainer,
        'tail_if_needed',
        scrollBehavior,
        completeShellScroll
      )
    }, behavior)

    return () => {
      cleanupSchedule()
      cleanupScrollComplete?.()
    }
  }, [
    isShellEnterActive,
    prefersReducedMotion,
    invokeShellScrollCompleteOnce,
    scheduleScroll,
    revealKey,
  ])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const inSettle =
      (deferChoiceChipsUntilCardReveal &&
        (isRevealInProgress ||
          !isChoiceChipsVisible ||
          isWithinRevealEndOverflowSettleWindow(revealEndedAtRef.current))) ||
      (deferPuzzleUntilCardReveal &&
        (isRevealInProgress ||
          !isPuzzleVisible ||
          isWithinRevealEndOverflowSettleWindow(revealEndedAtRef.current))) ||
      (state === 'checking' && showCheckingStatusLine)
    if (inSettle) {
      root.setAttribute('data-lesson-feed-scroll-settle', '')
    } else {
      root.removeAttribute('data-lesson-feed-scroll-settle')
    }
    return () => {
      root.removeAttribute('data-lesson-feed-scroll-settle')
    }
  }, [
    deferChoiceChipsUntilCardReveal,
    deferPuzzleUntilCardReveal,
    isRevealInProgress,
    isChoiceChipsVisible,
    isPuzzleVisible,
    state,
    showCheckingStatusLine,
  ])

  useLayoutEffect(() => {
    if (!isChoiceChipsPanel) return
    const el = composerStackRef.current
    if (!el) return

    const measure = () => {
      const width = measureChoiceChipsLaneWidthPx(el)
      if (width != null) {
        setComposerInnerWidthPx((current) => (current === width ? current : width))
      }
    }

    measure()
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [isChoiceChipsPanel, currentQuestion?.id])

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const nextSnapshot = {
      messageCount: messages.length,
      currentIndex: session.currentIndex,
      tailMessageId,
    }
    const previousSnapshot = previousScrollSnapshotRef.current

    if (previousSnapshot === null) {
      previousScrollSnapshotRef.current = nextSnapshot
      scheduleScrollPracticeFeedTail(
        resolvePracticeFeedScrollRequest({ prefersReducedMotion, reason: 'initial', state })
      )
      return
    }

    const indexChanged = previousSnapshot.currentIndex !== nextSnapshot.currentIndex
    const messageCountIncreased = nextSnapshot.messageCount > previousSnapshot.messageCount
    const tailChanged = previousSnapshot.tailMessageId !== nextSnapshot.tailMessageId

    if (!indexChanged && !messageCountIncreased && !tailChanged) {
      previousScrollSnapshotRef.current = nextSnapshot
      return
    }

    const shellScrollHandlesStepChange =
      indexChanged && !prefersReducedMotion && revealEnabled

    if (shellScrollHandlesStepChange) {
      previousScrollSnapshotRef.current = nextSnapshot
      return
    }

    previousScrollSnapshotRef.current = nextSnapshot

    const scrollBehavior = resolvePracticeFeedScrollRequest({
      prefersReducedMotion,
      reason: indexChanged
        ? 'step_change'
        : messageCountIncreased || tailChanged
          ? 'new_message'
          : 'initial',
      state,
    })
    scheduleScrollPracticeFeedTail(scrollBehavior)
  }, [
    messages.length,
    session.currentIndex,
    state,
    tailMessageId,
    prefersReducedMotion,
    revealEnabled,
    scheduleScrollPracticeFeedTail,
    session.entrySource,
  ])

  useEffect(() => {
    if (state !== 'feedback' || !feedback) return
    if (isLessonFeedScrolledToTail(scrollContainerRef.current, 'tail_if_needed')) return

    return scheduleScrollPracticeFeedTail(
      resolvePracticeFeedScrollRequest({ prefersReducedMotion, reason: 'feedback', state })
    )
  }, [state, feedback, tailMessageId, prefersReducedMotion, scheduleScrollPracticeFeedTail])

  useEffect(() => {
    if (!isRevealInProgress) return
    if (deferChoiceChipsUntilCardReveal) return
    if (isLessonFeedScrolledToTail(scrollContainerRef.current, 'tail_if_needed')) return

    const behavior = resolvePracticeFeedScrollRequest({
      prefersReducedMotion,
      reason: 'reveal',
      state,
    })
    return scheduleScrollPracticeFeedTail(behavior)
  }, [
    textRevealedThroughIndex,
    textAnimatingIndex,
    isRevealInProgress,
    deferChoiceChipsUntilCardReveal,
    prefersReducedMotion,
    scheduleScrollPracticeFeedTail,
    state,
  ])

  useEffect(() => {
    const wasRevealInProgress = previousRevealInProgressRef.current
    previousRevealInProgressRef.current = isRevealInProgress

    if (!wasRevealInProgress || isRevealInProgress) return

    if (
      shouldSkipRevealEndOverflowScroll({
        deferChoiceChipsUntilCardReveal,
        shouldRenderChoiceChips: isChoiceChipsPanel,
        wasRevealInProgress,
        isRevealInProgress,
      })
    ) {
      revealEndedAtRef.current = Date.now()
      return
    }

    if (isLessonFeedScrolledToTail(scrollContainerRef.current, 'tail_if_needed')) return

    return scheduleScrollPracticeFeedTail(
      resolvePracticeFeedScrollRequest({ prefersReducedMotion, reason: 'overflow_follow', state })
    )
  }, [
    isRevealInProgress,
    deferChoiceChipsUntilCardReveal,
    isChoiceChipsPanel,
    prefersReducedMotion,
    scheduleScrollPracticeFeedTail,
    state,
  ])

  useEffect(() => {
    if (state !== 'completed') return
    return scheduleScrollPracticeFeedTail(
      resolvePracticeFeedScrollRequest({
        prefersReducedMotion,
        reason: 'feedback',
        state,
      })
    )
  }, [state, prefersReducedMotion, completionMeta, scheduleScrollPracticeFeedTail])

  useEffect(() => {
    const messagesStack = messagesStackRef.current
    if (!messagesStack || state === 'completed') return
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => {
      if (isShellEnterActive) return
      if (state === 'checking' || isPracticeFeedCheckingTailMessageId(tailMessageId)) return
      const skipOverflowFollow = shouldSkipLessonFeedOverflowFollow({
        isRevealInProgress,
        deferChoiceChipsUntilCardReveal,
        isChoiceChipsVisible,
        revealEndedAtMs: revealEndedAtRef.current,
      })
      if (skipOverflowFollow) return

      scheduleScrollPracticeFeedTail(
        resolvePracticeFeedScrollRequest({
          prefersReducedMotion,
          reason: 'overflow_follow',
          state,
        })
      )
    })
    observer.observe(messagesStack)
    return () => observer.disconnect()
  }, [
    state,
    tailMessageId,
    prefersReducedMotion,
    scheduleScrollPracticeFeedTail,
    messages.length,
    textRevealedThroughIndex,
    textAnimatingIndex,
    isRevealInProgress,
    isShellEnterActive,
    deferChoiceChipsUntilCardReveal,
    isChoiceChipsVisible,
    session.currentIndex,
  ])

  const composerStackLayout = getPracticeComposerStackLayout({
    isChoiceChipsPanel,
    isListeningSelect: currentQuestion?.type === 'listening-select',
  })
  const composerStackStyle = {
    ...(composerStackLayout.style
      ? { ...composerStackLayout.style, paddingBottom: DIALOG_COMPOSER_PADDING_BOTTOM }
      : composerStackLayout.style),
    ...(composerMinHeight != null ? { minHeight: composerMinHeight } : {}),
  }

  useLayoutEffect(() => {
    if (
      (deferChoiceChipsUntilCardReveal || deferPuzzleUntilCardReveal) &&
      isWithinRevealEndOverflowSettleWindow(revealEndedAtRef.current)
    ) {
      return
    }
    return syncDialogComposerStackHeight(composerStackRef.current)
  }, [
    currentQuestion?.id,
    composerMinHeight,
    deferChoiceChipsUntilCardReveal,
    deferPuzzleUntilCardReveal,
    isChoiceChipsVisible,
    isPuzzleVisible,
    isChoiceChipsPanel,
    isPuzzlePanel,
    correctionPhase,
  ])

  useLayoutEffect(() => {
    if (state !== 'correction' || correctionPhase !== 'voiceReady') return
    if (!isPracticeRepeatCorrectionType(questionType)) return
    const scroll = scrollContainerRef.current
    if (!scroll || scroll.scrollHeight <= scroll.clientHeight) return
    scrollLessonFeedTailIfNeeded(scroll, 'auto')
  }, [
    state,
    correctionPhase,
    questionType,
    composerMinHeight,
    messages.length,
  ])

  useDialogFeedKeyboardScroll(scrollContainerRef, showQuestionComposer)

  const forgivenessMode = forgivenessContext
    ? resolvePracticeForgivenessBubbleMode({
        session,
        state,
        tier: forgivenessContext.tier,
        ringCount: forgivenessContext.ringCount,
        lastQualifyingDayKey: forgivenessContext.lastQualifyingDayKey,
        todayKey: forgivenessContext.todayKey,
      })
    : null
  const forgivenessCopy = getPracticeCoinForgivenessCopy()
  const forgivenessConfirmPending = Boolean(session.forgivenessConfirmPending)
  const forgivenessAppliedAckActive = Boolean(session.forgivenessAppliedAckActive)
  const forgivenessBalance = forgivenessContext?.coinBalance ?? 0
  const forgivenessPanel =
    forgivenessConfirmPending ? (
      <section className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-amber-900">
        <p className="font-semibold">
          {forgivenessBalance > 0 ? forgivenessCopy.confirmTitle : forgivenessCopy.zeroBalanceTitle}
        </p>
        <p className="text-sm leading-relaxed">
          {forgivenessBalance > 0
            ? forgivenessCopy.confirmBody(Math.max(0, forgivenessBalance - 1))
            : forgivenessCopy.zeroBalanceBody}
        </p>
        <button
          type="button"
          className={APP_BTN_PRIMARY_LARGE}
          onClick={() => onConfirmCoinForgiveness?.()}
        >
          {forgivenessCopy.confirm}
        </button>
        <button
          type="button"
          className={APP_BTN_SECONDARY_LARGE}
          onClick={onCancelCoinForgiveness}
        >
          {forgivenessCopy.decline}
        </button>
      </section>
    ) : forgivenessAppliedAckActive ? (
      <section className="space-y-2 rounded-xl border border-green-200 bg-green-50 px-3 py-3 text-green-800">
        <p className="font-semibold">{forgivenessCopy.appliedTitle}</p>
        <p className="text-sm">{forgivenessCopy.appliedBody(forgivenessBalance)}</p>
        <button
          type="button"
          className={APP_BTN_PRIMARY_LARGE}
          onClick={onContinueCoinForgiveness}
        >
          {forgivenessCopy.continueLabel}
        </button>
      </section>
    ) : null

  if (state === 'briefing') {
    return (
      <PracticeBriefingScreen
        session={session}
        audience={audience}
        onContinue={onAcknowledgeInstruction}
      />
    )
  }

  return (
    <div className="dialog-flex-shell flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,var(--chat-wallpaper)_0%,var(--chat-wallpaper-soft)_100%)]">
      <div className="chat-shell-x flex min-h-0 flex-1 flex-col py-2 sm:py-3">
        <div className="mx-auto flex min-h-0 flex-1 w-full max-w-[29rem] flex-col">
          <div
            className="glass-surface flex min-h-0 flex-1 w-full flex-col overflow-hidden rounded-[1.15rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)]"
            style={{ boxShadow: 'var(--chat-shell-shadow)' }}
          >
            <DialogGlassScrollHost>
              <div
                ref={scrollContainerRef}
                className={`${LESSON_SCROLL_VIEWPORT_CLASS} chat-feed-scroll chat-feed-wallpaper p-2.5 sm:p-3`}
                style={
                  scrollBottomPadding
                    ? {
                        paddingBottom: scrollBottomPadding,
                        scrollPaddingBottom: scrollBottomPadding,
                      }
                    : undefined
                }
              >
                <div ref={messagesStackRef}>
                  {session.generationNotice ? (
                    <div className="mb-2.5 rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2 text-[13px] leading-[1.45] text-[var(--status-warning-text)]">
                      {session.generationNotice}
                    </div>
                  ) : null}
                  {messages.map((message, index) => {
                    const previousRole = messages[index - 1]?.role as BubbleRole | undefined
                    const nextRole = messages[index + 1]?.role as BubbleRole | undefined
                    const position = getBubblePosition(previousRole, message.role, nextRole)
                    const isBubbleEnd = position === 'solo' || position === 'last'
                    const rowMargin = isBubbleEnd ? 'mb-2.5' : 'mb-0.5'

                    if (message.kind === 'lesson') {
                      const isCurrentQuestion = !message.isHistorical
                      const isActiveRevealTarget =
                        isCurrentQuestion && message.id === currentLessonMessage?.id

                      const hideLessonBubbleUntilRevealReady =
                        isCurrentQuestion &&
                        isActiveRevealTarget &&
                        revealEnabled &&
                        !isRevealInitializedForKey

                      const lessonShellEnterActive =
                        isCurrentQuestion &&
                        isActiveRevealTarget &&
                        (isShellEnterActive || hideLessonBubbleUntilRevealReady)

                      const currentLessonTextRevealedThroughIndex =
                        !isCurrentQuestion || !isActiveRevealTarget
                          ? (message.bubbles?.length ?? 0) - 1
                          : revealEnabled
                            ? !isRevealInitializedForKey
                              ? -1
                              : isRevealInProgress || isShellEnterActive
                                ? textRevealedThroughIndex
                                : (message.bubbles?.length ?? 0) - 1
                            : (message.bubbles?.length ?? 0) - 1

                      if (hideLessonBubbleUntilRevealReady) {
                        return null
                      }

                      const showRoleplayControls =
                        isCurrentQuestion &&
                        !message.isHistorical &&
                        currentQuestion?.type === 'roleplay-mini' &&
                        Boolean(roleplayEnglishPhrase)

                      const roleplayRevealParams = {
                        revealEnabled,
                        taskBubbleIndex,
                        isRevealInitializedForKey,
                        isShellEnterActive: lessonShellEnterActive,
                        textRevealedThroughIndex: currentLessonTextRevealedThroughIndex,
                        textAnimatingIndex:
                          isActiveRevealTarget && isTextRevealActive ? textAnimatingIndex : null,
                      }

                      const roleplayStripVisible =
                        showRoleplayControls &&
                        resolveIntroBlockTaskCardReached(roleplayRevealParams)

                      const roleplayChipsVisible = resolveIntroBlockChipsVisible({
                        ...roleplayRevealParams,
                        stripVisible: roleplayStripVisible,
                      })

                      const roleplayChipsUseEnter =
                        isActiveRevealTarget &&
                        isTextRevealActive &&
                        revealEnabled &&
                        !prefersReducedMotion &&
                        textAnimatingIndex === taskBubbleIndex

                      const isQuickTestLesson = session.entrySource === 'quick_test'
                      const lessonBubbleKey =
                        isCurrentQuestion && currentQuestion
                          ? `practice-soft-${currentQuestion.id}`
                          : message.id
                      const lessonPreferUnifiedLayout =
                        isQuickTestLesson || (isCurrentQuestion && isActiveRevealTarget)

                      return (
                        <ChatBubbleFrame
                          key={message.id}
                          role="assistant"
                          position={position}
                          className="w-full"
                          rowClassName={rowMargin}
                        >
                          <LessonStepBubble
                            key={lessonBubbleKey}
                            bubbles={message.bubbles ?? []}
                            preferUnifiedLayout={lessonPreferUnifiedLayout}
                            shellEnterActive={
                              isCurrentQuestion && isActiveRevealTarget ? lessonShellEnterActive : false
                            }
                            animateSections={
                              isCurrentQuestion &&
                              isActiveRevealTarget &&
                              isTextRevealActive
                            }
                            textRevealedThroughIndex={currentLessonTextRevealedThroughIndex}
                            textAnimatingIndex={
                              isCurrentQuestion && isActiveRevealTarget && isTextRevealActive
                                ? textAnimatingIndex
                                : null
                            }
                            onTextSectionRevealComplete={
                              isCurrentQuestion && isActiveRevealTarget
                                ? onTextSectionRevealComplete
                                : undefined
                            }
                          />
                          {roleplayStripVisible ? (
                            <div className="mt-1.5 flex w-full flex-wrap items-center gap-2">
                              <SpeakTranslationControls
                                embedded
                                chipsVisible={roleplayChipsVisible}
                                chipsUseEnterAnimation={roleplayChipsUseEnter}
                                onSpeak={handleRoleplaySpeak}
                                showTranslation={showTranslation}
                                onToggleTranslation={toggleTranslation}
                                translationDotState={translationDotState}
                                translation={translation}
                                translationError={translationError}
                                isLoadingTranslation={isLoadingTranslation}
                              />
                            </div>
                          ) : null}
                        </ChatBubbleFrame>
                      )
                    }

                    if (message.kind === 'answer') {
                      if (
                        isQuickTestSession &&
                        !quickTestFeedTailEnter.isMessageVisible(message.id)
                      ) {
                        return null
                      }

                      return (
                        <ChatBubbleFrame
                          key={message.id}
                          role="user"
                          position={position}
                          className={
                            isQuickTestSession
                              ? quickTestFeedTailEnter.getUserEnterClass(message.id)
                              : lessonUserEnterClass(message.id)
                          }
                          rowClassName={rowMargin}
                          onAnimationEnd={
                            isQuickTestSession
                              ? (event) =>
                                  handleQuickTestUserAnswerAnimationEnd(message.id, event)
                              : undefined
                          }
                        >
                          <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.45] font-normal">
                            {message.text}
                          </p>
                        </ChatBubbleFrame>
                      )
                    }

                    if (message.tone === 'service') {
                      const serviceRowClass = message.id.startsWith('practice-checking-')
                        ? CHAT_FEED_SERVICE_STATUS_ROW_PUZZLE_CHECKING_CLASS
                        : CHAT_FEED_SERVICE_STATUS_ROW_CLASS
                      return (
                        <div key={message.id} dir="ltr" className={serviceRowClass}>
                          <EngvoFeedServiceTypingText text={message.text ?? ''} />
                        </div>
                      )
                    }

                    const statusEnterClass = isQuickTestSession
                      ? quickTestFeedTailEnter.getAssistantEnterClass(message.id)
                      : lessonFeedStatusEnterClass(message.id)

                    if (
                      isQuickTestSession &&
                      !quickTestFeedTailEnter.isMessageVisible(message.id)
                    ) {
                      return null
                    }

                    if (message.tone === 'error') {
                      const isTailVoiceRepeatCorrectionError =
                        Boolean(message.repeatAnswer) &&
                        message.id === tailMessageId &&
                        state === 'correction' &&
                        isPracticeRepeatCorrectionType(questionType)
                      const animateSayText = isTailVoiceRepeatCorrectionError && !prefersReducedMotion
                      const sayTextRevealReadyForBubble = resolvePracticeSayTextRevealReady({
                        isTailVoiceRepeatCorrectionError,
                        correctionPhase,
                        errorSayTextRevealReady,
                      })

                      return (
                        <ChatBubbleFrame
                          key={message.id}
                          role="assistant"
                          position={position}
                          className={statusEnterClass}
                          rowClassName={rowMargin}
                          onAnimationEnd={(event) => handleStatusBubbleAnimationEnd(message.id, event)}
                        >
                          <LessonFeedbackStatusBubble
                            hintText={message.text ?? ''}
                            repeatAnswer={message.repeatAnswer}
                            repeatInstructionVerb={audience === 'child' ? 'Скажи' : 'Скажите'}
                            animateSayText={animateSayText}
                            sayTextRevealReady={sayTextRevealReadyForBubble}
                            emptySayTypingIndicator={
                              animateSayText && correctionPhase !== 'voiceReady'
                            }
                            sayRevealDelayMs={animateSayText ? 0 : undefined}
                          />
                          {message.id === tailMessageId &&
                          forgivenessMode &&
                          !forgivenessConfirmPending &&
                          !forgivenessAppliedAckActive ? (
                            <button
                              type="button"
                              className={`${APP_BTN_SECONDARY_LARGE} mt-2`}
                              disabled={forgivenessMode !== 'active'}
                              aria-label={forgivenessCopy.buttonAriaLabel}
                              onClick={() => onRequestCoinForgiveness?.()}
                            >
                              {forgivenessMode === 'exhausted'
                                ? forgivenessCopy.exhaustedLabel
                                : forgivenessCopy.buttonLabel}
                            </button>
                          ) : null}
                        </ChatBubbleFrame>
                      )
                    }

                    return (
                      <ChatBubbleFrame
                        key={message.id}
                        role="assistant"
                        position={position}
                        className={statusEnterClass}
                        rowClassName={rowMargin}
                        onAnimationEnd={(event) => handleStatusBubbleAnimationEnd(message.id, event)}
                      >
                        <section
                          className={`chat-section-surface glass-surface rounded-xl border ${
                            !message.text ? 'px-3 py-2' : 'px-2.5 py-1.5'
                          } ${statusCardClassByTone[message.tone ?? 'success']}`}
                        >
                          {!message.text ? (
                            <p className="whitespace-pre-line break-words text-[15px] leading-[1.45]">
                              {message.text}
                            </p>
                          ) : (
                            <FeedbackStatusText text={message.text} />
                          )}
                        </section>
                      </ChatBubbleFrame>
                    )
                  })}
                </div>
              </div>
            </DialogGlassScrollHost>

            <DialogComposerStack
              ref={composerStackRef}
              className={composerStackLayout.verticalClass}
              style={composerStackStyle}
            >
              {state === 'completed' ? (
                <PracticeFinale
                  session={session}
                  completionReady={Boolean(completionMeta)}
                  tier={completionMeta?.tier}
                  globalAmount={completionMeta?.globalAmount}
                  globalReason={completionMeta?.globalReason}
                  ringCount={completionMeta?.ringCount}
                  ringIncremented={completionMeta?.ringIncremented}
                  canEarnRingToday={completionMeta?.canEarnRingToday}
                  coinsAwarded={completionMeta?.coinsAwarded}
                  cupAwarded={completionMeta?.cupAwarded}
                  pendingPracticeCoins={completionMeta?.pendingPracticeCoins}
                  pendingCup={completionMeta?.pendingCup}
                  baseBadgeAwarded={completionMeta?.baseBadgeAwarded}
                  baseBadgeClaimed={completionMeta?.baseBadgeClaimed}
                  badgeLine={completionMeta?.badgeLine}
                  badgeRankAwarded={completionMeta?.badgeRankAwarded}
                  masteryScore={completionMeta?.masteryScore}
                  effectiveMasteryScore={completionMeta?.effectiveMasteryScore}
                  correctedCount={completionMeta?.correctedCount}
                  plannedLength={completionMeta?.plannedLength}
                  forgivenessUsed={completionMeta?.forgivenessUsed}
                  gemsPending={completionMeta?.gemsPending}
                  cupClaimed={completionMeta?.cupClaimed}
                  hasTips={hasTips}
                  otherTopicAvailable={otherTopicAvailable}
                  onRepeat={onRepeat}
                  onChallenge={() => onStartMode(nextMode(session.mode))}
                  onOpenLesson={onOpenLesson}
                  onBackToPracticeMenu={onBackToPracticeMenu}
                  onOpenTips={onOpenTips}
                  onOtherTopic={onOtherTopic}
                  onOpenAiChat={onOpenAiChat}
                  busy={generationBusy}
                />
              ) : state === 'error' ? (
                <div className="space-y-2">
                  <p className="px-1 text-center text-[13px] leading-snug text-amber-800">
                    {feedback?.message ??
                      'Не удалось подготовить следующий шаг. Можно повторить безопасный вариант.'}
                  </p>
                  <button
                    type="button"
                    onClick={onRetryAfterError ?? onRepeat}
                    disabled={generationBusy}
                    className={APP_BTN_SECONDARY_LARGE}
                  >
                    {generationBusy ? 'Генерируем...' : 'Повторить безопасный вариант'}
                  </button>
                  <button
                    type="button"
                    onClick={onBackToPracticeMenu}
                    className="w-full rounded-xl px-4 py-2 text-center text-sm font-medium text-[var(--text-muted)]"
                  >
                    В меню практики
                  </button>
                </div>
              ) : forgivenessPanel ? (
                forgivenessPanel
              ) : showQuestionComposer ? (
                <div className="space-y-2">
                  {forgivenessMode && state === 'active' ? (
                    <button
                      type="button"
                      className={APP_BTN_SECONDARY_LARGE}
                      disabled={forgivenessMode !== 'active'}
                      aria-label={forgivenessCopy.buttonAriaLabel}
                      onClick={() => onRequestCoinForgiveness?.()}
                    >
                      {forgivenessMode === 'exhausted'
                        ? forgivenessCopy.exhaustedLabel
                        : forgivenessCopy.buttonLabel}
                    </button>
                  ) : null}
                  <PracticeQuestionRenderer
                  question={currentQuestion}
                  voiceId={voiceId}
                  ttsSpeedIndex={effectiveTtsSpeedIndex}
                  onTtsSpeedIndexChange={handleTtsSpeedIndexChange}
                  disabled={
                    !canSubmit ||
                    isChoiceInteractionDisabled ||
                    isChoiceChipsCorrectionFrozen ||
                    isVoiceShadowCorrectionFrozen
                  }
                  choicePanelFrozen={
                    isChoicePanelFrozen ||
                    isChoiceChipsCorrectionFrozen ||
                    isVoiceShadowCorrectionFrozen
                  }
                  answerPanelLocked={isAnswerPanelLocked || isComposerCorrectionPaused}
                  correctionMode={
                    isCorrectionSession && !isPracticeRepeatCorrectionType(currentQuestion.type)
                  }
                  choiceCorrectionPhase={correctionPhase}
                  wrongAttemptsOnCurrentQuestion={session.wrongAttemptsOnCurrentQuestion ?? 0}
                  audience={audience}
                  prefersReducedMotion={prefersReducedMotion}
                  suppressComposerEnterAnimation={suppressComposerEnterAnimation}
                  onSubmit={handleSubmitAnswerWithTranslationClose}
                  suppressChoiceChipEnterAnimation={!isChoiceChipsVisible}
                  choiceChipsVisible={isChoiceChipsVisible}
                  puzzlePanelVisible={isPuzzleVisible}
                  wrongChoiceText={wrongChoiceHighlight}
                  />
                </div>
              ) : null}
            </DialogComposerStack>
          </div>
        </div>
      </div>
    </div>
  )
}
