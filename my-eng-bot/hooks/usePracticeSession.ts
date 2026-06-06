'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildLocalPracticeSession, buildPracticeSessionFromQuestions } from '@/lib/practice/builders/localPracticeBuilder'
import { buildPracticeWrongAnswerFeedback } from '@/lib/practice/practiceFeedbackCopy'
import {
  PRACTICE_ANSWER_REVEAL_MS,
  PRACTICE_CHECKING_MS,
  PRACTICE_FEEDBACK_MS,
} from '@/lib/practice/practiceAnswerPanelLock'
import { resolvePracticeRetryPolicy } from '@/lib/practice/practiceRetryPolicy'
import type { Audience } from '@/lib/types'
import { practiceStorage, type PracticeStorage } from '@/lib/practice/storage/practiceStorage'
import { resolvePracticeFlowStateForSession } from '@/lib/practice/practiceSessionFlow'
import { validatePracticeAnswer, type PracticeAnswerValidationContext } from '@/lib/practice/practiceValidation'
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
  completeSession: () => void
  abandonSession: () => void
  acknowledgeInstruction: () => void
}

const PRACTICE_WRONG_LIMIT_ENCOURAGEMENTS = [
  'Ты хорошо стараешься. Идём дальше — на следующем шаге точно получится.',
  'Хороший темп. Перейдём к следующему шагу и закрепим там.',
  'Это непростой момент, и ты справляешься. Двигаемся дальше.',
]

function pickPracticeWrongLimitEncouragement(seed: string): string {
  if (PRACTICE_WRONG_LIMIT_ENCOURAGEMENTS.length === 0) {
    return 'Ты хорошо стараешься. Идём дальше — на следующем шаге точно получится.'
  }
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return (
    PRACTICE_WRONG_LIMIT_ENCOURAGEMENTS[hash % PRACTICE_WRONG_LIMIT_ENCOURAGEMENTS.length] ??
    PRACTICE_WRONG_LIMIT_ENCOURAGEMENTS[0]!
  )
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
  const questionStartedAtRef = useRef(Date.now())
  const submittingRef = useRef(false)
  const pendingCorrectionRef = useRef<PracticeQuestion | null>(null)
  const answerRevealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const checkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const feedbackAutoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const beginNextQuestionRef = useRef<() => void>(() => {})

  const clearFeedbackAutoAdvance = useCallback(() => {
    if (feedbackAutoAdvanceRef.current) {
      clearTimeout(feedbackAutoAdvanceRef.current)
      feedbackAutoAdvanceRef.current = null
    }
  }, [])

  const clearAnswerRevealTimer = useCallback(() => {
    if (answerRevealTimerRef.current) {
      clearTimeout(answerRevealTimerRef.current)
      answerRevealTimerRef.current = null
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
    clearAnswerRevealTimer()
    clearCheckingTimer()
  }, [clearFeedbackAutoAdvance, clearAnswerRevealTimer, clearCheckingTimer])

  useEffect(() => {
    const restored = storage.loadActiveSession()
    if (!restored || restored.status !== 'active') return
    const normalized = {
      ...restored,
      wrongAttemptsOnCurrentQuestion: restored.wrongAttemptsOnCurrentQuestion ?? 0,
      instructionAcknowledged: restored.instructionAcknowledged ?? false,
    }
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
    setSession((current) => {
      if (!current) return current
      if (current.currentIndex >= current.questions.length - 1) {
        const completed = applyStatus(current, 'completed')
        storage.saveCompletedSession(completed)
        storage.clearActiveSession()
        setState('completed')
        return completed
      }
      const next = { ...current, currentIndex: current.currentIndex + 1, wrongAttemptsOnCurrentQuestion: 0 }
      questionStartedAtRef.current = Date.now()
      pendingCorrectionRef.current = null
      setFeedback(null)
      setPendingAnswer(null)
      setState('active')
      storage.saveActiveSession(next)
      return next
    })
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
    const normalized = {
      ...restored,
      wrongAttemptsOnCurrentQuestion: restored.wrongAttemptsOnCurrentQuestion ?? 0,
      instructionAcknowledged: restored.instructionAcknowledged ?? false,
    }
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
      setState('submitting')

      answerRevealTimerRef.current = setTimeout(() => {
        answerRevealTimerRef.current = null
        setState('checking')

        checkingTimerRef.current = setTimeout(() => {
          checkingTimerRef.current = null
          const correctionQuestion = pendingCorrectionRef.current
          const questionToValidate = correctionQuestion ?? currentQuestion
          const validationContext: PracticeAnswerValidationContext = correctionQuestion
            ? 'typed'
            : questionToValidate.options?.length && questionToValidate.type === 'choice'
              ? 'chip'
              : 'typed'
          const isCorrect = validatePracticeAnswer(cleanAnswer, questionToValidate, validationContext)
          const retryResolution = resolvePracticeRetryPolicy({
            currentWrongAttemptsOnQuestion: session.wrongAttemptsOnCurrentQuestion ?? 0,
            isCorrect,
          })
          const shouldAutoAdvanceAfterWrongLimit = !isCorrect && retryResolution.shouldAutoAdvanceToNextQuestion
          const answerFeedbackTone: 'success' | 'error' = isCorrect || shouldAutoAdvanceAfterWrongLimit ? 'success' : 'error'
          const answerFeedbackMessage = isCorrect
            ? correctionQuestion
              ? 'Отлично, закрепили. Идём дальше.'
              : 'Верно. Хороший ответ.'
            : shouldAutoAdvanceAfterWrongLimit
              ? pickPracticeWrongLimitEncouragement(
                  `${questionToValidate.id}|${session.answers.length}|${cleanAnswer.toLowerCase()}`
                )
              : buildPracticeWrongAnswerFeedback({
                  correctAnswer: questionToValidate.targetAnswer,
                  attemptNumber: Math.min(
                    2,
                    (session.wrongAttemptsOnCurrentQuestion ?? 0) + 1
                  ) as 1 | 2,
                  audience,
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

          if (isCorrect) {
            pendingCorrectionRef.current = null
            const targetQuestionCount = session.targetQuestionCount ?? session.questions.length
            const isAiAwaitingGeneration =
              session.generationSource === 'ai_generated' &&
              session.currentIndex >= session.questions.length - 1 &&
              session.questions.length < targetQuestionCount
            setFeedback({
              type: answerFeedbackTone,
              message: answerFeedbackMessage,
            })
            setState('feedback')
            if (isAiAwaitingGeneration) {
              scheduleFeedbackAdvance(() => {
                setFeedback(null)
                setState('generating_next')
              })
            } else {
              scheduleFeedbackAdvance(() => {
                beginNextQuestionRef.current()
              })
            }
          } else {
            if (shouldAutoAdvanceAfterWrongLimit) {
              pendingCorrectionRef.current = null
              setFeedback({
                type: answerFeedbackTone,
                message: answerFeedbackMessage,
              })
              setState('feedback')
              scheduleFeedbackAdvance(() => {
                beginNextQuestionRef.current()
              })
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
        }, PRACTICE_CHECKING_MS)
      }, PRACTICE_ANSWER_REVEAL_MS)
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
    completeSession,
    abandonSession,
    acknowledgeInstruction,
  }
}
