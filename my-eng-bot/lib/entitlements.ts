import { featureFlags } from '@/lib/featureFlags'

/** Stub entitlement: AI reinforce только при флаге (до реального Premium). */
export function canUseAiReinforce(): boolean {
  return featureFlags.aiReinforceV1 === true
}
