'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type MicVisualState = 'idle' | 'invite' | 'wait'

const INVITE_TO_WAIT_MS = 1800

export function useMicInviteAnimation(params: { inviteKey: string | null; pauseInvite?: boolean }) {
  const [micVisualState, setMicVisualState] = useState<MicVisualState>('idle')
  const micInviteTimerRef = useRef<number | null>(null)
  const lastInviteKeyRef = useRef<string | null>(null)

  const clearMicAnimationTimers = useCallback(() => {
    if (micInviteTimerRef.current != null) {
      window.clearTimeout(micInviteTimerRef.current)
      micInviteTimerRef.current = null
    }
  }, [])

  const resetMicAnimation = useCallback(() => {
    clearMicAnimationTimers()
    setMicVisualState('idle')
    lastInviteKeyRef.current = null
  }, [clearMicAnimationTimers])

  useEffect(() => {
    if (!params.inviteKey || params.pauseInvite) return
    if (lastInviteKeyRef.current === params.inviteKey) return
    lastInviteKeyRef.current = params.inviteKey
    setMicVisualState((current) => (current === 'idle' ? 'invite' : current))
  }, [params.inviteKey, params.pauseInvite])

  useEffect(() => {
    if (micVisualState !== 'invite') return
    clearMicAnimationTimers()
    micInviteTimerRef.current = window.setTimeout(() => {
      micInviteTimerRef.current = null
      setMicVisualState('wait')
    }, INVITE_TO_WAIT_MS)
    return () => {
      clearMicAnimationTimers()
    }
  }, [clearMicAnimationTimers, micVisualState])

  useEffect(() => {
    return () => {
      clearMicAnimationTimers()
    }
  }, [clearMicAnimationTimers])

  return {
    micVisualState,
    resetMicAnimation,
  }
}
