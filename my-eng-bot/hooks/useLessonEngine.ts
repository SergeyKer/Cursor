import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LessonData } from '@/types/lesson'
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

const VALIDATION_DELAY_MS = 400
const AUTO_ADVANCE_DELAY_MS = 1500
const ENABLE_GAMIFICATION = false

export function useLessonEngine(lesson: LessonData | null) {
  const [currentStep, setCurrentStep] = useState(0)
  const [xp, setXp] = useState(0)
  const [combo, setCombo] = useState(0)
  const [status, setStatus] = useState<LessonStatus>('idle')
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null)
  const [submittedAnswersByStep, setSubmittedAnswersByStep] = useState<Record<number, string>>({})
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
    setSubmittedAnswersByStep({})
  }, [lesson?.id, clearTimers])

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
      setStatus('checking')

      const isCorrect = validateAnswer(answer, exercise.correctAnswer, exercise.type)
      const validationTimer = setTimeout(() => {
        if (isCorrect) {
          setXp((prev) => prev + 10)
          setCombo((prev) => prev + 1)
          setFeedback({ type: 'success', message: 'Верно. Переходим дальше.' })
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
        setFeedback({
          type: 'error',
          message: exercise.hint ?? 'Почти. Попробуйте еще раз.',
        })
        setStatus('feedback')
      }, VALIDATION_DELAY_MS)

      timeoutRefs.current.push(validationTimer)
    },
    [lesson, step, currentStep, totalSteps, clearTimers, goToStep]
  )

  const footerDynamicText = feedback?.type === 'error' ? feedback.message : step?.footerDynamic ?? null
  const submittedAnswer = step ? submittedAnswersByStep[currentStep] ?? null : null
  const footerStaticText = useMemo(() => {
    if (!lesson || totalSteps === 0) return null

    const progressText = `Шаг ${Math.min(currentStep + 1, totalSteps)}/${totalSteps}`
    if (!ENABLE_GAMIFICATION) return progressText

    const comboText = combo > 1 ? ` | COMBO x${combo}` : ''
    return `${progressText} | ${xp} XP${comboText}`
  }, [lesson, totalSteps, currentStep, combo, xp])

  const footerTypingKey = useMemo(() => {
    if (!lesson) return 'lesson-footer'
    return `${lesson.id}:${currentStep}:${feedback?.type === 'error' ? 'hint' : 'step'}`
  }, [lesson, currentStep, feedback?.type])

  return {
    lesson,
    step,
    currentStep,
    totalSteps,
    xp,
    combo,
    status,
    feedback,
    submittedAnswer,
    blockProgress,
    footerDynamicText,
    footerStaticText,
    footerTypingKey,
    handleAnswer,
    goToNext,
    goToStep,
    resetCombo: () => setCombo(0),
  }
}
