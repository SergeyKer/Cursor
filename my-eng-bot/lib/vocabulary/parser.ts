import { ENGLISH_REPLACEMENTS, normalizeEnglishText, normalizeTranslationText } from '@/lib/vocabulary/cleanupRules'
import type { ParsedNecessaryWord } from '@/types/vocabulary'

function extractTranscription(leftPart: string): string {
  const matches = Array.from(leftPart.matchAll(/\[([^\]]+)\]/g)).map((match) => `[${match[1]}]`)
  return matches.join(', ')
}

function extractEnglish(leftPart: string): string {
  const withoutPhonetics = leftPart.replace(/\[[^\]]+\]/g, ' ')
  return normalizeEnglishText(withoutPhonetics)
}

export function parseNecessaryWordLine(line: string): ParsedNecessaryWord | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  const numbered = trimmed.match(/^(\d+)\.\s*(.+)$/u)
  if (!numbered) return null

  const id = Number(numbered[1])
  if (!Number.isInteger(id) || id <= 0) return null

  const body = numbered[2] ?? ''
  const separatorIndex = body.indexOf(' — ')
  if (separatorIndex === -1) return null

  const leftPart = body.slice(0, separatorIndex).trim()
  const rightPart = body.slice(separatorIndex + 3).trim()
  if (!leftPart || !rightPart) return null

  const transcription = extractTranscription(leftPart)
  const explicitEnglish = ENGLISH_REPLACEMENTS[id]
  const en = explicitEnglish ?? extractEnglish(leftPart)
  const ru = normalizeTranslationText(id, rightPart)

  if (!en || !ru) return null

  return {
    id,
    en,
    ru,
    transcription,
    source: trimmed,
  }
}

export function parseNecessaryWordsText(source: string): ParsedNecessaryWord[] {
  return source
    .split(/\r?\n/u)
    .map((line) => parseNecessaryWordLine(line))
    .filter((word): word is ParsedNecessaryWord => Boolean(word))
}
