import { normalizeRuTranslatePhrase } from '@/lib/lessonTranslatePrompt'
import { pickSuggestedScenario } from '@/lib/practice/buildPracticeDiversity'
import { resolveSituationLine } from '@/lib/practice/prompt/promptSourceUtils'
import type { PracticePromptSource } from '@/lib/practice/prompt/promptSourceTypes'
import type { LessonData } from '@/types/lesson'

export const GAP_FILL_PROMPT_PREFIX = 'Выберите слово для пропуска:'
/** Разделитель RU-фразы и английской рамки — как в уроках (step7Contrast), не длинное тире. */
export const GAP_FILL_PROMPT_SEPARATOR = ' - '

export type ParsedLegacyGapQuestion = {
  ruPhrase: string
  gapFrameEn: string
}

export type ParsedFillInstructionGap = {
  gapFrameEn: string
}

const INSTRUCTIONAL_RU_PREFIX = /^(дополните|впишите|переведите|выберите|восстановите)\b/iu

export function buildGapFillPrompt(ruPhrase: string, gapFrameEn: string): string {
  const ru = normalizeRuTranslatePhrase(ruPhrase)
  const frame = gapFrameEn.trim()
  const normalizedFrame = frame.includes('___') ? frame : `${frame} ___`
  return `${GAP_FILL_PROMPT_PREFIX} "${ru}"${GAP_FILL_PROMPT_SEPARATOR}«${normalizedFrame}».`
}

/** Нормализует gap-fill: длинное тире и русскую фразу без кавычек. */
export function normalizeGapFillPrompt(prompt: string): string {
  const withSeparator = normalizeGapFillPromptSeparator(prompt)
  const parts = extractGapFillParts(withSeparator)
  if (!parts) return withSeparator
  if (/^"/.test(parts.ruPhrase)) return withSeparator
  if (!/[А-Яа-яЁё]/.test(parts.ruPhrase) || isInstructionalRuPhrase(parts.ruPhrase)) {
    return withSeparator
  }
  return buildGapFillPrompt(parts.ruPhrase, parts.gapFrameEn)
}

/** Нормализует длинное тире из ИИ-ответов к каноническому разделителю gap-fill. */
export function normalizeGapFillPromptSeparator(prompt: string): string {
  const trimmed = prompt.trim()
  if (!trimmed.toLowerCase().startsWith(GAP_FILL_PROMPT_PREFIX.toLowerCase())) return prompt
  return prompt.replace(/\s+—\s+(?=«)/gu, GAP_FILL_PROMPT_SEPARATOR)
}

export function parseLegacyTranslateGapQuestion(question: string): ParsedLegacyGapQuestion | null {
  const trimmed = question.trim()
  if (!trimmed) return null

  const translateMatch = trimmed.match(
    /переведите[^:]*:\s*["«]([^"»]+)["»]\s*[-—]\s*["«]([^"»]+)["»]/iu
  )
  if (translateMatch?.[1] && translateMatch?.[2]) {
    return {
      ruPhrase: translateMatch[1].replace(/[.!?…]+$/u, '').trim(),
      gapFrameEn: translateMatch[2].trim(),
    }
  }

  const gapFillMatch = trimmed.match(
    /^выберите слово для пропуска:\s*(.+?)\s*[-—]\s*["«]([^"»]+)["»]/iu
  )
  if (gapFillMatch?.[1] && gapFillMatch?.[2]) {
    return {
      ruPhrase: gapFillMatch[1].replace(/[.!?…]+$/u, '').trim(),
      gapFrameEn: gapFillMatch[2].trim(),
    }
  }

  return null
}

export function parseFillInstructionGapQuestion(question: string): ParsedFillInstructionGap | null {
  const trimmed = question.trim()
  if (!trimmed) return null

  const match = trimmed.match(
    /^(?:дополните(?:\s+одним\s+словом)?|впишите\s+пропуск|дополните)\s*:\s*["«]([^"»]+___[^"»]+)["»]/iu
  )
  if (match?.[1]) {
    return { gapFrameEn: match[1].trim() }
  }

  return null
}

export function extractQuotedGapFrame(question: string): string | null {
  const match = question.match(/["«]([^"»]+___[^"»]+)["»]/i)
  return match?.[1]?.trim() ?? null
}

export function isInstructionalRuPhrase(phrase: string): boolean {
  const trimmed = phrase.trim()
  if (!trimmed) return true
  if (!/[А-Яа-яЁё]/.test(trimmed)) return true
  if (INSTRUCTIONAL_RU_PREFIX.test(trimmed)) return true
  if (/"[^"]+___/.test(trimmed) || /«[^»]+___/.test(trimmed)) return true
  return false
}

export function resolveDropdownRuPhrase(
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

export function extractGapFillParts(prompt: string): { ruPhrase: string; gapFrameEn: string } | null {
  const quotedMatch = prompt.match(/^выберите слово для пропуска:\s*"([^"]+)"\s*[-—]\s*«([^»]+)»\.?$/iu)
  if (quotedMatch?.[1] && quotedMatch?.[2]) {
    return { ruPhrase: quotedMatch[1].trim(), gapFrameEn: quotedMatch[2].trim() }
  }

  const legacyMatch = prompt.match(/^выберите слово для пропуска:\s*(.+?)\s*[-—]\s*«([^»]+)»\.?$/iu)
  if (!legacyMatch?.[1] || !legacyMatch?.[2]) return null
  return { ruPhrase: legacyMatch[1].trim(), gapFrameEn: legacyMatch[2].trim() }
}

export function isGapFillStylePrompt(prompt: string): boolean {
  const trimmed = prompt?.trim() ?? ''
  if (!trimmed) return false
  if (!trimmed.toLowerCase().startsWith(GAP_FILL_PROMPT_PREFIX.toLowerCase())) return false

  const gapCount = (trimmed.match(/___/g) ?? []).length
  if (gapCount !== 1) return false

  const parts = extractGapFillParts(trimmed)
  if (!parts) return false
  if (!/[А-Яа-яЁё]/.test(parts.ruPhrase)) return false
  if (isInstructionalRuPhrase(parts.ruPhrase)) return false
  if (!parts.gapFrameEn.includes('___')) return false

  return true
}

export function gapFillPromptHasValidContext(prompt: string): boolean {
  return isGapFillStylePrompt(prompt)
}

const DROPDOWN_HINT_WRITE_PATTERNS = [
  /напишите/gi,
  /напиши/gi,
  /впишите/gi,
  /впиши/gi,
  /восстановите/gi,
  /восстанови/gi,
]

export function sanitizeDropdownHint(hint: string | undefined): string | undefined {
  const trimmed = hint?.trim() ?? ''
  if (!trimmed) return undefined
  let result = trimmed
  for (const pattern of DROPDOWN_HINT_WRITE_PATTERNS) {
    result = result.replace(pattern, '').trim()
  }
  result = result.replace(/\s+/g, ' ').replace(/^[,.:;\s]+/, '').trim()
  if (!result) return undefined
  return /[.!?…]$/.test(result) ? result : `${result}.`
}
