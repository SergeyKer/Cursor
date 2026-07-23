import { LANGUAGE_NOTE_COPY } from '@/lib/uiCopy/languageNote'

export const CALL_REVIEW_COPY = {
  sheetTitle: LANGUAGE_NOTE_COPY.sheetTitle,
  said: 'Ты сказал',
  /** Free: title for `correct` field (not the optional `better` block). */
  betterSo: 'Лучше так',
  etalon: LANGUAGE_NOTE_COPY.etalon,
  why: 'Почему',
  betterNatural: LANGUAGE_NOTE_COPY.better,
  review: LANGUAGE_NOTE_COPY.review,
  summaryFree: 'Что заметили',
  summaryTeacher: 'Что поправил преподаватель',
  places: {
    one: 'место',
    few: 'места',
    many: 'мест',
  },
  fixes: {
    one: 'правка',
    few: 'правки',
    many: 'правок',
  },
} as const

/** Russian plural for 1 / 2–4 / 5+. */
export function formatCallReviewCountNoun(
  n: number,
  forms: { one: string; few: string; many: string }
): string {
  const abs = Math.abs(Math.trunc(n))
  const mod100 = abs % 100
  const mod10 = abs % 10
  if (mod100 >= 11 && mod100 <= 14) return forms.many
  if (mod10 === 1) return forms.one
  if (mod10 >= 2 && mod10 <= 4) return forms.few
  return forms.many
}

export function formatCallReviewSummaryLine(
  kind: 'free_call' | 'teacher',
  count: number
): string {
  const title =
    kind === 'teacher' ? CALL_REVIEW_COPY.summaryTeacher : CALL_REVIEW_COPY.summaryFree
  const forms = kind === 'teacher' ? CALL_REVIEW_COPY.fixes : CALL_REVIEW_COPY.places
  const noun = formatCallReviewCountNoun(count, forms)
  return `${title} · ${count} ${noun}`
}
