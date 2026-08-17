import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadHomeAudienceChosen, saveHomeAudienceChosen } from '@/lib/home/audienceGate'

describe('audienceGate', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('round-trips chosen flag', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value)
        },
        removeItem: (key: string) => {
          store.delete(key)
        },
      },
    })
    saveHomeAudienceChosen(false)
    expect(loadHomeAudienceChosen()).toBe(false)
    saveHomeAudienceChosen(true)
    expect(loadHomeAudienceChosen()).toBe(true)
    saveHomeAudienceChosen(false)
    expect(loadHomeAudienceChosen()).toBe(false)
  })
})
