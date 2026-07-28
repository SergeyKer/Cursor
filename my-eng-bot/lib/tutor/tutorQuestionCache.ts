import { storageGet, storageRemove, storageSet } from '@/lib/tutor/storageAdapter'
import { compactText } from '@/lib/tutor/text'

const CACHE_KEY = 'engvo.tutorQuestionCache:v1'
const CONSUMED_KEY = 'engvo.tutorCardConsumed:v1'
const MAX_CACHE = 40
const MAX_CONSUMED = 30

type QuestionCache = Record<string, { question: string; at: number }>

function readCache(): QuestionCache {
  try {
    const raw = storageGet('local', CACHE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as QuestionCache
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeCache(cache: QuestionCache): void {
  const entries = Object.entries(cache)
    .sort((a, b) => b[1].at - a[1].at)
    .slice(0, MAX_CACHE)
  storageSet('local', CACHE_KEY, JSON.stringify(Object.fromEntries(entries)))
}

export function tutorQuestionFingerprint(skillTagId: string, signalFreshnessKey = ''): string {
  return `${skillTagId}::${signalFreshnessKey}`
}

export function getCachedTutorQuestion(fingerprint: string): string | null {
  const row = readCache()[fingerprint]
  const q = compactText(row?.question, 280)
  return q || null
}

export function setCachedTutorQuestion(fingerprint: string, question: string): void {
  const q = compactText(question, 280)
  if (!q) return
  const cache = readCache()
  cache[fingerprint] = { question: q, at: Date.now() }
  writeCache(cache)
}

export function listConsumedTutorKeys(): string[] {
  try {
    const raw = storageGet('local', CONSUMED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.map((x) => String(x)).slice(0, MAX_CONSUMED) : []
  } catch {
    return []
  }
}

export function markTutorCardConsumed(skillTagId: string): void {
  const id = compactText(skillTagId, 80)
  if (!id) return
  const next = [id, ...listConsumedTutorKeys().filter((x) => x !== id)].slice(0, MAX_CONSUMED)
  storageSet('local', CONSUMED_KEY, JSON.stringify(next))
}

export function clearTutorQuestionStateForTests(): void {
  storageRemove('local', CACHE_KEY)
  storageRemove('local', CONSUMED_KEY)
}
