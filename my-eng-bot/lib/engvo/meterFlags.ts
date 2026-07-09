import type { EngvoCallPhase } from '@/lib/engvo/state'

export function resolveEngvoMeterFlags(params: {
  phase: EngvoCallPhase
  remoteStream: MediaStream | null
  remotePlaybackActive: boolean
}): {
  aiMeterStream: MediaStream | null
  aiMeterActive: boolean
  userMeterActive: boolean
} {
  const isUserTurn = params.phase === 'listening' || params.phase === 'userFinalizing'
  const isAssistantWait =
    params.phase === 'assistantPending' || params.phase === 'assistantSpeaking'
  const useRemote = Boolean(params.remotePlaybackActive && params.remoteStream)

  return {
    aiMeterStream: useRemote ? params.remoteStream : null,
    // Live analyser while AI audio plays; otherwise light idle ripple while the call turn is alive.
    aiMeterActive: useRemote || isUserTurn || isAssistantWait,
    // Mic follows call phase only (do not gate on remotePlaybackActive — OpenAI can leave it stuck true).
    userMeterActive: params.phase === 'connecting' || isUserTurn,
  }
}
