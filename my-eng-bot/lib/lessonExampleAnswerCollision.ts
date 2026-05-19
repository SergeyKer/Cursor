import { normalizeEnglishForLearnerAnswerMatch } from '@/lib/normalizeEnglishForLearnerAnswerMatch'
import type { Exercise, ExerciseVariant, LessonStep } from '@/types/lesson'

const EXAMPLE_PREFIX_RE = /Пример:\s*"([^"]+)"/iu
const QUOTED_ENGLISH_RE = /"([^"]*[A-Za-z][^"]*)"/gu

function hasLatin(text: string): boolean {
  return /[A-Za-z]/.test(text)
}

function splitIntoEnglishSentences(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed || !hasLatin(trimmed)) return []
  return trimmed
    .split(/(?<=\.)\s+/)
    .map((part) => part.trim())
    .filter((part) => hasLatin(part))
}

/** Предложения из блока `Пример: "…"`. */
export function extractEnglishExamplesFromInfo(infoText: string): string[] {
  const match = infoText.match(EXAMPLE_PREFIX_RE)
  if (!match?.[1]) return []
  return splitIntoEnglishSentences(match[1])
}

/** Английские фразы в кавычках (для translate-шагов без префикса «Пример»). */
export function extractQuotedEnglishPhrases(text: string): string[] {
  const phrases: string[] = []
  for (const match of text.matchAll(QUOTED_ENGLISH_RE)) {
    const quoted = match[1]?.trim()
    if (!quoted || !hasLatin(quoted)) continue
    phrases.push(...splitIntoEnglishSentences(quoted))
  }
  return Array.from(new Set(phrases))
}

/** Все фразы из info, которые могут совпасть с ответом на translate. */
export function extractEnglishSupportPhrasesFromInfo(infoText: string): string[] {
  const fromExample = extractEnglishExamplesFromInfo(infoText)
  if (fromExample.length > 0) return fromExample
  return extractQuotedEnglishPhrases(infoText)
}

function addAnswer(answers: string[], value: string | undefined) {
  const trimmed = value?.trim()
  if (trimmed) answers.push(trimmed)
}

function collectFromVariant(answers: string[], variant: ExerciseVariant) {
  addAnswer(answers, variant.correctAnswer)
  for (const accepted of variant.acceptedAnswers ?? []) {
    addAnswer(answers, accepted)
  }
}

export function collectTranslateExpectedAnswers(
  exercise: Pick<Exercise, 'correctAnswer' | 'acceptedAnswers' | 'variants'>
): string[] {
  const answers: string[] = []
  addAnswer(answers, exercise.correctAnswer)
  for (const accepted of exercise.acceptedAnswers ?? []) {
    addAnswer(answers, accepted)
  }
  for (const variant of exercise.variants ?? []) {
    collectFromVariant(answers, variant)
  }
  return Array.from(new Set(answers))
}

export function englishPhrasesCollideWithAnswers(phrases: string[], answers: string[]): boolean {
  if (phrases.length === 0 || answers.length === 0) return false
  const normalizedAnswers = answers.map((answer) => normalizeEnglishForLearnerAnswerMatch(answer, 'translation'))
  for (const phrase of phrases) {
    const normalizedPhrase = normalizeEnglishForLearnerAnswerMatch(phrase, 'translation')
    if (!normalizedPhrase) continue
    if (normalizedAnswers.some((normalizedAnswer) => normalizedAnswer === normalizedPhrase)) {
      return true
    }
  }
  return false
}

export function infoSupportCollidesWithTranslateAnswers(
  infoText: string,
  exercise: Pick<Exercise, 'correctAnswer' | 'acceptedAnswers' | 'variants'>
): boolean {
  const phrases = extractEnglishSupportPhrasesFromInfo(infoText)
  const answers = collectTranslateExpectedAnswers(exercise)
  return englishPhrasesCollideWithAnswers(phrases, answers)
}

export function stepTranslateInfoCollidesWithAnswers(step: LessonStep): boolean {
  if (step.exercise?.type !== 'translate') return false
  const infoText = step.bubbles[1]?.content ?? ''
  return infoSupportCollidesWithTranslateAnswers(infoText, step.exercise)
}

export function mergeTranslateExerciseForAnswers(
  candidate?: Pick<Exercise, 'correctAnswer' | 'acceptedAnswers' | 'variants'>,
  source?: Exercise
): Pick<Exercise, 'correctAnswer' | 'acceptedAnswers' | 'variants'> {
  return {
    correctAnswer:
      typeof candidate?.correctAnswer === 'string' && candidate.correctAnswer.trim()
        ? candidate.correctAnswer
        : (source?.correctAnswer ?? ''),
    acceptedAnswers: [
      ...(Array.isArray(candidate?.acceptedAnswers) ? candidate.acceptedAnswers : []),
      ...(source?.acceptedAnswers ?? []),
    ],
    variants: source?.variants ?? candidate?.variants,
  }
}
