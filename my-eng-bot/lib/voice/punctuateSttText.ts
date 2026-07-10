import { applyTypoFixes } from '@/lib/voice/applyTypoFixes'
import {
  needsPunctuationPass,
  preserveWordsOnlyPunctuation,
  truncateForSttPunctuate,
} from '@/lib/voice/sttPunctuation'

export const STT_PUNCTUATE_TIMEOUT_MS = 1500

/**
 * Typo-fix then optional LLM punctuate-only pass.
 * Never changes learner words: guard discards rewrites; errors fall back silently.
 */
export async function finalizeVoiceTranscript(
  rawText: string,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<string> {
  const typoFixed = applyTypoFixes(rawText.trim())
  if (!typoFixed) return ''
  if (!needsPunctuationPass(typoFixed)) return typoFixed

  const punctuated = await requestSttPunctuation(typoFixed, options)
  return preserveWordsOnlyPunctuation(typoFixed, punctuated)
}

export async function requestSttPunctuation(
  text: string,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<string> {
  const payload = truncateForSttPunctuate(text)
  if (!payload) return text

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
    if (!res.ok) return text
    const data = (await res.json()) as { text?: string }
    const next = typeof data.text === 'string' ? data.text.trim() : ''
    return next || text
  } catch {
    return text
  } finally {
    globalThis.clearTimeout(timeoutId)
    options?.signal?.removeEventListener('abort', onAbort)
  }
}
