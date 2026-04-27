'use client'

import type { Exercise } from '@/types/lesson'

type ExerciseRendererProps = {
  exercise: Exercise
}

export function ExerciseRenderer({ exercise }: ExerciseRendererProps) {
  void exercise
  return null
}
