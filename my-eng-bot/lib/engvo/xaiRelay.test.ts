import { describe, expect, it } from 'vitest'
import {
  buildEngvoXaiRelayWsUrl,
  buildXaiRelayErrorFrame,
  buildXaiUpstreamWsUrl,
  isAllowedRelayOrigin,
  isAllowedXaiRelayModel,
  resolveXaiRelayModel,
} from './xaiRelay'

describe('xaiRelay', () => {
  it('builds same-origin relay URL with model query', () => {
    expect(
      buildEngvoXaiRelayWsUrl('grok-voice-latest', {
        protocol: 'https:',
        host: 'my-eng-bot.vercel.app',
      })
    ).toBe('wss://my-eng-bot.vercel.app/api/realtime-session/xai-relay?model=grok-voice-latest')
  })

  it('builds upstream xAI URL', () => {
    expect(buildXaiUpstreamWsUrl('grok-voice-latest')).toBe(
      'wss://api.x.ai/v1/realtime?model=grok-voice-latest'
    )
  })

  it('whitelists voice models', () => {
    expect(isAllowedXaiRelayModel('grok-voice-latest')).toBe(true)
    expect(isAllowedXaiRelayModel('gpt-4')).toBe(false)
    expect(resolveXaiRelayModel('bad')).toBe('grok-voice-latest')
  })

  it('allows same-origin requests', () => {
    expect(
      isAllowedRelayOrigin({
        origin: 'https://my-eng-bot.vercel.app',
        host: 'my-eng-bot.vercel.app',
      })
    ).toBe(true)
    expect(
      isAllowedRelayOrigin({
        origin: 'https://evil.example',
        host: 'my-eng-bot.vercel.app',
      })
    ).toBe(false)
    expect(
      isAllowedRelayOrigin({
        origin: null,
        host: 'my-eng-bot.vercel.app',
      })
    ).toBe(false)
  })

  it('allows extra origins from env list', () => {
    expect(
      isAllowedRelayOrigin({
        origin: 'https://app.example.com',
        host: 'app.example.com',
        allowedOriginsEnv: 'app.example.com',
      })
    ).toBe(true)
  })

  it('builds error frame compatible with Realtime handler', () => {
    const frame = buildXaiRelayErrorFrame('upstream failed', 'relay_upstream')
    const parsed = JSON.parse(frame) as { type: string; error: { message: string; code: string } }
    expect(parsed.type).toBe('error')
    expect(parsed.error.message).toBe('upstream failed')
    expect(parsed.error.code).toBe('relay_upstream')
  })
})
