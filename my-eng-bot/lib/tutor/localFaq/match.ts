import {
  getLocalFaqById,
  listLocalFaqForLevels,
  resolveFaqLevelWindow,
} from '@/lib/tutor/localFaq/catalog'
import {
  looksLikeEnErrorUtterance,
  normalizeFaqText,
  stripFaqInterrogative,
} from '@/lib/tutor/localFaq/normalizeFaq'
import type { LocalFaqEntry, LocalFaqMatch } from '@/lib/tutor/localFaq/types'
import type { LevelId } from '@/lib/types'

const STOP = new Set([
  'почему',
  'зачем',
  'а',
  'не',
  'и',
  'или',
  'мы',
  'говорим',
  'в',
  'речи',
  'the',
  'a',
  'an',
  'to',
  'of',
  'is',
  'are',
  'am',
])

const HIT_MIN = 0.82

function tokenize(s: string): Set<string> {
  const out = new Set<string>()
  for (const part of s.split(/[^a-zа-яё0-9']+/i)) {
    const t = part.trim()
    if (t.length < 2) continue
    if (STOP.has(t)) continue
    out.add(t)
  }
  return out
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  for (const t of a) {
    if (b.has(t)) inter += 1
  }
  const union = a.size + b.size - inter
  return union === 0 ? 0 : inter / union
}

function extractEnNeedlesFromQuery(normalized: string): string[] {
  const out: string[] = []
  const quoted = normalized.matchAll(/"([^"]{2,80})"/g)
  for (const m of quoted) {
    if (m[1]) out.push(m[1].trim())
  }
  const latinRuns = normalized.match(/[a-z][a-z'\s]{2,60}[a-z]/gi) ?? []
  for (const run of latinRuns) {
    const t = run.replace(/\s+/g, ' ').trim().toLowerCase()
    if (t.split(' ').length >= 2) out.push(t)
  }
  return out
}

function entryHaystack(entry: LocalFaqEntry): string {
  return normalizeFaqText([entry.questionRu, ...entry.aliases, ...entry.enNeedles].join(' '))
}

/**
 * Match free text to FAQ pool. High threshold; EN error utterances → null.
 */
export function matchLocalFaq(
  query: string,
  level: LevelId | null | undefined
): LocalFaqMatch | null {
  const raw = query.trim()
  if (!raw) return null

  if (/^faq:/i.test(raw) || /^id:/i.test(raw)) {
    const id = raw.replace(/^(faq:|id:)/i, '').trim()
    const entry = getLocalFaqById(id)
    if (entry) return { entry, score: 1, reason: 'id' }
  }

  const byId = getLocalFaqById(raw)
  if (byId) return { entry: byId, score: 1, reason: 'id' }

  const norm = normalizeFaqText(raw)
  if (!norm) return null

  if (looksLikeEnErrorUtterance(norm)) return null

  const stripped = stripFaqInterrogative(norm)
  const levels = resolveFaqLevelWindow(level)
  const candidates = listLocalFaqForLevels(levels)
  const qNeedles = extractEnNeedlesFromQuery(norm)
  const qTokens = tokenize(stripped || norm)

  let best: LocalFaqMatch | null = null

  for (const entry of candidates) {
    const qNorm = normalizeFaqText(entry.questionRu)
    const qStrip = stripFaqInterrogative(qNorm)

    if (norm === qNorm || stripped === qStrip) {
      return { entry, score: 1, reason: 'exact' }
    }

    for (const alias of entry.aliases) {
      const a = normalizeFaqText(alias)
      if (!a) continue
      if (norm === a || stripped === a || stripped === stripFaqInterrogative(a)) {
        return { entry, score: 0.98, reason: 'alias' }
      }
    }

    let score = 0
    let reason: LocalFaqMatch['reason'] = 'jaccard'

    const needles = entry.enNeedles.map((n) => normalizeFaqText(n)).filter(Boolean)
    for (const n of needles) {
      if (n.length < 4) continue
      if (norm.includes(n) || stripped.includes(n)) {
        // Require multi-token needle or RU interrogative already present
        const needleTokens = n.split(/\s+/).length
        if (needleTokens >= 2 || !looksLikeEnErrorUtterance(norm)) {
          score = Math.max(score, 0.9)
          reason = 'needle'
        }
      }
      for (const qn of qNeedles) {
        if (qn === n || qn.includes(n) || n.includes(qn)) {
          if (qn.split(/\s+/).length >= 2 && n.split(/\s+/).length >= 2) {
            score = Math.max(score, 0.88)
            reason = 'needle'
          }
        }
      }
    }

    const hay = tokenize(entryHaystack(entry))
    const jac = jaccard(qTokens, hay)
    if (jac > score) {
      score = jac
      reason = 'jaccard'
    }

    if (score >= HIT_MIN && (!best || score > best.score)) {
      best = { entry, score, reason }
    }
  }

  return best
}
