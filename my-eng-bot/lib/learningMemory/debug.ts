import { featureFlags } from '@/lib/featureFlags'

export function isLearningMemoryDebugEnabled(): boolean {
  if (featureFlags.learningMemoryDebugV1) return true
  if (typeof window === 'undefined') return false
  try {
    if (window.localStorage?.getItem('engvo_learning_memory_debug') === '1') return true
  } catch {
    /* ignore */
  }
  const host = window.location?.hostname
  return host === 'localhost' || host === '127.0.0.1'
}
