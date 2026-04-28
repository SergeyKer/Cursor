'use client'

export type FooterVoiceTone = 'neutral' | 'support' | 'hint' | 'celebrate' | 'thinking' | 'error'
export type FooterVoiceEmphasis = 'none' | 'pulse'

export type FooterVoiceSource =
  | 'lesson'
  | 'translation'
  | 'dialogue'
  | 'communication'
  | 'home'
  | 'system'
  | 'future_mode'

export interface FooterVoiceCandidate {
  key: string
  text?: string | null
  compactText?: string | null
  priority?: number
  tone?: FooterVoiceTone
  emphasis?: FooterVoiceEmphasis
}

export interface FooterVoiceSelection {
  text: string
  typingKey: string
  tone: FooterVoiceTone
  emphasis: FooterVoiceEmphasis
}

const DEFAULT_SINGLE_LINE_LIMIT = 46

function normalizeVoiceText(text?: string | null): string {
  return typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : ''
}

function shortenToSingleLine(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  const hardLimit = Math.max(maxLength - 1, 1)
  const slice = text.slice(0, hardLimit)
  const lastSpaceIndex = slice.lastIndexOf(' ')
  if (lastSpaceIndex >= Math.floor(hardLimit * 0.65)) {
    return `${slice.slice(0, lastSpaceIndex).trim()}…`
  }
  return `${slice.trim()}…`
}

function materializeCandidate(
  candidate: FooterVoiceCandidate,
  maxLength: number
): FooterVoiceSelection | null {
  const text = normalizeVoiceText(candidate.text)
  if (!text) return null
  const compactText = normalizeVoiceText(candidate.compactText)
  const resolvedText =
    text.length <= maxLength
      ? text
      : compactText && compactText.length <= maxLength
        ? compactText
        : compactText
          ? shortenToSingleLine(compactText, maxLength)
          : shortenToSingleLine(text, maxLength)

  return {
    text: resolvedText,
    typingKey: candidate.key,
    tone: candidate.tone ?? 'neutral',
    emphasis: candidate.emphasis ?? 'none',
  }
}

export function pickFooterVoice(
  candidates: FooterVoiceCandidate[],
  options?: { maxLength?: number }
): FooterVoiceSelection | null {
  const maxLength = options?.maxLength ?? DEFAULT_SINGLE_LINE_LIMIT
  const sortedCandidates = [...candidates].sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0))

  for (const candidate of sortedCandidates) {
    const selection = materializeCandidate(candidate, maxLength)
    if (selection) return selection
  }

  return null
}
