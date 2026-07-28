/** In-memory fallback when sessionStorage/localStorage is unavailable (SSR / vitest node). */

type MemoryStore = Map<string, string>

const memorySession: MemoryStore = new Map()
const memoryLocal: MemoryStore = new Map()

function getWebStore(kind: 'session' | 'local'): Storage | null {
  try {
    if (typeof window === 'undefined') return null
    return kind === 'session' ? window.sessionStorage : window.localStorage
  } catch {
    return null
  }
}

export function storageGet(kind: 'session' | 'local', key: string): string | null {
  const web = getWebStore(kind)
  if (web) {
    try {
      return web.getItem(key)
    } catch {
      /* fall through */
    }
  }
  const mem = kind === 'session' ? memorySession : memoryLocal
  return mem.get(key) ?? null
}

export function storageSet(kind: 'session' | 'local', key: string, value: string): void {
  const web = getWebStore(kind)
  if (web) {
    try {
      web.setItem(key, value)
      return
    } catch {
      /* fall through */
    }
  }
  const mem = kind === 'session' ? memorySession : memoryLocal
  mem.set(key, value)
}

export function storageRemove(kind: 'session' | 'local', key: string): void {
  const web = getWebStore(kind)
  if (web) {
    try {
      web.removeItem(key)
    } catch {
      /* ignore */
    }
  }
  const mem = kind === 'session' ? memorySession : memoryLocal
  mem.delete(key)
}

export function clearTutorStorageMemoryForTests(): void {
  memorySession.clear()
  memoryLocal.clear()
}
