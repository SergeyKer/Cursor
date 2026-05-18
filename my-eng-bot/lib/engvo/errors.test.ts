import { describe, expect, it } from 'vitest'
import {
  ENGVO_SESSION_CONFIG_USER_MESSAGE,
  normalizeEngvoRealtimeUserMessage,
  resolveEngvoRealtimeUserMessage,
} from './errors'

describe('resolveEngvoRealtimeUserMessage', () => {
  it('maps unknown session.speed to a friendly Russian message', () => {
    const result = resolveEngvoRealtimeUserMessage({
      raw: "Unknown parameter: 'session.speed'.",
    })
    expect(result.userMessage).toBe(ENGVO_SESSION_CONFIG_USER_MESSAGE)
    expect(result.apiMessage).toContain('session.speed')
  })

  it('maps missing session.type to a friendly Russian message', () => {
    const result = resolveEngvoRealtimeUserMessage({
      raw: "Missing required parameter: 'session.type'.",
    })
    expect(result.userMessage).toBe(ENGVO_SESSION_CONFIG_USER_MESSAGE)
    expect(result.apiMessage).toContain('session.type')
  })

  it('maps rate limit responses', () => {
    const result = resolveEngvoRealtimeUserMessage({
      raw: 'rate limited',
      httpStatus: 429,
    })
    expect(result.userMessage).toContain('Слишком много запросов')
  })
})

describe('normalizeEngvoRealtimeUserMessage', () => {
  it('prefers userMessage from server JSON payload', () => {
    const message = normalizeEngvoRealtimeUserMessage(
      JSON.stringify({
        error: "Missing required parameter: 'session.type'.",
        userMessage: ENGVO_SESSION_CONFIG_USER_MESSAGE,
        diagnostics: { openAiStatus: 400 },
      })
    )
    expect(message).toBe(ENGVO_SESSION_CONFIG_USER_MESSAGE)
    expect(message).not.toContain('Missing required parameter')
  })

  it('maps raw API text without JSON wrapper', () => {
    const message = normalizeEngvoRealtimeUserMessage("Missing required parameter: 'session.type'.")
    expect(message).toBe(ENGVO_SESSION_CONFIG_USER_MESSAGE)
  })
})
