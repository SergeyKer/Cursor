import { normalizeEnglishForLearnerAnswerMatch } from '@/lib/normalizeEnglishForLearnerAnswerMatch'
import { isCompleteSentence } from '@/lib/practice/choiceOptionGranularity'
import { inferScenarioCategory } from '@/lib/practice/buildPracticeDiversity'
import { embeddedErrorFixPairIsAligned } from '@/lib/practice/embeddedQuestionScenarioAlignment'
import { collectLessonChoicePool } from '@/lib/practice/lessonChoicePool'
import type { PracticePromptAxis } from '@/lib/practice/prompt/promptSourceTypes'
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

const ERROR_FIX_LEAK_MARKERS = [
  /переведите/iu,
  /выберите\s+слово/iu,
  /___/,
  /дополните\s+одним\s+словом/iu,
  /прослушайте/iu,
  /собеседник\s*:/iu,
]

function tokenize(value: string): string[] {
  return value
    .replace(/[.,!?;:()[\]{}"]/g, ' ')
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeTokenKey(token: string): string {
  return token.replace(/[’']/g, '').toLowerCase()
}

function contentTokens(value: string): string[] {
  return tokenize(value).filter((token) => !CONTENT_STOP.has(normalizeTokenKey(token)))
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

export function inferErrorFixAxis(targetAnswer: string): PracticePromptAxis {
  const normalized = targetAnswer.trim().toLowerCase()
  if (/\btime\s+to\b/.test(normalized) || /\bit'?s\s+time\b/.test(normalized)) return 'action'
  return 'state'
}

export function inferSituationAxis(situationRu: string): PracticePromptAxis | 'unknown' {
  const category = inferScenarioCategory(situationRu)
  if (category === 'time') return 'action'
  if (category === 'weather' || category === 'distance') return 'state'
  return 'unknown'
}

export function errorFixPairIsAligned(
  situationRu: string,
  targetAnswer: string,
  lessonId?: string
): boolean {
  if (lessonId === '3') {
    return embeddedErrorFixPairIsAligned(situationRu, targetAnswer)
  }
  if (lessonId && lessonId !== '1') return true
  const situationAxis = inferSituationAxis(situationRu)
  if (situationAxis === 'unknown') return true
  return situationAxis === inferErrorFixAxis(targetAnswer)
}

export function isErrorFixTargetComplete(targetAnswer: string, lessonId?: string): boolean {
  const trimmed = targetAnswer.trim()
  if (!trimmed || !isCompleteSentence(trimmed)) return false
  if (lessonId && lessonId !== '1') return true

  const normalized = trimmed.toLowerCase()
  if (/^it'?s\s+time\.?$/i.test(normalized)) return false
  if (/\btime\b/.test(normalized) && !/\btime\s+to\b/.test(normalized) && !/\btime\s+for\b/.test(normalized)) {
    return false
  }
  return true
}

export function isErrorFixBrokenSameAxis(broken: string, targetAnswer: string): boolean {
  return inferErrorFixAxis(broken) === inferErrorFixAxis(targetAnswer)
}

export function errorFixPromptHasLeakMarkers(prompt: string): boolean {
  const trimmed = prompt.trim()
  if (!trimmed) return true
  return ERROR_FIX_LEAK_MARKERS.some((pattern) => pattern.test(trimmed))
}

/** True when the full target phrase appears in the prompt outside the Исправьте quote. */
export function errorFixPromptLeaksTargetAnswer(prompt: string, targetAnswer: string): boolean {
  const trimmedTarget = targetAnswer.trim()
  if (!trimmedTarget) return false
  const withoutBroken = prompt.replace(/Исправьте:\s*["«][^"»]+["»]\.?/iu, ' ')
  const normalizedPrompt = normalizeEnglishForLearnerAnswerMatch(withoutBroken, 'translation')
  const normalizedTarget = normalizeEnglishForLearnerAnswerMatch(trimmedTarget, 'translation')
  if (!normalizedPrompt || !normalizedTarget) return false
  return normalizedPrompt.includes(normalizedTarget)
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

  const brokenWords = contentTokens(trimmedBroken).map((item) => normalizeTokenKey(item))
  const targetWords = contentTokens(trimmedTarget).map((item) => normalizeTokenKey(item))
  if (brokenWords.length === 0 || targetWords.length === 0) return false

  // Reject traps that only differ by function words / missing be (It dark / It is dark).
  if (brokenWords.join(' ') === targetWords.join(' ')) return false

  if (!isErrorFixBrokenSameAxis(trimmedBroken, trimmedTarget)) return false

  return true
}

function swapContentWord(targetAnswer: string, replacement: string): string | null {
  const tokens = tokenize(targetAnswer)
  if (tokens.length < 2) return null
  const contentIndexes = tokens
    .map((token, index) => ({ token, index }))
    .filter(({ token }) => !CONTENT_STOP.has(normalizeTokenKey(token)))
  if (contentIndexes.length === 0) return null

  const pivot = contentIndexes[contentIndexes.length - 1]!
  if (normalizeTokenKey(pivot.token) === normalizeTokenKey(replacement)) return null
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
    .filter(({ token }) => !CONTENT_STOP.has(normalizeTokenKey(token)))
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
    .filter(({ token }) => !CONTENT_STOP.has(normalizeTokenKey(token)))
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
  const targetAxis = inferErrorFixAxis(targetAnswer)
  const targetContent = new Set(contentTokens(targetAnswer).map((item) => normalizeTokenKey(item)))
  const words: string[] = []
  for (const option of pool) {
    if (inferErrorFixAxis(option) !== targetAxis) continue
    for (const token of contentTokens(option)) {
      const key = normalizeTokenKey(token)
      if (targetContent.has(key)) continue
      if (words.some((item) => normalizeTokenKey(item) === key)) continue
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
