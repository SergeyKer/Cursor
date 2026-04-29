'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Exercise, SentencePuzzleVariant } from '@/types/lesson'

type LessonSentencePuzzleProps = {
  exercise: Exercise
  disabled?: boolean
  progressKey?: string
  onComplete: (summary: { submittedAnswer: string; message: string }) => void
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

export default function LessonSentencePuzzle({ exercise, disabled = false, progressKey, onComplete }: LessonSentencePuzzleProps) {
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
  const progressText = `Вариант ${variantIndex + 1}/${variants.length}`

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
      if (isLastVariant) {
        clearStoredProgress(progressKey)
        onComplete({
          submittedAnswer: activeVariant.correctAnswer,
          message: 'Пазл собран. Переходим дальше.',
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

  return (
    <section className="rounded-[1.1rem] border border-blue-100 bg-white/95 px-3 py-3 shadow-sm sm:px-4" aria-label={activeVariant.title}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-500">{progressText}</p>
          <h3 className="text-base font-semibold text-slate-900">{activeVariant.title}</h3>
        </div>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">+{exercise.bonusXp ?? 30} XP</span>
      </div>

      <p className="mb-3 text-sm leading-5 text-slate-600">{activeVariant.instruction}</p>

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Слоты предложения">
        {activeVariant.correctOrder.map((_, index) => {
          const word = selectedWords[index]
          return (
            <button
              key={`slot-${activeVariant.id}-${index}`}
              type="button"
              disabled={!word || isBusy}
              onClick={() => handleReturnWord(index)}
              className={`min-h-[44px] rounded-xl border px-2 py-2 text-sm font-semibold transition ${
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

      <div className="mb-3 flex flex-wrap gap-2" aria-label="Доступные слова">
        {availableWords.map((word, index) => (
          <button
            key={`${activeVariant.id}-${word}-${index}`}
            type="button"
            disabled={isBusy}
            onClick={() => handleSelectWord(word)}
            className="min-h-[44px] rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100 disabled:opacity-60"
            aria-label={`Добавить слово ${word}`}
          >
            {word}
          </button>
        ))}
      </div>

      {hintVisible && (
        <p className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800" role="status">
          {activeVariant.hintText}
        </p>
      )}

      {feedback && (
        <p
          className={`mb-2 rounded-xl px-3 py-2 text-sm ${
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
        className="min-h-[44px] w-full rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        Проверить
      </button>
    </section>
  )
}
