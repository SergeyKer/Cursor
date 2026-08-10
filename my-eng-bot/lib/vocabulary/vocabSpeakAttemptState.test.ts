import { describe, expect, it } from 'vitest'
import {
  initialVocabSpeakAttemptState,
  reduceVocabSpeakAttempt,
} from '@/lib/vocabulary/vocabSpeakAttemptState'
import { estimateCueBeepMs } from '@/lib/voice/playCueBeeps'

describe('reduceVocabSpeakAttempt', () => {
  it('walks idle → playing → cueStart → recording → cueStop → finalizing → preview', () => {
    let state = initialVocabSpeakAttemptState
    state = reduceVocabSpeakAttempt(state, { type: 'START_PLAYING' })
    expect(state.phase).toBe('playing')
    state = reduceVocabSpeakAttempt(state, { type: 'ETALON_ENDED' })
    expect(state.phase).toBe('cueStart')
    state = reduceVocabSpeakAttempt(state, { type: 'CUE_START_DONE' })
    expect(state.phase).toBe('recording')
    state = reduceVocabSpeakAttempt(state, { type: 'STOP_RECORDING' })
    expect(state.phase).toBe('cueStop')
    state = reduceVocabSpeakAttempt(state, { type: 'CUE_STOP_DONE' })
    expect(state.phase).toBe('finalizing')
    state = reduceVocabSpeakAttempt(state, { type: 'PREVIEW_READY' })
    expect(state.phase).toBe('preview')
  })

  it('allows restart from preview', () => {
    let state = reduceVocabSpeakAttempt(
      { phase: 'preview' },
      { type: 'START_PLAYING' }
    )
    expect(state.phase).toBe('playing')
  })

  it('ignores invalid transitions', () => {
    expect(reduceVocabSpeakAttempt({ phase: 'idle' }, { type: 'STOP_RECORDING' }).phase).toBe(
      'idle'
    )
    expect(reduceVocabSpeakAttempt({ phase: 'recording' }, { type: 'ETALON_ENDED' }).phase).toBe(
      'recording'
    )
  })

  it('RESET and CANCEL return idle', () => {
    expect(reduceVocabSpeakAttempt({ phase: 'recording' }, { type: 'RESET' }).phase).toBe('idle')
    expect(reduceVocabSpeakAttempt({ phase: 'preview' }, { type: 'CANCEL' }).phase).toBe('idle')
  })
})

describe('estimateCueBeepMs', () => {
  it('double is longer than single', () => {
    expect(estimateCueBeepMs('double')).toBeGreaterThan(estimateCueBeepMs('single'))
  })
})
