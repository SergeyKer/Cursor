import { normalizeEnglishForLearnerAnswerMatch } from '@/lib/normalizeEnglishForLearnerAnswerMatch'

export type VoiceAcceptKind = 'en_word' | 'en_phrase' | 'ru_chip'

/**
 * Thin accept for vocab — practice-grade normalize for EN; strict trim for RU chips.
 * Does not treat accessibility "I repeated" as accept — caller must not pass that as transcript.
 */
export function voiceAccept(params: {
  transcript: string
  target: string
  kind: VoiceAcceptKind
}): boolean {
  const transcript = params.transcript.trim()
  const target = params.target.trim()
  if (!transcript || !target) return false

  if (params.kind === 'ru_chip') {
    return transcript === target
  }

  const scope = params.kind === 'en_phrase' ? 'translation' : 'translation'
  const left = normalizeEnglishForLearnerAnswerMatch(transcript, scope)
  const right = normalizeEnglishForLearnerAnswerMatch(target, scope)
  if (!left || !right) return false
  if (left === right) return true

  // Single-word: allow target contained as whole token after normalize
  if (params.kind === 'en_word') {
    const tokens = left.split(' ').filter(Boolean)
    return tokens.includes(right) || left.includes(right)
  }

  return false
}

export function chipAccept(selected: string, correctRu: string): boolean {
  return voiceAccept({ transcript: selected, target: correctRu, kind: 'ru_chip' })
}
