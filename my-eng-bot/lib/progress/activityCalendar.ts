import { getTodayDateString } from '@/lib/rewardsState'

export type MonthDayCell = {
  date: string | null
  inMonth: boolean
  active: boolean
  isToday: boolean
}

/** Build a Sunday-start calendar grid for the month containing `anchor` (YYYY-MM-DD). */
export function buildMonthActivityGrid(
  activeDays: string[],
  anchor: string = getTodayDateString()
): { year: number; month: number; cells: MonthDayCell[] } {
  const [y, m] = anchor.split('-').map((x) => Number(x))
  const year = Number.isFinite(y) ? y : new Date().getFullYear()
  const month = Number.isFinite(m) ? m : new Date().getMonth() + 1
  const activeSet = new Set(activeDays)
  const first = new Date(year, month - 1, 1)
  const startPad = first.getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const today = getTodayDateString()
  const cells: MonthDayCell[] = []

  for (let i = 0; i < startPad; i++) {
    cells.push({ date: null, inMonth: false, active: false, isToday: false })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({
      date,
      inMonth: true,
      active: activeSet.has(date),
      isToday: date === today,
    })
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, inMonth: false, active: false, isToday: false })
  }
  return { year, month, cells }
}

export function lastSevenDayActivity(
  activeDays: string[],
  today: string = getTodayDateString()
): { date: string; active: boolean }[] {
  const activeSet = new Set(activeDays)
  const end = new Date(`${today}T12:00:00`)
  const out: { date: string; active: boolean }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(end)
    d.setDate(end.getDate() - i)
    const date = getTodayDateString(d)
    out.push({ date, active: activeSet.has(date) })
  }
  return out
}
