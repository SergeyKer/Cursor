import { GOLDEN_PATH_EXPLAIN_PACKS } from '@/lib/tutor/localExplain/goldenPathPacks'
import type { LocalExplainPack } from '@/lib/tutor/localExplain/types'
import { normalizeFaqText, stripFaqInterrogative } from '@/lib/tutor/localFaq/normalizeFaq'
import type { TutorAudience, TutorExplainAnswer } from '@/lib/tutor/types'

const PACKS: readonly LocalExplainPack[] = GOLDEN_PATH_EXPLAIN_PACKS

const BY_FAQ_ID = new Map<string, LocalExplainPack>()
for (const pack of PACKS) {
  for (const faqId of pack.faqIds) {
    BY_FAQ_ID.set(faqId, pack)
  }
}

function queryMatchesPack(norm: string, stripped: string, pack: LocalExplainPack): boolean {
  for (const q of pack.matchQueries ?? []) {
    const qNorm = normalizeFaqText(q)
    if (!qNorm) continue
    if (norm === qNorm || stripped === stripFaqInterrogative(qNorm)) return true
  }
  return false
}

/** Resolve local Explain pack by FAQ id or exact/alias query text. */
export function lookupLocalExplainPack(
  queryOrFaqId: string,
  _audience: TutorAudience = 'adult'
): TutorExplainAnswer | null {
  const raw = queryOrFaqId.trim()
  if (!raw) return null

  const byId = BY_FAQ_ID.get(raw)
  if (byId) return byId.answer

  const norm = normalizeFaqText(raw)
  if (!norm) return null
  const stripped = stripFaqInterrogative(norm)

  for (const pack of PACKS) {
    if (queryMatchesPack(norm, stripped, pack)) return pack.answer
  }
  return null
}

export function listGoldenPathExplainPacks(): readonly LocalExplainPack[] {
  return PACKS
}

export function getLocalExplainPackByFaqId(faqId: string): LocalExplainPack | null {
  return BY_FAQ_ID.get(faqId.trim()) ?? null
}
