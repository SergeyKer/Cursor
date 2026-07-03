'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Exercise, SentencePuzzleVariant } from '@/types/lesson'
import {
  CHIP_PANEL_DEFAULT_WIDTH_PX,
  layoutFlexChipRowsWithIndices,
  resolveFlexChipRowBasisCount,
  resolveFlexRowSlotWidthPx,
} from '@/lib/chipFlexLayout'
import {
  estimatePuzzleWordBankMinHeight,
  PUZZLE_PANEL_SLOT_ROW_GAP_PX,
} from '@/lib/puzzlePanelLayout'
import { resolveLessonSentencePuzzleCheckAction } from '@/lib/practice/resolveLessonSentencePuzzleCheckAction'
import { LESSON_PUZZLE_COMPLETE_MESSAGE } from '@/utils/footerMessages'

type LessonSentencePuzzleProps = {
  exercise: Exercise
  disabled?: boolean
  progressKey?: string
  submitMode?: 'lesson' | 'practice'
  compact?: boolean
  onPracticeSubmit?: (submittedAnswer: string) => void
  onComplete?: (summary: {
    submittedAnswer: string
    baseMessage?: string
    taskCurrent?: number
    taskTotal?: number
  }) => void
  onSubPuzzleComplete?: (summary: { subIndex: number; attempts: number }) => void
  onPuzzleProgressChange?: (progress: { subIndex: number; subTotal: number }) => void
  onAttemptFailed?: (params: {
    subIndex: number
    attempts: number
    submittedAnswer: string
    errorText: string
    hintText: string
    wordCount: number
    correctAnswer: string
  }) => void
  onSubSuccess?: (params: {
    subIndex: number
    attempts: number
    submittedAnswer: string
    isLastVariant: boolean
  }) => void
  onInteraction?: () => void
  /** Инкремент движка после checking+feedback успеха подпазла - запускает advance. */
  subPuzzleAdvanceToken?: number
  /** Сигнал движка: прощение ошибки - автозаполнение и success. */
  attemptForgivenessToken?: number
}

const PUZZLE_VARIANT_ADVANCE_MS = 700
const PUZZLE_PROGRESS_PREFIX = 'my-eng-bot-sentence-puzzle'

function sameOrder(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false
  return left.every((word, index) => word === right[index])
}

function shuffleWords(words: string[], seed: string): string[] {
  const next = [...words]
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  }
  for (let index = next.length - 1; index > 0; index -= 1) {
    hash = (hash * 1664525 + 1013904223) >>> 0
    const swapIndex = hash % (index + 1)
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }
  return next
}

function getVariantWords(variant: SentencePuzzleVariant): string[] {
  return variant.words.length > 0 ? variant.words : variant.correctOrder
}

type StoredPuzzleProgress = {
  variantIndex: number
  selectedWords: string[]
  attempts: number
}

function readStoredProgress(key: string | undefined, variantCount: number): StoredPuzzleProgress | null {
  if (!key || typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(`${PUZZLE_PROGRESS_PREFIX}:${key}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredPuzzleProgress & { hintVisible?: boolean }>
    const variantIndex = typeof parsed.variantIndex === 'number' ? parsed.variantIndex : 0
    if (variantIndex < 0 || variantIndex >= variantCount) return null
    return {
      variantIndex,
      selectedWords: Array.isArray(parsed.selectedWords) ? parsed.selectedWords.filter((word): word is string => typeof word === 'string') : [],
      attempts: typeof parsed.attempts === 'number' ? parsed.attempts : 0,
    }
  } catch {
    return null
  }
}

function writeStoredProgress(key: string | undefined, progress: StoredPuzzleProgress): void {
  if (!key || typeof window === 'undefined') return
  try {
    window.localStorage.setItem(`${PUZZLE_PROGRESS_PREFIX}:${key}`, JSON.stringify(progress))
  } catch {
    // localStorage can be unavailable in private modes; puzzle still works in memory.
  }
}

function clearStoredProgress(key: string | undefined): void {
  if (!key || typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(`${PUZZLE_PROGRESS_PREFIX}:${key}`)
  } catch {
    // ignore
  }
}

export default function LessonSentencePuzzle({
  exercise,
  disabled = false,
  progressKey,
  submitMode = 'lesson',
  compact = false,
  onPracticeSubmit,
  onComplete,
  onSubPuzzleComplete,
  onPuzzleProgressChange,
  onAttemptFailed,
  onSubSuccess,
  onInteraction,
  subPuzzleAdvanceToken = 0,
  attemptForgivenessToken = 0,
}: LessonSentencePuzzleProps) {
  const variants = exercise.puzzleVariants ?? []
  const [variantIndex, setVariantIndex] = useState(0)
  const consumedAdvanceTokenRef = useRef(subPuzzleAdvanceToken)
  const consumedForgivenessTokenRef = useRef(attemptForgivenessToken)
  const [selectedWords, setSelectedWords] = useState<string[]>([])
  const [attempts, setAttempts] = useState(0)
  const [locked, setLocked] = useState(false)
  const laneRef = useRef<HTMLDivElement>(null)
  const [laneWidthPx, setLaneWidthPx] = useState<number | undefined>(undefined)

  const activeVariant = variants[variantIndex]
  const availableWords = useMemo(() => {
    if (!activeVariant) return []
    const selectedCounts = new Map<string, number>()
    for (const word of selectedWords) {
      selectedCounts.set(word, (selectedCounts.get(word) ?? 0) + 1)
    }

    return shuffleWords(getVariantWords(activeVariant), activeVariant.id).filter((word) => {
      const used = selectedCounts.get(word) ?? 0
      if (used <= 0) return true
      selectedCounts.set(word, used - 1)
      return false
    })
  }, [activeVariant, selectedWords])

  const wordBankMinHeight = useMemo(() => {
    if (!activeVariant) return 0
    const width = laneWidthPx ?? CHIP_PANEL_DEFAULT_WIDTH_PX
    return estimatePuzzleWordBankMinHeight(getVariantWords(activeVariant), width)
  }, [activeVariant, laneWidthPx])

  const slotRows = useMemo(() => {
    if (!activeVariant) return []
    const width = laneWidthPx ?? CHIP_PANEL_DEFAULT_WIDTH_PX
    return layoutFlexChipRowsWithIndices(activeVariant.correctOrder, width, 'puzzle', PUZZLE_PANEL_SLOT_ROW_GAP_PX)
  }, [activeVariant, laneWidthPx])

  const slotWidthPx = useMemo(() => {
    const width = laneWidthPx ?? CHIP_PANEL_DEFAULT_WIDTH_PX
    const tokenRows = slotRows.map((row) => row.map((item) => item.token))
    const basisCount =
      resolveFlexChipRowBasisCount(tokenRows) || activeVariant?.correctOrder.length || 0
    return resolveFlexRowSlotWidthPx(width, basisCount, PUZZLE_PANEL_SLOT_ROW_GAP_PX)
  }, [activeVariant?.correctOrder.length, laneWidthPx, slotRows])

  useLayoutEffect(() => {
    const lane = laneRef.current
    if (!lane) return

    const measure = () => {
      const width = Math.round(lane.clientWidth)
      if (width > 0) {
        setLaneWidthPx(width)
      }
    }

    measure()

    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(measure)
    observer.observe(lane)
    return () => observer.disconnect()
  }, [activeVariant?.id, variantIndex])

  useEffect(() => {
    const stored = readStoredProgress(progressKey, variants.length)
    if (!stored) return
    setVariantIndex(stored.variantIndex)
    setSelectedWords(stored.selectedWords)
    setAttempts(stored.attempts)
  }, [progressKey, variants.length])

  useEffect(() => {
    if (variants.length === 0) return
    onPuzzleProgressChange?.({ subIndex: variantIndex, subTotal: variants.length })
  }, [onPuzzleProgressChange, variantIndex, variants.length])

  useEffect(() => {
    if (!activeVariant || locked) return
    writeStoredProgress(progressKey, {
      variantIndex,
      selectedWords,
      attempts,
    })
  }, [activeVariant, attempts, locked, progressKey, selectedWords, variantIndex])

  useEffect(() => {
    if (subPuzzleAdvanceToken <= 0 || subPuzzleAdvanceToken === consumedAdvanceTokenRef.current) {
      return
    }
    consumedAdvanceTokenRef.current = subPuzzleAdvanceToken

    const timer = window.setTimeout(() => {
      onInteraction?.()
      setVariantIndex((current) => current + 1)
      setSelectedWords([])
      setAttempts(0)
      setLocked(false)
    }, PUZZLE_VARIANT_ADVANCE_MS)

    return () => window.clearTimeout(timer)
  }, [subPuzzleAdvanceToken, onInteraction])

  useEffect(() => {
    if (
      attemptForgivenessToken <= 0 ||
      attemptForgivenessToken === consumedForgivenessTokenRef.current ||
      !activeVariant
    ) {
      return
    }
    consumedForgivenessTokenRef.current = attemptForgivenessToken

    const attemptsAfterForgiveness = 0
    setAttempts(attemptsAfterForgiveness)
    setSelectedWords([...activeVariant.correctOrder])
    setLocked(true)

    const submittedAnswer = activeVariant.correctOrder.join(' ')
    const isLastVariant = variantIndex >= variants.length - 1

    if (isLastVariant) {
      onSubPuzzleComplete?.({ subIndex: variantIndex, attempts: attemptsAfterForgiveness })
      clearStoredProgress(progressKey)
      onComplete?.({
        submittedAnswer: activeVariant.correctAnswer,
        baseMessage: LESSON_PUZZLE_COMPLETE_MESSAGE,
        taskCurrent: variantIndex + 1,
        taskTotal: variants.length,
      })
      return
    }

    onSubSuccess?.({
      subIndex: variantIndex,
      attempts: attemptsAfterForgiveness,
      submittedAnswer,
      isLastVariant: false,
    })
  }, [
    attemptForgivenessToken,
    activeVariant,
    onComplete,
    onSubPuzzleComplete,
    onSubSuccess,
    progressKey,
    variantIndex,
    variants.length,
  ])

  if (!activeVariant || variants.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Пазл пока не настроен для этого урока.
      </div>
    )
  }

  const isBusy = disabled || locked
  const isFilled = selectedWords.length === activeVariant.correctOrder.length

  const resetAttempt = (nextAttempts: number, submittedAnswer: string) => {
    onAttemptFailed?.({
      subIndex: variantIndex,
      attempts: nextAttempts,
      submittedAnswer,
      errorText: activeVariant.errorText,
      hintText: activeVariant.hintText,
      wordCount: activeVariant.correctOrder.length,
      correctAnswer: activeVariant.correctAnswer,
    })
    setSelectedWords([])
    setAttempts(nextAttempts)
  }

  const handleCheck = () => {
    if (isBusy || !isFilled) return
    const submittedAnswer = selectedWords.join(' ')
    const isCorrect = sameOrder(selectedWords, activeVariant.correctOrder)
    const action = resolveLessonSentencePuzzleCheckAction({
      submitMode,
      isFilled,
      isCorrect,
    })

    if (action === 'practiceSubmit') {
      onPracticeSubmit?.(submittedAnswer)
      return
    }

    if (action === 'lessonRetry') {
      resetAttempt(attempts + 1, submittedAnswer)
      return
    }

    if (action !== 'lessonSuccess') return

    const isLastVariant = variantIndex >= variants.length - 1
    setLocked(true)

    if (isLastVariant) {
      onSubPuzzleComplete?.({ subIndex: variantIndex, attempts })
      clearStoredProgress(progressKey)
      onComplete?.({
        submittedAnswer: activeVariant.correctAnswer,
        baseMessage: LESSON_PUZZLE_COMPLETE_MESSAGE,
        taskCurrent: variantIndex + 1,
        taskTotal: variants.length,
      })
      return
    }

    onSubSuccess?.({
      subIndex: variantIndex,
      attempts,
      submittedAnswer,
      isLastVariant: false,
    })
  }

  const handleSelectWord = (word: string) => {
    if (isBusy || selectedWords.length >= activeVariant.correctOrder.length) return
    onInteraction?.()
    setSelectedWords((current) => [...current, word])
  }

  const handleReturnWord = (index: number) => {
    if (isBusy) return
    onInteraction?.()
    setSelectedWords((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const instructionText = activeVariant.instruction.trim()
  const slotStyle =
    slotWidthPx > 0
      ? { flex: `0 0 ${slotWidthPx}px`, width: slotWidthPx, maxWidth: slotWidthPx }
      : undefined

  return (
    <section className="rounded-[1.1rem] border border-blue-100 bg-white/95 px-2.5 py-2 shadow-sm sm:px-3" aria-label={activeVariant.title || 'Пазл'}>
      {!compact && activeVariant.title ? (
        <h3 className="mb-1.5 text-sm font-semibold leading-tight text-slate-900">{activeVariant.title}</h3>
      ) : null}

      {!compact && instructionText ? (
        <p className="mb-2 text-[13px] leading-snug text-slate-600">{instructionText}</p>
      ) : null}

      <div ref={laneRef}>
        <div className="mb-2 flex flex-col gap-1.5" aria-label="Слоты предложения">
          {slotRows.map((row, rowIndex) => (
            <div key={`slot-row-${activeVariant.id}-${rowIndex}`} className="flex justify-start gap-1.5">
              {row.map(({ index }) => {
                const word = selectedWords[index]
                return (
                  <button
                    key={`slot-${activeVariant.id}-${index}`}
                    type="button"
                    disabled={!word || isBusy}
                    onClick={() => handleReturnWord(index)}
                    style={slotStyle}
                    className={`inline-flex h-9 min-w-0 shrink-0 items-center justify-center rounded-lg border px-2 text-sm font-semibold transition ${
                      word
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-dashed border-slate-300 bg-slate-50 text-slate-400'
                    }`}
                    aria-label={word ? `Убрать слово ${word}` : `Пустой слот ${index + 1}`}
                  >
                    {word ?? '...'}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div
          className="mb-2 flex flex-wrap content-start gap-1.5"
          style={wordBankMinHeight > 0 ? { minHeight: wordBankMinHeight } : undefined}
          aria-label="Доступные слова"
        >
        {availableWords.map((word, index) => (
          <button
            key={`${activeVariant.id}-${word}-${index}`}
            type="button"
            disabled={isBusy}
            onClick={() => handleSelectWord(word)}
            className="inline-flex h-9 items-center rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100 disabled:opacity-60"
            aria-label={`Добавить слово ${word}`}
          >
            {word}
          </button>
        ))}
        </div>
      </div>

      <button
        type="button"
        disabled={isBusy || !isFilled}
        onClick={handleCheck}
        className="h-10 w-full rounded-xl bg-blue-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        Проверить
      </button>
    </section>
  )
}
