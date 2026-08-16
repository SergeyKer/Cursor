import { describe, expect, it } from 'vitest'
import { pickDailyStarAction, type DailyStarPickInput } from '@/lib/myPlan/pickDailyStarAction'

const idle = {
  status: 'not_started',
  progress: 0,
  target: 8,
  completedAt: null,
}

function input(over: Partial<DailyStarPickInput> = {}): DailyStarPickInput {
  return {
    todayDate: '2026-08-16',
    communication: { ...idle },
    translation: { ...idle },
    dialogue: { ...idle },
    engvo: { status: 'not_started', progress: 0, target: 7, completedAt: null },
    practiceInProgress: false,
    engvoVoiceEnabled: true,
    ...over,
  }
}

describe('pickDailyStarAction', () => {
  it('без метров → общение', () => {
    expect(pickDailyStarAction(undefined)).toEqual({ kind: 'open_communication' })
  })

  it('продолжает ближайший in_progress к финишу', () => {
    expect(
      pickDailyStarAction(
        input({
          communication: { status: 'in_progress', progress: 3, target: 8, completedAt: null },
          translation: { status: 'in_progress', progress: 7, target: 8, completedAt: null },
        })
      )
    ).toEqual({ kind: 'open_translation' })
  })

  it('практика in_progress если нет 8/8/звонка в процессе', () => {
    expect(pickDailyStarAction(input({ practiceInProgress: true }))).toEqual({
      kind: 'quick_practice',
      entrySource: 'my_plan',
    })
  })

  it('простой старт: общение → звонок → перевод', () => {
    expect(pickDailyStarAction(input())).toEqual({ kind: 'open_communication' })
    expect(
      pickDailyStarAction(
        input({
          communication: { ...idle, completedAt: '2026-08-16' },
        })
      )
    ).toEqual({ kind: 'open_engvo' })
    expect(
      pickDailyStarAction(
        input({
          communication: { ...idle, completedAt: '2026-08-16' },
          engvo: { status: 'completed', progress: 7, target: 7, completedAt: '2026-08-16' },
        })
      )
    ).toEqual({ kind: 'open_translation' })
  })

  it('без флага звонка не предлагает engvo', () => {
    expect(
      pickDailyStarAction(
        input({
          engvoVoiceEnabled: false,
          communication: { ...idle, completedAt: '2026-08-16' },
          engvo: { status: 'in_progress', progress: 6, target: 7, completedAt: null },
        })
      )
    ).toEqual({ kind: 'open_translation' })
  })
})
