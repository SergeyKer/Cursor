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

  it('falls back to delta text when completed transcript is empty', () => {
    let state = createRealtimeTranscriptState()
    state = reduceRealtimeTranscriptEvent(state, {
      type: 'input_audio_buffer.committed',
      item_id: 'item-1',
      previous_item_id: null,
    })
    state = reduceRealtimeTranscriptEvent(state, {
      type: 'conversation.item.input_audio_transcription.delta',
      item_id: 'item-1',
      delta: 'me too',
    })
    state = reduceRealtimeTranscriptEvent(state, {
      type: 'conversation.item.input_audio_transcription.completed',
      item_id: 'item-1',
      transcript: '',
    })

    expect(state.items['item-1']?.completedText).toBe('me too')
    expect(getRealtimeTranscriptView(state)).toEqual({
      finalText: 'me too',
      interimText: '',
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

  it('keeps partial completed status in interim deltaText, not completedText', () => {
    let state = createRealtimeTranscriptState()
    state = reduceRealtimeTranscriptEvent(state, {
      type: 'input_audio_buffer.committed',
      item_id: 'item-1',
      previous_item_id: null,
    })
    state = reduceRealtimeTranscriptEvent(state, {
      type: 'conversation.item.input_audio_transcription.completed',
      item_id: 'item-1',
      transcript: 'Hello',
      status: 'in_progress',
    })

    expect(state.items['item-1']?.deltaText).toBe('Hello')
    expect(state.items['item-1']?.completedText).toBe('')
    expect(getRealtimeTranscriptView(state)).toEqual({
      finalText: '',
      interimText: 'Hello',
    })

    state = reduceRealtimeTranscriptEvent(state, {
      type: 'conversation.item.input_audio_transcription.completed',
      item_id: 'item-1',
      transcript: 'Hello there friend',
      status: 'completed',
    })

    expect(state.items['item-1']?.completedText).toBe('Hello there friend')
    expect(state.items['item-1']?.deltaText).toBe('')
    expect(getRealtimeTranscriptView(state)).toEqual({
      finalText: 'Hello there friend',
      interimText: '',
    })
  })

  it('replaces cumulative text on updated events instead of appending', () => {
    let state = createRealtimeTranscriptState()
    state = reduceRealtimeTranscriptEvent(state, {
      type: 'input_audio_buffer.committed',
      item_id: 'item-1',
      previous_item_id: null,
    })
    state = reduceRealtimeTranscriptEvent(state, {
      type: 'conversation.item.input_audio_transcription.updated',
      item_id: 'item-1',
      transcript: 'Hello',
    })
    state = reduceRealtimeTranscriptEvent(state, {
      type: 'conversation.item.input_audio_transcription.updated',
      item_id: 'item-1',
      transcript: 'Hello world',
    })

    expect(state.items['item-1']?.deltaText).toBe('Hello world')
    expect(getRealtimeTranscriptView(state)).toEqual({
      finalText: '',
      interimText: 'Hello world',
    })
  })

  it('still commits OpenAI completed without status as final', () => {
    let state = createRealtimeTranscriptState()
    state = reduceRealtimeTranscriptEvent(state, {
      type: 'input_audio_buffer.committed',
      item_id: 'item-1',
      previous_item_id: null,
    })
    state = reduceRealtimeTranscriptEvent(state, {
      type: 'conversation.item.input_audio_transcription.completed',
      item_id: 'item-1',
      transcript: 'OpenAI final',
    })

    expect(state.items['item-1']?.completedText).toBe('OpenAI final')
    expect(getRealtimeTranscriptView(state).finalText).toBe('OpenAI final')
  })
})
