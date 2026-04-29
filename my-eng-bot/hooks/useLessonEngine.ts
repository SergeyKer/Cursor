import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AdaptiveConfig, Exercise, LessonData, LessonMistake, PostLessonContent } from '@/types/lesson'
import { validateAnswer } from '@/utils/validateAnswer'
import {
  pickFooterVoice,
  type FooterVoiceCandidate,
  type FooterVoiceEmphasis,
  type FooterVoiceTone,
} from '@/lib/footerVoice'
import { buildFinaleTimelineStep, getLessonLearningSteps, resolveLessonFinale } from '@/lib/lessonFinale'
import { getLessonRepeatFooterMessage, getVariantInfo } from '@/utils/footerMessages'

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

type LessonAttemptHistoryEntry = {
  submittedAnswer: string | null
  feedback: LessonFeedback
  stepSnapshot: LessonData['steps'][number]
}

export type ExerciseVariantProgress = {
  total: number
  current: number
} | null

export type LessonFooterVoice = {
  text: string | null
  typingKey: string | null
  tone: FooterVoiceTone
  emphasis: FooterVoiceEmphasis
}

const VALIDATION_DELAY_MS = 400
const AUTO_ADVANCE_DELAY_MS = 1500

function buildLessonHintMessage(hint: string | undefined): string {
  return hint?.trim() || 'Почти. Попробуйте еще раз.'
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
    question: activeVariant.question ?? exercise.question,
    options: activeVariant.options ?? exercise.options,
    correctAnswer: activeVariant.correctAnswer,
    acceptedAnswers:
      activeVariant.acceptedAnswers ??
      exercise.acceptedAnswers ??
      [activeVariant.correctAnswer],
    singleWordCueRu: activeVariant.singleWordCueRu ?? exercise.singleWordCueRu,
    hint: activeVariant.hint ?? exercise.hint,
    answerFormat: activeVariant.answerFormat ?? exercise.answerFormat,
    answerPolicy: activeVariant.answerPolicy ?? exercise.answerPolicy,
    currentVariantIndex: variantIndex,
  }
}

export function useLessonEngine(lesson: LessonData | null) {
  const [currentStep, setCurrentStep] = useState(0)
  const [phase, setPhase] = useState<'lesson' | 'finale'>('lesson')
  const [xp, setXp] = useState(0)
  const [combo, setCombo] = useState(0)
  const [exerciseErrors, setExerciseErrors] = useState(0)
  const [currentVariantIndex, setCurrentVariantIndex] = useState(0)
  const [status, setStatus] = useState<LessonStatus>('idle')
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null)
  const [feedbackByStep, setFeedbackByStep] = useState<Record<number, LessonFeedback>>({})
  const [submittedAnswersByStep, setSubmittedAnswersByStep] = useState<Record<number, string>>({})
  const [attemptHistoryByStep, setAttemptHistoryByStep] = useState<Record<number, LessonAttemptHistoryEntry[]>>({})
  const [mistakes, setMistakes] = useState<LessonMistake[]>([])
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = useCallback(() => {
    timeoutRefs.current.forEach((timeoutId) => clearTimeout(timeoutId))
    timeoutRefs.current = []
  }, [])

  useEffect(() => {
    clearTimers()
    setCurrentStep(0)
    setPhase('lesson')
    setXp(0)
    setCombo(0)
    setExerciseErrors(0)
    setCurrentVariantIndex(0)
    setStatus('idle')
    setFeedback(null)
    setFeedbackByStep({})
    setSubmittedAnswersByStep({})
    setAttemptHistoryByStep({})
    setMistakes([])
  }, [lesson?.id, lesson?.runKey, clearTimers])

  useEffect(() => {
    return () => {
      clearTimers()
    }
  }, [clearTimers])

  const learningSteps = useMemo(() => getLessonLearningSteps(lesson), [lesson])
  const finale = useMemo(() => resolveLessonFinale(lesson), [lesson])
  const totalSteps = learningSteps.length
  const isFinale = phase === 'finale'
  const finaleStep = useMemo(
    () => (lesson && finale ? buildFinaleTimelineStep(lesson, finale, totalSteps + 1) : null),
    [finale, lesson, totalSteps]
  )
  const rawStep = isFinale ? finaleStep : learningSteps[currentStep] ?? null
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
    if (isFinale) {
      setStatus('completed')
    }
  }, [isFinale])

  useEffect(() => {
    const variants = rawStep?.exercise?.variants ?? []
    if (variants.length === 0) return
    setCurrentVariantIndex(0)
    setExerciseErrors(0)
  }, [rawStep?.stepNumber, rawStep?.exercise?.variants])

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
      setPhase('lesson')
      setCurrentStep(boundedIndex)
      setExerciseErrors(0)
      setCurrentVariantIndex(0)
      setFeedback(null)
      setAttemptHistoryByStep((current) => {
        if (!(boundedIndex in current)) return current
        const next = { ...current }
        delete next[boundedIndex]
        return next
      })
      setStatus('idle')
    },
    [lesson, totalSteps, clearTimers]
  )

  const goToFinale = useCallback(() => {
    if (!lesson || !finale) return
    clearTimers()
    setPhase('finale')
    setExerciseErrors(0)
    setCurrentVariantIndex(0)
    setFeedback(null)
    setStatus('completed')
  }, [clearTimers, finale, lesson])

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
    setStatus(isFinale ? 'completed' : 'idle')
  }, [currentStep, isFinale])

  const handleAnswer = useCallback(
    (answer: string) => {
      if (!lesson || !rawStep?.exercise || !activeExercise) return
      const baseExercise = rawStep.exercise
      const exercise = activeExercise
      const variants = baseExercise.variants ?? []
      const trimmedAnswer = answer.trim()
      if (!trimmedAnswer || /^\/(?:[\w-]+)(?:\s.*)?$/.test(trimmedAnswer)) return

      clearTimers()
      setSubmittedAnswersByStep((current) => ({ ...current, [currentStep]: trimmedAnswer }))
      setFeedbackByStep((current) => {
        if (!(currentStep in current)) return current
        const next = { ...current }
        delete next[currentStep]
        return next
      })
      setFeedback(null)
      setStatus('checking')

      const isCorrect = validateAnswer(trimmedAnswer, exercise)
      const validationTimer = setTimeout(() => {
        if (isCorrect) {
          const nextVariantIndex = variants.length > 0 && currentVariantIndex < variants.length - 1 ? currentVariantIndex + 1 : -1
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
          setAttemptHistoryByStep((current) => ({
            ...current,
            [currentStep]: [
              ...(current[currentStep] ?? []),
              {
                submittedAnswer: trimmedAnswer,
                feedback: successFeedback,
                stepSnapshot: {
                  ...rawStep,
                  exercise: {
                    ...exercise,
                    variants: rawStep.exercise?.variants,
                    adaptive: rawStep.exercise?.adaptive,
                    difficultyProfile: rawStep.exercise?.difficultyProfile,
                  },
                },
              },
            ],
          }))
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
          } else if (finale) {
            const finaleTimer = setTimeout(() => {
              goToFinale()
            }, AUTO_ADVANCE_DELAY_MS)
            timeoutRefs.current.push(finaleTimer)
          }
          return
        }

        setCombo(0)
        setExerciseErrors((prev) => prev + 1)
        setMistakes((current) => {
          const next = current.filter((item) => item.step !== rawStep.stepNumber)
          next.push({
            step: rawStep.stepNumber,
            userAnswer: trimmedAnswer,
            correctAnswer: exercise.correctAnswer,
          })
          return next
        })
        const errorFeedback = {
          type: 'error',
          message: buildLessonHintMessage(exercise.hint),
        } as const
        setFeedback(errorFeedback)
        setFeedbackByStep((current) => ({ ...current, [currentStep]: errorFeedback }))
        setAttemptHistoryByStep((current) => ({
          ...current,
          [currentStep]: [
            ...(current[currentStep] ?? []),
            {
              submittedAnswer: trimmedAnswer,
              feedback: errorFeedback,
              stepSnapshot: {
                ...rawStep,
                exercise: {
                  ...exercise,
                  variants: rawStep.exercise?.variants,
                  adaptive: rawStep.exercise?.adaptive,
                  difficultyProfile: rawStep.exercise?.difficultyProfile,
                },
              },
            },
          ],
        }))
        setStatus('feedback')
      }, VALIDATION_DELAY_MS)

      timeoutRefs.current.push(validationTimer)
    },
    [
      lesson,
      rawStep,
      activeExercise,
      currentStep,
      totalSteps,
      finale,
      clearTimers,
      goToStep,
      goToFinale,
      currentVariantIndex,
      clearCurrentStepTransientState,
    ]
  )

  const completeCurrentStep = useCallback(
    (options?: { submittedAnswer?: string; message?: string; xpAward?: number }) => {
      if (!lesson || !rawStep?.exercise || isFinale) return
      clearTimers()
      const submitted = options?.submittedAnswer?.trim() || rawStep.exercise.correctAnswer
      const successFeedback = {
        type: 'success',
        message: options?.message ?? 'Верно. Переходим дальше.',
      } as const

      setSubmittedAnswersByStep((current) => ({ ...current, [currentStep]: submitted }))
      setFeedback(successFeedback)
      setFeedbackByStep((current) => ({ ...current, [currentStep]: successFeedback }))
      setAttemptHistoryByStep((current) => ({
        ...current,
        [currentStep]: [
          ...(current[currentStep] ?? []),
          {
            submittedAnswer: submitted,
            feedback: successFeedback,
            stepSnapshot: rawStep,
          },
        ],
      }))
      setXp((prev) => prev + (options?.xpAward ?? 10))
      setCombo((prev) => prev + 1)
      setExerciseErrors(0)
      setMistakes((current) => current.filter((item) => item.step !== rawStep.stepNumber))
      setStatus('feedback')

      const nextTimer = setTimeout(() => {
        if (currentStep < totalSteps - 1) {
          goToStep(currentStep + 1)
          return
        }
        if (finale) {
          goToFinale()
        }
      }, AUTO_ADVANCE_DELAY_MS)
      timeoutRefs.current.push(nextTimer)
    },
    [clearTimers, currentStep, finale, goToFinale, goToStep, isFinale, lesson, rawStep, totalSteps]
  )

  const submittedAnswer = step ? submittedAnswersByStep[currentStep] ?? null : null
  const postLesson = useMemo<PostLessonContent | null>(() => {
    return isFinale ? finale?.postLesson ?? null : null
  }, [finale?.postLesson, isFinale])
  const footerVariantProgress = useMemo<ExerciseVariantProgress>(() => {
    const variants = rawStep?.exercise?.variants ?? []
    if (variants.length <= 1) return null
    return {
      total: variants.length,
      current: currentVariantIndex,
    }
  }, [rawStep?.exercise?.variants, currentVariantIndex])
  const footerVariantInfo = useMemo(() => getVariantInfo(activeExercise), [activeExercise])
  const repeatFooterMessage = useMemo(
    () => getLessonRepeatFooterMessage(step?.stepNumber, footerVariantInfo),
    [footerVariantInfo, step?.stepNumber]
  )
  const footerStaticText = useMemo(() => {
    if (!lesson || totalSteps === 0) return null

    if (isFinale && postLesson?.staticFooterText) {
      return postLesson.staticFooterText
    }
    const progressText = `Шаг ${Math.min(currentStep + 1, totalSteps)}/${totalSteps}`
    return `${progressText} | ${xp} XP | COMBO x${combo}`
  }, [combo, currentStep, isFinale, lesson, postLesson?.staticFooterText, totalSteps, xp])

  const contextualFooterHint = useMemo(() => {
    if (exerciseErrors > 0 && activeExercise?.hint?.trim()) {
      return `💡 ${buildLessonHintMessage(activeExercise.hint)}`
    }
    return null
  }, [exerciseErrors, activeExercise?.hint])

  const footerVoice = useMemo<LessonFooterVoice>(() => {
    const candidates: Array<FooterVoiceCandidate | null> = [
        isFinale
          ? {
              key: 'lesson-completed',
              priority: 100,
              text: finale?.myEngComment ?? 'Урок пройден. Готовы дальше?',
              compactText: 'Урок пройден. Дальше?',
              tone: 'celebrate',
              emphasis: 'pulse',
            }
          : null,
        feedback?.type === 'error'
          ? {
              key: exerciseErrors >= 2 ? 'lesson-error-support-strong' : 'lesson-error-support',
              priority: 95,
              text: exerciseErrors >= 2 ? 'Ничего, еще одна попытка.' : 'Почти. Попробуйте еще раз.',
              compactText: 'Почти. Еще раз.',
              tone: 'support',
            }
          : null,
        status === 'checking'
          ? {
              key: 'lesson-checking',
              priority: 90,
              text: 'Смотрю ваш ответ.',
              compactText: 'Смотрю ответ.',
              tone: 'thinking',
            }
          : null,
        feedback?.type === 'success' && combo >= 5
          ? {
              key: `lesson-combo-${combo}`,
              priority: 85,
              text: `COMBO x${combo}! Вы летите!`,
              compactText: `COMBO x${combo}!`,
              tone: 'celebrate',
              emphasis: 'pulse',
            }
          : null,
        feedback?.type === 'success' && combo >= 3
          ? {
              key: `lesson-combo-${combo}`,
              priority: 80,
              text: `COMBO x${combo}! Так держать!`,
              compactText: `COMBO x${combo}!`,
              tone: 'celebrate',
            }
          : null,
        feedback?.type === 'success'
          ? {
              key: 'lesson-success',
              priority: 75,
              text: 'Верно. Идем дальше.',
              compactText: 'Верно. Дальше.',
              tone: 'support',
            }
          : null,
        repeatFooterMessage
          ? {
              key: `lesson-repeat-${step?.stepNumber ?? currentStep}-${footerVariantInfo?.current ?? 0}`,
              priority: 60,
              text: repeatFooterMessage,
              compactText: repeatFooterMessage,
              tone: 'neutral',
            }
          : null,
        step?.myEngComment
          ? {
              key: `lesson-step-${step.stepNumber}`,
              priority: 50,
              text: step.myEngComment,
              tone: 'neutral',
            }
          : null,
        contextualFooterHint
          ? {
              key: `lesson-context-${step?.stepNumber ?? currentStep}`,
              priority: 20,
              text: contextualFooterHint,
              compactText: 'Есть подсказка.',
              tone: 'hint',
            }
          : null,
        step?.footerDynamic
          ? {
              key: `lesson-fallback-${step.stepNumber}`,
              priority: 10,
              text: step.footerDynamic,
              compactText: step.footerDynamic,
              tone: 'neutral',
            }
          : null,
      ]
    const voice = pickFooterVoice(
      candidates.filter((candidate): candidate is FooterVoiceCandidate => candidate !== null),
      { maxLength: 46 }
    )

    return {
      text: voice?.text ?? null,
      typingKey: voice && lesson ? `${lesson.id}:${lesson.runKey ?? 'static'}:${currentStep}:${currentVariantIndex}:${voice.typingKey}` : null,
      tone: voice?.tone ?? 'neutral',
      emphasis: voice?.emphasis ?? 'none',
    }
  }, [
    combo,
    contextualFooterHint,
    currentStep,
    currentVariantIndex,
    exerciseErrors,
    feedback?.type,
    finale?.myEngComment,
    footerVariantInfo,
    isFinale,
    lesson,
    repeatFooterMessage,
    status,
    step?.footerDynamic,
    step?.myEngComment,
    step?.stepNumber,
  ])

  const completedSteps = useMemo(() => {
    if (!lesson) return []
    const visibleCount = isFinale ? totalSteps : Math.min(currentStep + 1, totalSteps)
    return learningSteps.slice(0, visibleCount).map((lessonStep) => lessonStep.stepNumber)
  }, [currentStep, isFinale, learningSteps, lesson, totalSteps])

  const timeline = useMemo<LessonTimelineEntry[]>(() => {
    if (!lesson) return []

    const completedLearningCount = isFinale ? totalSteps : currentStep
    const completedEntries = learningSteps.slice(0, completedLearningCount).flatMap((lessonStep, stepIndex) => {
      const attempts = attemptHistoryByStep[stepIndex] ?? []
      if (attempts.length > 0) {
        return attempts.map((attempt) => ({
          stepIndex,
          submittedAnswer: attempt.submittedAnswer,
          feedback: attempt.feedback,
          isCurrent: false,
          step: attempt.stepSnapshot,
        }))
      }
      return [
        {
          stepIndex,
          submittedAnswer: submittedAnswersByStep[stepIndex] ?? null,
          feedback: feedbackByStep[stepIndex] ?? null,
          isCurrent: false,
          step: lessonStep,
        },
      ]
    })

    const currentLessonStep = isFinale ? finaleStep : learningSteps[currentStep]
    if (!currentLessonStep) return completedEntries

    const currentStepAttempts = isFinale ? [] : attemptHistoryByStep[currentStep] ?? []
    const currentAttemptEntries: LessonTimelineEntry[] = currentStepAttempts.map((attempt) => ({
      stepIndex: currentStep,
      submittedAnswer: attempt.submittedAnswer,
      feedback: attempt.feedback,
      isCurrent: false,
      step: attempt.stepSnapshot,
    }))

    const hasRenderedAttempts = currentStepAttempts.length > 0
    const currentEntry: LessonTimelineEntry = {
      stepIndex: isFinale ? totalSteps : currentStep,
      submittedAnswer: isFinale ? null : hasRenderedAttempts ? null : submittedAnswersByStep[currentStep] ?? null,
      feedback: hasRenderedAttempts ? null : feedback,
      isCurrent: true,
      step: step ?? currentLessonStep,
    }

    return [...completedEntries, ...currentAttemptEntries, currentEntry]
  }, [
    lesson,
    isFinale,
    totalSteps,
    currentStep,
    learningSteps,
    finaleStep,
    submittedAnswersByStep,
    feedback,
    feedbackByStep,
    step,
    attemptHistoryByStep,
  ])

  return {
    lesson,
    step,
    timeline,
    currentStep,
    totalSteps,
    phase,
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
    footerDynamicText: footerVoice.text,
    footerStaticText,
    footerVariantProgress,
    footerTypingKey: footerVoice.typingKey,
    footerVoiceTone: footerVoice.tone,
    footerVoiceEmphasis: footerVoice.emphasis,
    isCompletionStep: isFinale,
    isFinale,
    finale,
    postLesson,
    handleAnswer,
    completeCurrentStep,
    goToNext,
    goToStep,
    resetCombo: () => setCombo(0),
  }
}
