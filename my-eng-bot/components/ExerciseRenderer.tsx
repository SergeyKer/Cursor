'use client'

import type { Exercise } from '@/types/lesson'

type ExerciseRendererProps = {
  exercise: Exercise
  onAnswer: (answer: string) => void
  isChecking?: boolean
}

const difficultyColors = {
  easy: 'border-green-200 bg-green-50',
  medium: 'border-yellow-200 bg-yellow-50',
  hard: 'border-red-200 bg-red-50',
} as const

export function ExerciseRenderer({ exercise, onAnswer, isChecking = false }: ExerciseRendererProps) {
  const currentVariantIndex = exercise.currentVariantIndex ?? 0
  const currentVariant = exercise.variants?.[currentVariantIndex]
  const currentDifficulty = currentVariant?.difficulty ?? 'easy'
  const currentQuestion = currentVariant?.question ?? exercise.question
  const currentOptions = currentVariant?.options ?? exercise.options
  const showVariantProgress = Boolean(exercise.variants && exercise.variants.length > 1 && exercise.type !== 'translate')
  const hideTranslateHint = exercise.type === 'translate' && currentQuestion.includes('____')

  return (
    <div className={`variant-enter rounded-xl border-2 p-3 ${difficultyColors[currentDifficulty]}`}>
      <div className="space-y-3">
        <p className={`text-sm font-medium text-gray-700 ${exercise.type === 'fill_choice' ? 'text-right' : ''}`}>
          {currentQuestion}
        </p>

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

        {exercise.type === 'micro_quiz' && currentOptions?.length ? (
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
        ) : exercise.type === 'fill_choice' || exercise.type === 'translate' || hideTranslateHint ? null : (
          <p className="text-xs text-gray-500">
            {'Продолжите упражнение ниже.'}
          </p>
        )}
      </div>
    </div>
  )
}
