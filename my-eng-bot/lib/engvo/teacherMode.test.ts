import { describe, expect, it } from 'vitest'
import { extractTeacherCorrection } from '@/lib/learningMemory/teacherCorrection'
import {
  TEACHER_OPENING_SEEDS_ADULT_RU,
  TEACHER_OPENING_SEEDS_B1_EN,
  pickOpeningSeed,
} from '@/lib/engvo/openingSeeds'
import {
  buildEngvoTeacherFirstTurnResponseInstructions,
  buildEngvoTeacherRealtimeInstructions,
} from '@/lib/engvo/teacherPrompts'
import { buildEngvoFirstTurnResponseInstructions, buildEngvoRealtimeInstructions } from '@/lib/engvo/instructions'
import { resolveEngvoTeacherPhase } from '@/lib/engvo/sessionKind'

describe('extractTeacherCorrection', () => {
  it('parses You meant quoted one-liner', () => {
    const r = extractTeacherCorrection('You meant: "I speak English every day." Can you say that?')
    expect(r.marker).toBe('you_meant')
    expect(r.corrected).toMatch(/I speak English every day/i)
  })

  it('parses soft You mean variant', () => {
    const r = extractTeacherCorrection('You mean: I went home yesterday.')
    expect(r.marker).toBe('you_meant')
    expect(r.corrected?.toLowerCase()).toContain('went home')
  })

  it('parses Скажи and stops before Переведи', () => {
    const r = extractTeacherCorrection('Правильно так. Скажи: I like apples. Переведи на английский.')
    expect(r.marker).toBe('skazhi')
    expect(r.corrected).toMatch(/I like apples/i)
    expect(r.corrected).not.toMatch(/Переведи/i)
  })

  it('returns null without markers', () => {
    expect(extractTeacherCorrection('Молодец! Я люблю путешествовать. Переведи на английский.').corrected).toBeNull()
  })
})

describe('pickOpeningSeed', () => {
  it('uses deterministic index when provided', () => {
    expect(pickOpeningSeed(TEACHER_OPENING_SEEDS_ADULT_RU, 0)).toBe(TEACHER_OPENING_SEEDS_ADULT_RU[0])
    expect(pickOpeningSeed(TEACHER_OPENING_SEEDS_ADULT_RU, 1)).toBe(TEACHER_OPENING_SEEDS_ADULT_RU[1])
    expect(pickOpeningSeed(TEACHER_OPENING_SEEDS_ADULT_RU, TEACHER_OPENING_SEEDS_ADULT_RU.length)).toBe(
      TEACHER_OPENING_SEEDS_ADULT_RU[0]
    )
  })
})

describe('teacher prompts', () => {
  it('first turn asks for topic when not skipTopicChoice', () => {
    const text = buildEngvoTeacherFirstTurnResponseInstructions({
      audience: 'adult',
      level: 'a2',
      tense: 'present_simple',
      sentenceType: 'general',
      openingSeedIndex: 0,
    })
    expect(text.toLowerCase()).toMatch(/о чём|поговорить|topic/)
    expect(text).toContain('Preferred opening this turn:')
    expect(text).toContain(TEACHER_OPENING_SEEDS_ADULT_RU[0]!)
    expect(text).toMatch(/brief frame-greeting/i)
    expect(text).not.toMatch(/Do not small-talk/)
    expect(text).not.toMatch(/Do not greet with free-conversation/)
    expect(text).not.toMatch(/Start immediately with one Russian drill/)
  })

  it('first turn greets then drills with skipTopicChoice', () => {
    const text = buildEngvoTeacherFirstTurnResponseInstructions({
      audience: 'adult',
      level: 'b1',
      tense: 'present_simple',
      sentenceType: 'general',
      skipTopicChoice: true,
      topicPreset: 'travel',
      openingSeedIndex: 0,
    })
    expect(text).toMatch(/travel/i)
    expect(text).toMatch(/Translate into English/i)
    expect(text).toContain(TEACHER_OPENING_SEEDS_B1_EN[0]!)
    expect(text).toMatch(/After the frame-greeting/i)
    expect(text).not.toMatch(/Do not small-talk/)
    expect(text).not.toMatch(/Start immediately with one Russian drill/)
  })

  it('varies preferred opening by seed index', () => {
    const a = buildEngvoTeacherFirstTurnResponseInstructions({
      audience: 'adult',
      level: 'a2',
      tense: 'present_simple',
      sentenceType: 'general',
      openingSeedIndex: 0,
    })
    const b = buildEngvoTeacherFirstTurnResponseInstructions({
      audience: 'adult',
      level: 'a2',
      tense: 'present_simple',
      sentenceType: 'general',
      openingSeedIndex: 1,
    })
    expect(a).toContain(TEACHER_OPENING_SEEDS_ADULT_RU[0]!)
    expect(b).toContain(TEACHER_OPENING_SEEDS_ADULT_RU[1]!)
    expect(a).not.toEqual(b)
  })

  it('realtime teacher instructions omit anti-translator free-call rule', () => {
    const text = buildEngvoTeacherRealtimeInstructions({
      audience: 'adult',
      level: 'a2',
      tense: 'past_simple',
      sentenceType: 'interrogative',
    })
    expect(text).toMatch(/Engvo Teacher/)
    expect(text).not.toMatch(/do not switch to translator mode/)
    expect(text).toMatch(/Скажи/)
  })

  it('A1/A2 requires micro-reason, soft error tone, and turn order', () => {
    const text = buildEngvoTeacherRealtimeInstructions({
      audience: 'adult',
      level: 'a2',
      tense: 'present_simple',
      sentenceType: 'general',
    })
    expect(text).toMatch(/micro-reason/i)
    expect(text).toMatch(/Bare verdict without reason is forbidden/)
    expect(text).toMatch(/Never pack the next Russian drill into the same turn as "Скажи:"/)
    expect(text).toMatch(/Anti-cliche/)
    expect(text).toMatch(/soft lead-in/i)
    expect(text).toMatch(/AFTER a successful repeat/i)
    expect(text).toMatch(/Unclear or noisy audio is not an error/)
    expect(text).toMatch(/experienced voice translation tutor/i)
  })

  it('B1+ requires micro-reason before You meant', () => {
    const text = buildEngvoTeacherRealtimeInstructions({
      audience: 'adult',
      level: 'b1',
      tense: 'present_simple',
      sentenceType: 'general',
    })
    expect(text).toMatch(/You meant/)
    expect(text).toMatch(/micro-reason/i)
    expect(text).toMatch(/Bare "Incorrect\." \/ "Wrong\." without a reason is forbidden/)
    expect(text).toMatch(/Never pack the next Russian drill into the same turn as You meant/)
  })

  it('adult A2 success examples stay adult-oriented', () => {
    const text = buildEngvoTeacherRealtimeInstructions({
      audience: 'adult',
      level: 'a2',
      tense: 'present_simple',
      sentenceType: 'general',
    })
    expect(text).toMatch(/Да, так и говорят/)
    expect(text).not.toMatch(/Супер, так и нужно/)
  })

  it('child A1 uses plain terminology and child praise pool', () => {
    const text = buildEngvoTeacherRealtimeInstructions({
      audience: 'child',
      level: 'a1',
      tense: 'present_simple',
      sentenceType: 'general',
    })
    expect(text).toMatch(/plain words/i)
    expect(text).toMatch(/avoid heavy grammar labels/i)
    expect(text).toMatch(/Супер, так и нужно/)
    expect(text).not.toMatch(/время на месте/)
  })

  it('realtime skipTopicChoice greets then drills', () => {
    const text = buildEngvoTeacherRealtimeInstructions({
      audience: 'adult',
      level: 'a2',
      tense: 'present_simple',
      sentenceType: 'general',
      skipTopicChoice: true,
      topicPreset: 'food',
    })
    expect(text).toMatch(/After one brief frame-greeting, start drill/)
    expect(text).not.toMatch(/Start in drill phase immediately/)
  })
})

describe('instructions branching', () => {
  it('routes teacher kind to teacher first-turn', () => {
    const free = buildEngvoFirstTurnResponseInstructions({
      audience: 'adult',
      level: 'a2',
      topic: 'travel',
      kind: 'free_call',
      openingSeedIndex: 0,
    })
    const teacher = buildEngvoFirstTurnResponseInstructions({
      audience: 'adult',
      level: 'a2',
      topic: 'travel',
      kind: 'teacher',
      tense: 'present_simple',
      sentenceType: 'general',
      openingSeedIndex: 0,
    })
    expect(free).not.toEqual(teacher)
    expect(teacher).toMatch(/topic_choice|О чём|поговорить/i)
  })

  it('free_call realtime keeps English-only coach', () => {
    const text = buildEngvoRealtimeInstructions({
      audience: 'adult',
      level: 'a2',
      topic: 'free_talk',
      kind: 'free_call',
    })
    expect(text).toMatch(/English only/i)
  })

  it('teacher realtime uses teacher block', () => {
    const text = buildEngvoRealtimeInstructions({
      audience: 'adult',
      level: 'b1',
      topic: 'free_talk',
      kind: 'teacher',
      tense: 'present_simple',
      sentenceType: 'general',
    })
    expect(text).toMatch(/You meant/)
  })
})

describe('resolveEngvoTeacherPhase', () => {
  it('returns null for free_call', () => {
    expect(resolveEngvoTeacherPhase({ kind: 'free_call' })).toBeNull()
  })
  it('starts topic_choice by default', () => {
    expect(resolveEngvoTeacherPhase({ kind: 'teacher' })).toBe('topic_choice')
  })
  it('starts drill when skipTopicChoice', () => {
    expect(resolveEngvoTeacherPhase({ kind: 'teacher', skipTopicChoice: true })).toBe('drill')
  })
})
