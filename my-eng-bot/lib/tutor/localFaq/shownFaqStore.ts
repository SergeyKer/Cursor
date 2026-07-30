import { storageGet, storageRemove, storageSet } from '@/lib/tutor/storageAdapter'
import { compactText } from '@/lib/tutor/text'

const STORAGE_KEY = 'engvo.tutorShownFaq:v1'
export const SHOWN_FAQ_CAP = 48
export const SHOWN_FAQ_TTL_MS = 14 * 24 * 60 * 60 * 1000

type ShownEntry = { id: string; at: number }

function readEntries(nowMs = Date.now()): ShownEntry[] {
  try {
    const raw = storageGet('local', STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: ShownEntry[] = []
    const seen = new Set<string>()
    for (const row of parsed) {
      if (!row || typeof row !== 'object') continue
      const id = compactText((row as ShownEntry).id, 120)
      const at = Number((row as ShownEntry).at)
      if (!id || !Number.isFinite(at)) continue
      if (nowMs - at > SHOWN_FAQ_TTL_MS) continue
      if (seen.has(id)) continue
      seen.add(id)
      out.push({ id, at })
    }
    out.sort((a, b) => b.at - a.at)
    return out.slice(0, SHOWN_FAQ_CAP)
  } catch {
    return []
  }
}

function writeEntries(entries: ShownEntry[]): void {
  const trimmed = [...entries]
    .sort((a, b) => b.at - a.at)
    .slice(0, SHOWN_FAQ_CAP)
  storageSet('local', STORAGE_KEY, JSON.stringify(trimmed))
}

export function listShownFaqIds(nowMs = Date.now()): string[] {
  return readEntries(nowMs).map((e) => e.id)
}

/** Upsert shown ids (idempotent for Strict Mode). */
export function recordShownFaqIds(ids: readonly string[], nowMs = Date.now()): void {
  if (!ids.length) return
  const prev = readEntries(nowMs)
  const byId = new Map(prev.map((e) => [e.id, e]))
  for (const raw of ids) {
    const id = compactText(raw, 120)
    if (!id || id.startsWith('bank_')) continue
    byId.set(id, { id, at: nowMs })
  }
  writeEntries([...byId.values()])
}

export function pruneShownFaqStore(nowMs = Date.now()): void {
  writeEntries(readEntries(nowMs))
}

/** Drop oldest half by `at` (for pool exhaustion). */
export function clearHalfOldestShown(nowMs = Date.now()): number {
  const entries = readEntries(nowMs)
  if (entries.length === 0) return 0
  const sortedOldestFirst = [...entries].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id))
  const drop = Math.max(1, Math.floor(sortedOldestFirst.length / 2))
  const keep = new Set(sortedOldestFirst.slice(drop).map((e) => e.id))
  writeEntries(entries.filter((e) => keep.has(e.id)))
  return drop
}

export function clearShownFaqForTests(): void {
  storageRemove('local', STORAGE_KEY)
}
