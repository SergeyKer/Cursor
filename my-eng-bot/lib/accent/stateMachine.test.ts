import { describe, expect, it } from 'vitest'
import { initialAccentBlockState, reduceAccentBlockState } from '@/lib/accent/stateMachine'
import type { AccentBlockFeedback } from '@/types/accent'

const feedback: AccentBlockFeedback = {
  lessonId: 'th-think',
  blockType: 'words',
  score: 80,
  summary: 'Распознано 4/5.',
  coachMessage: 'Повтори thank.',
  problemWords: ['thank'],
}

describe('accent state machine', () => {
  it('moves through the valid six-state flow', () => {
    const recording = reduceAccentBlockState(initialAccentBlockState, { type: 'START_RECORDING', attemptId: 'attempt-1' })
    const preview = reduceAccentBlockState(recording, { type: 'FINALIZE_RECORDING' })
    const submitting = reduceAccentBlockState(preview, { type: 'SUBMIT_PREVIEW' })
    const withFeedback = reduceAccentBlockState(submitting, { type: 'SHOW_FEEDBACK', feedback })
    const complete = reduceAccentBlockState(withFeedback, { type: 'COMPLETE_BLOCK' })

    expect([recording.state, preview.state, submitting.state, withFeedback.state, complete.state]).toEqual([
      'recording',
      'preview',
      'submitting',
      'feedback',
      'complete',
    ])
    expect(complete.attemptId).toBe('attempt-1')
    expect(complete.feedback?.score).toBe(80)
  })

  it('ignores invalid transitions', () => {
    const idleAfterSubmit = reduceAccentBlockState(initialAccentBlockState, { type: 'SUBMIT_PREVIEW' })
    expect(idleAfterSubmit).toBe(initialAccentBlockState)

    const recording = reduceAccentBlockState(initialAccentBlockState, { type: 'START_RECORDING', attemptId: 'attempt-1' })
    const stillRecording = reduceAccentBlockState(recording, { type: 'SHOW_FEEDBACK', feedback })
    expect(stillRecording).toBe(recording)
  })

  it('finalizes recording only once', () => {
    const recording = reduceAccentBlockState(initialAccentBlockState, { type: 'START_RECORDING', attemptId: 'attempt-1' })
    const preview = reduceAccentBlockState(recording, { type: 'FINALIZE_RECORDING' })
    const previewAgain = reduceAccentBlockState(preview, { type: 'FINALIZE_RECORDING' })

    expect(previewAgain).toBe(preview)
    expect(previewAgain.state).toBe('preview')
    expect(previewAgain.finalized).toBe(true)
  })
})
