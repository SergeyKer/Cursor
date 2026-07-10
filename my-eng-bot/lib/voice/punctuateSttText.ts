import { applyTypoFixes } from '@/lib/voice/applyTypoFixes'
import {
  applyLocalSttPunctuation,
  needsPunctuationPass,
  truncateForSttPunctuate,
  wordsIdentityEqual,
} from '@/lib/voice/sttPunctuation'

export const STT_PUNCTUATE_TIMEOUT_MS = 3000

/**
 * Typo-fix then LLM punctuate-only, with local fallback that never drops punctuation
 * when a pass is needed. Learner word tokens are preserved.
 */
export async function finalizeVoiceTranscript(
  rawText: string,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<string> {
  const typoFixed = applyTypoFixes(rawText.trim())
  if (!typoFixed) return ''
  if (!needsPunctuationPass(typoFixed)) return typoFixed

  const punctuated = await requestSttPunctuation(typoFixed, options)
  if (punctuated && wordsIdentityEqual(typoFixed, punctuated)) {
    return punctuated
  }
  return applyLocalSttPunctuation(typoFixed)
}

/** Returns punctuated text, or null when API/timeout/empty so caller can use local fallback. */
export async function requestSttPunctuation(
  text: string,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<string | null> {
  const payload = truncateForSttPunctuate(text)
  if (!payload) return null

  const timeoutMs = options?.timeoutMs ?? STT_PUNCTUATE_TIMEOUT_MS
  const controller = new AbortController()
  const onAbort = () => controller.abort()
  options?.signal?.addEventListener('abort', onAbort)

  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch('/api/stt-punctuate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: payload }),
      signal: controller.signal,
    })
    if (!res.ok) return null
    const data = (await res.json()) as { text?: string }
    const next = typeof data.text === 'string' ? data.text.trim() : ''
    return next || null
  } catch {
    return null
  } finally {
    globalThis.clearTimeout(timeoutId)
    options?.signal?.removeEventListener('abort', onAbort)
  }
}
