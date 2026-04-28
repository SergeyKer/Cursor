'use client'

import type { Exercise } from '@/types/lesson'

type ExerciseRendererProps = {
  exercise: Exercise
  onAnswer: (answer: string) => void
  isChecking?: boolean
}

export function ExerciseRenderer({ exercise, onAnswer, isChecking = false }: ExerciseRendererProps) {
  const currentVariantIndex = exercise.currentVariantIndex ?? 0
  const currentVariant = exercise.variants?.[currentVariantIndex]
  const currentOptions = currentVariant?.options ?? exercise.options
  const showVariantProgress = Boolean(exercise.variants && exercise.variants.length > 1 && exercise.type !== 'translate')

  if (exercise.type !== 'micro_quiz' || !currentOptions?.length) return null

  return (
    <div className="variant-enter space-y-2 pb-2">
      {showVariantProgress && (
        <div className="flex gap-1" aria-label="Прогресс вариантов упражнения">
          {exercise.variants?.map((_, index) => (
            <div
              key={`exercise-variant-${index}`}
              className={`h-2 w-2 rounded-full transition ${
                index < currentVariantIndex
                  ? 'bg-green-400'
                  : index === currentVariantIndex
                    ? 'bg-blue-400 animate-pulse'
                    : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {currentOptions.map((option, index) => (
          <button
            key={`micro-quiz-option-${index}`}
            type="button"
            onClick={() => onAnswer(option)}
            disabled={isChecking}
            className="rounded-full bg-blue-100 px-4 py-2 text-sm text-blue-900 transition hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}
