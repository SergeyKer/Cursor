import { describe, expect, it } from 'vitest'
import { resolveEngvoXaiTransportMode } from './xaiTransportMode'

describe('resolveEngvoXaiTransportMode', () => {
  it('uses direct on localhost', () => {
    expect(resolveEngvoXaiTransportMode({ hostname: 'localhost' })).toBe('direct')
    expect(resolveEngvoXaiTransportMode({ hostname: '127.0.0.1' })).toBe('direct')
  })

  it('uses relay on deployed host', () => {
    expect(resolveEngvoXaiTransportMode({ hostname: 'my-eng-bot.vercel.app' })).toBe('relay')
  })
})
