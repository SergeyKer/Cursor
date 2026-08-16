import { describe, expect, it } from 'vitest'
import { collectDailyStarActivity, dayQualifiesForDailyStar } from '@/lib/dailyStar/activity'
import { closeDailyStarDay, evaluateDailyStar } from '@/lib/dailyStar/evaluate'
import {
  createEmptyDailyStarState,
  emptyDailyStarActivity,
  type DailyStarActivity,
  type DailyStarClosedBy,
  type DailyStarStoreSlices,
} from '@/lib/dailyStar/types'

const TODAY = '2026-08-16'
const YESTERDAY = '2026-08-15'
const TOMORROW = '2026-08-17'

function closed(closedByToday: DailyStarClosedBy): DailyStarActivity {
  return { closedByToday }
}

function emptySlices(overrides: Partial<DailyStarStoreSlices> = {}): DailyStarStoreSlices {
  return {
    lessons: [],
    practiceSessions: [],
    ...overrides,
  }
}

function atNoon(date: string): number {
  return Date.parse(`${date}T12:00:00`)
}

describe('Daily Star lite', () => {
  it('нет активности → день не закрыт', () => {
    const { state, snapshot } = evaluateDailyStar(createEmptyDailyStarState(), emptyDailyStarActivity(), TODAY)
    expect(snapshot.dailyClosedToday).toBe(false)
    expect(snapshot.dayXOf7).toBe(0)
    expect(snapshot.seriesToward7).toBe(0)
    expect(snapshot.rubyAwarded).toBe(false)
    expect(snapshot.lifetimeStars).toBe(0)
    expect(snapshot.history).toEqual([])
    expect(state).toEqual(createEmptyDailyStarState())
  })

  it('один урок с датой сдачи → день закрыт, день 1 из 7, рубин не начисляется', () => {
    const { state, snapshot } = evaluateDailyStar(createEmptyDailyStarState(), closed('lesson'), TODAY)
    expect(snapshot.dailyClosedToday).toBe(true)
    expect(snapshot.dayXOf7).toBe(1)
    expect(snapshot.seriesToward7).toBe(1)
    expect(snapshot.lastClosedDate).toBe(TODAY)
    expect(snapshot.seriesCollected).toBe(false)
    expect(snapshot.rubyAwarded).toBe(false)
    expect(snapshot.lifetimeStars).toBe(1)
    expect(snapshot.todayClosedBy).toBe('lesson')
    expect(state.lastClosedDate).toBe(TODAY)
    expect(state.history).toEqual([{ date: TODAY, closedBy: 'lesson' }])
  })

  it('два закрытия в один день ≠ две звезды и closedBy не переписывается', () => {
    const first = evaluateDailyStar(createEmptyDailyStarState(), closed('communication'), TODAY)
    const second = evaluateDailyStar(first.state, closed('translation'), TODAY)
    expect(second.snapshot.dailyClosedToday).toBe(true)
    expect(second.snapshot.dayXOf7).toBe(1)
    expect(second.snapshot.seriesToward7).toBe(1)
    expect(second.snapshot.todayClosedBy).toBe('communication')
    expect(second.state).toEqual(first.state)
    expect(closeDailyStarDay(first.state, TODAY, 'translation')).toBe(first.state)
  })

  it('смена даты без активности → новый день не закрыт, серия жива', () => {
    const closedDay = evaluateDailyStar(createEmptyDailyStarState(), closed('lesson'), TODAY)
    const nextMorning = evaluateDailyStar(closedDay.state, emptyDailyStarActivity(), TOMORROW)
    expect(nextMorning.snapshot.dailyClosedToday).toBe(false)
    expect(nextMorning.snapshot.lastClosedDate).toBe(TODAY)
    expect(nextMorning.snapshot.dayXOf7).toBe(1)
    expect(nextMorning.snapshot.seriesToward7).toBe(1)
    expect(nextMorning.state).toEqual(closedDay.state)
  })

  it('смена даты + урок → серия +1, всё ещё один зачёт за день', () => {
    const day1 = evaluateDailyStar(createEmptyDailyStarState(), closed('lesson'), TODAY)
    const day2 = evaluateDailyStar(day1.state, closed('lesson'), TOMORROW)
    expect(day2.snapshot.dailyClosedToday).toBe(true)
    expect(day2.snapshot.dayXOf7).toBe(2)
    expect(day2.snapshot.lifetimeStars).toBe(2)
    expect(day2.snapshot.rubyAwarded).toBe(false)
  })

  it('разрыв в датах сбрасывает серию к 1', () => {
    const day1 = evaluateDailyStar(createEmptyDailyStarState(), closed('lesson'), YESTERDAY)
    const afterGap = evaluateDailyStar(day1.state, closed('lesson'), TOMORROW)
    expect(afterGap.snapshot.seriesToward7).toBe(1)
    expect(afterGap.snapshot.dayXOf7).toBe(1)
  })

  it('7 подряд → серия собрана, рубин всё ещё false', () => {
    let state = createEmptyDailyStarState()
    for (let day = 1; day <= 7; day += 1) {
      const date = `2026-08-${String(day).padStart(2, '0')}`
      const result = evaluateDailyStar(state, closed('lesson'), date)
      state = result.state
      expect(result.snapshot.rubyAwarded).toBe(false)
    }
    expect(state.seriesToward7).toBe(7)
    expect(state.seriesCollected).toBe(true)
    expect(state.lifetimeStars).toBe(7)
  })

  it('практика закрывает день; слова / FAQ / шаг урока — нет', () => {
    expect(dayQualifiesForDailyStar(closed('practice'))).toBe(true)
    expect(dayQualifiesForDailyStar(emptyDailyStarActivity())).toBe(false)
    expect(
      collectDailyStarActivity(
        emptySlices({ lessons: [{ lessonCompletedAt: null }] }),
        TODAY
      ).closedByToday
    ).toBeNull()
  })

  it('8/8 общения сегодня закрывает; leftover completed вчера — нет', () => {
    expect(
      collectDailyStarActivity(emptySlices({ communicationCompletedAt: TODAY }), TODAY).closedByToday
    ).toBe('communication')
    expect(
      collectDailyStarActivity(emptySlices({ communicationCompletedAt: YESTERDAY }), TODAY).closedByToday
    ).toBeNull()
  })

  it('перевод 8/8 и звонок 7/7 закрывают; порядок closedBy — общение раньше перевода', () => {
    expect(
      collectDailyStarActivity(emptySlices({ translationCompletedAt: TODAY }), TODAY).closedByToday
    ).toBe('translation')
    expect(
      collectDailyStarActivity(emptySlices({ engvoCompletedAt: `${TODAY}T18:00:00.000Z` }), TODAY).closedByToday
    ).toBe('engvo')
    expect(
      collectDailyStarActivity(
        emptySlices({ communicationCompletedAt: TODAY, translationCompletedAt: TODAY }),
        TODAY
      ).closedByToday
    ).toBe('communication')
  })

  it('collect считает только закрытия выбранного дня', () => {
    const activity = collectDailyStarActivity(
      emptySlices({
        lessons: [{ lessonCompletedAt: TODAY }, { lessonCompletedAt: YESTERDAY }],
        practiceSessions: [{ completedAt: atNoon(TODAY) }, { completedAt: null }],
        communicationCompletedAt: YESTERDAY,
      }),
      TODAY
    )
    expect(activity.closedByToday).toBe('practice')
  })
})
