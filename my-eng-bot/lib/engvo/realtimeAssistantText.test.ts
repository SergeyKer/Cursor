import { describe, expect, it } from 'vitest'
import {
  extractRealtimeTextFromResponseDone,
  isEngvoOutputAudioTranscriptDeltaEvent,
  isEngvoOutputAudioTranscriptDoneEvent,
  resolveEngvoRealtimeResponseId,
} from './realtimeAssistantText'

describe('realtimeAssistantText', () => {
  it('resolves response id from top-level or nested response', () => {
    expect(resolveEngvoRealtimeResponseId({ response_id: 'resp_top' })).toBe('resp_top')
    expect(resolveEngvoRealtimeResponseId({ response: { id: 'resp_nested' } })).toBe('resp_nested')
    expect(resolveEngvoRealtimeResponseId({})).toBeNull()
  })

  it('recognizes GA and legacy output audio transcript events', () => {
    expect(isEngvoOutputAudioTranscriptDeltaEvent('response.output_audio_transcript.delta')).toBe(
      true
    )
    expect(isEngvoOutputAudioTranscriptDeltaEvent('response.audio_transcript.delta')).toBe(true)
    expect(isEngvoOutputAudioTranscriptDoneEvent('response.output_audio_transcript.done')).toBe(true)
    expect(isEngvoOutputAudioTranscriptDoneEvent('response.audio_transcript.done')).toBe(true)
    expect(isEngvoOutputAudioTranscriptDeltaEvent('response.output_text.delta')).toBe(false)
  })

  it('extracts transcript from output_audio and legacy audio parts', () => {
    const text = extractRealtimeTextFromResponseDone({
      response: {
        output: [
          {
            content: [
              { type: 'output_audio', transcript: 'Hello from Engvo.' },
              { type: 'audio', transcript: 'Legacy line.' },
            ],
          },
        ],
      },
    })
    expect(text).toBe('Hello from Engvo. Legacy line.')
  })

  it('extracts output_text parts', () => {
    const text = extractRealtimeTextFromResponseDone({
      response: {
        output: [{ content: [{ type: 'output_text', text: 'Plain text reply.' }] }],
      },
    })
    expect(text).toBe('Plain text reply.')
  })
})
