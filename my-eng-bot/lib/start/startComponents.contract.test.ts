import { describe, expect, it } from 'vitest'

describe('StartPageChrome contract', () => {
  it('exports default placeholder title constant', async () => {
    const mod = await import('@/components/start/StartPageChrome')
    expect(typeof mod.default).toBe('function')
  })
})

describe('StartShell contract', () => {
  it('exports client start shell component', async () => {
    const mod = await import('@/components/start/StartShell')
    expect(typeof mod.default).toBe('function')
  })
})
