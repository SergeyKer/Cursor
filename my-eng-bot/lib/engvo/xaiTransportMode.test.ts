import { describe, expect, it } from 'vitest'
import { resolveEngvoXaiTransportModeServer } from './xaiTransportMode'

describe('resolveEngvoXaiTransportModeServer', () => {
  it('uses relay on deployed host', () => {
    expect(
      resolveEngvoXaiTransportModeServer({
        hostname: 'my-eng-bot.vercel.app',
        hasServerProxyEnv: false,
      })
    ).toBe('relay')
  })

  it('uses direct on localhost without server proxy env', () => {
    expect(
      resolveEngvoXaiTransportModeServer({
        hostname: 'localhost',
        hasServerProxyEnv: false,
      })
    ).toBe('direct')
  })

  it('uses direct on localhost even with server proxy env (relay needs dev:vercel)', () => {
    expect(
      resolveEngvoXaiTransportModeServer({
        hostname: 'localhost',
        hasServerProxyEnv: true,
      })
    ).toBe('direct')
  })

  it('honors NEXT_PUBLIC override', () => {
    expect(
      resolveEngvoXaiTransportModeServer({
        hostname: 'localhost',
        hasServerProxyEnv: false,
        envOverride: 'relay',
      })
    ).toBe('relay')
  })
})
