import { describe, expect, it } from 'vitest'
import { selectNowGoal, getMyPlanRecommendations } from '@/lib/myPlan/selectNowGoal'
import {
  CRITICAL_ZONE_ERROR_COUNT,
  INCOMPLETE_STALE_DAYS,
  type MyPlanInput,
} from '@/lib/myPlan/types'
import type { AttentionZone } from '@/lib/learningMemory/types'

const baseCatalog = [
  {
    id: '1',
    title: 'To be',
    order: 10,
    enabled: true,
    hasTheory: true,
    hasPractice: true,
    level: 'A2' as const,
  },
  {
    id: '2',
    title: 'Урок B',
    order: 20,
    enabled: true,
    hasTheory: true,
    hasPractice: true,
    level: 'A2' as const,
  },
]

function zone(over: Partial<AttentionZone> = {}): AttentionZone {
  return {
    skillTagId: 'present-simple',
    title: 'Present Simple',
    errorCount: CRITICAL_ZONE_ERROR_COUNT,
    sourceHint: 'В чате',
    lessonId: '1',
    chipActive: true,
    suggestionLine: 'Открыть урок',
    score: 40,
    ...over,
  }
}

function emptyInput(over: Partial<MyPlanInput> = {}): MyPlanInput {
  return {
    todayDate: '2026-05-14',
    catalog: baseCatalog,
    lessons: {},
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
    anchorLevel: 'A2',
    audience: 'adult',
    canUseAiReinforce: false,
    nowMs: Date.parse('2026-05-14T12:00:00.000Z'),
    ...over,
  }
}

describe('selectNowGoal', () => {
  it('свежий incomplete побеждает critical zone', () => {
    const input = emptyInput({
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
      attentionZones: [zone()],
    })
    const { mainTask } = selectNowGoal(input)
    expect(mainTask?.goalType).toBe('incomplete')
    expect(mainTask?.action).toEqual({ kind: 'resume_lesson', lessonId: '2' })
  })

  it('stale incomplete уступает critical zone (3+ ошибок)', () => {
    const staleIso = new Date(
      Date.parse('2026-05-14T12:00:00.000Z') - (INCOMPLETE_STALE_DAYS + 1) * 24 * 60 * 60 * 1000
    ).toISOString()
    const input = emptyInput({
      lessons: {
        '2': {
          lessonId: '2',
          topic: 'Еда',
          completedSteps: [1],
          lastCompleted: '',
          mistakesCount: 0,
          incompleteTouchedAtIso: staleIso,
        },
      },
      attentionZones: [zone({ lessonId: '1', errorCount: CRITICAL_ZONE_ERROR_COUNT })],
    })
    const { mainTask } = selectNowGoal(input)
    expect(mainTask?.goalType).toBe('reinforce')
    expect(mainTask?.action.kind).toBe('reinforce_skill')
  })

  it('после теории без практики — practice_after_theory', () => {
    const input = emptyInput({
      lessons: {
        '1': {
          lessonId: '1',
          topic: 'To be',
          completedSteps: [1, 2, 3],
          lastCompleted: '2026-05-14T10:00:00.000Z',
          mistakesCount: 0,
        },
      },
    })
    const { mainTask } = selectNowGoal(input)
    expect(mainTask?.goalType).toBe('practice_after_theory')
    expect(mainTask?.action).toMatchObject({
      kind: 'start_practice',
      lessonId: '1',
      mode: 'challenge',
      entrySource: 'my_plan',
    })
  })

  it('следующий урок по программе', () => {
    const { mainTask, programTask, programStatus } = selectNowGoal(emptyInput())
    expect(mainTask?.goalType).not.toBe('next_lesson')
    expect(programStatus).toBe('active')
    expect(programTask?.goalType).toBe('next_lesson')
    expect(programTask?.action).toEqual({ kind: 'open_lesson', lessonId: '1' })
  })

  it('soft return при daysSinceLastActive >= 3', () => {
    const input = emptyInput({
      catalog: [],
      daysSinceLastActive: 5,
    })
    const { mainTask } = selectNowGoal(input)
    expect(mainTask?.goalType).toBe('soft_return')
  })

  it('secondary при RESCUE пустой (не мешает soft)', () => {
    const input = emptyInput({
      lessons: {
        '1': {
          lessonId: '1',
          topic: 'To be',
          completedSteps: [1],
          lastCompleted: '',
          mistakesCount: 0,
        },
      },
      attentionZones: [zone({ lessonId: '1', skillTagId: 'to-be', title: 'To be' })],
    })
    const { mainTask, secondary } = selectNowGoal(input)
    expect(mainTask?.action.kind).toBe('resume_lesson')
    expect(secondary).toEqual([])
  })

  it('secondary не дублирует lessonId main в REPAIR', () => {
    const input = emptyInput({
      attentionZones: [
        zone({ lessonId: '1', skillTagId: 'to-be', title: 'To be', errorCount: 5, score: 50 }),
        zone({
          lessonId: '2',
          skillTagId: 'food',
          title: 'Food',
          errorCount: 2,
          score: 10,
        }),
      ],
    })
    const { mainTask, secondary } = selectNowGoal(input)
    expect(mainTask?.goalType).toBe('reinforce')
    for (const s of secondary) {
      if (s.action.kind === 'open_lesson' || s.action.kind === 'resume_lesson') {
        expect(s.action.lessonId).not.toBe(
          mainTask?.action.kind === 'reinforce_skill' ? mainTask.action.lessonId : ''
        )
      }
    }
  })

  it('bronze done без hard → improve_medal open_lesson', () => {
    const input = emptyInput({
      lessons: {
        '1': {
          lessonId: '1',
          topic: 'To be',
          completedSteps: [1, 2, 3],
          lastCompleted: '2026-05-14T10:00:00.000Z',
          mistakesCount: 0,
          medal: 'bronze',
          lessonCompleted: true,
        },
      },
      practiceCompleted: [
        { lessonId: '1', completedAt: Date.parse('2026-05-14T11:00:00.000Z'), status: 'completed' },
      ],
    })
    const { mainTask } = selectNowGoal(input)
    expect(mainTask?.goalType).toBe('improve_medal')
    expect(mainTask?.action).toEqual({ kind: 'open_lesson', lessonId: '1' })
    expect(mainTask?.reasonLine).toMatch(/золот/)
  })

  it('MASTER soft rotation skips recentSoftKeys', () => {
    const input = emptyInput({
      lessons: {
        '1': {
          lessonId: '1',
          topic: 'To be',
          completedSteps: [1],
          lastCompleted: '2026-05-10T10:00:00.000Z',
          mistakesCount: 0,
          medal: 'bronze',
          lessonCompleted: true,
        },
        '2': {
          lessonId: '2',
          topic: 'B',
          completedSteps: [1],
          lastCompleted: '2026-05-11T10:00:00.000Z',
          mistakesCount: 0,
          medal: 'silver',
          lessonCompleted: true,
        },
      },
      practiceCompleted: [
        { lessonId: '1', completedAt: Date.parse('2026-05-10T12:00:00.000Z'), status: 'completed' },
        { lessonId: '2', completedAt: Date.parse('2026-05-11T12:00:00.000Z'), status: 'completed' },
      ],
      recentSoftKeys: ['improve_medal:1'],
    })
    const { mainTask } = selectNowGoal(input)
    expect(mainTask?.goalType).toBe('improve_medal')
    expect(mainTask?.action).toEqual({ kind: 'open_lesson', lessonId: '2' })
  })

  it('zone без lessonId даёт живой CTA (quick_practice), не мёртвую кнопку', () => {
    const input = emptyInput({
      catalog: [],
      attentionZones: [zone({ lessonId: null, chipActive: false, errorCount: 4 })],
    })
    const { mainTask } = selectNowGoal(input)
    expect(mainTask?.goalType).toBe('reinforce')
    expect(mainTask?.action.kind).toBe('quick_practice')
  })

  it('incomplete берёт EN title из каталога, не RU topic прогресса', () => {
    const catalogTitle = "It's / It's time to"
    const input = emptyInput({
      catalog: [
        {
          id: '1',
          title: catalogTitle,
          order: 10,
          enabled: true,
          hasTheory: true,
          hasPractice: true,
          level: 'A2',
        },
      ],
      lessons: {
        '1': {
          lessonId: '1',
          topic: 'Это / Пора',
          completedSteps: [1],
          lastCompleted: '',
          mistakesCount: 0,
        },
      },
    })
    const { mainTask } = selectNowGoal(input)
    expect(mainTask?.goalType).toBe('incomplete')
    expect(mainTask?.title).toBe(`Урок: ${catalogTitle}`)
    expect(mainTask?.ariaLabel).toContain(catalogTitle)
    expect(mainTask?.reasonLine).toContain(catalogTitle)
    expect(mainTask?.reasonLine).toMatch(/остановились|остановился/)
  })

  it('child copy на incomplete', () => {
    const input = emptyInput({
      audience: 'child',
      lessons: {
        '1': {
          lessonId: '1',
          topic: 'Это / Пора',
          completedSteps: [1],
          lastCompleted: '',
          mistakesCount: 0,
        },
      },
    })
    const { mainTask } = selectNowGoal(input)
    expect(mainTask?.title).toBe('Урок: To be')
    expect(mainTask?.buttonLabel).toBe('Продолжить')
    expect(mainTask?.reasonLine).toMatch(/остановился|To be/)
  })

  it('reinforce why includes errorCount', () => {
    const input = emptyInput({
      catalog: [],
      attentionZones: [zone({ lessonId: null, chipActive: false, errorCount: 4 })],
    })
    const { mainTask } = selectNowGoal(input)
    expect(mainTask?.goalType).toBe('reinforce')
    expect(mainTask?.title).toMatch(/^Тема:/)
    expect(mainTask?.reasonLine).toMatch(/4/)
  })

  it('facade getMyPlanRecommendations возвращает до 3', () => {
    const recs = getMyPlanRecommendations(emptyInput({ daysSinceLastActive: 5 }))
    expect(recs.length).toBeGreaterThan(0)
    expect(recs.length).toBeLessThanOrEqual(3)
  })

  it('programTask заполнен при cold start без main next', () => {
    const { mainTask, programTask, programStatus } = selectNowGoal(emptyInput())
    expect(mainTask?.goalType).not.toBe('next_lesson')
    expect(programStatus).toBe('active')
    expect(programTask?.action).toEqual({ kind: 'open_lesson', lessonId: '1' })
  })

  it('canUseAiReinforce=true → generation ai при lessonId', () => {
    const input = emptyInput({
      catalog: [],
      canUseAiReinforce: true,
      attentionZones: [zone({ lessonId: '1', errorCount: 5 })],
    })
    // need catalog entry with practice for reinforce_skill path
    input.catalog = baseCatalog
    const { mainTask } = selectNowGoal(input)
    expect(mainTask?.action.kind).toBe('reinforce_skill')
    if (mainTask?.action.kind === 'reinforce_skill') {
      expect(mainTask.action.generation).toBe('ai')
    }
  })
})
