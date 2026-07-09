/**
 * Normalize OpenAI / xAI realtime server events into a small set of Engvo actions.
 * Keeps AppShell from branching on dozens of provider-specific event names.
 */

export type EngvoNormalizedRealtimeEvent =
  | { kind: 'session_ready' }
  | { kind: 'speech_started' }
  | { kind: 'speech_stopped' }
  | { kind: 'assistant_transcript_final'; text: string; responseId: string | null }
  | { kind: 'assistant_text_final'; text: string; responseId: string | null }
  | { kind: 'user_transcript_final'; text: string; itemId: string | null }
  | { kind: 'user_transcript_delta'; text: string }
  | { kind: 'response_done'; responseId: string | null; raw: Record<string, unknown> }
  | { kind: 'error'; message: string }
  | { kind: 'passthrough'; type: string; raw: Record<string, unknown> }

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value
  }
  return null
}

export function normalizeEngvoRealtimeServerEvent(
  rawJson: string
): EngvoNormalizedRealtimeEvent | null {
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(rawJson) as Record<string, unknown>
  } catch {
    return null
  }
  const type = typeof parsed.type === 'string' ? parsed.type : ''
  if (!type) return null

  if (
    type === 'session.updated' ||
    type === 'session.created' ||
    type === 'session.update.acknowledged'
  ) {
    return { kind: 'session_ready' }
  }

  if (
    type === 'input_audio_buffer.speech_started' ||
    type === 'conversation.item.input_audio_transcription.speech_started'
  ) {
    return { kind: 'speech_started' }
  }

  if (
    type === 'input_audio_buffer.speech_stopped' ||
    type === 'conversation.item.input_audio_transcription.speech_stopped'
  ) {
    return { kind: 'speech_stopped' }
  }

  if (
    type === 'response.output_audio_transcript.done' ||
    type === 'response.audio_transcript.done'
  ) {
    const text =
      pickString(parsed.transcript, parsed.text, asRecord(parsed.item)?.transcript) ?? ''
    const responseId = pickString(parsed.response_id, asRecord(parsed.response)?.id)
    return { kind: 'assistant_transcript_final', text, responseId }
  }

  if (type === 'response.output_text.done' || type === 'response.text.done') {
    const text = pickString(parsed.text, parsed.transcript) ?? ''
    const responseId = pickString(parsed.response_id, asRecord(parsed.response)?.id)
    return { kind: 'assistant_text_final', text, responseId }
  }

  if (
    type === 'conversation.item.input_audio_transcription.completed' ||
    type === 'conversation.item.input_audio_transcription.done'
  ) {
    const text = pickString(parsed.transcript, parsed.text) ?? ''
    const itemId = pickString(parsed.item_id, asRecord(parsed.item)?.id)
    const status = parsed.status
    if (status === 'in_progress' || status === 'incomplete') {
      return { kind: 'user_transcript_delta', text }
    }
    return { kind: 'user_transcript_final', text, itemId }
  }

  if (
    type === 'conversation.item.input_audio_transcription.updated' ||
    type === 'conversation.item.input_audio_transcription.delta' ||
    type === 'input_audio_transcription.delta'
  ) {
    const text = pickString(parsed.delta, parsed.text, parsed.transcript) ?? ''
    return { kind: 'user_transcript_delta', text }
  }

  if (type === 'response.done') {
    const response = asRecord(parsed.response)
    const responseId = pickString(parsed.response_id, response?.id)
    return { kind: 'response_done', responseId, raw: parsed }
  }

  if (type === 'error' || type === 'response.failed') {
    const err = asRecord(parsed.error)
    const message =
      pickString(err?.message, parsed.message, parsed.error) ?? 'Realtime error'
    return { kind: 'error', message }
  }

  return { kind: 'passthrough', type, raw: parsed }
}
