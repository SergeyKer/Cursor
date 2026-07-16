import {
  LEARNING_SIGNALS_KEY,
  MAX_LEARNING_SIGNALS,
  SKILL_MASTERY_KEY,
  type LearningSignal,
  type SkillMasterySlice,
} from '@/lib/learningMemory/types'

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // quota / private mode — never break UX
  }
}

export function listLearningSignals(): LearningSignal[] {
  const parsed = readJson<unknown>(LEARNING_SIGNALS_KEY, [])
  return Array.isArray(parsed) ? (parsed as LearningSignal[]) : []
}

export function clearLearningSignals(): void {
  if (!canUseStorage()) return
  try {
    window.localStorage.removeItem(LEARNING_SIGNALS_KEY)
  } catch {
    /* ignore */
  }
}

export function loadSkillMasteryMap(): Record<string, SkillMasterySlice> {
  const parsed = readJson<unknown>(SKILL_MASTERY_KEY, {})
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
  return parsed as Record<string, SkillMasterySlice>
}

export function saveSkillMasteryMap(map: Record<string, SkillMasterySlice>): void {
  writeJson(SKILL_MASTERY_KEY, map)
}

export function clearSkillMasteryMap(): void {
  if (!canUseStorage()) return
  try {
    window.localStorage.removeItem(SKILL_MASTERY_KEY)
  } catch {
    /* ignore */
  }
}

export type SaveLearningSignalInput = Omit<LearningSignal, 'id' | 'at'> & {
  id?: string
  at?: string
}

/**
 * Persist a learning signal. Dedupes by utteranceHash within recent window:
 * same hash → bump lastAt on existing, do not inflate count with a duplicate row.
 */
export function saveLearningSignal(input: SaveLearningSignalInput): LearningSignal | null {
  try {
    const at = input.at ?? new Date().toISOString()
    const id = input.id ?? `ls_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    const nextSignal: LearningSignal = {
      id,
      at,
      source: input.source,
      detector: input.detector,
      utteranceHash: input.utteranceHash,
      rawTopicIds: input.rawTopicIds ?? [],
      rawTopicTitles: input.rawTopicTitles ?? [],
      lessonIdHint: input.lessonIdHint ?? null,
      skillTagIds: input.skillTagIds ?? [],
      snippet: input.snippet,
    }

    const current = listLearningSignals()
    if (nextSignal.utteranceHash) {
      const existingIdx = current.findIndex((s) => s.utteranceHash === nextSignal.utteranceHash)
      if (existingIdx >= 0) {
        const existing = current[existingIdx]!
        const updated: LearningSignal = {
          ...existing,
          at,
          source: nextSignal.source,
          detector: nextSignal.detector,
          rawTopicIds: nextSignal.rawTopicIds.length ? nextSignal.rawTopicIds : existing.rawTopicIds,
          rawTopicTitles: nextSignal.rawTopicTitles.length
            ? nextSignal.rawTopicTitles
            : existing.rawTopicTitles,
          lessonIdHint: nextSignal.lessonIdHint ?? existing.lessonIdHint,
          skillTagIds: nextSignal.skillTagIds.length ? nextSignal.skillTagIds : existing.skillTagIds,
          snippet: nextSignal.snippet ?? existing.snippet,
        }
        const next = [...current]
        next[existingIdx] = updated
        writeJson(LEARNING_SIGNALS_KEY, next.slice(0, MAX_LEARNING_SIGNALS))
        return updated
      }
    }

    const next = [nextSignal, ...current].slice(0, MAX_LEARNING_SIGNALS)
    writeJson(LEARNING_SIGNALS_KEY, next)
    return nextSignal
  } catch {
    return null
  }
}

export function markSkillsResolved(
  skillTagIds: string[],
  cooldownMs: number,
  now: number = Date.now()
): void {
  if (skillTagIds.length === 0) return
  const map = loadSkillMasteryMap()
  const until = new Date(now + cooldownMs).toISOString()
  for (const id of skillTagIds) {
    const prev = map[id]
    map[id] = {
      skillTagId: id,
      errorCount: prev?.errorCount ?? 0,
      bySource: prev?.bySource ?? {},
      lastAt: prev?.lastAt ?? new Date(now).toISOString(),
      lessonIdHint: prev?.lessonIdHint ?? null,
      resolvedUntil: until,
    }
  }
  saveSkillMasteryMap(map)
}

export function clearSkillResolved(skillTagIds: string[]): void {
  if (skillTagIds.length === 0) return
  const map = loadSkillMasteryMap()
  let changed = false
  for (const id of skillTagIds) {
    if (!map[id]?.resolvedUntil) continue
    map[id] = { ...map[id]!, resolvedUntil: null }
    changed = true
  }
  if (changed) saveSkillMasteryMap(map)
}
