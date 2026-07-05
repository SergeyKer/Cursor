export const GAP_FILL_PROMPT_PREFIX = 'Выберите слово для пропуска:'

export type ParsedLegacyGapQuestion = {
  ruPhrase: string
  gapFrameEn: string
}

export function buildGapFillPrompt(ruPhrase: string, gapFrameEn: string): string {
  const ru = ruPhrase.trim().replace(/[.!?…]+$/u, '')
  const frame = gapFrameEn.trim()
  const normalizedFrame = frame.includes('___') ? frame : `${frame} ___`
  return `${GAP_FILL_PROMPT_PREFIX} ${ru} — «${normalizedFrame}».`
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

export function isGapFillStylePrompt(prompt: string): boolean {
  const trimmed = prompt?.trim() ?? ''
  if (!trimmed) return false
  if (!trimmed.toLowerCase().startsWith(GAP_FILL_PROMPT_PREFIX.toLowerCase())) return false
  if (!/___/.test(trimmed)) return false
  if (!/[А-Яа-яЁё]/.test(trimmed)) return false
  return /[-—]/.test(trimmed) && /["«]/.test(trimmed)
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
