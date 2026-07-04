import { TRANSLATE_PROMPT_PREFIX } from '@/lib/lessonTranslatePrompt'
import { extractSituationLabel, findLessonStepBubbleContent } from '@/lib/practice/buildChoicePrompt'
import { pickSuggestedScenario } from '@/lib/practice/buildPracticeDiversity'
import type { LessonData, LessonStep } from '@/types/lesson'

const KEYWORD_STOP_WORDS = new Set([
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
  'time',
  'my',
  'your',
  'me',
  'do',
  'does',
  'who',
  'what',
  'where',
  'when',
  'how',
])

export function mergePromptParts(parts: string[]): string {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isTranslateStylePrompt(prompt: string): boolean {
  const trimmed = prompt?.trim() ?? ''
  if (!trimmed) return false
  return trimmed.toLowerCase().startsWith(TRANSLATE_PROMPT_PREFIX.toLowerCase())
}

export function situationalPromptHasContext(prompt: string): boolean {
  const normalized = prompt.trim()
  if (!normalized || !/[А-Яа-яЁё]/.test(normalized)) return false
  if (isTranslateStylePrompt(normalized)) return false
  if (/ситуация\s*:/i.test(normalized)) return true
  if (/тема\s*:/i.test(normalized)) return true
  return normalized.length >= 24
}

export function resolveSituationLine(step: LessonStep, lesson: LessonData, stepIndex: number): string {
  const taskContent = findLessonStepBubbleContent(step, 'task')
  const fromTask = extractSituationLabel(taskContent)
  if (fromTask) return fromTask

  const situations = lesson.repeatConfig?.sourceSituations ?? []
  const suggested = pickSuggestedScenario(situations, stepIndex, [])
  if (suggested) return `Ситуация: ${suggested.replace(/[.!?…]+$/u, '')}.`

  const topic = lesson.topic.trim()
  if (topic) return `Тема: ${topic}.`
  return 'Ситуация: короткая бытовая сцена.'
}

export function extractSemanticKeywords(targetAnswer: string, limit = 4): string[] {
  const tokens = targetAnswer
    .replace(/[.,!?;:()[\]{}'"]/g, ' ')
    .split(/\s+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)

  const keywords: string[] = []
  for (const token of tokens) {
    if (KEYWORD_STOP_WORDS.has(token)) continue
    if (keywords.includes(token)) continue
    keywords.push(token)
    if (keywords.length >= limit) break
  }
  return keywords
}

export function stripAnswerLeakFromHint(hint: string | undefined, targetAnswer: string): string | undefined {
  const trimmedHint = hint?.trim()
  const trimmedTarget = targetAnswer.trim()
  if (!trimmedHint || !trimmedTarget) return trimmedHint
  if (trimmedHint.toLowerCase().includes(trimmedTarget.toLowerCase())) return undefined
  return trimmedHint
}
