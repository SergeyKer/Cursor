const MOSCOW_TZ = 'Europe/Moscow'

/**
 * Voice Lab password (Europe/Moscow):
 * `KSA` + 7 digits + `!`
 *
 * Digits = DDMMYY with ISO weekday N (Mon=1…Sun=7) inserted at 1-based position N.
 * Thursday 9 Jul 2026 → base 090726, N=4 → 0904726 → KSA0904726!
 * Friday 10 Jul 2026 → base 100726, N=5 → 1007526 → KSA1007526!
 */
export function buildVoiceLabPasswordForDate(date: Date = new Date()): string {
  const parts = getMoscowDateParts(date)
  const baseSix = `${parts.dd}${parts.mm}${parts.yy}`
  const n = Number(parts.isoWeekday)
  const digits = insertAtOneBased(baseSix, n, parts.isoWeekday)
  return `KSA${digits}!`
}

export function isValidVoiceLabPassword(input: string, date: Date = new Date()): boolean {
  return input.trim() === buildVoiceLabPasswordForDate(date)
}

export function getMoscowDateKey(date: Date = new Date()): string {
  const { yyyy, mm, dd } = getMoscowDateParts(date)
  return `${yyyy}-${mm}-${dd}`
}

/** Insert `ch` so it becomes the 1-based `position`-th character of the result. */
function insertAtOneBased(sixDigits: string, position: number, ch: string): string {
  const pos = Math.min(Math.max(position, 1), sixDigits.length + 1)
  const i = pos - 1
  return `${sixDigits.slice(0, i)}${ch}${sixDigits.slice(i)}`
}

function getMoscowDateParts(date: Date): {
  yyyy: string
  yy: string
  mm: string
  dd: string
  isoWeekday: string
} {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: MOSCOW_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  })
  const parts = fmt.formatToParts(date)
  const byType = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const yyyy = byType('year')
  return {
    yyyy,
    yy: yyyy.slice(-2),
    mm: byType('month'),
    dd: byType('day'),
    isoWeekday: weekdayShortToIso(byType('weekday')),
  }
}

function weekdayShortToIso(short: string): string {
  const map: Record<string, string> = {
    Mon: '1',
    Tue: '2',
    Wed: '3',
    Thu: '4',
    Fri: '5',
    Sat: '6',
    Sun: '7',
  }
  return map[short] ?? '1'
}
