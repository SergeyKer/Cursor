/** GA + legacy Realtime event type names for assistant audio transcript streaming. */
export const ENGVO_OUTPUT_AUDIO_TRANSCRIPT_DELTA_TYPES = [
  'response.output_audio_transcript.delta',
  'response.audio_transcript.delta',
] as const

export const ENGVO_OUTPUT_AUDIO_TRANSCRIPT_DONE_TYPES = [
  'response.output_audio_transcript.done',
  'response.audio_transcript.done',
] as const

export function isEngvoOutputAudioTranscriptDeltaEvent(type: string | undefined): boolean {
  return (
    type === 'response.output_audio_transcript.delta' || type === 'response.audio_transcript.delta'
  )
}

export function isEngvoOutputAudioTranscriptDoneEvent(type: string | undefined): boolean {
  return (
    type === 'response.output_audio_transcript.done' || type === 'response.audio_transcript.done'
  )
}

export function resolveEngvoRealtimeResponseId(payload: {
  response_id?: unknown
  response?: unknown
}): string | null {
  if (typeof payload.response_id === 'string' && payload.response_id.trim()) {
    return payload.response_id
  }
  const response = payload.response as { id?: unknown } | undefined
  if (typeof response?.id === 'string' && response.id.trim()) {
    return response.id
  }
  return null
}

type ContentPart = { type?: string; text?: string; transcript?: string }

function collectTextFromContentParts(content: ContentPart[]): string[] {
  const parts: string[] = []
  for (const part of content) {
    if (part?.type === 'output_text' && typeof part.text === 'string' && part.text.trim()) {
      parts.push(part.text.trim())
    } else if (
      (part?.type === 'output_audio' || part?.type === 'audio') &&
      typeof part.transcript === 'string' &&
      part.transcript.trim()
    ) {
      parts.push(part.transcript.trim())
    }
  }
  return parts
}

/** Text from `response.done` payload (GA `output_audio` / `output_text` + legacy `audio`). */
export function extractRealtimeTextFromResponseDone(payload: unknown): string {
  const response = (
    payload as {
      response?: {
        output?: Array<{ content?: ContentPart[] } | ContentPart>
      }
    }
  )?.response
  const output = Array.isArray(response?.output) ? response.output : []
  const parts: string[] = []

  for (const item of output) {
    if (item && typeof item === 'object' && 'content' in item) {
      const content = Array.isArray((item as { content?: ContentPart[] }).content)
        ? (item as { content: ContentPart[] }).content
        : []
      parts.push(...collectTextFromContentParts(content))
    } else if (item && typeof item === 'object' && 'type' in item) {
      parts.push(...collectTextFromContentParts([item as ContentPart]))
    }
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim()
}
