import { describe, expect, it } from 'vitest'
import { buildMyPlanModeDoors } from '@/lib/myPlan/buildModeDoors'

describe('buildMyPlanModeDoors', () => {
  it('skips lesson and respects flags', () => {
    const off = buildMyPlanModeDoors(
      {
        engvoVoiceV1: false,
        practiceEngineV1: false,
        tutorChatV1: false,
        accentTrainerV1: false,
        referenceV1: false,
      },
      'adult'
    )
    expect(off.map((r) => r.id)).toEqual(['communication', 'translation', 'dialogue', 'vocabulary'])
    expect(off[0]?.label).toBe('Поговорить')

    const on = buildMyPlanModeDoors(
      {
        engvoVoiceV1: true,
        practiceEngineV1: true,
        tutorChatV1: true,
        accentTrainerV1: true,
        referenceV1: true,
      },
      'child'
    )
    expect(on.map((r) => r.id)[0]).toBe('communication')
    expect(on[0]?.label).toBe('Поговори')
    expect(on.some((r) => r.id === 'engvo')).toBe(true)
    expect(on.some((r) => r.id === 'practice')).toBe(true)
    expect(on.some((r) => r.id === 'tutor')).toBe(true)
    expect(on.some((r) => r.id === 'pronunciation')).toBe(true)
    const practice = on.find((r) => r.id === 'practice')
    expect(practice?.target).toEqual({ kind: 'quick_practice' })
    expect(practice?.label).toBe('Потренируйся')
  })
})
