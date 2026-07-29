import { describe, expect, it } from 'vitest'
import { matchTutorGate } from '@/lib/tutor/tutorGate'
import { TUTOR_CHAT_COPY } from '@/lib/uiCopy/tutorChat'

describe('matchTutorGate', () => {
  it('stops exact smalltalk', () => {
    expect(matchTutorGate('спасибо')?.reason).toBe('smalltalk')
    expect(matchTutorGate('ты бот?')?.reason).toBe('smalltalk')
    expect(matchTutorGate('привет')?.messageRu).toBe(TUTOR_CHAT_COPY.gateSoftNext)
  })

  it('stops clear off-topic facts', () => {
    expect(matchTutorGate('кто президент США')?.reason).toBe('off_topic')
    expect(matchTutorGate('кто президент США')?.messageRu).toBe(TUTOR_CHAT_COPY.outOfScopeFallback)
  })

  it('stops large homework orders', () => {
    expect(matchTutorGate('напиши эссе на 300 слов')?.reason).toBe('large_order')
  })

  it('does not block explicit EN intents with thematic words', () => {
    expect(matchTutorGate('как сказать президент по-английски?')).toBeNull()
    expect(matchTutorGate('что значит essay?')).toBeNull()
  })
})
