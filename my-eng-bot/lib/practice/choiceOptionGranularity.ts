import type { ExerciseType, LessonAnswerFormat } from '@/types/lesson'

export type ChoiceGranularity = 'word' | 'sentence'

const SENTENCE_STARTERS = [/^It's\b/i, /^I'm\b/i, /^It's time to\b/i, /^We are\b/i, /^She is\b/i]

export function isCompleteSentence(option: string): boolean {
  const normalized = option.trim()
  if (!normalized) return false
  for (const pattern of SENTENCE_STARTERS) {
    if (pattern.test(normalized)) return true
  }
  const withoutPunctuation = normalized.replace(/[.!?]$/g, '').trim()
  const tokens = withoutPunctuation.split(/\s+/).filter(Boolean)
  return tokens.length >= 2 && /[.!?]$/.test(normalized)
}

export function inferChoiceGranularity(params: {
  targetAnswer: string
  answerFormat?: LessonAnswerFormat
  prompt?: string
  exerciseType?: ExerciseType
}): ChoiceGranularity {
  const target = params.targetAnswer.trim()
  const prompt = params.prompt ?? ''

  if (params.answerFormat === 'single_word' || /___/.test(prompt)) {
    return 'word'
  }

  if (params.answerFormat === 'full_sentence') {
    return 'sentence'
  }

  if (params.answerFormat === 'short_phrase') {
    const tokens = target.replace(/[.!?]$/g, '').split(/\s+/).filter(Boolean)
    return tokens.length <= 2 && !/[.!?]$/.test(target) ? 'word' : 'sentence'
  }

  if (params.answerFormat === 'choice' || params.exerciseType === 'fill_choice') {
    if (isCompleteSentence(target)) return 'sentence'
    const tokens = target.replace(/[.!?]$/g, '').split(/\s+/).filter(Boolean)
    if (tokens.length === 1) return 'word'
  }

  if (isCompleteSentence(target)) return 'sentence'

  const tokens = target.replace(/[.!?]$/g, '').split(/\s+/).filter(Boolean)
  if (tokens.length === 1) return 'word'

  return tokens.length >= 2 ? 'sentence' : 'word'
}

export function matchesChoiceGranularity(option: string, granularity: ChoiceGranularity): boolean {
  const trimmed = option.trim()
  if (!trimmed) return false
  if (granularity === 'word') {
    return !isCompleteSentence(trimmed)
  }
  return isCompleteSentence(trimmed)
}

export function filterByChoiceGranularity(options: string[], granularity: ChoiceGranularity): string[] {
  return options.filter((item) => matchesChoiceGranularity(item, granularity))
}
