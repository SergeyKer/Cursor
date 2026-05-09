import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  consumeNextEngvoWelcomeMessage,
  ENGVO_WELCOME_LINES_ADULT,
  ENGVO_WELCOME_LINES_CHILD,
} from './welcomeMessageRotation'

const KEY = 'myeng-engvo-welcome-rotation-v1'

function installMemoryLocalStorage() {
  const store: Record<string, string> = {}
  const ls = {
    getItem: (k: string) => (k in store ? store[k]! : null),
    setItem: (k: string, v: string) => {
      store[k] = v
    },
    removeItem: (k: string) => {
      delete store[k]
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k]
    },
    key: () => null,
    get length() {
      return Object.keys(store).length
    },
  } as Storage
  vi.stubGlobal('localStorage', ls)
}

describe('consumeNextEngvoWelcomeMessage', () => {
  beforeEach(() => {
    installMemoryLocalStorage()
    globalThis.localStorage.clear()
  })

  it('returns lines from the child pool in some order', () => {
    const a = consumeNextEngvoWelcomeMessage('child')
    expect(ENGVO_WELCOME_LINES_CHILD).toContain(a)
    const b = consumeNextEngvoWelcomeMessage('child')
    expect(ENGVO_WELCOME_LINES_CHILD).toContain(b)
  })

  it('keeps child and adult rotations independent', () => {
    const c = consumeNextEngvoWelcomeMessage('child')
    const d = consumeNextEngvoWelcomeMessage('adult')
    expect(ENGVO_WELCOME_LINES_CHILD).toContain(c)
    expect(ENGVO_WELCOME_LINES_ADULT).toContain(d)
    const raw = globalThis.localStorage.getItem(KEY)
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!) as { child: { cursor: number }; adult: { cursor: number } }
    expect(parsed.child).toBeTruthy()
    expect(parsed.adult).toBeTruthy()
  })
})
