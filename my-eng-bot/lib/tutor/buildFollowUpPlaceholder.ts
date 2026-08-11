/**
 * Post-explain follow-up: placeholder (legacy) + chip path (product).
 * Pure: no React, no fetch, no LLM.
 */

import {
  listLocalFaqForLevels,
  listKnownFaqTopicKeys,
  normalizeFaqText,
  resolveFaqLevelWindow,
  topicKeysFromSkillTagIds,
} from '@/lib/tutor/localFaq'
import type { LocalFaqEntry, LocalFaqGenre } from '@/lib/tutor/localFaq/types'
import type { TutorAnswerKind, TutorExplainAnswer } from '@/lib/tutor/types'
import {
  FOLLOW_UP_CHIP_BANK,
  FOLLOW_UP_CHIP_BANK_BY_KIND,
  FOLLOW_UP_CONTINUE_BANK,
  followUpPlaceholderPrefix,
  type TutorChatAudience,
} from '@/lib/uiCopy/tutorChat'
import type { LevelId } from '@/lib/types'

/** Full placeholder string max length (prefix included). */
export const TUTOR_FOLLOW_UP_PLACEHOLDER_MAX = 48

/** Chip label max length (no prefix). */
export const TUTOR_FOLLOW_UP_CHIP_MAX = 64

export type BuildTutorFollowUpPlaceholderParams = {
  answer: TutorExplainAnswer
  level?: LevelId | null
  audience?: TutorChatAudience
  excludeQuestionRu?: string | null
  seed?: number
}

export type BuildTutorFollowUpChipParams = BuildTutorFollowUpPlaceholderParams

/** Generic RU/EN glue — never counts as thematic overlap. */
const OVERLAP_STOPWORDS = new Set([
  'почему',
  'зачем',
  'чем',
  'что',
  'как',
  'это',
  'эта',
  'этот',
  'эти',
  'значит',
  'означает',
  'отлича',
  'отличается',
  'отличаются',
  'отличие',
  'отличия',
  'когда',
  'какой',
  'какая',
  'какие',
  'можно',
  'пример',
  'примеры',
  'напиши',
  'ещё',
  'еще',
  'the',
  'and',
  'for',
  'with',
  'from',
  'this',
  'that',
  'what',
  'when',
  'why',
  'how',
  'does',
  'did',
  'are',
  'was',
  'were',
  'you',
  'your',
  'not',
])

function hashSeed(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pickRotated(bank: readonly string[], seed: number): string | null {
  if (bank.length === 0) return null
  return bank[seed % bank.length] ?? null
}

function isEnToken(t: string): boolean {
  return /^[a-z0-9']+$/i.test(t)
}

/**
 * Tokenize for overlap. EN grammar tokens (my, me, up…) allowed at len≥2;
 * Cyrillic / other at len≥3. Stopwords dropped.
 */
function tokenizeOverlap(text: string): Set<string> {
  const norm = normalizeFaqText(text)
  if (!norm) return new Set()
  const out = new Set<string>()
  for (const raw of norm.split(/[^a-zа-яё0-9']+/i)) {
    const t = raw.trim()
    if (!t || OVERLAP_STOPWORDS.has(t)) continue
    if (isEnToken(t)) {
      if (t.length >= 2) out.add(t)
    } else if (t.length >= 3) {
      out.add(t)
    }
  }
  return out
}

/**
 * Resolve FAQ topicKey from explain anchor.
 * known(canonicalKey) → skillTags → substring/token of known keys.
 */
export function resolveFollowUpTopicKey(answer: TutorExplainAnswer): string | null {
  const known = listKnownFaqTopicKeys()
  const key = (answer.topicAnchor.canonicalKey || '').trim().toLowerCase()
  if (key && known.has(key)) return key

  const fromSkills = topicKeysFromSkillTagIds(answer.topicAnchor.skillTagIds)
  if (fromSkills[0]) return fromSkills[0]

  if (key) {
    const ranked = [...known].sort((a, b) => b.length - a.length || a.localeCompare(b))
    for (const candidate of ranked) {
      if (candidate.length < 4) continue
      if (key === candidate || key.includes(candidate) || key.split('_').includes(candidate)) {
        return candidate
      }
    }
  }
  return null
}

function isNearDup(entry: LocalFaqEntry, excludeNorms: string[]): boolean {
  const candidates = [entry.questionRu, ...entry.aliases].map((s) => normalizeFaqText(s))
  for (const c of candidates) {
    if (!c) continue
    for (const ex of excludeNorms) {
      if (!ex) continue
      if (c === ex || c.includes(ex) || ex.includes(c)) return true
    }
  }
  return false
}

function buildSeedTokens(params: {
  answer: TutorExplainAnswer
  excludeQuestionRu?: string | null
}): Set<string> {
  const parts = [
    params.excludeQuestionRu ?? '',
    params.answer.title,
    params.answer.topicAnchor.title,
    params.answer.topicAnchor.canonicalKey.replace(/_/g, ' '),
    ...params.answer.examplesEn,
    ...(params.answer.topicAnchor.skillTagIds ?? []),
  ]
  const out = new Set<string>()
  for (const p of parts) {
    for (const t of tokenizeOverlap(p)) out.add(t)
  }
  return out
}

/** Weighted overlap: EN needle hits count 2× (thematic signal). */
function entryOverlapScore(entry: LocalFaqEntry, seedTokens: Set<string>): number {
  if (seedTokens.size === 0) return 0

  let score = 0
  const seen = new Set<string>()

  const addFrom = (text: string, weight: number) => {
    for (const t of tokenizeOverlap(text)) {
      if (!seedTokens.has(t) || seen.has(t)) continue
      seen.add(t)
      score += weight
    }
  }

  addFrom(entry.questionRu, 1)
  for (const a of entry.aliases) addFrom(a, 1)
  for (const n of entry.enNeedles) addFrom(n, 2)

  return score
}

function genreMatchesKind(genre: LocalFaqGenre, kind: TutorAnswerKind): boolean {
  if (kind === 'contrast') return genre === 'contrast'
  if (kind === 'grammar' || kind === 'form' || kind === 'orthography') return genre === 'grammar'
  if (kind === 'how_to_say' || kind === 'translate') return genre === 'phrase' || genre === 'grammar'
  return genre === 'grammar'
}

function pickSiblingFaqShortest(params: {
  topicKey: string
  level: LevelId | null | undefined
  excludeNorms: string[]
}): LocalFaqEntry | null {
  const levels = resolveFaqLevelWindow(params.level)
  const pool = listLocalFaqForLevels(levels).filter(
    (e) => e.topicKey === params.topicKey && !isNearDup(e, params.excludeNorms)
  )
  if (pool.length === 0) return null
  pool.sort(
    (a, b) =>
      a.questionRu.length - b.questionRu.length ||
      b.popularity - a.popularity ||
      a.id.localeCompare(b.id)
  )
  return pool[0] ?? null
}

function pickSiblingFaqForChip(params: {
  topicKey: string
  level: LevelId | null | undefined
  excludeNorms: string[]
  answer: TutorExplainAnswer
  seedTokens: Set<string>
}): { entry: LocalFaqEntry; overlap: number } | null {
  const levels = resolveFaqLevelWindow(params.level)
  const pool = listLocalFaqForLevels(levels).filter(
    (e) => e.topicKey === params.topicKey && !isNearDup(e, params.excludeNorms)
  )
  if (pool.length === 0) return null

  const scored = pool
    .map((entry) => {
      const overlap = entryOverlapScore(entry, params.seedTokens)
      const genreBonus = genreMatchesKind(entry.genre, params.answer.answerKind) ? 1 : 0
      const fits = entry.questionRu.length <= TUTOR_FOLLOW_UP_CHIP_MAX ? 1 : 0
      return { entry, overlap, genreBonus, fits }
    })
    .filter((s) => s.overlap >= 1)

  if (scored.length === 0) return null

  // Among viable overlaps: genre → overlap → popularity → fit → id
  scored.sort(
    (a, b) =>
      b.genreBonus - a.genreBonus ||
      b.overlap - a.overlap ||
      b.entry.popularity - a.entry.popularity ||
      b.fits - a.fits ||
      a.entry.id.localeCompare(b.entry.id)
  )

  const best = scored[0]
  if (!best) return null
  return { entry: best.entry, overlap: best.overlap }
}

/**
 * Compress long sibling into a CONTINUE-safe short angle.
 * Placeholder path still uses this; chip path uses chipMax.
 */
export function compressSiblingToFollowUpHint(
  entry: LocalFaqEntry,
  maxLen: number = TUTOR_FOLLOW_UP_PLACEHOLDER_MAX
): string | null {
  const q = entry.questionRu
  const qLower = q.toLowerCase()
  // Explicit negation only — bare «не » is too noisy.
  if (/отриц|отрицани|don't|doesn'?t|haven'?t|won'?t|\bnot\b/i.test(qLower)) {
    return 'А в отрицании?'
  }
  if (/вопрос|do you|have you|does |did /i.test(qLower) && /отлича|чем |когда |почему /i.test(qLower)) {
    return 'А в вопросе?'
  }
  if (/вопрос|do you|have you/i.test(qLower)) {
    return 'А в вопросе?'
  }
  const needle = entry.enNeedles.find((n) => {
    const t = n.replace(/…/g, '').trim()
    return t.length >= 3 && t.length <= 28
  })
  if (needle) {
    const clean = needle.replace(/…/g, '').trim()
    const wrapped = `А «${clean}»?`
    if (wrapped.length <= maxLen) return wrapped
  }
  if (/пример/i.test(qLower)) return 'А пример?'
  return null
}

function kindBankHint(kind: TutorAnswerKind, seed: number): string | null {
  const bank = FOLLOW_UP_CONTINUE_BANK[kind] ?? FOLLOW_UP_CONTINUE_BANK.other
  return pickRotated(bank, seed)
}

function chipAngleOrExit(kind: TutorAnswerKind, seed: number, preferExit: boolean): string {
  if (preferExit) return FOLLOW_UP_CHIP_BANK.exit
  const bank = FOLLOW_UP_CHIP_BANK_BY_KIND[kind] ?? FOLLOW_UP_CHIP_BANK_BY_KIND.other
  if (bank.length === 0) return FOLLOW_UP_CHIP_BANK.exit
  return pickRotated(bank, seed) ?? FOLLOW_UP_CHIP_BANK.exit
}

/** Strip «Например: » prefix for chip label / submit. */
export function stripFollowUpPlaceholderPrefix(hint: string): string {
  const prefix = followUpPlaceholderPrefix()
  return hint.startsWith(prefix) ? hint.slice(prefix.length) : hint
}

/**
 * Build post-explain placeholder string, or null → caller keeps idle placeholder.
 * Legacy path: shortest sibling + CONTINUE bank (unchanged contract).
 */
export function buildTutorFollowUpPlaceholder(
  params: BuildTutorFollowUpPlaceholderParams
): string | null {
  const audience: TutorChatAudience = params.audience === 'child' ? 'child' : 'adult'
  const prefix = followUpPlaceholderPrefix(audience)
  const answer = params.answer
  const seed =
    params.seed ??
    hashSeed(`${answer.topicAnchor.canonicalKey}|${answer.answerKind}|${answer.title}`)

  const excludeNorms = [
    normalizeFaqText(answer.title),
    normalizeFaqText(answer.topicAnchor.title),
    normalizeFaqText(params.excludeQuestionRu ?? ''),
  ].filter(Boolean)

  const topicKey = resolveFollowUpTopicKey(answer)
  if (topicKey) {
    const sibling = pickSiblingFaqShortest({
      topicKey,
      level: params.level,
      excludeNorms,
    })
    if (sibling) {
      const full = `${prefix}${sibling.questionRu}`
      if (full.length <= TUTOR_FOLLOW_UP_PLACEHOLDER_MAX) {
        return full
      }
      const compressed = compressSiblingToFollowUpHint(sibling, TUTOR_FOLLOW_UP_PLACEHOLDER_MAX)
      if (compressed) {
        const withPrefix = `${prefix}${compressed}`
        if (withPrefix.length <= TUTOR_FOLLOW_UP_PLACEHOLDER_MAX) return withPrefix
        if (compressed.length <= TUTOR_FOLLOW_UP_PLACEHOLDER_MAX) return compressed
      }
    }
  }

  const fromKind = kindBankHint(answer.answerKind, seed)
  if (!fromKind) return null
  const withPrefix = `${prefix}${fromKind}`
  if (withPrefix.length <= TUTOR_FOLLOW_UP_PLACEHOLDER_MAX) return withPrefix
  return fromKind.length <= TUTOR_FOLLOW_UP_PLACEHOLDER_MAX ? fromKind : null
}

/**
 * First-hop continue chip label (no «Например:»), or null.
 */
export function buildTutorFollowUpChip(params: BuildTutorFollowUpChipParams): string | null {
  const answer = params.answer
  // Always leave a forward chip — even weak kinds (miss→tutor lexical answers).
  if (answer.answerKind === 'translate' || answer.answerKind === 'other') {
    return FOLLOW_UP_CHIP_BANK.exit
  }

  const seed =
    params.seed ??
    hashSeed(`${answer.topicAnchor.canonicalKey}|${answer.answerKind}|${answer.title}`)

  const excludeNorms = [
    normalizeFaqText(answer.title),
    normalizeFaqText(answer.topicAnchor.title),
    normalizeFaqText(params.excludeQuestionRu ?? ''),
  ].filter(Boolean)

  const seedTokens = buildSeedTokens({
    answer,
    excludeQuestionRu: params.excludeQuestionRu,
  })

  const topicKey = resolveFollowUpTopicKey(answer)
  if (!topicKey) {
    return FOLLOW_UP_CHIP_BANK.exit
  }

  const levels = resolveFaqLevelWindow(params.level)
  const poolSize = listLocalFaqForLevels(levels).filter(
    (e) => e.topicKey === topicKey && !isNearDup(e, excludeNorms)
  ).length

  const picked = pickSiblingFaqForChip({
    topicKey,
    level: params.level,
    excludeNorms,
    answer,
    seedTokens,
  })

  // Weak / no overlap → honest exit (do not fake CONTINUE angle).
  if (!picked || picked.overlap < 1) {
    return FOLLOW_UP_CHIP_BANK.exit
  }

  const sibling = picked.entry
  if (sibling.questionRu.length <= TUTOR_FOLLOW_UP_CHIP_MAX) {
    return sibling.questionRu
  }

  const compressed = compressSiblingToFollowUpHint(sibling, TUTOR_FOLLOW_UP_CHIP_MAX)
  if (compressed && compressed.length <= TUTOR_FOLLOW_UP_CHIP_MAX) {
    return compressed
  }

  // Topic known, pool existed, but nothing fit → kind angles (not misleading exit-only).
  if (poolSize > 0) {
    return chipAngleOrExit(answer.answerKind, seed, false)
  }

  return FOLLOW_UP_CHIP_BANK.exit
}
