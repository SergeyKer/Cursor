import { describe, expect, it } from 'vitest'
import { getMyPlanRecommendations } from '@/lib/myPlan/recommendations'
import type { MyPlanInput } from '@/lib/myPlan/types'

const baseCatalog = [
  { id: '1', title: 'Урок A', order: 10, enabled: true, hasTheory: true, hasPractice: true },
  { id: '2', title: 'Урок B', order: 20, enabled: true, hasTheory: true, hasPractice: true },
]

function emptyInput(over: Partial<MyPlanInput> = {}): MyPlanInput {
  return {
    todayDate: '2026-05-14',
    catalog: baseCatalog,
    lessons: {},
    rewards: {
      lastActiveDate: '2026-05-14',
      dailyStreak: 0,
      modeGoals: {
        communication: { completed: false },
        engvo: { completed: false },
      },
    },
    practiceCompleted: [],
    daysSinceLastActive: null,
    weakSpots: [],
    audience: 'adult',
    nowMs: Date.parse('2026-05-14T12:00:00.000Z'),
    ...over,
  }
}

describe('getMyPlanRecommendations (facade)', () => {
  it('при незавершённом уроке первая карточка - продолжить', () => {
    const input = emptyInput({
      lessons: {
        '1': {
          lessonId: '1',
          topic: 'Еда',
          completedSteps: [1],
          lastCompleted: '',
          mistakesCount: 0,
        },
      },
    })
    const recs = getMyPlanRecommendations(input)
    expect(recs[0]?.id).toBe('continue-lesson')
    expect(recs[0]?.action).toEqual({ kind: 'resume_lesson', lessonId: '1' })
  })

  it('после теории без практики появляется закрепление практикой', () => {
    const input = emptyInput({
      lessons: {
        '1': {
          lessonId: '1',
          topic: 'Еда',
          completedSteps: [1, 2, 3],
          lastCompleted: '2026-05-14T10:00:00.000Z',
          mistakesCount: 0,
        },
      },
      practiceCompleted: [],
    })
    const recs = getMyPlanRecommendations(input)
    const practice = recs.find((r) => r.id === 'practice-after-theory')
    expect(practice).toBeTruthy()
    expect(practice?.action).toMatchObject({
      kind: 'start_practice',
      lessonId: '1',
      mode: 'challenge',
      entrySource: 'my_plan',
    })
  })

  it('если практика уже была после теории, карточка закрепления не показывается', () => {
    const input = emptyInput({
      lessons: {
        '1': {
          lessonId: '1',
          topic: 'Еда',
          completedSteps: [1, 2],
          lastCompleted: '2026-05-14T10:00:00.000Z',
          mistakesCount: 0,
        },
      },
      practiceCompleted: [
        { lessonId: '1', completedAt: Date.parse('2026-05-14T11:00:00.000Z'), status: 'completed' },
      ],
    })
    const recs = getMyPlanRecommendations(input)
    expect(recs.find((r) => r.id === 'practice-after-theory')).toBeUndefined()
  })

  it('следующий урок по программе - первый без завершённой теории', () => {
    const input = emptyInput({ lessons: {} })
    const recs = getMyPlanRecommendations(input)
    const next = recs.find((r) => r.id?.startsWith('next-lesson'))
    expect(next?.action).toEqual({ kind: 'open_lesson', lessonId: '1' })
  })

  it('после перерыва — soft return в списке', () => {
    const input = emptyInput({
      catalog: [],
      rewards: {
        lastActiveDate: '2026-05-01',
        dailyStreak: 0,
        modeGoals: { communication: { completed: true }, engvo: { completed: true } },
      },
      daysSinceLastActive: 5,
    })
    const recs = getMyPlanRecommendations(input)
    expect(recs.some((r) => r.id === 'return-after-break')).toBe(true)
  })
})
