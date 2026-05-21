import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  consumeNextEngvoWelcomeMessage,
  ENGVO_WELCOME_LINES_A1,
  ENGVO_WELCOME_LINES_ADULT,
  ENGVO_WELCOME_LINES_CHILD,
} from './welcomeMessageRotation'

const KEY = 'myeng-engvo-welcome-rotation-v2'

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

  it('returns Russian lines from the child pool', () => {
    const a = consumeNextEngvoWelcomeMessage('child')
    expect(ENGVO_WELCOME_LINES_CHILD).toContain(a)
    expect(a).toMatch(/[А-Яа-яЁё]/)
  })

  it('returns Russian lines from the adult pool', () => {
    const d = consumeNextEngvoWelcomeMessage('adult')
    expect(ENGVO_WELCOME_LINES_ADULT).toContain(d)
    expect(d).toMatch(/[А-Яа-яЁё]/)
  })

  it('uses A1 pool for both audiences when level is a1', () => {
    const childA1 = consumeNextEngvoWelcomeMessage('child', 'a1')
    const adultA1 = consumeNextEngvoWelcomeMessage('adult', 'a1')
    expect(ENGVO_WELCOME_LINES_A1).toContain(childA1)
    expect(ENGVO_WELCOME_LINES_A1).toContain(adultA1)
    expect(childA1.length).toBeLessThanOrEqual(80)
  })

  it('keeps child, adult and a1 rotations independent', () => {
    consumeNextEngvoWelcomeMessage('child')
    consumeNextEngvoWelcomeMessage('adult')
    consumeNextEngvoWelcomeMessage('child', 'a1')
    const raw = globalThis.localStorage.getItem(KEY)
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!) as {
      child: { cursor: number }
      adult: { cursor: number }
      a1: { cursor: number }
    }
    expect(parsed.child).toBeTruthy()
    expect(parsed.adult).toBeTruthy()
    expect(parsed.a1).toBeTruthy()
  })
})
