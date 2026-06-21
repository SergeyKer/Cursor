import type { Audience } from '@/lib/types'

export type StartBranchIntent = 'chat' | 'hub' | null

export type StartBridgeState = {
  audience: Audience | null
  audienceChosen: boolean
  branchIntent: StartBranchIntent
  runtimeLoading: boolean
}

export function createEmptyBridge(): StartBridgeState {
  return {
    audience: null,
    audienceChosen: false,
    branchIntent: null,
    runtimeLoading: false,
  }
}

export function mergeBridgeState(
  current: StartBridgeState,
  patch: Partial<StartBridgeState>
): StartBridgeState {
  return { ...current, ...patch }
}

export function resolveHomeMenuViewFromIntent(intent: StartBranchIntent): 'root' | 'aiChat' | 'lessons' {
  if (intent === 'chat') return 'aiChat'
  if (intent === 'hub') return 'lessons'
  return 'root'
}

export function bridgeForBranchActivation(
  audience: Audience,
  intent: Exclude<StartBranchIntent, null>
): StartBridgeState {
  return {
    audience,
    audienceChosen: true,
    branchIntent: intent,
    runtimeLoading: true,
  }
}

/** SSR-safe snapshot for hydration checks - no Date/window/random. */
export function serializeBridgeForHydration(bridge: StartBridgeState): string {
  return JSON.stringify({
    audience: bridge.audience,
    audienceChosen: bridge.audienceChosen,
    branchIntent: bridge.branchIntent,
    runtimeLoading: bridge.runtimeLoading,
  })
}
