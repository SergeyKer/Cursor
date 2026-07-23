import { describe, expect, it } from 'vitest'
import { BLUE_SECONDARY_SKIN } from '@/lib/homeCtaStyles'
import {
  buildProgressNowCta,
  mapAttentionZoneToTarget,
  mapMyPlanActionToTarget,
} from '@/lib/progress/progressActions'
import { selectNowGoal } from '@/lib/myPlan/selectNowGoal'
import type { MyPlanInput, MyPlanRecommendation } from '@/lib/myPlan/types'
import type { AttentionZone } from '@/lib/learningMemory/types'

/** Frozen snapshot — accidental secondary edits must fail this test. */
const BLUE_SECONDARY_SKIN_FROZEN =
  'border border-[#3b82f6] bg-gradient-to-b from-[#60a5fa] to-[#2563eb] text-white hover:brightness-105 active:brightness-95'

const baseCatalog = [
  { id: '1', title: 'To be', order: 10, enabled: true, hasTheory: true, hasPractice: true },
  { id: '2', title: 'Урок B', order: 20, enabled: true, hasTheory: true, hasPractice: true },
]

function emptyInput(over: Partial<MyPlanInput> = {}): MyPlanInput {
  return {
    todayDate: '2026-05-14',
    catalog: baseCatalog,
    lessons: {
      '2': {
        lessonId: '2',
        topic: 'Еда',
        completedSteps: [1],
        lastCompleted: '',
        mistakesCount: 0,
        incompleteTouchedAtIso: '2026-05-13T12:00:00.000Z',
      },
    },
    rewards: {
      lastActiveDate: '2026-05-14',
      dailyStreak: 0,
      level: 1,
      totalXP: 0,
      modeGoals: {
        communication: { completed: false },
        engvo: { completed: false },
      },
    },
    practiceCompleted: [],
    daysSinceLastActive: null,
    weakSpots: [],
    audience: 'adult',
    canUseAiReinforce: false,
    nowMs: Date.parse('2026-05-14T12:00:00.000Z'),
    ...over,
  }
}

describe('progressActions', () => {
  it('keeps BLUE_SECONDARY_SKIN unchanged (anti-regression)', () => {
    expect(BLUE_SECONDARY_SKIN).toBe(BLUE_SECONDARY_SKIN_FROZEN)
  })

  it('Сейчас ≡ selectNowGoal mainTask id and action.kind', () => {
    const input = emptyInput()
    const { mainTask } = selectNowGoal(input)
    expect(mainTask).not.toBeNull()
    const cta = buildProgressNowCta(mainTask, 'Открыть Мой план', 'Мой план')
    expect(cta.mainTaskId).toBe(mainTask!.id)
    expect(cta.actionKind).toBe(mainTask!.action.kind)
    expect(cta.variant).toBe('launch')
    expect(cta.target).toEqual(mapMyPlanActionToTarget(mainTask!.action))
  })

  it('empty main → action my_plan', () => {
    const cta = buildProgressNowCta(null, 'Открыть Мой план', 'aria')
    expect(cta.variant).toBe('action')
    expect(cta.target).toEqual({ kind: 'my_plan' })
    expect(cta.label).toBe('Открыть Мой план')
  })

  it('unmapped action falls back to my_plan action CTA', () => {
    const fake = {
      id: 'x',
      priority: 1,
      title: 't',
      subtitle: '',
      reasonLine: '',
      buttonLabel: 'Go',
      ariaLabel: 'Go',
      action: { kind: 'unknown_future' as never },
    } as unknown as MyPlanRecommendation
    const cta = buildProgressNowCta(fake, 'Открыть Мой план', 'aria')
    expect(cta.variant).toBe('action')
    expect(cta.target).toEqual({ kind: 'my_plan' })
    expect(cta.mainTaskId).toBe('x')
  })

  it('zone with lesson → practice launch; without → my_plan', () => {
    const withLesson: AttentionZone = {
      skillTagId: 'a',
      title: 'A',
      errorCount: 3,
      sourceHint: 'В практике',
      lessonId: '1',
      chipActive: true,
      suggestionLine: '',
      score: 10,
    }
    const without: AttentionZone = { ...withLesson, lessonId: null, chipActive: false }
    expect(mapAttentionZoneToTarget(withLesson)).toEqual({
      kind: 'practice',
      lessonId: '1',
      mode: 'balanced',
    })
    expect(mapAttentionZoneToTarget(without)).toEqual({ kind: 'my_plan' })
  })

  it('maps lesson and practice actions', () => {
    expect(mapMyPlanActionToTarget({ kind: 'open_lesson', lessonId: '9' })).toEqual({
      kind: 'lesson',
      lessonId: '9',
    })
    expect(
      mapMyPlanActionToTarget({
        kind: 'start_practice',
        lessonId: '9',
        mode: 'challenge',
        entrySource: 'my_plan',
      })
    ).toEqual({ kind: 'practice', lessonId: '9', mode: 'challenge' })
  })
})
