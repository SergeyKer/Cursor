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
import type { LocalFaqMatch } from '@/lib/tutor/localFaq/types'
import type { LevelId } from '@/lib/types'

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

/**
 * Match free text to FAQ pool.
 * Strict only: id / exact / alias / multi-token EN needle (≥2 words).
 * No Jaccard / silent paraphrase — avoids topic substitution on free text.
 * EN error utterances → null.
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
    const needles = entry.enNeedles.map((n) => normalizeFaqText(n)).filter(Boolean)
    for (const n of needles) {
      const needleTokens = n.split(/\s+/).length
      // Strong multi-token only: ≥3 words, or 2 words with enough chars (blocks "i am" FP)
      if (needleTokens < 2) continue
      if (needleTokens === 2 && n.length < 12) continue
      if (n.length < 8) continue

      if (norm.includes(n) || stripped.includes(n)) {
        score = Math.max(score, 0.9)
      }
      for (const qn of qNeedles) {
        const qTokens = qn.split(/\s+/).length
        if (qTokens < 2) continue
        if (qn === n) {
          score = Math.max(score, 0.88)
          continue
        }
        // Query contains full entry needle — not the reverse (short qn ⊆ long n)
        if (qn.includes(n) && (needleTokens >= 3 || n.length >= 12)) {
          score = Math.max(score, 0.88)
        }
      }
    }

    if (score > 0 && (!best || score > best.score)) {
      best = { entry, score, reason: 'needle' }
    }
  }

  return best
}
