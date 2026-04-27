import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LessonData, LessonMistake, PostLessonContent } from '@/types/lesson'
import { validateAnswer } from '@/utils/validateAnswer'

export type LessonStatus = 'idle' | 'checking' | 'feedback' | 'completed'

export type LessonFeedback = {
  type: 'success' | 'error'
  message: string
}

export type BlockProgress = {
  visibleCount: number
  awaitsInput: boolean
}

export type LessonTimelineEntry = {
  stepIndex: number
  submittedAnswer: string | null
  feedback: LessonFeedback | null
  isCurrent: boolean
  step: LessonData['steps'][number]
}

const VALIDATION_DELAY_MS = 400
const AUTO_ADVANCE_DELAY_MS = 1500
const ENABLE_GAMIFICATION = false

function buildLessonHintWithCorrectAnswer(
  hint: string | undefined,
  correctAnswer: string
): string {
  const baseHint = hint?.trim() || 'Почти. Попробуйте еще раз.'
  return `${baseHint} Скажи: ${correctAnswer.trim()}`
}

export function useLessonEngine(lesson: LessonData | null) {
  const [currentStep, setCurrentStep] = useState(0)
  const [xp, setXp] = useState(0)
  const [combo, setCombo] = useState(0)
  const [status, setStatus] = useState<LessonStatus>('idle')
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null)
  const [feedbackByStep, setFeedbackByStep] = useState<Record<number, LessonFeedback>>({})
  const [submittedAnswersByStep, setSubmittedAnswersByStep] = useState<Record<number, string>>({})
  const [mistakes, setMistakes] = useState<LessonMistake[]>([])
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = useCallback(() => {
    timeoutRefs.current.forEach((timeoutId) => clearTimeout(timeoutId))
    timeoutRefs.current = []
  }, [])

  useEffect(() => {
    clearTimers()
    setCurrentStep(0)
    setXp(0)
    setCombo(0)
    setStatus('idle')
    setFeedback(null)
    setFeedbackByStep({})
    setSubmittedAnswersByStep({})
    setMistakes([])
  }, [lesson?.id, lesson?.runKey, clearTimers])

  useEffect(() => {
    return () => {
      clearTimers()
    }
  }, [clearTimers])

  const totalSteps = lesson?.steps.length ?? 0
  const step = lesson?.steps[currentStep] ?? null

  useEffect(() => {
    if (step?.stepType === 'completion') {
      setStatus('completed')
    }
  }, [step?.stepType])

  const blockProgress = useMemo<BlockProgress>(
    () => ({
      visibleCount: step?.bubbles.length ?? 0,
      awaitsInput: Boolean(step?.exercise),
    }),
    [step]
  )

  const goToStep = useCallback(
    (nextStepIndex: number) => {
      if (!lesson || totalSteps === 0) return
      clearTimers()
      const boundedIndex = Math.min(Math.max(nextStepIndex, 0), totalSteps - 1)
      setCurrentStep(boundedIndex)
      setFeedback(null)
      setStatus(lesson.steps[boundedIndex]?.stepType === 'completion' ? 'completed' : 'idle')
    },
    [lesson, totalSteps, clearTimers]
  )

  const goToNext = useCallback(() => {
    goToStep(currentStep + 1)
  }, [currentStep, goToStep])

  const handleAnswer = useCallback(
    (answer: string) => {
      if (!lesson || !step?.exercise) return
      const exercise = step.exercise

      clearTimers()
      setSubmittedAnswersByStep((current) => ({ ...current, [currentStep]: answer.trim() }))
      setFeedbackByStep((current) => {
        if (!(currentStep in current)) return current
        const next = { ...current }
        delete next[currentStep]
        return next
      })
      setFeedback(null)
      setStatus('checking')

      const isCorrect = validateAnswer(answer, exercise)
      const validationTimer = setTimeout(() => {
        if (isCorrect) {
          const successFeedback = { type: 'success', message: 'Верно. Переходим дальше.' } as const
          setXp((prev) => prev + 10)
          setCombo((prev) => prev + 1)
          setMistakes((current) => current.filter((item) => item.step !== step.stepNumber))
          setFeedback(successFeedback)
          setFeedbackByStep((current) => ({ ...current, [currentStep]: successFeedback }))
          setStatus('feedback')

          if (currentStep < totalSteps - 1) {
            const autoAdvanceTimer = setTimeout(() => {
              goToStep(currentStep + 1)
            }, AUTO_ADVANCE_DELAY_MS)
            timeoutRefs.current.push(autoAdvanceTimer)
          }
          return
        }

        setCombo(0)
        setMistakes((current) => {
          const next = current.filter((item) => item.step !== step.stepNumber)
          next.push({
            step: step.stepNumber,
            userAnswer: answer.trim(),
            correctAnswer: exercise.correctAnswer,
          })
          return next
        })
        const errorFeedback = {
          type: 'error',
          message: buildLessonHintWithCorrectAnswer(exercise.hint, exercise.correctAnswer),
        } as const
        setFeedback(errorFeedback)
        setFeedbackByStep((current) => ({ ...current, [currentStep]: errorFeedback }))
        setStatus('feedback')
      }, VALIDATION_DELAY_MS)

      timeoutRefs.current.push(validationTimer)
    },
    [lesson, step, currentStep, totalSteps, clearTimers, goToStep]
  )

  const footerDynamicText = feedback?.type === 'error' ? feedback.message : step?.footerDynamic ?? null
  const submittedAnswer = step ? submittedAnswersByStep[currentStep] ?? null : null
  const postLesson = useMemo<PostLessonContent | null>(() => {
    if (step?.stepType !== 'completion') return null
    return step.postLesson ?? null
  }, [step])
  const footerStaticText = useMemo(() => {
    if (!lesson || totalSteps === 0) return null

    if (status === 'completed' && postLesson?.staticFooterText) {
      return postLesson.staticFooterText
    }
    const progressText = `Шаг ${Math.min(currentStep + 1, totalSteps)}/${totalSteps}`
    if (!ENABLE_GAMIFICATION) return progressText

    const comboText = combo > 1 ? ` | COMBO x${combo}` : ''
    return `${progressText} | ${xp} XP${comboText}`
  }, [lesson, totalSteps, currentStep, combo, xp, status, postLesson?.staticFooterText])

  const effectiveFooterDynamicText =
    feedback?.type === 'error' ? feedback.message : status === 'completed' ? postLesson?.dynamicFooterText ?? step?.footerDynamic ?? null : step?.footerDynamic ?? null

  const footerTypingKey = useMemo(() => {
    if (!lesson) return 'lesson-footer'
    return `${lesson.id}:${lesson.runKey ?? 'static'}:${currentStep}:${feedback?.type === 'error' ? 'hint' : 'step'}`
  }, [lesson, currentStep, feedback?.type])

  const completedSteps = useMemo(() => {
    if (!lesson) return []
    return lesson.steps.slice(0, currentStep + 1).map((lessonStep) => lessonStep.stepNumber)
  }, [lesson, currentStep])

  const timeline = useMemo<LessonTimelineEntry[]>(() => {
    if (!lesson) return []

    return lesson.steps.slice(0, currentStep + 1).map((lessonStep, stepIndex) => ({
      stepIndex,
      submittedAnswer: submittedAnswersByStep[stepIndex] ?? null,
      feedback: stepIndex === currentStep ? feedback : feedbackByStep[stepIndex] ?? null,
      isCurrent: stepIndex === currentStep,
      step: lessonStep,
    }))
  }, [lesson, currentStep, submittedAnswersByStep, feedback, feedbackByStep])

  return {
    lesson,
    step,
    timeline,
    currentStep,
    totalSteps,
    xp,
    combo,
    status,
    feedback,
    submittedAnswer,
    mistakes,
    completedSteps,
    blockProgress,
    footerDynamicText: effectiveFooterDynamicText,
    footerStaticText,
    footerTypingKey,
    isCompletionStep: step?.stepType === 'completion',
    postLesson,
    handleAnswer,
    goToNext,
    goToStep,
    resetCombo: () => setCombo(0),
  }
}
