'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Exercise, SentencePuzzleVariant } from '@/types/lesson'
import { LESSON_PUZZLE_COMPLETE_MESSAGE } from '@/utils/footerMessages'

type LessonSentencePuzzleProps = {
  exercise: Exercise
  disabled?: boolean
  progressKey?: string
  onComplete: (summary: {
    submittedAnswer: string
    baseMessage?: string
    taskCurrent?: number
    taskTotal?: number
  }) => void
  onSubPuzzleComplete?: (summary: { subIndex: number; attempts: number }) => void
  onPuzzleProgressChange?: (progress: { subIndex: number; subTotal: number }) => void
  subPuzzleMaxXp?: number
}

type PuzzleFeedback = {
  type: 'success' | 'error'
  text: string
} | null

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
  hintVisible: boolean
}

function readStoredProgress(key: string | undefined, variantCount: number): StoredPuzzleProgress | null {
  if (!key || typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(`${PUZZLE_PROGRESS_PREFIX}:${key}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredPuzzleProgress>
    const variantIndex = typeof parsed.variantIndex === 'number' ? parsed.variantIndex : 0
    if (variantIndex < 0 || variantIndex >= variantCount) return null
    return {
      variantIndex,
      selectedWords: Array.isArray(parsed.selectedWords) ? parsed.selectedWords.filter((word): word is string => typeof word === 'string') : [],
      attempts: typeof parsed.attempts === 'number' ? parsed.attempts : 0,
      hintVisible: Boolean(parsed.hintVisible),
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
  onComplete,
  onSubPuzzleComplete,
  onPuzzleProgressChange,
  subPuzzleMaxXp,
}: LessonSentencePuzzleProps) {
  const variants = exercise.puzzleVariants ?? []
  const [variantIndex, setVariantIndex] = useState(0)
  const [selectedWords, setSelectedWords] = useState<string[]>([])
  const [attempts, setAttempts] = useState(0)
  const [hintVisible, setHintVisible] = useState(false)
  const [feedback, setFeedback] = useState<PuzzleFeedback>(null)
  const [locked, setLocked] = useState(false)

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

  useEffect(() => {
    const stored = readStoredProgress(progressKey, variants.length)
    if (!stored) return
    setVariantIndex(stored.variantIndex)
    setSelectedWords(stored.selectedWords)
    setAttempts(stored.attempts)
    setHintVisible(stored.hintVisible)
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
      hintVisible,
    })
  }, [activeVariant, attempts, hintVisible, locked, progressKey, selectedWords, variantIndex])

  if (!activeVariant || variants.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Пазл пока не настроен для этого урока.
      </div>
    )
  }

  const isBusy = disabled || locked
  const isFilled = selectedWords.length === activeVariant.correctOrder.length

  const resetAttempt = (nextAttempts: number) => {
    setSelectedWords([])
    setAttempts(nextAttempts)
    setHintVisible(nextAttempts >= 2)
    setFeedback({ type: 'error', text: activeVariant.errorText })
  }

  const handleCheck = () => {
    if (isBusy || !isFilled) return
    const isCorrect = sameOrder(selectedWords, activeVariant.correctOrder)
    if (!isCorrect) {
      resetAttempt(attempts + 1)
      return
    }

    const isLastVariant = variantIndex >= variants.length - 1
    setLocked(true)
    setFeedback({ type: 'success', text: activeVariant.successText })

    window.setTimeout(() => {
      onSubPuzzleComplete?.({ subIndex: variantIndex, attempts })
      if (isLastVariant) {
        clearStoredProgress(progressKey)
        onComplete({
          submittedAnswer: activeVariant.correctAnswer,
          baseMessage: LESSON_PUZZLE_COMPLETE_MESSAGE,
          taskCurrent: variantIndex + 1,
          taskTotal: variants.length,
        })
        return
      }

      setVariantIndex((current) => current + 1)
      setSelectedWords([])
      setAttempts(0)
      setHintVisible(false)
      setFeedback({ type: 'success', text: activeVariant.myEngComment })
      setLocked(false)
    }, PUZZLE_VARIANT_ADVANCE_MS)
  }

  const handleSelectWord = (word: string) => {
    if (isBusy || selectedWords.length >= activeVariant.correctOrder.length) return
    setFeedback(null)
    setSelectedWords((current) => [...current, word])
  }

  const handleReturnWord = (index: number) => {
    if (isBusy) return
    setFeedback(null)
    setSelectedWords((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const slotCount = activeVariant.correctOrder.length
  const slotGridClass =
    slotCount <= 3 ? 'grid-cols-3' : slotCount <= 4 ? 'grid-cols-4' : 'grid-cols-2 sm:grid-cols-4'

  return (
    <section className="rounded-[1.1rem] border border-blue-100 bg-white/95 px-2.5 py-2 shadow-sm sm:px-3" aria-label={activeVariant.title}>
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-sm font-semibold leading-tight text-slate-900">{activeVariant.title}</h3>
        <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
          до +{subPuzzleMaxXp ?? exercise.bonusXp ?? 13}
        </span>
      </div>

      <p className="mb-2 text-[13px] leading-snug text-slate-600">{activeVariant.instruction}</p>

      <div className={`mb-2 grid gap-1.5 ${slotGridClass}`} aria-label="Слоты предложения">
        {activeVariant.correctOrder.map((_, index) => {
          const word = selectedWords[index]
          return (
            <button
              key={`slot-${activeVariant.id}-${index}`}
              type="button"
              disabled={!word || isBusy}
              onClick={() => handleReturnWord(index)}
              className={`inline-flex h-9 min-w-0 items-center justify-center rounded-lg border px-2 text-sm font-semibold transition ${
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

      <div className="mb-2 flex flex-wrap gap-1.5" aria-label="Доступные слова">
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

      {hintVisible && (
        <p className="mb-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[13px] leading-snug text-amber-800" role="status">
          {activeVariant.hintText}
        </p>
      )}

      {feedback && (
        <p
          className={`mb-1.5 rounded-lg px-2.5 py-1.5 text-[13px] leading-snug ${
            feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}
          role="status"
          aria-live="polite"
        >
          {feedback.text}
        </p>
      )}

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
