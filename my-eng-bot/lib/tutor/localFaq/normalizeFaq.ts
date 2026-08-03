import { normalizeTutorEmDashes } from '@/lib/tutor/text'
import { normalizeTutorQuery } from '@/lib/tutor/tutorIntent'

/** Normalize for FAQ matching: quotes, apostrophes, case, interrogative strip optional. */
export function normalizeFaqText(raw: string): string {
  let s = normalizeTutorQuery(raw, 500)
  if (!s) return ''
  s = s
    .normalize('NFKC')
    .replace(/ё/g, 'е')
    .replace(/[«»„“”]/g, '"')
    .replace(/[''`´’]/g, "'")
    .toLowerCase()
  s = normalizeTutorEmDashes(s)
  s = s.replace(/[?？!！]+$/g, '').trim()
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

const LEADING_Q_RE =
  /^(а\s+)?(почему|зачем|чем|когда|можно\s+ли|в\s+чём|как)\s+/i

/** Strip leading RU interrogative for alias-style compare. */
export function stripFaqInterrogative(normalized: string): string {
  return normalized.replace(LEADING_Q_RE, '').trim()
}

/** Mostly Latin tokens → likely EN sentence to check, not a why-FAQ. */
export function looksLikeEnErrorUtterance(normalized: string): boolean {
  if (!normalized) return false
  if (LEADING_Q_RE.test(normalized) || /^(почему|зачем|чем|когда)\b/.test(normalized)) {
    return false
  }
  if (/[«"][^»"]+[»"]\s*,?\s*а\s+не\s+[«"]/.test(normalized)) return false
  const letters = normalized.replace(/[^a-zа-яё]/gi, '')
  if (letters.length < 4) return false
  const latin = (normalized.match(/[a-z]/gi) ?? []).length
  const cyr = (normalized.match(/[а-яё]/gi) ?? []).length
  return latin >= 6 && latin > cyr * 2
}
