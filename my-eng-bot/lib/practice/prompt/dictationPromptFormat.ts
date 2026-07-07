import { pickSuggestedScenario } from '@/lib/practice/buildPracticeDiversity'
import { isInstructionalRuPhrase } from '@/lib/practice/prompt/dropdownFillPromptFormat'
import { resolveSituationLine, situationalPromptHasContext } from '@/lib/practice/prompt/promptSourceUtils'
import type { PracticePromptSource } from '@/lib/practice/prompt/promptSourceTypes'
import type { LessonData } from '@/types/lesson'

export const DICTATION_INSTRUCTION = 'Прослушайте английскую фразу и запишите её целиком.'

const DICTATION_LEAK_MARKERS = [
  /переведите/iu,
  /выберите\s+слово/iu,
  /___/,
  /дополните\s+одним\s+словом/iu,
]

export function buildDictationTaskPrompt(ruSituation: string): string {
  const situation = ruSituation.trim().replace(/[.!?…]+$/u, '')
  return `Ситуация: ${situation}.`
}

const DICTATION_INSTRUCTION_TAIL =
  /\s*прослушайте\s+английскую\s+фразу\s+и\s+запишите\s+е[ёе]\s+целиком\.?\s*$/iu

export function stripDictationTaskInstruction(prompt: string): string {
  return prompt.trim().replace(DICTATION_INSTRUCTION_TAIL, '').trim()
}

export function dictationPromptHasLeakMarkers(prompt: string): boolean {
  const trimmed = prompt.trim()
  if (!trimmed) return true
  return DICTATION_LEAK_MARKERS.some((pattern) => pattern.test(trimmed))
}

const DICTATION_SCENARIO_PREFIX = /^сценарий\s+\d+\s+из\s+\d+\s*:\s*/iu

function normalizeDictationPromptForValidation(prompt: string): string {
  return prompt.trim().replace(DICTATION_SCENARIO_PREFIX, '').trim()
}

export function isDictationStylePrompt(prompt: string): boolean {
  const trimmed = normalizeDictationPromptForValidation(stripDictationTaskInstruction(prompt))
  if (!trimmed) return false
  if (dictationPromptHasLeakMarkers(trimmed)) return false
  if (!/[А-Яа-яЁё]/.test(trimmed)) return false
  if (!/^ситуация\s*:/iu.test(trimmed) && !/^тема\s*:/iu.test(trimmed)) return false
  if (trimmed.includes('\n')) return false
  return situationalPromptHasContext(trimmed)
}

export function dictationPromptHasValidContext(prompt: string): boolean {
  return isDictationStylePrompt(prompt)
}

export function resolveDictationRuSituation(
  source: Pick<PracticePromptSource, 'step'>,
  lesson: LessonData,
  stepIndex: number
): string {
  const situations = lesson.repeatConfig?.sourceSituations ?? []
  if (situations.length > 0) {
    const suggested = pickSuggestedScenario(situations, stepIndex, [])
    const situation = (suggested ?? situations[stepIndex % situations.length])
      ?.trim()
      .replace(/[.!?…]+$/u, '')
    if (situation && !isInstructionalRuPhrase(situation)) return situation
  }

  const fromSituation = resolveSituationLine(source.step, lesson, stepIndex)
  const cleaned = fromSituation
    .replace(/^ситуация\s*:\s*/iu, '')
    .replace(/^тема\s*:\s*/iu, '')
    .replace(/[.!?…]+$/u, '')
    .trim()
  if (cleaned && !isInstructionalRuPhrase(cleaned)) return cleaned

  const topic = lesson.topic.trim().replace(/[.!?…]+$/u, '')
  if (topic) return topic
  return 'Ответьте по заданию'
}
