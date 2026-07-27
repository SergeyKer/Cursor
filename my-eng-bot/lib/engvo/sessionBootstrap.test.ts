import { describe, expect, it } from 'vitest'
import {
  buildEngvoSessionBootstrapSnapshot,
  isEngvoSessionBootstrapRedundantUpdate,
} from './sessionBootstrap'

const baseA = buildEngvoSessionBootstrapSnapshot({
  level: 'a1',
  audience: 'adult',
  topic: 'free_talk',
  voice: 'ara',
  speed: 1,
  provider: 'xai',
  kind: 'free_call',
})

const baseB = buildEngvoSessionBootstrapSnapshot({
  ...baseA,
  level: 'b1',
})

describe('Engvo session bootstrap snapshot', () => {
  it('marks equal snapshots as redundant', () => {
    const copy = buildEngvoSessionBootstrapSnapshot(baseA)
    expect(isEngvoSessionBootstrapRedundantUpdate(baseA, copy)).toBe(true)
    expect(isEngvoSessionBootstrapRedundantUpdate(null, copy)).toBe(false)
  })

  it('detects level/topic/audience/voice/speed/provider/kind changes', () => {
    expect(isEngvoSessionBootstrapRedundantUpdate(baseA, { ...baseA, level: 'b1' })).toBe(false)
    expect(isEngvoSessionBootstrapRedundantUpdate(baseA, { ...baseA, topic: 'travel' })).toBe(false)
    expect(isEngvoSessionBootstrapRedundantUpdate(baseA, { ...baseA, audience: 'child' })).toBe(false)
    expect(isEngvoSessionBootstrapRedundantUpdate(baseA, { ...baseA, voice: 'rex' })).toBe(false)
    expect(isEngvoSessionBootstrapRedundantUpdate(baseA, { ...baseA, speed: 0.85 })).toBe(false)
    expect(isEngvoSessionBootstrapRedundantUpdate(baseA, { ...baseA, provider: 'openai' })).toBe(false)
    expect(isEngvoSessionBootstrapRedundantUpdate(baseA, { ...baseA, kind: 'teacher' })).toBe(false)
  })

  it('detects teacher drill/lesson axis changes', () => {
    const teacher = buildEngvoSessionBootstrapSnapshot({
      ...baseA,
      kind: 'teacher',
      teacherTense: 'present_simple',
      teacherSentenceType: 'general',
      teacherDrillKind: 'tense_drill',
      teacherLessonId: 'all',
      teacherEffectiveLessonId: null,
    })
    expect(
      isEngvoSessionBootstrapRedundantUpdate(teacher, {
        ...teacher,
        teacherDrillKind: 'lesson_topic',
      })
    ).toBe(false)
    expect(
      isEngvoSessionBootstrapRedundantUpdate(teacher, {
        ...teacher,
        teacherEffectiveLessonId: '4',
      })
    ).toBe(false)
  })
})
