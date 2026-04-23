import { describe, expect, it } from 'vitest'
import {
  createRealtimeTranscriptState,
  getRealtimeTranscriptFinalText,
  getRealtimeTranscriptView,
  reduceRealtimeTranscriptEvent,
} from './realtimeStt'

describe('realtimeStt transcript state', () => {
  it('keeps committed items ordered by previous item id', () => {
    let state = createRealtimeTranscriptState()
    state = reduceRealtimeTranscriptEvent(state, {
      type: 'input_audio_buffer.committed',
      item_id: 'item-1',
      previous_item_id: null,
    })
    state = reduceRealtimeTranscriptEvent(state, {
      type: 'input_audio_buffer.committed',
      item_id: 'item-2',
      previous_item_id: 'item-1',
    })

    expect(state.orderedItemIds).toEqual(['item-1', 'item-2'])
  })

  it('builds live interim text from delta events', () => {
    let state = createRealtimeTranscriptState()
    state = reduceRealtimeTranscriptEvent(state, {
      type: 'input_audio_buffer.committed',
      item_id: 'item-1',
      previous_item_id: null,
    })
    state = reduceRealtimeTranscriptEvent(state, {
      type: 'conversation.item.input_audio_transcription.delta',
      item_id: 'item-1',
      delta: 'Hello',
    })
    state = reduceRealtimeTranscriptEvent(state, {
      type: 'conversation.item.input_audio_transcription.delta',
      item_id: 'item-1',
      delta: ', world',
    })

    expect(getRealtimeTranscriptView(state)).toEqual({
      finalText: '',
      interimText: 'Hello, world',
    })
  })

  it('moves completed items into final text and keeps next turn interim', () => {
    let state = createRealtimeTranscriptState()
    state = reduceRealtimeTranscriptEvent(state, {
      type: 'input_audio_buffer.committed',
      item_id: 'item-1',
      previous_item_id: null,
    })
    state = reduceRealtimeTranscriptEvent(state, {
      type: 'conversation.item.input_audio_transcription.completed',
      item_id: 'item-1',
      transcript: 'Hello there',
    })
    state = reduceRealtimeTranscriptEvent(state, {
      type: 'input_audio_buffer.committed',
      item_id: 'item-2',
      previous_item_id: 'item-1',
    })
    state = reduceRealtimeTranscriptEvent(state, {
      type: 'conversation.item.input_audio_transcription.delta',
      item_id: 'item-2',
      delta: 'general',
    })

    expect(getRealtimeTranscriptView(state)).toEqual({
      finalText: 'Hello there',
      interimText: 'general',
    })
  })

  it('resolves a final transcript from final and interim turns', () => {
    let state = createRealtimeTranscriptState()
    state = reduceRealtimeTranscriptEvent(state, {
      type: 'input_audio_buffer.committed',
      item_id: 'item-1',
      previous_item_id: null,
    })
    state = reduceRealtimeTranscriptEvent(state, {
      type: 'conversation.item.input_audio_transcription.completed',
      item_id: 'item-1',
      transcript: 'I am swimming',
    })
    state = reduceRealtimeTranscriptEvent(state, {
      type: 'input_audio_buffer.committed',
      item_id: 'item-2',
      previous_item_id: 'item-1',
    })
    state = reduceRealtimeTranscriptEvent(state, {
      type: 'conversation.item.input_audio_transcription.delta',
      item_id: 'item-2',
      delta: 'in the sea',
    })

    expect(getRealtimeTranscriptFinalText(state)).toBe('I am swimming in the sea')
  })
})
