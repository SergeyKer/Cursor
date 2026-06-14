import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AdaptiveConfig, LessonData, LessonMistake, PostLessonContent } from '@/types/lesson'
import { validateAnswer } from '@/utils/validateAnswer'
import {
  pickFooterVoice,
  FOOTER_DYNAMIC_MAX_LENGTH,
  type FooterVoiceCandidate,
  type FooterVoiceEmphasis,
  type FooterVoiceTone,
} from '@/lib/footerVoice'
import { buildFinaleTimelineStep, getLessonLearningSteps, resolveLessonFinale } from '@/lib/lessonFinale'
import {
  applyComboXpAward,
  awardCoreXpForUnit,
  computeCorePercent,
  getComboMilestoneXp,
  listLessonScoringUnits,
  MAX_CORE_XP_DEFAULT,
  sumMaxCoreXpForLesson,
} from '@/lib/lessonScore'

const COMBO_MILESTONES = [
  { combo: 3, xp: 5 },
  { combo: 5, xp: 10 },
  { combo: 7, xp: 15 },
] as const
import {
  buildLessonAdvanceMessage,
  buildLessonNextPuzzleSubMessage,
  buildLessonNextVariantMessage,
  getLessonRepeatFooterMessage,
  getVariantInfo,
} from '@/utils/footerMessages'
import type { Exercise } from '@/types/lesson'
import {
  buildPuzzleFooterVoiceCandidate,
  resolvePuzzleAttemptChatMessage,
} from '@/lib/puzzlePanelLayout'
import { formatComboFooterVoiceLabel, formatComboMilestoneBlockedCelebration, formatComboSegmentText } from '@/lib/gamificationGlyphs'
import {
  ENGVO_CHECKING_FOOTER,
  ENGVO_LESSON_ADVANCING_FOOTER,
  ENGVO_LESSON_ADVANCING_VARIANT_FOOTER,
} from '@/lib/engvoPersonaCopy'
import {
  LESSON_SUCCESS_HOLD_MS,
  LESSON_VALIDATION_DELAY_MS,
} from '@/lib/lessonAnswerPanelLock'
import { getLessonCoinForgivenessCopy, type LessonCoinForgivenessAudience } from '@/lib/lessonCoinForgivenessCopy'
import { isCoinForgivenessExercise, isCoinForgivenessStep } from '@/lib/lessonCoinForgiveness'

/** Откладывает итог проверки (validate внутри onAfterDelay), как в практике. */
export function scheduleLessonCheckingOutcome(
  onAfterDelay: () => void,
  schedule: (handler: () => void, delayMs: number) => ReturnType<typeof setTimeout>,
  delayMs: number = LESSON_VALIDATION_DELAY_MS,
): ReturnType<typeof setTimeout> {
  return schedule(onAfterDelay, delayMs)
}


function getUpcomingLessonTaskTotal(exercise?: Exercise | null): number | undefined {
  if (!exercise) return undefined
  const variantCount = exercise.variants?.length ?? 0
  if (variantCount > 1) return variantCount
  const puzzleCount = exercise.puzzleVariants?.length ?? 0
  if (puzzleCount > 1) return puzzleCount
  return undefined
}

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

/**
 * Хвост timeline для текущего шага.
 * - Пазл: карточка задания → попытки (feedback под инструкцией).
 * - Остальные шаги: попытки → карточка (новый вариант внизу ленты, виден при скролле).
 */
export function buildActiveStepTimeline(
  completedEntries: LessonTimelineEntry[],
  currentEntry: LessonTimelineEntry,
  currentAttemptEntries: LessonTimelineEntry[],
  exerciseType?: Exercise['type'],
): LessonTimelineEntry[] {
  const isPuzzle = exerciseType === 'sentence_puzzle'
  return isPuzzle
    ? [...completedEntries, currentEntry, ...currentAttemptEntries]
    : [...completedEntries, ...currentAttemptEntries, currentEntry]
}

/** Ответ в currentEntry: при checking показываем в ленте даже после первой ошибки. */
export function resolveLessonCurrentEntrySubmittedAnswer(params: {
  isFinale: boolean
  status: LessonStatus
  currentStep: number
  hasRenderedAttempts: boolean
  submittedAnswersByStep: Record<number, string>
}): string | null {
  if (params.isFinale) return null
  if (params.status === 'checking') {
    return params.submittedAnswersByStep[params.currentStep] ?? null
  }
  if (params.hasRenderedAttempts) return null
  return params.submittedAnswersByStep[params.currentStep] ?? null
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

export interface LessonXpAward {
  core: number
  combo: number
  total: number
  nonce: number
  comboMilestoneBlocked?: boolean
}

const INITIAL_LESSON_XP_AWARD: LessonXpAward = { core: 0, combo: 0, total: 0, nonce: 0 }

export type LessonAnswerOptions = {
  attemptIndexOverride?: number
}

export type UseLessonEngineOptions = {
  audience?: LessonCoinForgivenessAudience
}

export function useLessonEngine(lesson: LessonData | null, options: UseLessonEngineOptions = {}) {
  const audience = options.audience ?? 'adult'
  const [currentStep, setCurrentStep] = useState(0)
  const [phase, setPhase] = useState<'lesson' | 'finale'>('lesson')
  const [coreXp, setCoreXp] = useState(0)
  const [comboXp, setComboXp] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [lastCoreDelta, setLastCoreDelta] = useState(0)
  const [lastComboDelta, setLastComboDelta] = useState(0)
  const [lastXpAward, setLastXpAward] = useState<LessonXpAward>(INITIAL_LESSON_XP_AWARD)
  const [lastComboMilestoneBlocked, setLastComboMilestoneBlocked] = useState(false)
  const comboRef = useRef(0)
  const claimedComboMilestonesRef = useRef<Set<number>>(new Set())
  const [exerciseErrors, setExerciseErrors] = useState(0)
  const [currentVariantIndex, setCurrentVariantIndex] = useState(0)
  const [status, setStatus] = useState<LessonStatus>('idle')
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null)
  const [feedbackByStep, setFeedbackByStep] = useState<Record<number, LessonFeedback>>({})
  const [submittedAnswersByStep, setSubmittedAnswersByStep] = useState<Record<number, string>>({})
  const [attemptHistoryByStep, setAttemptHistoryByStep] = useState<Record<number, LessonAttemptHistoryEntry[]>>({})
  const [puzzleProgress, setPuzzleProgress] = useState<{ subIndex: number; subTotal: number } | null>(null)
  const [puzzleSubAdvanceToken, setPuzzleSubAdvanceToken] = useState(0)
  const [forgivenessUsedThisRun, setForgivenessUsedThisRun] = useState(false)
  const [forgivenessOfferDeclinedThisRun, setForgivenessOfferDeclinedThisRun] = useState(false)
  const [forgivenessConfirmPending, setForgivenessConfirmPending] = useState(false)
  const [puzzleAttemptForgivenessToken, setPuzzleAttemptForgivenessToken] = useState(0)
  const [forgivenessAutofillAnswer, setForgivenessAutofillAnswer] = useState<string | null>(null)
  const [forgivenessAutofillChoice, setForgivenessAutofillChoice] = useState<string | null>(null)
  const [forgivenessAutofillNonce, setForgivenessAutofillNonce] = useState(0)
  const [coinForgivenessFooterPulse, setCoinForgivenessFooterPulse] = useState(false)
  const [isAdvancingToNextStep, setIsAdvancingToNextStep] = useState(false)
  const [isAdvancingToNextVariant, setIsAdvancingToNextVariant] = useState(false)
  const [mistakes, setMistakes] = useState<LessonMistake[]>([])
  const [firstTryCount, setFirstTryCount] = useState(0)
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearAdvanceFlags = useCallback(() => {
    setIsAdvancingToNextStep(false)
    setIsAdvancingToNextVariant(false)
  }, [])

  const clearTimers = useCallback(() => {
    timeoutRefs.current.forEach((timeoutId) => clearTimeout(timeoutId))
    timeoutRefs.current = []
    clearAdvanceFlags()
  }, [clearAdvanceFlags])

  useEffect(() => {
    clearTimers()
    setCurrentStep(0)
    setPhase('lesson')
    setCoreXp(0)
    setComboXp(0)
    setCombo(0)
    setMaxCombo(0)
    setLastCoreDelta(0)
    setLastComboDelta(0)
    setLastXpAward(INITIAL_LESSON_XP_AWARD)
    setLastComboMilestoneBlocked(false)
    comboRef.current = 0
    claimedComboMilestonesRef.current = new Set()
    setExerciseErrors(0)
    setCurrentVariantIndex(0)
    setStatus('idle')
    setFeedback(null)
    setFeedbackByStep({})
    setSubmittedAnswersByStep({})
    setAttemptHistoryByStep({})
    setPuzzleSubAdvanceToken(0)
    setForgivenessUsedThisRun(false)
    setForgivenessOfferDeclinedThisRun(false)
    setForgivenessConfirmPending(false)
    setPuzzleAttemptForgivenessToken(0)
    setForgivenessAutofillAnswer(null)
    setForgivenessAutofillChoice(null)
    setForgivenessAutofillNonce(0)
    setCoinForgivenessFooterPulse(false)
    clearAdvanceFlags()
    setMistakes([])
    setFirstTryCount(0)
  }, [lesson?.id, lesson?.runKey, clearTimers, clearAdvanceFlags])

  useEffect(() => {
    return () => {
      clearTimers()
    }
  }, [clearTimers])

  useEffect(() => {
    comboRef.current = combo
  }, [combo])

  const learningSteps = useMemo(() => getLessonLearningSteps(lesson), [lesson])
  const finale = useMemo(() => resolveLessonFinale(lesson), [lesson])
  const maxCoreXp = useMemo(
    () => (lesson ? sumMaxCoreXpForLesson(lesson) : MAX_CORE_XP_DEFAULT),
    [lesson]
  )
  const totalScoredUnits = useMemo(
    () => (lesson ? listLessonScoringUnits(lesson).length : 0),
    [lesson]
  )
  const totalXp = coreXp + comboXp

  const applySuccessAward = useCallback(
    (params: { stepNumber: number; variantIndex?: number; puzzleSubIndex?: number; attemptIndex: number }) => {
      if (!lesson) return
      if (params.attemptIndex === 0) {
        setFirstTryCount((current) => current + 1)
      }
      const awardedCore = awardCoreXpForUnit(lesson, {
        stepNumber: params.stepNumber,
        variantIndex: params.variantIndex,
        puzzleSubIndex: params.puzzleSubIndex,
        attemptIndex: params.attemptIndex,
      })

      const nextCombo = comboRef.current + 1
      comboRef.current = nextCombo

      const coreAfterStep = coreXp + awardedCore
      let comboAward = 0
      const milestone = getComboMilestoneXp(nextCombo, claimedComboMilestonesRef.current, {
        coreXp: coreAfterStep,
        maxCoreXp,
      })
      const wouldBeMilestone = COMBO_MILESTONES.some((item) => item.combo === nextCombo)
      const comboMilestoneBlocked =
        wouldBeMilestone &&
        !claimedComboMilestonesRef.current.has(nextCombo) &&
        !milestone &&
        computeCorePercent(coreAfterStep, maxCoreXp) < 50
      if (milestone) {
        claimedComboMilestonesRef.current.add(milestone.combo)
        comboAward = milestone.xp
      }
      setLastComboMilestoneBlocked(comboMilestoneBlocked)

      const totalAward = awardedCore + comboAward
      if (totalAward > 0 || comboMilestoneBlocked) {
        setLastXpAward((prev) => ({
          core: awardedCore,
          combo: comboAward,
          total: totalAward,
          nonce: prev.nonce + 1,
          comboMilestoneBlocked,
        }))
      }

      if (awardedCore > 0) {
        setCoreXp((prev) => prev + awardedCore)
        setLastCoreDelta(awardedCore)
      } else {
        setLastCoreDelta(0)
      }

      setCombo(nextCombo)
      setMaxCombo((current) => Math.max(current, nextCombo))
      if (comboAward > 0) {
        setComboXp((comboPrev) => applyComboXpAward(comboPrev, comboAward))
        setLastComboDelta(comboAward)
      } else {
        setLastComboDelta(0)
      }
    },
    [coreXp, lesson, maxCoreXp]
  )
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

  useEffect(() => {
    setPuzzleProgress(null)
  }, [rawStep?.stepNumber, rawStep?.exercise?.type])

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
      setPuzzleSubAdvanceToken(0)
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
    setPuzzleSubAdvanceToken(0)
    setFeedback(null)
    setStatus('completed')
  }, [clearTimers, finale, lesson])

  const goToNext = useCallback(() => {
    goToStep(currentStep + 1)
  }, [currentStep, goToStep])

  const scheduleSuccessAdvance = useCallback(
    (kind: 'variant' | 'step', onAdvance: () => void) => {
      if (kind === 'variant') {
        setIsAdvancingToNextVariant(true)
        setIsAdvancingToNextStep(false)
      } else {
        setIsAdvancingToNextStep(true)
        setIsAdvancingToNextVariant(false)
      }
      const timer = setTimeout(() => {
        clearAdvanceFlags()
        onAdvance()
      }, LESSON_SUCCESS_HOLD_MS)
      timeoutRefs.current.push(timer)
    },
    [clearAdvanceFlags]
  )

  const clearCurrentStepTransientState = useCallback(() => {
    clearAdvanceFlags()
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
  }, [clearAdvanceFlags, currentStep, isFinale])

  const beginLessonCheckingPhase = useCallback(
    (submittedAnswer: string, onAfterDelay: () => void) => {
      clearTimers()
      setSubmittedAnswersByStep((current) => ({ ...current, [currentStep]: submittedAnswer }))
      setFeedbackByStep((current) => {
        if (!(currentStep in current)) return current
        const next = { ...current }
        delete next[currentStep]
        return next
      })
      setFeedback(null)
      setStatus('checking')
      const validationTimer = scheduleLessonCheckingOutcome(
        onAfterDelay,
        (handler, delayMs) => setTimeout(handler, delayMs)
      )
      timeoutRefs.current.push(validationTimer)
    },
    [clearTimers, currentStep]
  )

  const handleAnswer = useCallback(
    (answer: string, answerOptions?: LessonAnswerOptions) => {
      if (!lesson || !rawStep?.exercise || !activeExercise) return
      const baseExercise = rawStep.exercise
      const exercise = activeExercise
      const variants = baseExercise.variants ?? []
      const trimmedAnswer = answer.trim()
      if (!trimmedAnswer || /^\/(?:[\w-]+)(?:\s.*)?$/.test(trimmedAnswer)) return

      beginLessonCheckingPhase(trimmedAnswer, () => {
        const isCorrect = validateAnswer(trimmedAnswer, exercise)
        if (isCorrect) {
          const nextVariantIndex = variants.length > 0 && currentVariantIndex < variants.length - 1 ? currentVariantIndex + 1 : -1
          const isLastVariant = nextVariantIndex === -1
          const successFeedback = {
            type: 'success',
            message: isLastVariant
              ? (() => {
                  const nextLearningStep =
                    currentStep < totalSteps - 1 ? learningSteps[currentStep + 1] : null
                  return buildLessonAdvanceMessage({
                    currentStep,
                    totalSteps,
                    stepNumber: rawStep.stepNumber,
                    taskCurrent: variants.length > 1 ? currentVariantIndex + 1 : undefined,
                    taskTotal: variants.length > 1 ? variants.length : undefined,
                    nextStepNumber: nextLearningStep?.stepNumber,
                    nextTaskTotal: getUpcomingLessonTaskTotal(nextLearningStep?.exercise),
                  })
                })()
              : buildLessonNextVariantMessage({
                  stepNumber: rawStep.stepNumber,
                  nextVariantIndex,
                  variantTotal: variants.length,
                }),
          } as const
          applySuccessAward({
            stepNumber: rawStep.stepNumber,
            variantIndex: variants.length > 0 ? currentVariantIndex : undefined,
            attemptIndex: answerOptions?.attemptIndexOverride ?? exerciseErrors,
          })
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
            scheduleSuccessAdvance('variant', () => {
              setCurrentVariantIndex(nextVariantIndex)
              clearCurrentStepTransientState()
            })
            return
          }

          if (currentStep < totalSteps - 1) {
            scheduleSuccessAdvance('step', () => {
              goToStep(currentStep + 1)
            })
          } else if (finale) {
            const finaleTimer = setTimeout(() => {
              goToFinale()
            }, LESSON_SUCCESS_HOLD_MS)
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
      })
    },
    [
      lesson,
      rawStep,
      activeExercise,
      currentStep,
      totalSteps,
      finale,
      beginLessonCheckingPhase,
      goToStep,
      goToFinale,
      currentVariantIndex,
      clearCurrentStepTransientState,
      learningSteps,
      applySuccessAward,
      exerciseErrors,
      scheduleSuccessAdvance,
    ]
  )

  const awardPuzzleSubStep = useCallback(
    (puzzleSubIndex: number, attemptsBeforeSuccess: number) => {
      if (!rawStep) return
      applySuccessAward({
        stepNumber: rawStep.stepNumber,
        puzzleSubIndex,
        attemptIndex: attemptsBeforeSuccess,
      })
      setExerciseErrors(0)
      setMistakes((current) => current.filter((item) => item.step !== rawStep.stepNumber))
    },
    [applySuccessAward, rawStep]
  )

  const clearPuzzleAttemptFeedback = useCallback(() => {
    setFeedback(null)
    setStatus('idle')
  }, [])

  const recordPuzzleAttempt = useCallback(
    (
      params:
        | {
            subIndex: number
            submittedAnswer: string
            type: 'error'
            attempts: number
            errorText: string
            hintText: string
            wordCount: number
            correctAnswer: string
          }
        | {
            subIndex: number
            submittedAnswer: string
            type: 'success'
            attempts: number
          }
    ) => {
      if (!lesson || !rawStep?.exercise || rawStep.exercise.type !== 'sentence_puzzle') return

      const submittedAnswer = params.submittedAnswer.trim()
      beginLessonCheckingPhase(submittedAnswer, () => {
        const puzzleSubTotal = rawStep.exercise?.puzzleVariants?.length ?? 0
        const message =
          params.type === 'error'
            ? resolvePuzzleAttemptChatMessage({
                attempts: params.attempts,
                errorText: params.errorText,
                hintText: params.hintText,
                wordCount: params.wordCount,
                correctAnswer: params.correctAnswer,
              })
            : buildLessonNextPuzzleSubMessage({
                nextSubIndex: params.subIndex + 1,
                subTotal: puzzleSubTotal,
              })

        const attemptFeedback = {
          type: params.type,
          message,
        } as const

        setAttemptHistoryByStep((current) => ({
          ...current,
          [currentStep]: [
            ...(current[currentStep] ?? []),
            {
              submittedAnswer: submittedAnswer || null,
              feedback: attemptFeedback,
              stepSnapshot: rawStep,
            },
          ],
        }))

        if (params.type === 'error') {
          setCombo(0)
          setExerciseErrors(params.attempts)
          setMistakes((current) => {
            const next = current.filter((item) => item.step !== rawStep.stepNumber)
            next.push({
              step: rawStep.stepNumber,
              userAnswer: params.submittedAnswer,
              correctAnswer: params.correctAnswer,
            })
            return next
          })
        } else {
          awardPuzzleSubStep(params.subIndex, params.attempts)
          setPuzzleSubAdvanceToken((current) => current + 1)
        }

        setFeedback(attemptFeedback)
        setStatus('feedback')
      })
    },
    [awardPuzzleSubStep, beginLessonCheckingPhase, currentStep, lesson, rawStep]
  )

  const requestCoinForgiveness = useCallback(() => {
    setForgivenessConfirmPending(true)
  }, [])

  const declineForgivenessOfferThisRun = useCallback(() => {
    setForgivenessOfferDeclinedThisRun(true)
    setForgivenessConfirmPending(false)
  }, [])

  const cancelCoinForgivenessConfirm = useCallback(() => {
    setForgivenessConfirmPending(false)
  }, [])

  const applyCoinErrorForgiveness = useCallback((): boolean => {
    if (!lesson || !rawStep?.exercise || !activeExercise) return false
    if (status !== 'feedback' || feedback?.type !== 'error') return false
    if (exerciseErrors !== 1) return false
    if (!isCoinForgivenessStep(rawStep.stepNumber)) return false
    if (!isCoinForgivenessExercise(activeExercise)) return false

    const correctAnswer = activeExercise.correctAnswer?.trim()
    if (!correctAnswer && activeExercise.type !== 'sentence_puzzle') return false

    setForgivenessUsedThisRun(true)
    setForgivenessConfirmPending(false)
    setCoinForgivenessFooterPulse(true)
    setExerciseErrors(0)
    setMistakes((current) => current.filter((item) => item.step !== rawStep.stepNumber))

    if (activeExercise.type === 'sentence_puzzle') {
      setPuzzleAttemptForgivenessToken((current) => current + 1)
      return true
    }

    if (activeExercise.type === 'fill_choice') {
      setForgivenessAutofillChoice(correctAnswer)
      setForgivenessAutofillNonce((current) => current + 1)
      return true
    }

    setForgivenessAutofillAnswer(correctAnswer)
    setForgivenessAutofillNonce((current) => current + 1)
    return true
  }, [activeExercise, exerciseErrors, feedback?.type, lesson, rawStep, status])

  useEffect(() => {
    if (status === 'idle') {
      setCoinForgivenessFooterPulse(false)
    }
  }, [status])

  const completeCurrentStep = useCallback(
    (options?: {
      submittedAnswer?: string
      baseMessage?: string
      message?: string
      xpAward?: number
      taskCurrent?: number
      taskTotal?: number
    }) => {
      if (!lesson || !rawStep?.exercise || isFinale) return
      const submitted = options?.submittedAnswer?.trim() || rawStep.exercise.correctAnswer

      beginLessonCheckingPhase(submitted, () => {
        const variants = rawStep.exercise?.variants ?? []
        const puzzleVariants = rawStep.exercise?.puzzleVariants ?? []
        const nextLearningStep = currentStep < totalSteps - 1 ? learningSteps[currentStep + 1] : null
        const successFeedback = {
          type: 'success',
          message: buildLessonAdvanceMessage({
            base: options?.baseMessage ?? options?.message,
            currentStep,
            totalSteps,
            stepNumber: rawStep.stepNumber,
            taskCurrent:
              options?.taskCurrent ??
              (variants.length > 1 ? currentVariantIndex + 1 : undefined),
            taskTotal:
              options?.taskTotal ??
              (variants.length > 1 ? variants.length : undefined) ??
              (puzzleVariants.length > 1 ? puzzleVariants.length : undefined),
            nextStepNumber: nextLearningStep?.stepNumber,
            nextTaskTotal: getUpcomingLessonTaskTotal(nextLearningStep?.exercise),
          }),
        } as const

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
        setExerciseErrors(0)
        setMistakes((current) => current.filter((item) => item.step !== rawStep.stepNumber))
        setStatus('feedback')

        if (currentStep < totalSteps - 1) {
          scheduleSuccessAdvance('step', () => {
            goToStep(currentStep + 1)
          })
          return
        }
        if (finale) {
          const finaleTimer = setTimeout(() => {
            goToFinale()
          }, LESSON_SUCCESS_HOLD_MS)
          timeoutRefs.current.push(finaleTimer)
        }
      })
    },
    [
      beginLessonCheckingPhase,
      currentStep,
      currentVariantIndex,
      finale,
      goToFinale,
      goToStep,
      isFinale,
      learningSteps,
      lesson,
      rawStep,
      scheduleSuccessAdvance,
      totalSteps,
    ]
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
    const xpLabel = coreXp === 0 && comboXp === 0 ? `0/${maxCoreXp}` : `${coreXp}/${maxCoreXp}`
    return `${progressText} | ${xpLabel} | COMBO x${combo}`
  }, [combo, coreXp, comboXp, currentStep, isFinale, lesson, maxCoreXp, postLesson?.staticFooterText, totalSteps])

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
        feedback?.type === 'error' && !activeExercise?.hint?.trim()
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
              text: ENGVO_CHECKING_FOOTER,
              compactText: 'Engvo проверяет.',
              tone: 'thinking',
            }
          : null,
        isAdvancingToNextStep
          ? {
              key: 'lesson-advancing',
              priority: 78,
              text: ENGVO_LESSON_ADVANCING_FOOTER,
              compactText: 'Engvo готовит шаг.',
              tone: 'thinking',
            }
          : null,
        isAdvancingToNextVariant
          ? {
              key: 'lesson-advancing-variant',
              priority: 78,
              text: ENGVO_LESSON_ADVANCING_VARIANT_FOOTER,
              compactText: 'Engvo готовит задание.',
              tone: 'thinking',
            }
          : null,
        feedback?.type === 'success' && lastComboMilestoneBlocked && combo >= 3
          ? {
              key: `lesson-combo-streak-${combo}`,
              priority: 86,
              text: formatComboMilestoneBlockedCelebration(combo),
              compactText: `${formatComboSegmentText(combo)}!`,
              tone: 'celebrate',
            }
          : null,
        feedback?.type === 'success' && combo >= 5 && !lastComboMilestoneBlocked
          ? {
              key: `lesson-combo-${combo}`,
              priority: 85,
              text: formatComboFooterVoiceLabel(combo, '! Вы летите!'),
              compactText: `${formatComboSegmentText(combo)}!`,
              tone: 'celebrate',
              emphasis: 'pulse',
            }
          : null,
        feedback?.type === 'success' && combo >= 3 && !lastComboMilestoneBlocked
          ? {
              key: `lesson-combo-${combo}`,
              priority: 80,
              text: formatComboFooterVoiceLabel(combo, '! Так держать!'),
              compactText: `${formatComboSegmentText(combo)}!`,
              tone: 'celebrate',
            }
          : null,
        feedback?.type === 'success' && currentStep < totalSteps - 1
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
        coinForgivenessFooterPulse
          ? {
              key: 'lesson-coin-forgiveness-applied',
              priority: 55,
              text: getLessonCoinForgivenessCopy(audience).appliedFooter,
              compactText: getLessonCoinForgivenessCopy(audience).appliedFooter,
              tone: 'support',
            }
          : null,
        rawStep?.exercise?.type === 'sentence_puzzle' &&
        puzzleProgress &&
        (rawStep.exercise.puzzleVariants?.length ?? 0) > 0
          ? buildPuzzleFooterVoiceCandidate({
              subIndex: puzzleProgress.subIndex,
              subTotal: puzzleProgress.subTotal,
              variantTitle: rawStep.exercise.puzzleVariants?.[puzzleProgress.subIndex]?.title,
            })
          : null,
        step?.myEngComment && rawStep?.exercise?.type !== 'sentence_puzzle'
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
      { maxLength: FOOTER_DYNAMIC_MAX_LENGTH }
    )

    return {
      text: voice?.text ?? null,
      typingKey: voice && lesson ? `${lesson.id}:${lesson.runKey ?? 'static'}:${currentStep}:${currentVariantIndex}:${voice.typingKey}` : null,
      tone: voice?.tone ?? 'neutral',
      emphasis: voice?.emphasis ?? 'none',
    }
  }, [
    activeExercise?.hint,
    audience,
    coinForgivenessFooterPulse,
    combo,
    isAdvancingToNextStep,
    isAdvancingToNextVariant,
    lastComboMilestoneBlocked,
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
    totalSteps,
    puzzleProgress,
    rawStep?.exercise?.type,
    rawStep?.exercise?.puzzleVariants,
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
      submittedAnswer: resolveLessonCurrentEntrySubmittedAnswer({
        isFinale,
        status,
        currentStep,
        hasRenderedAttempts,
        submittedAnswersByStep,
      }),
      feedback: hasRenderedAttempts ? null : feedback,
      isCurrent: true,
      step: step ?? currentLessonStep,
    }

    return buildActiveStepTimeline(
      completedEntries,
      currentEntry,
      currentAttemptEntries,
      currentEntry.step.exercise?.type
    )
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
    status,
  ])

  return {
    lesson,
    step,
    timeline,
    currentStep,
    totalSteps,
    phase,
    xp: totalXp,
    coreXp,
    comboXp,
    totalXp,
    maxCoreXp,
    maxCombo,
    firstTryCount,
    totalScoredUnits,
    lastCoreDelta,
    lastComboDelta,
    lastXpAward,
    lastComboMilestoneBlocked,
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
    awardPuzzleSubStep,
    recordPuzzleAttempt,
    clearPuzzleAttemptFeedback,
    puzzleProgress,
    puzzleSubAdvanceToken,
    isAdvancingToNextStep,
    isAdvancingToNextVariant,
    onPuzzleProgressChange: setPuzzleProgress,
    goToNext,
    goToStep,
    goToFinale,
    resetCombo: () => {
      comboRef.current = 0
      setCombo(0)
    },
    forgivenessUsedThisRun,
    forgivenessOfferDeclinedThisRun,
    forgivenessConfirmPending,
    puzzleAttemptForgivenessToken,
    forgivenessAutofillAnswer,
    forgivenessAutofillChoice,
    forgivenessAutofillNonce,
    requestCoinForgiveness,
    declineForgivenessOfferThisRun,
    cancelCoinForgivenessConfirm,
    applyCoinErrorForgiveness,
  }
}
