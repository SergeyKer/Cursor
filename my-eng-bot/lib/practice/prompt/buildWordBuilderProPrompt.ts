import { DEFAULT_PRACTICE_SENTENCE_PUZZLE_PROMPT } from '@/lib/practice/resolvePracticeSentencePuzzleSlice'
import { resolveWordBuilderSituation } from '@/lib/practice/prompt/resolveWordBuilderSituation'
import type { Exercise, LessonData, LessonStep, SentencePuzzleVariant } from '@/types/lesson'

function normalizeInstruction(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return DEFAULT_PRACTICE_SENTENCE_PUZZLE_PROMPT
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

function mergePromptParts(parts: string[]): string {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildWordBuilderProPrompt(params: {
  step: LessonStep
  exercise: Exercise
  lesson: Pick<LessonData, 'id' | 'topic'> & Partial<Pick<LessonData, 'repeatConfig'>>
  puzzlePrompt?: string
  stepIndex?: number
  targetAnswer: string
  matchedVariant?: SentencePuzzleVariant | null
}): string {
  const instruction = normalizeInstruction(params.puzzlePrompt ?? DEFAULT_PRACTICE_SENTENCE_PUZZLE_PROMPT)
  const situationPrompt = resolveWordBuilderSituation({
    targetAnswer: params.targetAnswer,
    lesson: params.lesson as LessonData,
    exercise: params.exercise,
    matchedVariant: params.matchedVariant,
  })

  if (!situationPrompt.trim()) return instruction
  if (/ситуация/i.test(instruction)) return instruction

  const normalizedSituation = situationPrompt.trim()
  if (normalizedSituation.toLowerCase().includes(instruction.toLowerCase().replace(/[.!?…]/g, ''))) {
    return normalizedSituation
  }

  return mergePromptParts([normalizedSituation, instruction])
}
