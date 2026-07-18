import type { LearningSignal, SkillMasterySlice } from '@/lib/learningMemory/types'
import * as localStorageAdapter from '@/lib/learningMemory/storage'

/**
 * Storage port for learning memory (local now → Supabase later).
 * Ranking/UI should depend on this surface, not raw localStorage.
 */
export type LearningMemoryStoragePort = {
  listSignals: () => LearningSignal[]
  saveSignal: typeof localStorageAdapter.saveLearningSignal
  clearSignals: () => void
  loadMasteryMap: () => Record<string, SkillMasterySlice>
  saveMasteryMap: (map: Record<string, SkillMasterySlice>) => void
  clearMasteryMap: () => void
  markSkillsResolved: typeof localStorageAdapter.markSkillsResolved
  clearSkillResolved: typeof localStorageAdapter.clearSkillResolved
}

const localPort: LearningMemoryStoragePort = {
  listSignals: localStorageAdapter.listLearningSignals,
  saveSignal: localStorageAdapter.saveLearningSignal,
  clearSignals: localStorageAdapter.clearLearningSignals,
  loadMasteryMap: localStorageAdapter.loadSkillMasteryMap,
  saveMasteryMap: localStorageAdapter.saveSkillMasteryMap,
  clearMasteryMap: localStorageAdapter.clearSkillMasteryMap,
  markSkillsResolved: localStorageAdapter.markSkillsResolved,
  clearSkillResolved: localStorageAdapter.clearSkillResolved,
}

let activePort: LearningMemoryStoragePort = localPort

/** Test/DI: swap storage backend. */
export function setLearningMemoryStoragePort(port: LearningMemoryStoragePort): void {
  activePort = port
}

export function getLearningMemoryStoragePort(): LearningMemoryStoragePort {
  return activePort
}

export function resetLearningMemoryStoragePort(): void {
  activePort = localPort
}
