'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildLocalPracticeSession, buildPracticeSessionFromQuestions } from '@/lib/practice/builders/localPracticeBuilder'
import { practiceStorage, type PracticeStorage } from '@/lib/practice/storage/practiceStorage'
import { validatePracticeAnswer } from '@/lib/practice/practiceValidation'
import type {
  PracticeAnswer,
  PracticeBuildConfig,
  PracticeQuestion,
  PracticeSession,
  PracticeSessionStatus,
} from '@/types/practice'

export type PracticeFlowState = 'idle' | 'active' | 'checking' | 'feedback' | 'correction' | 'completed' | 'error'

export interface PracticeFeedback {
  type: 'success' | 'error'
  message: string
}

export interface PracticeSessionControls {
  session: PracticeSession | null
  currentQuestion: PracticeQuestion | null
  state: PracticeFlowState
  feedback: PracticeFeedback | null
  canSubmit: boolean
  startSession: (config: PracticeBuildConfig) => PracticeSession
  resumeSession: () => PracticeSession | null
  submitAnswer: (answer: string) => void
  nextQuestion: () => void
  completeSession: () => void
  abandonSession: () => void
}

const CHECKING_DELAY_MS = 260

function applyStatus(session: PracticeSession, status: PracticeSessionStatus): PracticeSession {
  return { ...session, status, completedAt: status === 'completed' ? Date.now() : session.completedAt }
}

function createAnswer(params: {
  question: PracticeQuestion
  userAnswer: string
  isCorrect: boolean
  corrected: boolean
  startedAt: number
}): PracticeAnswer {
  const xpEarned = params.isCorrect ? params.question.xpBase : params.corrected ? Math.max(1, Math.floor(params.question.xpBase * 0.4)) : 0
  return {
    questionId: params.question.id,
    userAnswer: params.userAnswer,
    correctAnswer: params.question.targetAnswer,
    isCorrect: params.isCorrect,
    corrected: params.corrected,
    xpEarned,
    responseTimeMs: Math.max(0, Date.now() - params.startedAt),
    timestamp: Date.now(),
  }
}

export function usePracticeSession(storage: PracticeStorage = practiceStorage): PracticeSessionControls {
  const [session, setSession] = useState<PracticeSession | null>(null)
  const [state, setState] = useState<PracticeFlowState>('idle')
  const [feedback, setFeedback] = useState<PracticeFeedback | null>(null)
  const questionStartedAtRef = useRef(Date.now())
  const submittingRef = useRef(false)
  const pendingCorrectionRef = useRef<PracticeQuestion | null>(null)
  const checkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const restored = storage.loadActiveSession()
    if (!restored || restored.status !== 'active') return
    setSession(restored)
    setState('active')
    questionStartedAtRef.current = Date.now()
  }, [storage])

  useEffect(() => {
    return () => {
      if (checkingTimerRef.current) clearTimeout(checkingTimerRef.current)
    }
  }, [])

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

  const startSession = useCallback(
    (config: PracticeBuildConfig) => {
      const nextSession = config.questions?.length
        ? buildPracticeSessionFromQuestions(config, config.questions)
        : buildLocalPracticeSession(config)
      pendingCorrectionRef.current = null
      questionStartedAtRef.current = Date.now()
      setFeedback(null)
      setState('active')
      persistSession(nextSession)
      return nextSession
    },
    [persistSession]
  )

  const resumeSession = useCallback(() => {
    const restored = storage.loadActiveSession()
    if (!restored || restored.status !== 'active') return null
    pendingCorrectionRef.current = null
    questionStartedAtRef.current = Date.now()
    setFeedback(null)
    setState('active')
    setSession(restored)
    return restored
  }, [storage])

  const completeSession = useCallback(() => {
    setSession((current) => {
      if (!current) return current
      const completed = applyStatus(current, 'completed')
      storage.saveCompletedSession(completed)
      storage.clearActiveSession()
      setState('completed')
      return completed
    })
  }, [storage])

  const nextQuestion = useCallback(() => {
    setSession((current) => {
      if (!current) return current
      if (current.currentIndex >= current.questions.length - 1) {
        const completed = applyStatus(current, 'completed')
        storage.saveCompletedSession(completed)
        storage.clearActiveSession()
        setState('completed')
        return completed
      }
      const next = { ...current, currentIndex: current.currentIndex + 1 }
      questionStartedAtRef.current = Date.now()
      pendingCorrectionRef.current = null
      setFeedback(null)
      setState('active')
      storage.saveActiveSession(next)
      return next
    })
  }, [storage])

  const submitAnswer = useCallback(
    (answer: string) => {
      const cleanAnswer = answer.trim()
      if (!session || !currentQuestion || !cleanAnswer || submittingRef.current) return

      submittingRef.current = true
      setState('checking')

      if (checkingTimerRef.current) clearTimeout(checkingTimerRef.current)
      checkingTimerRef.current = setTimeout(() => {
        const correctionQuestion = pendingCorrectionRef.current
        const questionToValidate = correctionQuestion ?? currentQuestion
        const isCorrect = validatePracticeAnswer(cleanAnswer, questionToValidate)

        if (correctionQuestion && !isCorrect) {
          setFeedback({ type: 'error', message: `Ещё раз мягко: ${questionToValidate.targetAnswer}` })
          setState('correction')
          submittingRef.current = false
          return
        }

        const answerRecord = createAnswer({
          question: questionToValidate,
          userAnswer: cleanAnswer,
          isCorrect,
          corrected: Boolean(correctionQuestion),
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
          }
          storage.saveActiveSession(next)
          return next
        })

        if (isCorrect) {
          pendingCorrectionRef.current = null
          setFeedback({
            type: 'success',
            message: correctionQuestion ? 'Отлично, закрепили. Идём дальше.' : 'Верно. Хороший ответ.',
          })
          setState('feedback')
        } else {
          pendingCorrectionRef.current = questionToValidate
          setFeedback({
            type: 'error',
            message: `Почти. Правильный вариант: ${questionToValidate.targetAnswer}`,
          })
          setState('correction')
        }

        submittingRef.current = false
      }, CHECKING_DELAY_MS)
    },
    [currentQuestion, session, storage]
  )

  const abandonSession = useCallback(() => {
    pendingCorrectionRef.current = null
    setFeedback(null)
    setState('idle')
    setSession(null)
    storage.clearActiveSession()
  }, [storage])

  return {
    session,
    currentQuestion,
    state,
    feedback,
    canSubmit: state === 'active' || state === 'correction',
    startSession,
    resumeSession,
    submitAnswer,
    nextQuestion,
    completeSession,
    abandonSession,
  }
}
