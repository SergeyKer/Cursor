import { describe, expect, it } from 'vitest'
import {
  buildEngvoContinuationResponseInstructions,
  buildEngvoFirstTurnResponseInstructions,
  buildEngvoRealtimeInstructions,
  buildEngvoSpeechSpeedRule,
} from './instructions'
import { buildEngvoRealtimeInstructionsClient } from './instructionsClient'

describe('buildEngvoRealtimeInstructions', () => {
  it('includes safety, english-only rule, CEFR, topic and adult tone', () => {
    const result = buildEngvoRealtimeInstructions({
      audience: 'adult',
      level: 'a2',
      topic: 'travel',
    })

    expect(result).toContain('14+')
    expect(result).toContain('always answer in English only')
    expect(result).toContain('AI_SAFETY:refuse_adult_18plus')
    expect(result).toContain('AI_SAFETY:anti_exfiltration')
    expect(result).toContain('Audience style: ADULT.')
    expect(result).toContain('CEFR lexical ceiling (A2)')
    expect(result).toContain('Active conversation topic: Travel.')
    expect(result).toContain('respectful, warm, and natural')
    expect(result).toContain('Conversational delivery:')
    expect(result).toContain('[pause]')
    expect(result).toContain('[chuckle]')
    expect(result).toContain('If warmth or speech tags conflict with CEFR, keep CEFR')
    expect(result).toContain('For short, simple Russian input')
    expect(result).toContain('Do not mention Russian')
    expect(result).not.toContain('respectful, concise, and calm')
  })

  it('includes child tone, child-safe topic guidance and lexical guardrails', () => {
    const result = buildEngvoRealtimeInstructions({
      audience: 'child',
      level: 'a1',
      topic: 'technology',
    })

    expect(result).toContain('Audience style: CHILD.')
    expect(result).toContain('warm, simple, age-appropriate English')
    expect(result).toContain('CEFR lexical ceiling (A1)')
    expect(result).toContain('Active conversation topic: Movies and series.')
    expect(result).toContain('Low-level reinforcement (A1)')
    expect(result).toContain('Grammar ceiling: Present Simple')
    expect(result).toContain('Avoid abstract or formal words')
    expect(result).toContain('Do not jump to A2/B1 vocabulary')
    expect(result).toContain('Avoid bureaucratic, overly formal, or adult business language.')
    expect(result).toContain('very small English vocabulary')
    expect(result).toContain('Conversational delivery:')
    expect(result).toContain('For A1, keep the existing short-reply ceiling')
    expect(result).not.toContain('For A2+, usually use 1-3 short spoken sentences')
    expect(result).toContain('prefer [pause] or <soft>')
    expect(result).toContain('avoid frequent chuckle or laugh')
  })

  it('keeps A2+ conversational length without relaxing CEFR', () => {
    const result = buildEngvoRealtimeInstructions({
      audience: 'adult',
      level: 'b1',
      topic: 'food',
      kind: 'free_call',
    })

    expect(result).toContain('Conversational delivery:')
    expect(result).toContain('For A2+, usually use 1-3 short spoken sentences')
    expect(result).toContain('CEFR lexical ceiling (B1)')
    expect(result).toContain('If warmth or speech tags conflict with CEFR, keep CEFR')
  })
  it('includes speech pace in instructions alongside audio.output.speed', () => {
    const fast = buildEngvoRealtimeInstructions({
      audience: 'adult',
      level: 'a2',
      topic: 'free_talk',
      speechSpeed: 1,
    })
    const slow = buildEngvoRealtimeInstructions({
      audience: 'adult',
      level: 'a2',
      topic: 'free_talk',
      speechSpeed: 0.8,
    })

    expect(fast).toContain(buildEngvoSpeechSpeedRule(1))
    expect(slow).toContain(buildEngvoSpeechSpeedRule(0.8))
    expect(fast).not.toEqual(slow)
  })

  it('keeps client and server realtime instructions aligned', () => {
    expect(
      buildEngvoRealtimeInstructionsClient({
        audience: 'adult',
        level: 'b1',
        topic: 'music',
      })
    ).toBe(
      buildEngvoRealtimeInstructions({
        audience: 'adult',
        level: 'b1',
        topic: 'music',
      })
    )
  })

  it('builds A1-specific first-turn instruction with warm seed greeting', () => {
    const result = buildEngvoFirstTurnResponseInstructions({
      audience: 'child',
      level: 'a1',
      topic: 'hobbies',
      openingSeedIndex: 0,
    })

    expect(result).toContain('Preferred opening this turn:')
    expect(result).toContain('Hi! Let’s talk.')
    expect(result).toContain('one warm short greeting')
    expect(result).toContain('Present Simple')
    expect(result).toContain('Hobbies and interests')
    expect(result).toContain('Do not add extra filler')
  })

  it('builds a low-level first-turn instruction for A2 inside the selected topic', () => {
    const result = buildEngvoFirstTurnResponseInstructions({
      audience: 'child',
      level: 'a2',
      topic: 'hobbies',
      openingSeedIndex: 0,
    })

    expect(result).toContain('one warm short greeting')
    expect(result).toContain('Preferred opening this turn:')
    expect(result).toContain('Hi! Let’s talk a little.')
    expect(result).toContain('For A2, use very common everyday words')
    expect(result).toContain('The first question must be directly about Hobbies and interests.')
    expect(result).toContain('Do not add extra filler')
  })

  it('varies free-call preferred opening by seed index', () => {
    const a = buildEngvoFirstTurnResponseInstructions({
      audience: 'adult',
      level: 'b1',
      topic: 'free_talk',
      openingSeedIndex: 0,
    })
    const b = buildEngvoFirstTurnResponseInstructions({
      audience: 'adult',
      level: 'b1',
      topic: 'free_talk',
      openingSeedIndex: 1,
    })
    expect(a).toContain('Hi — nice to hear you.')
    expect(b).toContain('Hello. Let’s chat for a bit.')
    expect(a).toContain('warm, natural adult-to-adult')
    expect(a).toContain('Keep the greeting short; do not add a second greeting or a long preamble.')
    expect(a).not.toEqual(b)
  })

  it('builds a continuation instruction that keeps CEFR and topic stable', () => {
    const result = buildEngvoContinuationResponseInstructions({
      audience: 'adult',
      level: 'b1',
      topic: 'travel',
    })

    expect(result).toContain('The learner reconnected after a short break.')
    expect(result).toContain('Keep the conversation on Travel')
    expect(result).toContain('Keep the same audience style, CEFR level, and vocabulary limits')
    expect(result).toContain('react naturally')
    expect(result).toContain('Do not widen the topic or increase vocabulary difficulty.')
    expect(result).not.toContain('Conversational delivery:')
    expect(result).not.toContain('[chuckle]')
  })
  it('adds A1 constraints to continuation instructions', () => {
    const result = buildEngvoContinuationResponseInstructions({
      audience: 'child',
      level: 'a1',
      topic: 'food',
    })

    expect(result).toContain('For A1, keep each reply to one short sentence')
    expect(result).toContain('Present Simple')
  })
})
