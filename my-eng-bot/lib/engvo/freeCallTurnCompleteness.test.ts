import { describe, expect, it } from 'vitest'
import { isTooLongFreeCallAssistantTurn } from '@/lib/engvo/freeCallTurnCompleteness'

describe('isTooLongFreeCallAssistantTurn', () => {
  it('skips greeting before user final', () => {
    expect(
      isTooLongFreeCallAssistantTurn({
        text: 'Hi there. Ready when you are.',
        level: 'b1',
        userFinalCount: 0,
      }).tooLong
    ).toBe(false)
  })

  it('accepts a short calm reply', () => {
    expect(
      isTooLongFreeCallAssistantTurn({
        text: 'Nice — nature is great. What place do you like outside?',
        level: 'b1',
        userFinalCount: 1,
      }).tooLong
    ).toBe(false)
  })

  it('flags helpdesk persona', () => {
    const r = isTooLongFreeCallAssistantTurn({
      text: "I'm all ears—what can I help you with?",
      level: 'b1',
      userFinalCount: 1,
    })
    expect(r.tooLong).toBe(true)
    expect(r.reason).toBe('helpdesk')
  })

  it('flags nature lecture menu', () => {
    const r = isTooLongFreeCallAssistantTurn({
      text:
        'Nature is endlessly fascinating—where would you like to start? The intricate web of ecosystems, the raw power of weather and geology, the quiet intelligence of plants and animals, or something else?',
      level: 'b1',
      userFinalCount: 1,
    })
    expect(r.tooLong).toBe(true)
    expect(r.reason).toMatch(/lecture|too_long/)
  })

  it('uses stricter A1 word ceiling', () => {
    const long = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ')
    expect(
      isTooLongFreeCallAssistantTurn({
        text: long,
        level: 'a1',
        userFinalCount: 1,
      }).tooLong
    ).toBe(true)
  })
})
