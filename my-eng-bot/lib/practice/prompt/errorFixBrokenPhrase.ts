import { normalizeEnglishForLearnerAnswerMatch } from '@/lib/normalizeEnglishForLearnerAnswerMatch'
import { collectLessonChoicePool } from '@/lib/practice/lessonChoicePool'
import type { LessonData } from '@/types/lesson'

const CONTENT_STOP = new Set([
  'i',
  "i'm",
  'im',
  "it's",
  'its',
  'it',
  'is',
  'am',
  'are',
  'the',
  'a',
  'an',
  'to',
  'my',
  'your',
  'me',
  'do',
  'does',
])

function tokenize(value: string): string[] {
  return value
    .replace(/[’']/g, '')
    .replace(/[.,!?;:()[\]{}"]/g, ' ')
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function contentTokens(value: string): string[] {
  return tokenize(value).filter((token) => !CONTENT_STOP.has(token.toLowerCase()))
}

export function extractErrorFixBrokenPhrase(prompt: string): string | null {
  const match = /Исправьте:\s*["«]([^"»]+)["»]/iu.exec(prompt)
  const broken = match?.[1]?.trim()
  return broken || null
}

export function extractSituationKeyFromErrorFixPrompt(prompt: string): string {
  const situation = /(?:Ситуация|Тема)\s*:\s*([^.]*)/iu.exec(prompt)
  const key = (situation?.[1] ?? prompt).trim().toLowerCase().replace(/\s+/g, ' ')
  return key
}

export function isErrorFixBrokenValid(broken: string, targetAnswer: string): boolean {
  const trimmedBroken = broken.trim()
  const trimmedTarget = targetAnswer.trim()
  if (!trimmedBroken || !trimmedTarget) return false
  if (trimmedBroken.toLowerCase() === trimmedTarget.toLowerCase()) return false

  const normalizedBroken = normalizeEnglishForLearnerAnswerMatch(trimmedBroken, 'translation')
  const normalizedTarget = normalizeEnglishForLearnerAnswerMatch(trimmedTarget, 'translation')
  if (!normalizedBroken || !normalizedTarget) return false
  if (normalizedBroken === normalizedTarget) return false

  const brokenWords = contentTokens(trimmedBroken).map((item) => item.toLowerCase())
  const targetWords = contentTokens(trimmedTarget).map((item) => item.toLowerCase())
  if (brokenWords.length === 0 || targetWords.length === 0) return false

  // Reject traps that only differ by function words / missing be (It dark / It is dark).
  if (brokenWords.join(' ') === targetWords.join(' ')) return false

  return true
}

function swapContentWord(targetAnswer: string, replacement: string): string | null {
  const tokens = tokenize(targetAnswer)
  if (tokens.length < 2) return null
  const contentIndexes = tokens
    .map((token, index) => ({ token, index }))
    .filter(({ token }) => !CONTENT_STOP.has(token.toLowerCase()))
  if (contentIndexes.length === 0) return null

  const pivot = contentIndexes[contentIndexes.length - 1]!
  if (pivot.token.toLowerCase() === replacement.toLowerCase()) return null
  const next = [...tokens]
  const endsWithPunct = /[.!?]$/.test(targetAnswer.trim())
  next[pivot.index] = replacement
  let phrase = next.join(' ')
  if (endsWithPunct && !/[.!?]$/.test(phrase)) phrase = `${phrase}.`
  return phrase
}

function reorderContentWords(targetAnswer: string): string | null {
  const tokens = tokenize(targetAnswer)
  if (tokens.length < 3) return null
  const contentIndexes = tokens
    .map((token, index) => ({ token, index }))
    .filter(({ token }) => !CONTENT_STOP.has(token.toLowerCase()))
  if (contentIndexes.length < 2) return null
  const a = contentIndexes[0]!
  const b = contentIndexes[contentIndexes.length - 1]!
  const next = [...tokens]
  next[a.index] = b.token
  next[b.index] = a.token
  const endsWithPunct = /[.!?]$/.test(targetAnswer.trim())
  let phrase = next.join(' ')
  if (endsWithPunct && !/[.!?]$/.test(phrase)) phrase = `${phrase}.`
  return phrase
}

function dropContentWord(targetAnswer: string): string | null {
  const tokens = tokenize(targetAnswer)
  const contentIndexes = tokens
    .map((token, index) => ({ token, index }))
    .filter(({ token }) => !CONTENT_STOP.has(token.toLowerCase()))
  if (contentIndexes.length < 2) return null
  const drop = contentIndexes[contentIndexes.length - 1]!
  const next = tokens.filter((_, index) => index !== drop.index)
  const endsWithPunct = /[.!?]$/.test(targetAnswer.trim())
  let phrase = next.join(' ')
  if (endsWithPunct && !/[.!?]$/.test(phrase)) phrase = `${phrase}.`
  return phrase
}

function candidateReplacements(targetAnswer: string, lesson: LessonData): string[] {
  const pool = collectLessonChoicePool(lesson, targetAnswer)
  const targetContent = new Set(contentTokens(targetAnswer).map((item) => item.toLowerCase()))
  const words: string[] = []
  for (const option of pool) {
    for (const token of contentTokens(option)) {
      const key = token.toLowerCase()
      if (targetContent.has(key)) continue
      if (words.some((item) => item.toLowerCase() === key)) continue
      words.push(token)
    }
  }
  return words
}

/** Build a STT-safe broken phrase: prefer wrong content word, then order, then missing word. */
export function buildBrokenPhraseFromTarget(targetAnswer: string, lesson: LessonData): string | null {
  const replacements = candidateReplacements(targetAnswer, lesson)
  for (const replacement of replacements) {
    const swapped = swapContentWord(targetAnswer, replacement)
    if (swapped && isErrorFixBrokenValid(swapped, targetAnswer)) return swapped
  }

  const reordered = reorderContentWords(targetAnswer)
  if (reordered && isErrorFixBrokenValid(reordered, targetAnswer)) return reordered

  const dropped = dropContentWord(targetAnswer)
  if (dropped && isErrorFixBrokenValid(dropped, targetAnswer)) return dropped

  return null
}
