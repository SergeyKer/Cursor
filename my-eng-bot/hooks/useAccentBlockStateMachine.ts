'use client'

import * as React from 'react'
import {
  createAccentAttemptId,
  initialAccentBlockState,
  reduceAccentBlockState,
  type AccentBlockRuntimeState,
} from '@/lib/accent/stateMachine'
import type { AccentBlockFeedback } from '@/types/accent'

export interface AccentBlockStateMachine {
  runtime: AccentBlockRuntimeState
  startRecording: () => void
  finalizeRecording: () => void
  submitPreview: () => void
  showFeedback: (feedback: AccentBlockFeedback) => void
  completeBlock: () => void
  reset: () => void
}

export function useAccentBlockStateMachine(): AccentBlockStateMachine {
  const [runtime, dispatch] = React.useReducer(reduceAccentBlockState, initialAccentBlockState)

  const startRecording = React.useCallback(() => {
    dispatch({ type: 'START_RECORDING', attemptId: createAccentAttemptId() })
  }, [])

  const finalizeRecording = React.useCallback(() => {
    dispatch({ type: 'FINALIZE_RECORDING' })
  }, [])

  const submitPreview = React.useCallback(() => {
    dispatch({ type: 'SUBMIT_PREVIEW' })
  }, [])

  const showFeedback = React.useCallback((feedback: AccentBlockFeedback) => {
    dispatch({ type: 'SHOW_FEEDBACK', feedback })
  }, [])

  const completeBlock = React.useCallback(() => {
    dispatch({ type: 'COMPLETE_BLOCK' })
  }, [])

  const reset = React.useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  return {
    runtime,
    startRecording,
    finalizeRecording,
    submitPreview,
    showFeedback,
    completeBlock,
    reset,
  }
}
