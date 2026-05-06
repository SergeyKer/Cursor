import type { AdaptiveEvent } from '@/types/adaptiveRetention'

const STORAGE_KEY = 'my-eng-bot-adaptive-events'
const MAX_EVENTS = 100

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function recordAdaptiveEvent(event: AdaptiveEvent): void {
  if (!canUseStorage()) return
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const current = raw ? (JSON.parse(raw) as AdaptiveEvent[]) : []
    const next = [event, ...(Array.isArray(current) ? current : [])].slice(0, MAX_EVENTS)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Analytics are best-effort in local MVP.
  }
}

export function listAdaptiveEvents(): AdaptiveEvent[] {
  if (!canUseStorage()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as AdaptiveEvent[]) : []
  } catch {
    return []
  }
}
