import { describe, expect, it } from 'vitest'
import { extractTeacherCorrection } from '@/lib/learningMemory/teacherCorrection'
import {
  TEACHER_OPENING_SEEDS_ADULT_RU,
  TEACHER_OPENING_SEEDS_B1_EN,
  pickOpeningSeed,
} from '@/lib/engvo/openingSeeds'
import {
  buildEngvoTeacherDrillReclaimInstructions,
  buildEngvoTeacherFirstTurnResponseInstructions,
  buildEngvoTeacherRealtimeInstructions,
  TEACHER_RHYTHM_LOCK_MARKER,
} from '@/lib/engvo/teacherPrompts'
import {
  TEACHER_EQUIVALENCE_GOLDEN_FRAGMENTS,
  TEACHER_EQUIVALENCE_POLICY_MARKER,
} from '@/lib/engvo/teacherEquivalencePolicy'
import { buildEngvoFirstTurnResponseInstructions, buildEngvoRealtimeInstructions } from '@/lib/engvo/instructions'
import { buildEngvoRealtimeInstructionsClient } from '@/lib/engvo/instructionsClient'
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

  it('parses B1+ contrast so:/not without You meant', () => {
    const r = extractTeacherCorrection(
      'Close — so: I have a cat — not: I have cat. Try that.'
    )
    expect(r.marker).toBe('contrast')
    expect(r.corrected).toBe('I have a cat')
  })

  it('parses contrast with not just and em-dash', () => {
    const r = extractTeacherCorrection(
      'Almost — so: I\'ve never seen such a clear sea — not just so clear. Your turn.'
    )
    expect(r.marker).toBe('contrast')
    expect(r.corrected?.toLowerCase()).toContain('never seen such a clear sea')
  })

  it('prefers legacy You meant when both markers present', () => {
    const r = extractTeacherCorrection(
      'Close — so: I have a cat — not: I have cat. You meant: "I have a cat." Try that.'
    )
    expect(r.marker).toBe('you_meant')
    expect(r.corrected).toMatch(/I have a cat/i)
  })

  it('does not parse SUCCESS or bare so as contrast', () => {
    expect(
      extractTeacherCorrection(
        "Good — you've got it. Мы никогда не видели такого чистого моря. Your turn — in English."
      ).corrected
    ).toBeNull()
    expect(
      extractTeacherCorrection('Natural. Завтра пляж пустой. Translate into English.').corrected
    ).toBeNull()
    expect(extractTeacherCorrection('So, next one.').corrected).toBeNull()
    expect(extractTeacherCorrection('So what do you think?').corrected).toBeNull()
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
    expect(text).toMatch(/Teacher live delivery:/)
    expect(text).toMatch(/Topic thread:/)
    expect(text).toMatch(/always Russian/i)
    expect(text).toMatch(/one honest try/i)
    expect(text).not.toMatch(/same mistake repeats next/i)
  })

  it('B1+ requires conversational so:/not contrast without You meant protocol', () => {
    const text = buildEngvoTeacherRealtimeInstructions({
      audience: 'adult',
      level: 'b1',
      tense: 'present_simple',
      sentenceType: 'general',
    })
    expect(text).toMatch(/so:\s*<canonical>/i)
    expect(text).toMatch(/never say You meant/i)
    expect(text).not.toMatch(/Use "You meant/)
    expect(text).not.toMatch(/You meant: "<canonical/)
    expect(text).toMatch(/micro-reason/i)
    expect(text).toMatch(/Bare "Incorrect\." \/ "Wrong\." without a reason is forbidden/)
    expect(text).toMatch(/Never pack the next Russian drill into the same turn as the so:\/not/)
    expect(text).toMatch(/contrast of forms/i)
    expect(text).toMatch(/The article is missing/)
    expect(text).toMatch(/Anti-cliche/)
    expect(text).toMatch(/Try that/)
    expect(text).toMatch(/Teacher live delivery:/)
    expect(text).toMatch(/always Russian/i)
    expect(text).not.toMatch(/same mistake repeats next/i)
    expect(text).not.toContain('Conversational delivery:')
  })

  it('child B1+ uses same English so:/not ERROR path', () => {
    const text = buildEngvoTeacherRealtimeInstructions({
      audience: 'child',
      level: 'b1',
      tense: 'present_simple',
      sentenceType: 'general',
    })
    expect(text).toMatch(/so:\s*<canonical>/i)
    expect(text).toMatch(/never say You meant/i)
    expect(text).not.toMatch(/Use "You meant/)
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
    expect(text).toMatch(/play-coach/i)
    expect(text).not.toMatch(/время на месте/)
  })

  it('adult B1 uses peer-coach voice', () => {
    const text = buildEngvoTeacherRealtimeInstructions({
      audience: 'adult',
      level: 'b1',
      tense: 'present_simple',
      sentenceType: 'general',
    })
    expect(text).toMatch(/peer-coach/i)
    expect(text).not.toMatch(/play-coach/i)
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

  it('realtime teacher includes equivalence policy with golden school cases', () => {
    const text = buildEngvoTeacherRealtimeInstructions({
      audience: 'adult',
      level: 'a2',
      tense: 'present_simple',
      sentenceType: 'general',
    })
    expect(text).toContain(TEACHER_EQUIVALENCE_POLICY_MARKER)
    expect(text).toMatch(/accepted set/i)
    expect(text).toMatch(/Never start an error turn with bare "Неправильно\."/)
    for (const fragment of TEACHER_EQUIVALENCE_GOLDEN_FRAGMENTS) {
      expect(text).toContain(fragment)
    }
  })

  it('A1 equivalence block does not invite prep lectures', () => {
    const text = buildEngvoTeacherRealtimeInstructions({
      audience: 'adult',
      level: 'a1',
      tense: 'present_simple',
      sentenceType: 'general',
    })
    expect(text).toContain(TEACHER_EQUIVALENCE_POLICY_MARKER)
    expect(text).toMatch(/no prep lecture/i)
  })

  it('realtime teacher includes rhythm lock with soft bridge and reclaim paths', () => {
    const text = buildEngvoTeacherRealtimeInstructions({
      audience: 'adult',
      level: 'a2',
      tense: 'present_simple',
      sentenceType: 'general',
    })
    expect(text).toContain(TEACHER_RHYTHM_LOCK_MARKER)
    expect(text).toMatch(/soft bridge/i)
    expect(text).toMatch(/pending repeat/i)
    expect(text).toMatch(/same Russian/i)
    expect(text).toMatch(/never silent wait/i)
    expect(text).toMatch(/Incomplete topic→drill handoff/i)
    expect(text).toMatch(/no debate/i)
    expect(text).toMatch(/Хорошо, что спрашиваешь/)
    expect(text).toMatch(/Классно, что заметил/)
  })

  it('topic choice rules treat learner Russian as naming not drill', () => {
    const text = buildEngvoTeacherRealtimeInstructions({
      audience: 'adult',
      level: 'b1',
      tense: 'present_simple',
      sentenceType: 'general',
    })
    expect(text).toMatch(/topic naming only/i)
    expect(text).toMatch(/NOT the drill/i)
    expect(text).toMatch(/NEW Russian drill/i)
    expect(text).toMatch(/Here's the first sentence/i)
  })

  it('drill reclaim instructions force new Russian + translate', () => {
    const text = buildEngvoTeacherDrillReclaimInstructions({
      level: 'b1',
      tense: 'present_simple',
      sentenceType: 'general',
    })
    expect(text).toMatch(/Incomplete teacher turn reclaim/i)
    expect(text).toMatch(/NEW Russian drill/i)
    expect(text).toMatch(/Do not re-ask the topic/i)
    expect(text).toMatch(/Translate into English/i)
  })

  it('first turn does not include rhythm lock marker', () => {
    const text = buildEngvoTeacherFirstTurnResponseInstructions({
      audience: 'adult',
      level: 'a2',
      tense: 'present_simple',
      sentenceType: 'general',
      openingSeedIndex: 0,
    })
    expect(text).not.toContain(TEACHER_RHYTHM_LOCK_MARKER)
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
    expect(text).not.toContain(TEACHER_EQUIVALENCE_POLICY_MARKER)
    expect(text).not.toContain(TEACHER_RHYTHM_LOCK_MARKER)
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
    expect(text).toMatch(/so:\s*<canonical>/i)
    expect(text).toMatch(/never say You meant/i)
    expect(text).not.toMatch(/Use "You meant/)
    expect(text).toContain(TEACHER_EQUIVALENCE_POLICY_MARKER)
    expect(text).toContain(TEACHER_RHYTHM_LOCK_MARKER)
  })

  it('teacher client realtime instructions include equivalence marker (parity)', () => {
    const text = buildEngvoRealtimeInstructionsClient({
      audience: 'adult',
      level: 'a2',
      topic: 'travel',
      kind: 'teacher',
      tense: 'present_simple',
      sentenceType: 'general',
    })
    expect(text).toContain(TEACHER_EQUIVALENCE_POLICY_MARKER)
    expect(text).toContain(TEACHER_RHYTHM_LOCK_MARKER)
  })

  it('free_call client realtime instructions exclude equivalence marker', () => {
    const text = buildEngvoRealtimeInstructionsClient({
      audience: 'adult',
      level: 'a2',
      topic: 'travel',
      kind: 'free_call',
    })
    expect(text).not.toContain(TEACHER_EQUIVALENCE_POLICY_MARKER)
    expect(text).not.toContain(TEACHER_RHYTHM_LOCK_MARKER)
  })

  it('teacher realtime does not leak free-call conversational delivery', () => {
    const text = buildEngvoRealtimeInstructions({
      audience: 'adult',
      level: 'a2',
      topic: 'travel',
      kind: 'teacher',
      tense: 'present_simple',
      sentenceType: 'general',
    })
    expect(text).not.toContain('Conversational delivery:')
    expect(text).toMatch(/Teacher live delivery:/)
    expect(text).toMatch(/Engvo Teacher/)
  })

  it('teacher first-turn keeps preferred opening without free-call delivery', () => {
    const text = buildEngvoFirstTurnResponseInstructions({
      audience: 'adult',
      level: 'a2',
      topic: 'travel',
      kind: 'teacher',
      tense: 'present_simple',
      sentenceType: 'general',
      openingSeedIndex: 0,
    })
    expect(text).toContain('Preferred opening this turn:')
    expect(text).toContain('Keep the greeting short; do not add a second greeting or a long preamble.')
    expect(text).not.toContain('Conversational delivery:')
    expect(text).toMatch(/conversationally/i)
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
