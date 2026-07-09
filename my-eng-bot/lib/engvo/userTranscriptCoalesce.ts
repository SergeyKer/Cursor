import { ENGVO_XAI_USER_COALESCE_WINDOW_MS } from '@/lib/engvo/constants'

const CONTRACTION_EXPANSIONS: Array<[RegExp, string]> = [
  [/\bi'm\b/g, 'i am'],
  [/\byou're\b/g, 'you are'],
  [/\bwe're\b/g, 'we are'],
  [/\bthey're\b/g, 'they are'],
  [/\bit's\b/g, 'it is'],
  [/\bthat's\b/g, 'that is'],
  [/\bwhat's\b/g, 'what is'],
  [/\bwho's\b/g, 'who is'],
  [/\bcan't\b/g, 'cannot'],
  [/\bdon't\b/g, 'do not'],
  [/\bdidn't\b/g, 'did not'],
  [/\bisn't\b/g, 'is not'],
  [/\baren't\b/g, 'are not'],
  [/\bwasn't\b/g, 'was not'],
  [/\bweren't\b/g, 'were not'],
]

/** Normalize transcript for near-duplicate compare (punctuation/case/spacing/contractions). */
export function normalizeEngvoUserTranscriptForCompare(text: string): string {
  let out = text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, '')
    .replace(/\s+/g, ' ')
  for (const [pattern, replacement] of CONTRACTION_EXPANSIONS) {
    out = out.replace(pattern, replacement)
  }
  return out.replace(/\s+/g, ' ').trim()
}

/**
 * xAI noisy VAD may emit two near-identical user finals in a short window.
 * Coalesce into one bubble instead of inserting a second turn.
 */
export function shouldCoalesceEngvoUserTranscript(params: {
  previousUserText: string | null | undefined
  nextUserText: string
  elapsedMsSincePreviousUser: number
  windowMs?: number
}): boolean {
  const prev = normalizeEngvoUserTranscriptForCompare(params.previousUserText ?? '')
  const next = normalizeEngvoUserTranscriptForCompare(params.nextUserText)
  if (!prev || !next) return false
  if (params.elapsedMsSincePreviousUser < 0) return false
  const windowMs = params.windowMs ?? ENGVO_XAI_USER_COALESCE_WINDOW_MS
  if (params.elapsedMsSincePreviousUser > windowMs) return false
  return prev === next
}
