/**
 * Post-explain composer placeholder: sibling FAQ → compress → CONTINUE bank.
 * Pure: no React, no fetch, no LLM.
 */

import {
  listLocalFaqForLevels,
  listKnownFaqTopicKeys,
  normalizeFaqText,
  resolveFaqLevelWindow,
  topicKeysFromSkillTagIds,
} from '@/lib/tutor/localFaq'
import type { LocalFaqEntry } from '@/lib/tutor/localFaq/types'
import type { TutorAnswerKind, TutorExplainAnswer } from '@/lib/tutor/types'
import {
  FOLLOW_UP_CONTINUE_BANK,
  followUpPlaceholderPrefix,
  type TutorChatAudience,
} from '@/lib/uiCopy/tutorChat'
import type { LevelId } from '@/lib/types'

/** Full placeholder string max length (prefix included). */
export const TUTOR_FOLLOW_UP_PLACEHOLDER_MAX = 48

export type BuildTutorFollowUpPlaceholderParams = {
  answer: TutorExplainAnswer
  level?: LevelId | null
  audience?: TutorChatAudience
  excludeQuestionRu?: string | null
  seed?: number
}

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
    // Prefer longer known keys as tokens inside LLM slug (e.g. have_got in …_have_got_…).
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

function pickSiblingFaq(params: {
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

/**
 * Compress long sibling into a CONTINUE-safe short angle.
 */
export function compressSiblingToFollowUpHint(entry: LocalFaqEntry): string | null {
  const q = entry.questionRu
  const qLower = q.toLowerCase()
  if (/отриц|не\s+|don't|doesn'?t|haven'?t|not\b/i.test(qLower)) {
    return 'А в отрицании?'
  }
  if (/вопрос|do you|have you|does |did |\?\s*$/i.test(qLower) && /отлича|чем |когда |почему /i.test(qLower)) {
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
    if (wrapped.length <= TUTOR_FOLLOW_UP_PLACEHOLDER_MAX) return wrapped
  }
  if (/пример/i.test(qLower)) return 'А пример?'
  return null
}

function kindBankHint(kind: TutorAnswerKind, seed: number): string | null {
  const bank = FOLLOW_UP_CONTINUE_BANK[kind] ?? FOLLOW_UP_CONTINUE_BANK.other
  return pickRotated(bank, seed)
}

/**
 * Build post-explain placeholder string, or null → caller keeps idle placeholder.
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
    const sibling = pickSiblingFaq({
      topicKey,
      level: params.level,
      excludeNorms,
    })
    if (sibling) {
      const full = `${prefix}${sibling.questionRu}`
      if (full.length <= TUTOR_FOLLOW_UP_PLACEHOLDER_MAX) {
        return full
      }
      const compressed = compressSiblingToFollowUpHint(sibling)
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
