import { extractSituationLabel, findLessonStepBubbleContent } from '@/lib/practice/buildChoicePrompt'
import type { Exercise, LessonData, LessonStep } from '@/types/lesson'

export const VOICE_SHADOW_FALLBACK_PROMPT = 'Прослушайте фразу и повторите вслух.'

export const VOICE_SHADOW_INFO_LABEL = 'Прослушайте фразу и повторите её вслух или текстом.'

const REPEAT_PHRASE_PATTERNS = [
  /\s*(?:повторите|повтори)\s+фразу\s*:?.+$/iu,
  /\s*repeat\s+(?:the\s+)?phrase\s*:?.+$/iu,
  /\s*say\s*:?.+$/iu,
] as const

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function stripTargetAnswerFromPrompt(prompt: string, targetAnswer: string): string {
  let result = prompt.trim()
  const normalizedTarget = targetAnswer.trim()
  if (!normalizedTarget) return result

  const quotedVariants = [
    `'${normalizedTarget}'`,
    `"${normalizedTarget}"`,
    `«${normalizedTarget}»`,
    normalizedTarget,
  ]
  for (const variant of quotedVariants) {
    if (variant) {
      result = result.split(variant).join(' ')
    }
  }
  return normalizeWhitespace(result.replace(/[,:;–—-]\s*$/u, '').replace(/\s*[,:;]\s*$/u, ''))
}

export function sanitizeVoiceShadowPrompt(prompt: string, targetAnswer: string): string {
  let result = prompt.trim()
  for (const pattern of REPEAT_PHRASE_PATTERNS) {
    result = result.replace(pattern, '')
  }
  result = stripTargetAnswerFromPrompt(result, targetAnswer)
  result = normalizeWhitespace(result)
  if (!result || !/[А-Яа-яЁё]/.test(result)) {
    return VOICE_SHADOW_FALLBACK_PROMPT
  }
  return /[.!?…]$/.test(result) ? result : `${result}.`
}

export function buildVoiceShadowPrompt(
  step: LessonStep,
  _exercise: Exercise,
  lesson: Pick<LessonData, 'topic'>
): string {
  const taskContent = findLessonStepBubbleContent(step, 'task')
  const situation = extractSituationLabel(taskContent)
  if (situation) return situation

  const topic = lesson.topic.trim()
  if (topic) return `Тема: ${topic}.`
  return VOICE_SHADOW_FALLBACK_PROMPT
}
