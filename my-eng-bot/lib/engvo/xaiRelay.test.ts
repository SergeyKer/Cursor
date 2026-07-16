import { describe, expect, it } from 'vitest'
import {
  buildEngvoXaiRelayWsUrl,
  buildXaiRelayErrorFrame,
  buildXaiUpstreamWsUrl,
  decodeRelayWsTextPayload,
  encodeRelayForwardPayload,
  isAllowedRelayOrigin,
  isAllowedXaiRelayModel,
  isRelaySessionUpdatePayload,
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

  it('decodes ws text Buffer to utf8 string and leaves binary alone', () => {
    const textBuf = Buffer.from('{"type":"session.created"}', 'utf8')
    expect(decodeRelayWsTextPayload(textBuf, false)).toBe('{"type":"session.created"}')
    expect(decodeRelayWsTextPayload(textBuf, true)).toBeNull()
    expect(decodeRelayWsTextPayload('already-string', false)).toBe('already-string')
  })

  it('encodes text frames as string with binary:false (not Buffer binary)', () => {
    const textBuf = Buffer.from('{"type":"session.updated"}', 'utf8')
    const encoded = encodeRelayForwardPayload(textBuf, false)
    expect(encoded.binary).toBe(false)
    expect(typeof encoded.payload).toBe('string')
    expect(encoded.payload).toBe('{"type":"session.updated"}')

    const binary = encodeRelayForwardPayload(Buffer.from([1, 2, 3]), true)
    expect(binary.binary).toBe(true)
    expect(Buffer.isBuffer(binary.payload)).toBe(true)
  })

  it('detects session.update JSON payloads', () => {
    expect(isRelaySessionUpdatePayload('{"type":"session.update","session":{}}')).toBe(true)
    expect(isRelaySessionUpdatePayload('{"type":"input_audio_buffer.append"}')).toBe(false)
  })
})
