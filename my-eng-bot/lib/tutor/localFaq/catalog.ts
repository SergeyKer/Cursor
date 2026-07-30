import { LOCAL_FAQ_A1 } from '@/lib/tutor/localFaq/data/a1'
import { LOCAL_FAQ_A2 } from '@/lib/tutor/localFaq/data/a2'
import { LOCAL_FAQ_B1_NUANCE } from '@/lib/tutor/localFaq/data/b1_nuance'
import { LOCAL_FAQ_B2_GEMS } from '@/lib/tutor/localFaq/data/b2_gems'
import type { LocalFaqEntry, LocalFaqLevel } from '@/lib/tutor/localFaq/types'
import type { LevelId } from '@/lib/types'

const ALL_ENTRIES: readonly LocalFaqEntry[] = [
  ...LOCAL_FAQ_A1,
  ...LOCAL_FAQ_A2,
  ...LOCAL_FAQ_B1_NUANCE,
  ...LOCAL_FAQ_B2_GEMS,
]

const BY_ID = new Map(ALL_ENTRIES.map((e) => [e.id, e]))

/** Map session level to FAQ pool window. */
export function resolveFaqLevelWindow(level: LevelId | null | undefined): LocalFaqLevel[] {
  switch (level) {
    case 'a1':
    case 'starter':
      return ['a1']
    case 'a2':
      return ['a1', 'a2']
    case 'b1':
      return ['a2', 'b1']
    case 'b2':
    case 'c1':
    case 'c2':
      return ['a2', 'b1', 'b2']
    default:
      return ['a1', 'a2']
  }
}

export function getLocalFaqById(id: string): LocalFaqEntry | null {
  return BY_ID.get(id) ?? null
}

export function listLocalFaqForLevels(levels: readonly LocalFaqLevel[]): LocalFaqEntry[] {
  const set = new Set(levels)
  return ALL_ENTRIES.filter((e) => set.has(e.level))
}

export function listAllLocalFaq(): readonly LocalFaqEntry[] {
  return ALL_ENTRIES
}

export function localFaqPoolSize(): number {
  return ALL_ENTRIES.length
}
