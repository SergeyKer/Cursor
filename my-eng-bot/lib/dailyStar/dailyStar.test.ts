import { describe, expect, it } from 'vitest'
import { collectDailyStarActivity, dayQualifiesForDailyStar } from '@/lib/dailyStar/activity'
import { closeDailyStarDay, evaluateDailyStar } from '@/lib/dailyStar/evaluate'
import {
  createEmptyDailyStarState,
  DAILY_STAR_TUTOR_FAQ_MIN,
  emptyDailyStarActivity,
  type DailyStarActivity,
} from '@/lib/dailyStar/types'

const TODAY = '2026-08-16'
const YESTERDAY = '2026-08-15'
const TOMORROW = '2026-08-17'

function lessonActivity(count = 1): DailyStarActivity {
  return { ...emptyDailyStarActivity(), lessonCount: count }
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
    expect(state).toEqual(createEmptyDailyStarState())
  })

  it('один урок → день закрыт, день 1 из 7, рубин не начисляется', () => {
    const { state, snapshot } = evaluateDailyStar(createEmptyDailyStarState(), lessonActivity(1), TODAY)
    expect(snapshot.dailyClosedToday).toBe(true)
    expect(snapshot.dayXOf7).toBe(1)
    expect(snapshot.seriesToward7).toBe(1)
    expect(snapshot.lastClosedDate).toBe(TODAY)
    expect(snapshot.seriesCollected).toBe(false)
    expect(snapshot.rubyAwarded).toBe(false)
    expect(state.lastClosedDate).toBe(TODAY)
  })

  it('два закрытия в один день ≠ две звезды', () => {
    const first = evaluateDailyStar(createEmptyDailyStarState(), lessonActivity(1), TODAY)
    const second = evaluateDailyStar(first.state, lessonActivity(2), TODAY)
    expect(second.snapshot.dailyClosedToday).toBe(true)
    expect(second.snapshot.dayXOf7).toBe(1)
    expect(second.snapshot.seriesToward7).toBe(1)
    expect(second.state).toEqual(first.state)
    expect(closeDailyStarDay(first.state, TODAY)).toBe(first.state)
  })

  it('смена даты без активности → новый день не закрыт, серия жива', () => {
    const closed = evaluateDailyStar(createEmptyDailyStarState(), lessonActivity(1), TODAY)
    const nextMorning = evaluateDailyStar(closed.state, emptyDailyStarActivity(), TOMORROW)
    expect(nextMorning.snapshot.dailyClosedToday).toBe(false)
    expect(nextMorning.snapshot.lastClosedDate).toBe(TODAY)
    expect(nextMorning.snapshot.dayXOf7).toBe(1)
    expect(nextMorning.snapshot.seriesToward7).toBe(1)
    expect(nextMorning.state).toEqual(closed.state)
  })

  it('смена даты + урок → серия +1, всё ещё один зачёт за день', () => {
    const day1 = evaluateDailyStar(createEmptyDailyStarState(), lessonActivity(1), TODAY)
    const day2 = evaluateDailyStar(day1.state, lessonActivity(1), TOMORROW)
    expect(day2.snapshot.dailyClosedToday).toBe(true)
    expect(day2.snapshot.dayXOf7).toBe(2)
    expect(day2.snapshot.rubyAwarded).toBe(false)
  })

  it('разрыв в датах сбрасывает серию к 1', () => {
    const day1 = evaluateDailyStar(createEmptyDailyStarState(), lessonActivity(1), YESTERDAY)
    const afterGap = evaluateDailyStar(day1.state, lessonActivity(1), TOMORROW)
    expect(afterGap.snapshot.seriesToward7).toBe(1)
    expect(afterGap.snapshot.dayXOf7).toBe(1)
  })

  it('7 подряд → серия собрана, рубин всё ещё false', () => {
    let state = createEmptyDailyStarState()
    for (let day = 1; day <= 7; day += 1) {
      const date = `2026-08-${String(day).padStart(2, '0')}`
      const result = evaluateDailyStar(state, lessonActivity(1), date)
      state = result.state
      expect(result.snapshot.rubyAwarded).toBe(false)
    }
    expect(state.seriesToward7).toBe(7)
    expect(state.seriesCollected).toBe(true)
  })

  it('практика / слова / произношение / 3 FAQ закрывают день, 2 FAQ — нет', () => {
    expect(dayQualifiesForDailyStar({ ...emptyDailyStarActivity(), practiceCount: 1 })).toBe(true)
    expect(dayQualifiesForDailyStar({ ...emptyDailyStarActivity(), vocabCount: 1 })).toBe(true)
    expect(dayQualifiesForDailyStar({ ...emptyDailyStarActivity(), pronunciationCount: 1 })).toBe(true)
    expect(dayQualifiesForDailyStar({ ...emptyDailyStarActivity(), tutorFaqCount: DAILY_STAR_TUTOR_FAQ_MIN - 1 })).toBe(
      false
    )
    expect(dayQualifiesForDailyStar({ ...emptyDailyStarActivity(), tutorFaqCount: DAILY_STAR_TUTOR_FAQ_MIN })).toBe(true)
  })

  it('collect считает только события выбранного дня', () => {
    const activity = collectDailyStarActivity(
      {
        lessons: [{ lastCompleted: `${TODAY}T10:00:00.000Z` }, { lastCompleted: `${YESTERDAY}T10:00:00.000Z` }],
        practiceSessions: [{ completedAt: atNoon(TODAY) }, { completedAt: null }],
        vocabHistory: [{ completedAt: atNoon(YESTERDAY) }],
        accent: [{ completedDates: [`${TODAY}T18:00:00.000Z`] }],
        tutorFaqShown: [{ at: atNoon(TODAY) }, { at: atNoon(TODAY) }, { at: atNoon(YESTERDAY) }],
      },
      TODAY
    )
    expect(activity.lessonCount).toBe(1)
    expect(activity.practiceCount).toBe(1)
    expect(activity.vocabCount).toBe(0)
    expect(activity.pronunciationCount).toBe(1)
    expect(activity.tutorFaqCount).toBe(2)
  })
})
