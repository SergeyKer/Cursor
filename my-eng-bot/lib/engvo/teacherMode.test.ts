import { describe, expect, it } from 'vitest'
import { extractTeacherCorrection } from '@/lib/learningMemory/teacherCorrection'
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

describe('teacher prompts', () => {
  it('first turn asks for topic when not skipTopicChoice', () => {
    const text = buildEngvoTeacherFirstTurnResponseInstructions({
      audience: 'adult',
      level: 'a2',
      tense: 'present_simple',
      sentenceType: 'general',
    })
    expect(text.toLowerCase()).toMatch(/о чём|поговорить|topic/)
    expect(text).not.toMatch(/Start immediately with one Russian drill/)
  })

  it('first turn drills immediately with skipTopicChoice', () => {
    const text = buildEngvoTeacherFirstTurnResponseInstructions({
      audience: 'adult',
      level: 'b1',
      tense: 'present_simple',
      sentenceType: 'general',
      skipTopicChoice: true,
      topicPreset: 'travel',
    })
    expect(text).toMatch(/travel/i)
    expect(text).toMatch(/Translate into English/i)
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
})

describe('instructions branching', () => {
  it('routes teacher kind to teacher first-turn', () => {
    const free = buildEngvoFirstTurnResponseInstructions({
      audience: 'adult',
      level: 'a2',
      topic: 'travel',
      kind: 'free_call',
    })
    const teacher = buildEngvoFirstTurnResponseInstructions({
      audience: 'adult',
      level: 'a2',
      topic: 'travel',
      kind: 'teacher',
      tense: 'present_simple',
      sentenceType: 'general',
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
