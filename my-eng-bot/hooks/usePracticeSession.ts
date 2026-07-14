'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { normalizeAdaptiveQuestionInSession } from '@/lib/practice/applyAdaptiveQuestionTier'
import { buildLocalPracticeSession, buildPracticeSessionFromQuestions } from '@/lib/practice/builders/localPracticeBuilder'
import {
  buildBossPrimarySuccessFeedback,
  buildPracticeWrongAnswerFeedback,
  buildPracticeWrongLimitEncouragement,
} from '@/lib/practice/practiceFeedbackCopy'
import {
  PRACTICE_ANSWER_REVEAL_MS,
  PRACTICE_CHECKING_MS,
  PRACTICE_FEEDBACK_MS,
} from '@/lib/practice/practiceAnswerPanelLock'
import { resolvePracticeRetryPolicy } from '@/lib/practice/practiceRetryPolicy'
import type { Audience } from '@/lib/types'
import { practiceStorage, type PracticeStorage } from '@/lib/practice/storage/practiceStorage'
import { resolvePracticeFlowStateForSession } from '@/lib/practice/practiceSessionFlow'
import {
  isPracticeAwaitingAiGeneration,
  normalizePracticeSessionTargetCount,
} from '@/lib/practice/practiceSessionProgress'
import { validatePracticeAnswer, type PracticeAnswerValidationContext } from '@/lib/practice/practiceValidation'
import { isPracticeChipSelectionType } from '@/lib/practice/practiceCorrectionFamily'
import {
  applyPracticeForgivenessToSession,
  requestPracticeForgiveness,
} from '@/lib/practice/practiceCoinForgiveness'
import type {
  PracticeAnswer,
  PracticeBuildConfig,
  PracticeQuestion,
  PracticeSession,
  PracticeSessionStatus,
} from '@/types/practice'

export type PracticeFlowState =
  | 'idle'
  | 'briefing'
  | 'active'
  | 'submitting'
  | 'checking'
  | 'feedback'
  | 'correction'
  | 'generating_next'
  | 'completed'
  | 'error'

export interface PracticeFeedback {
  type: 'success' | 'error'
  message: string
}

export interface PracticeSessionControls {
  session: PracticeSession | null
  currentQuestion: PracticeQuestion | null
  state: PracticeFlowState
  feedback: PracticeFeedback | null
  /** Текст ответа, отправленного на проверку, пока он ещё не записан в session.answers */
  pendingAnswer: string | null
  canSubmit: boolean
  startSession: (config: PracticeBuildConfig) => PracticeSession
  resumeSession: () => PracticeSession | null
  submitAnswer: (answer: string) => void
  beginNextQuestion: () => void
  nextQuestion: () => void
  appendGeneratedQuestion: (question: PracticeQuestion) => void
  failGeneratingNext: (message: string) => void
  retryGeneratingNext: () => void
  completeSession: () => void
  abandonSession: () => void
  acknowledgeInstruction: () => void
  requestCoinForgiveness: () => boolean
  cancelCoinForgiveness: () => void
  applyCoinForgiveness: () => boolean
  continueAfterCoinForgiveness: () => void
}

function applyStatus(session: PracticeSession, status: PracticeSessionStatus): PracticeSession {
  return { ...session, status, completedAt: status === 'completed' ? Date.now() : session.completedAt }
}

function createAnswer(params: {
  question: PracticeQuestion
  userAnswer: string
  isCorrect: boolean
  corrected: boolean
  feedbackMessage: string
  feedbackTone: 'success' | 'error'
  startedAt: number
}): PracticeAnswer {
  const xpEarned = params.isCorrect ? params.question.xpBase : params.corrected ? Math.max(1, Math.floor(params.question.xpBase * 0.4)) : 0
  return {
    questionId: params.question.id,
    userAnswer: params.userAnswer,
    correctAnswer: params.question.targetAnswer,
    isCorrect: params.isCorrect,
    corrected: params.corrected,
    feedbackMessage: params.feedbackMessage,
    feedbackTone: params.feedbackTone,
    xpEarned,
    responseTimeMs: Math.max(0, Date.now() - params.startedAt),
    timestamp: Date.now(),
  }
}

export interface UsePracticeSessionOptions {
  storage?: PracticeStorage
  audience?: Audience
}

export function usePracticeSession(options: UsePracticeSessionOptions = {}): PracticeSessionControls {
  const storage = options.storage ?? practiceStorage
  const audience = options.audience ?? 'adult'
  const [session, setSession] = useState<PracticeSession | null>(null)
  const [state, setState] = useState<PracticeFlowState>('idle')
  const [feedback, setFeedback] = useState<PracticeFeedback | null>(null)
  const [pendingAnswer, setPendingAnswer] = useState<string | null>(null)
  const sessionRef = useRef<PracticeSession | null>(null)
  const questionStartedAtRef = useRef(Date.now())
  const submittingRef = useRef(false)
  const pendingCorrectionRef = useRef<PracticeQuestion | null>(null)
  const checkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const feedbackAutoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const beginNextQuestionRef = useRef<() => void>(() => {})

  const clearFeedbackAutoAdvance = useCallback(() => {
    if (feedbackAutoAdvanceRef.current) {
      clearTimeout(feedbackAutoAdvanceRef.current)
      feedbackAutoAdvanceRef.current = null
    }
  }, [])

  const clearCheckingTimer = useCallback(() => {
    if (checkingTimerRef.current) {
      clearTimeout(checkingTimerRef.current)
      checkingTimerRef.current = null
    }
  }, [])

  const clearTransitionTimers = useCallback(() => {
    clearFeedbackAutoAdvance()
    clearCheckingTimer()
  }, [clearFeedbackAutoAdvance, clearCheckingTimer])

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    const restored = storage.loadActiveSession()
    if (!restored || restored.status !== 'active') return
    const normalized = normalizeAdaptiveQuestionInSession(
      normalizePracticeSessionTargetCount({
        ...restored,
        wrongAttemptsOnCurrentQuestion: restored.wrongAttemptsOnCurrentQuestion ?? 0,
        instructionAcknowledged: restored.instructionAcknowledged ?? false,
      })
    )
    setSession(normalized)
    setState(resolvePracticeFlowStateForSession(normalized))
    questionStartedAtRef.current = Date.now()
  }, [storage])

  useEffect(() => {
    return () => {
      clearTransitionTimers()
    }
  }, [clearTransitionTimers])

  const currentQuestion = useMemo(() => {
    if (!session || session.status !== 'active') return null
    return session.questions[session.currentIndex] ?? null
  }, [session])

  const persistSession = useCallback(
    (nextSession: PracticeSession) => {
      setSession(nextSession)
      if (nextSession.status === 'active') {
        storage.saveActiveSession(nextSession)
      }
    },
    [storage]
  )

  const beginNextQuestion = useCallback(() => {
    clearTransitionTimers()
    const current = sessionRef.current
    if (!current) return

    if (current.currentIndex >= current.questions.length - 1) {
      const completed = applyStatus(current, 'completed')
      storage.saveCompletedSession(completed)
      storage.clearActiveSession()
      setSession(completed)
      setState('completed')
      return
    }

    const next = normalizeAdaptiveQuestionInSession({
      ...current,
      currentIndex: current.currentIndex + 1,
      wrongAttemptsOnCurrentQuestion: 0,
    })
    questionStartedAtRef.current = Date.now()
    pendingCorrectionRef.current = null
    storage.saveActiveSession(next)
    setSession(next)
    setFeedback(null)
    setPendingAnswer(null)
    setState('active')
  }, [clearTransitionTimers, storage])

  useEffect(() => {
    beginNextQuestionRef.current = () => {
      beginNextQuestion()
    }
  }, [beginNextQuestion])

  const startSession = useCallback(
    (config: PracticeBuildConfig) => {
      clearTransitionTimers()
      setPendingAnswer(null)
      const nextSession = config.questions?.length
        ? buildPracticeSessionFromQuestions(config, config.questions)
        : buildLocalPracticeSession(config)
      if (config.entrySource === 'quick_test') {
        nextSession.instructionAcknowledged = true
      }
      pendingCorrectionRef.current = null
      questionStartedAtRef.current = Date.now()
      setFeedback(null)
      setState(resolvePracticeFlowStateForSession(nextSession))
      persistSession(nextSession)
      return nextSession
    },
    [clearTransitionTimers, persistSession]
  )

  const resumeSession = useCallback(() => {
    clearTransitionTimers()
    setPendingAnswer(null)
    const restored = storage.loadActiveSession()
    if (!restored || restored.status !== 'active') return null
    const normalized = normalizeAdaptiveQuestionInSession(
      normalizePracticeSessionTargetCount({
        ...restored,
        wrongAttemptsOnCurrentQuestion: restored.wrongAttemptsOnCurrentQuestion ?? 0,
        instructionAcknowledged: restored.instructionAcknowledged ?? false,
      })
    )
    pendingCorrectionRef.current = null
    questionStartedAtRef.current = Date.now()
    setFeedback(null)
    setState(resolvePracticeFlowStateForSession(normalized))
    setSession(normalized)
    return normalized
  }, [clearTransitionTimers, storage])

  const acknowledgeInstruction = useCallback(() => {
    setSession((current) => {
      if (!current || current.status !== 'active') return current
      const next = { ...current, instructionAcknowledged: true }
      storage.saveActiveSession(next)
      return next
    })
    setState('active')
  }, [storage])

  const requestCoinForgiveness = useCallback(() => {
    const current = sessionRef.current
    if (!current || current.status !== 'active') return false
    const resolved = requestPracticeForgiveness(current)
    if (!resolved.ok) return false
    sessionRef.current = resolved.session
    persistSession(resolved.session)
    return true
  }, [persistSession])

  const cancelCoinForgiveness = useCallback(() => {
    const current = sessionRef.current
    if (!current?.forgivenessConfirmPending) return
    const next = { ...current, forgivenessConfirmPending: false }
    sessionRef.current = next
    persistSession(next)
  }, [persistSession])

  const applyCoinForgiveness = useCallback(() => {
    const current = sessionRef.current
    if (!current || current.status !== 'active') return false
    const resolved = applyPracticeForgivenessToSession(current)
    if (!resolved.ok) return false
    sessionRef.current = resolved.session
    persistSession(resolved.session)
    return true
  }, [persistSession])

  const continueAfterCoinForgiveness = useCallback(() => {
    const current = sessionRef.current
    if (!current?.forgivenessAppliedAckActive) return
    const next = { ...current, forgivenessAppliedAckActive: false }
    sessionRef.current = next
    persistSession(next)
  }, [persistSession])

  const completeSession = useCallback(() => {
    clearTransitionTimers()
    setPendingAnswer(null)
    setSession((current) => {
      if (!current) return current
      const completed = applyStatus(current, 'completed')
      storage.saveCompletedSession(completed)
      storage.clearActiveSession()
      setState('completed')
      return completed
    })
  }, [clearTransitionTimers, storage])

  const scheduleFeedbackAdvance = useCallback(
    (onAdvance: () => void) => {
      clearFeedbackAutoAdvance()
      feedbackAutoAdvanceRef.current = setTimeout(() => {
        feedbackAutoAdvanceRef.current = null
        onAdvance()
      }, PRACTICE_FEEDBACK_MS)
    },
    [clearFeedbackAutoAdvance]
  )

  const submitAnswer = useCallback(
    (answer: string) => {
      const cleanAnswer = answer.trim()
      if (!session || !currentQuestion || !cleanAnswer || submittingRef.current) return

      clearTransitionTimers()
      submittingRef.current = true
      setPendingAnswer(cleanAnswer)
      setState('checking')

      checkingTimerRef.current = setTimeout(() => {
        checkingTimerRef.current = null
        const correctionQuestion = pendingCorrectionRef.current
        const questionToValidate = correctionQuestion ?? currentQuestion
        const validationContext: PracticeAnswerValidationContext = correctionQuestion
          ? 'correction'
          : questionToValidate.options?.length && isPracticeChipSelectionType(questionToValidate.type)
            ? 'chip'
            : 'typed'
        const isCorrect = validatePracticeAnswer(cleanAnswer, questionToValidate, validationContext)
        const retryResolution = resolvePracticeRetryPolicy({
          currentWrongAttemptsOnQuestion: session.wrongAttemptsOnCurrentQuestion ?? 0,
          isCorrect,
          entrySource: session.entrySource,
        })
        const shouldAutoAdvanceAfterWrongLimit = !isCorrect && retryResolution.shouldAutoAdvanceToNextQuestion
        const isQuickTestWrongLimit =
          shouldAutoAdvanceAfterWrongLimit && session.entrySource === 'quick_test'
        const answerFeedbackTone: 'success' | 'error' =
          isCorrect || (shouldAutoAdvanceAfterWrongLimit && !isQuickTestWrongLimit) ? 'success' : 'error'
        const wrongLimitMessage = isQuickTestWrongLimit
          ? (() => {
              const base = buildPracticeWrongAnswerFeedback({
                correctAnswer: questionToValidate.targetAnswer,
                attemptNumber: 1,
                audience,
                question: questionToValidate,
              })
              const explanation = questionToValidate.explanation?.trim()
              return explanation ? `${base} ${explanation}` : base
            })()
          : buildPracticeWrongLimitEncouragement({
              correctAnswer: questionToValidate.targetAnswer,
              audience,
              seed: `${questionToValidate.id}|${session.answers.length}|${cleanAnswer.toLowerCase()}`,
            })
        const answerFeedbackMessage = isCorrect
          ? correctionQuestion
            ? questionToValidate.type === 'boss-challenge'
              ? audience === 'child'
                ? 'Отлично, закрепили. Финал твой.'
                : 'Отлично, закрепили. Финал ваш.'
              : 'Отлично, закрепили. Идём дальше.'
            : questionToValidate.type === 'boss-challenge'
              ? buildBossPrimarySuccessFeedback({ audience })
              : 'Верно. Хороший ответ.'
          : shouldAutoAdvanceAfterWrongLimit
            ? wrongLimitMessage
            : buildPracticeWrongAnswerFeedback({
                correctAnswer: questionToValidate.targetAnswer,
                attemptNumber: Math.min(
                  2,
                  (session.wrongAttemptsOnCurrentQuestion ?? 0) + 1
                ) as 1 | 2,
                audience,
                question: questionToValidate,
              })

        const answerRecord = createAnswer({
          question: questionToValidate,
          userAnswer: cleanAnswer,
          isCorrect,
          corrected: Boolean(correctionQuestion) && isCorrect,
          feedbackMessage: answerFeedbackMessage,
          feedbackTone: answerFeedbackTone,
          startedAt: questionStartedAtRef.current,
        })

        setSession((current) => {
          if (!current) return current
          const next = {
            ...current,
            answers: [...current.answers, answerRecord],
            score: current.score + (answerRecord.isCorrect ? 1 : 0),
            xp: current.xp + answerRecord.xpEarned,
            streak: answerRecord.isCorrect ? current.streak + 1 : 0,
            wrongAttemptsOnCurrentQuestion: retryResolution.nextWrongAttemptsOnCurrentQuestion,
          }
          storage.saveActiveSession(next)
          return next
        })
        setPendingAnswer(null)

        const advanceAfterAcceptedAnswer = () => {
          if (isPracticeAwaitingAiGeneration(session)) {
            scheduleFeedbackAdvance(() => {
              setFeedback(null)
              setState('generating_next')
            })
          } else {
            scheduleFeedbackAdvance(() => {
              beginNextQuestionRef.current()
            })
          }
        }

        if (isCorrect) {
          pendingCorrectionRef.current = null
          setFeedback({
            type: answerFeedbackTone,
            message: answerFeedbackMessage,
          })
          setState('feedback')
          advanceAfterAcceptedAnswer()
        } else {
          if (shouldAutoAdvanceAfterWrongLimit) {
            pendingCorrectionRef.current = null
            setFeedback({
              type: answerFeedbackTone,
              message: answerFeedbackMessage,
            })
            setState('feedback')
            advanceAfterAcceptedAnswer()
          } else {
            pendingCorrectionRef.current = questionToValidate
            setFeedback({
              type: answerFeedbackTone,
              message: answerFeedbackMessage,
            })
            setState('correction')
          }
        }

        submittingRef.current = false
      }, PRACTICE_ANSWER_REVEAL_MS + PRACTICE_CHECKING_MS)
    },
    [audience, clearTransitionTimers, currentQuestion, scheduleFeedbackAdvance, session, storage]
  )

  const abandonSession = useCallback(() => {
    clearTransitionTimers()
    pendingCorrectionRef.current = null
    setPendingAnswer(null)
    setFeedback(null)
    setState('idle')
    setSession(null)
    storage.clearActiveSession()
  }, [clearTransitionTimers, storage])

  const appendGeneratedQuestion = useCallback(
    (question: PracticeQuestion) => {
      setSession((current) => {
        if (!current || current.status !== 'active') return current
        const next = { ...current, questions: [...current.questions, question] }
        storage.saveActiveSession(next)
        return next
      })
    },
    [storage]
  )

  const failGeneratingNext = useCallback((message: string) => {
    setFeedback({ type: 'error', message })
    setState('error')
  }, [])

  const retryGeneratingNext = useCallback(() => {
    setFeedback(null)
    setState('generating_next')
  }, [])

  return {
    session,
    currentQuestion,
    state,
    feedback,
    pendingAnswer,
    canSubmit: state === 'active' || state === 'correction',
    startSession,
    resumeSession,
    submitAnswer,
    beginNextQuestion,
    nextQuestion: beginNextQuestion,
    appendGeneratedQuestion,
    failGeneratingNext,
    retryGeneratingNext,
    completeSession,
    abandonSession,
    acknowledgeInstruction,
    requestCoinForgiveness,
    cancelCoinForgiveness,
    applyCoinForgiveness,
    continueAfterCoinForgiveness,
  }
}
