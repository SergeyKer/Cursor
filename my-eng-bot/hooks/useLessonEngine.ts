import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AdaptiveConfig, Exercise, LessonData, LessonMistake, PostLessonContent } from '@/types/lesson'
import { validateAnswer } from '@/utils/validateAnswer'
import { DEFAULT_ADAPTIVE_CONFIG, getNextVariant } from '@/utils/generateExerciseVariants'

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

export type ExerciseVariantProgress = {
  total: number
  current: number
} | null

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

function resolveAdaptiveConfig(config?: AdaptiveConfig): AdaptiveConfig {
  return {
    ...DEFAULT_ADAPTIVE_CONFIG,
    ...config,
  }
}

export function resolveExerciseForVariant(exercise?: Exercise | null, variantIndex: number = 0): Exercise | null {
  if (!exercise) return null
  const variants = exercise.variants ?? []
  const activeVariant = variants[variantIndex]
  if (!activeVariant) {
    return {
      ...exercise,
      currentVariantIndex: variantIndex,
    }
  }

  return {
    ...exercise,
    question: activeVariant.question,
    options: activeVariant.options,
    correctAnswer: activeVariant.correctAnswer,
    acceptedAnswers: activeVariant.acceptedAnswers ?? [activeVariant.correctAnswer],
    hint: activeVariant.hint,
    answerFormat: activeVariant.answerFormat ?? exercise.answerFormat,
    answerPolicy: activeVariant.answerPolicy ?? exercise.answerPolicy,
    currentVariantIndex: variantIndex,
  }
}

export function useLessonEngine(lesson: LessonData | null) {
  const [currentStep, setCurrentStep] = useState(0)
  const [xp, setXp] = useState(0)
  const [combo, setCombo] = useState(0)
  const [exerciseErrors, setExerciseErrors] = useState(0)
  const [currentVariantIndex, setCurrentVariantIndex] = useState(0)
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
    setExerciseErrors(0)
    setCurrentVariantIndex(0)
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
  const rawStep = lesson?.steps[currentStep] ?? null
  const activeExercise = useMemo(
    () => resolveExerciseForVariant(rawStep?.exercise, currentVariantIndex),
    [rawStep?.exercise, currentVariantIndex]
  )
  const step = useMemo(() => {
    if (!rawStep) return null
    if (!activeExercise) return rawStep
    return {
      ...rawStep,
      exercise: {
        ...activeExercise,
        variants: rawStep.exercise?.variants,
        adaptive: rawStep.exercise?.adaptive,
        difficultyProfile: rawStep.exercise?.difficultyProfile,
      },
    }
  }, [rawStep, activeExercise])

  useEffect(() => {
    if (step?.stepType === 'completion') {
      setStatus('completed')
    }
  }, [step?.stepType])

  useEffect(() => {
    const variants = rawStep?.exercise?.variants ?? []
    if (variants.length === 0) return

    const startDifficulty = rawStep?.exercise?.adaptive?.startDifficulty
    const preferredIndex = startDifficulty ? variants.findIndex((variant) => variant.difficulty === startDifficulty) : 0
    setCurrentVariantIndex(preferredIndex >= 0 ? preferredIndex : 0)
    setExerciseErrors(0)
  }, [rawStep?.stepNumber, rawStep?.exercise?.adaptive?.startDifficulty, rawStep?.exercise?.variants])

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
      setExerciseErrors(0)
      setCurrentVariantIndex(0)
      setFeedback(null)
      setStatus(lesson.steps[boundedIndex]?.stepType === 'completion' ? 'completed' : 'idle')
    },
    [lesson, totalSteps, clearTimers]
  )

  const goToNext = useCallback(() => {
    goToStep(currentStep + 1)
  }, [currentStep, goToStep])

  const clearCurrentStepTransientState = useCallback(() => {
    setSubmittedAnswersByStep((current) => {
      if (!(currentStep in current)) return current
      const next = { ...current }
      delete next[currentStep]
      return next
    })
    setFeedbackByStep((current) => {
      if (!(currentStep in current)) return current
      const next = { ...current }
      delete next[currentStep]
      return next
    })
    setFeedback(null)
    setStatus(rawStep?.stepType === 'completion' ? 'completed' : 'idle')
  }, [currentStep, rawStep?.stepType])

  const handleAnswer = useCallback(
    (answer: string) => {
      if (!lesson || !rawStep?.exercise || !activeExercise) return
      const baseExercise = rawStep.exercise
      const exercise = activeExercise
      const adaptiveConfig = resolveAdaptiveConfig(baseExercise.adaptive)
      const variants = baseExercise.variants ?? []

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
          const nextVariantIndex = variants.length
            ? getNextVariant(variants, currentVariantIndex, exerciseErrors, adaptiveConfig)
            : -1
          const isLastVariant = nextVariantIndex === -1
          const successFeedback = {
            type: 'success',
            message: isLastVariant ? 'Верно. Переходим дальше.' : 'Верно. Следующий вариант.',
          } as const
          setXp((prev) => prev + 10)
          setCombo((prev) => prev + 1)
          setExerciseErrors(0)
          setMistakes((current) => current.filter((item) => item.step !== rawStep.stepNumber))
          setFeedback(successFeedback)
          setFeedbackByStep((current) => ({ ...current, [currentStep]: successFeedback }))
          setStatus('feedback')

          if (!isLastVariant) {
            const nextVariantTimer = setTimeout(() => {
              setCurrentVariantIndex(nextVariantIndex)
              clearCurrentStepTransientState()
            }, AUTO_ADVANCE_DELAY_MS)
            timeoutRefs.current.push(nextVariantTimer)
            return
          }

          if (currentStep < totalSteps - 1) {
            const autoAdvanceTimer = setTimeout(() => {
              goToStep(currentStep + 1)
            }, AUTO_ADVANCE_DELAY_MS)
            timeoutRefs.current.push(autoAdvanceTimer)
          }
          return
        }

        setCombo(0)
        setExerciseErrors((prev) => prev + 1)
        setMistakes((current) => {
          const next = current.filter((item) => item.step !== rawStep.stepNumber)
          next.push({
            step: rawStep.stepNumber,
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

        const nextErrorCount = exerciseErrors + 1
        if (variants.length > 0 && nextErrorCount >= adaptiveConfig.errorThreshold) {
          const easierIndex = variants.findIndex((variant) => variant.difficulty === 'easy')
          if (easierIndex >= 0 && easierIndex !== currentVariantIndex) {
            const easierVariantTimer = setTimeout(() => {
              setCurrentVariantIndex(easierIndex)
              clearCurrentStepTransientState()
            }, AUTO_ADVANCE_DELAY_MS)
            timeoutRefs.current.push(easierVariantTimer)
          }
        }
      }, VALIDATION_DELAY_MS)

      timeoutRefs.current.push(validationTimer)
    },
    [
      lesson,
      rawStep,
      activeExercise,
      currentStep,
      totalSteps,
      clearTimers,
      goToStep,
      currentVariantIndex,
      exerciseErrors,
      clearCurrentStepTransientState,
    ]
  )

  const submittedAnswer = step ? submittedAnswersByStep[currentStep] ?? null : null
  const postLesson = useMemo<PostLessonContent | null>(() => {
    if (step?.stepType !== 'completion') return null
    return step.postLesson ?? null
  }, [step])
  const footerVariantProgress = useMemo<ExerciseVariantProgress>(() => {
    const variants = rawStep?.exercise?.variants ?? []
    if (variants.length <= 1) return null
    return {
      total: variants.length,
      current: currentVariantIndex,
    }
  }, [rawStep?.exercise?.variants, currentVariantIndex])
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

  const contextualFooterHint = useMemo(() => {
    if (exerciseErrors > 0 && activeExercise?.hint?.trim()) {
      return `💡 Подсказка: ${activeExercise.hint.trim()}`
    }
    return null
  }, [exerciseErrors, activeExercise?.hint])

  const effectiveFooterDynamicText =
    feedback?.type === 'error'
      ? feedback.message
      : status === 'completed'
        ? postLesson?.dynamicFooterText ?? step?.footerDynamic ?? null
        : contextualFooterHint ?? step?.footerDynamic ?? null

  const footerTypingKey = useMemo(() => {
    if (!lesson) return 'lesson-footer'
    return `${lesson.id}:${lesson.runKey ?? 'static'}:${currentStep}:${currentVariantIndex}:${feedback?.type === 'error' ? 'hint' : contextualFooterHint ? 'context' : 'step'}`
  }, [lesson, currentStep, currentVariantIndex, feedback?.type, contextualFooterHint])

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
      step: stepIndex === currentStep && step ? step : lessonStep,
    }))
  }, [lesson, currentStep, submittedAnswersByStep, feedback, feedbackByStep, step])

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
    exerciseErrors,
    currentVariantIndex,
    completedSteps,
    blockProgress,
    footerDynamicText: effectiveFooterDynamicText,
    footerStaticText,
    footerVariantProgress,
    footerTypingKey,
    isCompletionStep: step?.stepType === 'completion',
    postLesson,
    handleAnswer,
    goToNext,
    goToStep,
    resetCombo: () => setCombo(0),
  }
}
