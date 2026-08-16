import type { AttentionZone } from '@/lib/learningMemory/types'
import type { MyPlanRecommendation } from '@/lib/myPlan/types'
import { listTutorCuriosity } from '@/lib/tutor/curiosityStore'
import { matchLocalFaq } from '@/lib/tutor/localFaq'
import { resolveFaqCanonForZone } from '@/lib/tutor/localFaq/pickFaqForTopic'
import {
  getCachedTutorQuestion,
  listConsumedTutorKeys,
  tutorQuestionFingerprint,
} from '@/lib/tutor/tutorQuestionCache'
import { TUTOR_CHAT_COPY } from '@/lib/uiCopy/tutorChat'
import { buildOpenTutorAction } from '@/lib/tutor/tutorCardStub'
import type { LevelId } from '@/lib/types'

const TUTOR_CHIP_LIMIT = 3

function tryZoneTask(
  zone: AttentionZone,
  params: { level: LevelId | null; faqPoolEnabled: boolean }
): MyPlanRecommendation | null {
  if (params.faqPoolEnabled) {
    const faq = resolveFaqCanonForZone(zone, params.level)
    if (faq) {
      const action = buildOpenTutorAction({
        prefill: faq.questionRu,
        source: 'error_prompt',
        skillTagId: zone.skillTagId,
      })
      if (!action) return null
      return {
        id: `tutor-zone-${zone.skillTagId}`,
        priority: 0,
        title: `Часто путаешь ${zone.title}`,
        subtitle: '',
        reasonLine: `Спросить Репетитора: ${faq.questionRu}`,
        action,
        buttonLabel: TUTOR_CHAT_COPY.cardButtonAsk,
        ariaLabel: `${TUTOR_CHAT_COPY.cardSectionTitle}: ${zone.title}`,
        timeLabel: null,
      }
    }
  }

  const fingerprint = tutorQuestionFingerprint(zone.skillTagId, String(zone.errorCount))
  const cached = getCachedTutorQuestion(fingerprint)
  if (!cached) return null
  const action = buildOpenTutorAction({
    prefill: cached,
    source: 'error_prompt',
    skillTagId: zone.skillTagId,
  })
  if (!action) return null
  return {
    id: `tutor-zone-${zone.skillTagId}`,
    priority: 0,
    title: `Часто путаешь ${zone.title}`,
    subtitle: '',
    reasonLine: `Спросить Репетитора: ${cached}`,
    action,
    buttonLabel: TUTOR_CHAT_COPY.cardButtonAsk,
    ariaLabel: `${TUTOR_CHAT_COPY.cardSectionTitle}: ${zone.title}`,
    timeLabel: null,
  }
}

function tryCuriosityTask(
  curiosity: ReturnType<typeof listTutorCuriosity>[number],
  params: { level: LevelId | null; faqPoolEnabled: boolean }
): MyPlanRecommendation | null {
  let prefill = curiosity.questionRu
  if (params.faqPoolEnabled) {
    const hit = matchLocalFaq(curiosity.questionRu, params.level)
    if (hit) prefill = hit.entry.questionRu
  }
  const action = buildOpenTutorAction({
    prefill,
    source: 'curiosity',
    skillTagId: curiosity.canonicalKey,
  })
  if (!action) return null
  return {
    id: `tutor-curiosity-${curiosity.id}`,
    priority: 0,
    title: curiosity.topicTitle,
    subtitle: '',
    reasonLine: TUTOR_CHAT_COPY.cardCuriosityFallback,
    action,
    buttonLabel: TUTOR_CHAT_COPY.cardButtonAsk,
    ariaLabel: `${TUTOR_CHAT_COPY.cardSectionTitle}: ${curiosity.topicTitle}`,
    timeLabel: null,
  }
}

/**
 * Same AttentionZones order as Now — no second scorer.
 * Prefill: FAQ canon (flag ON) → AI cache → curiosity. Up to 3 chips.
 */
export function selectTutorTasks(params: {
  attentionZones?: AttentionZone[]
  consumedKeys?: string[]
  level?: LevelId | null
  faqPoolEnabled?: boolean
  limit?: number
}): MyPlanRecommendation[] {
  const limit = Math.max(1, Math.min(TUTOR_CHIP_LIMIT, params.limit ?? TUTOR_CHIP_LIMIT))
  const consumed = new Set(params.consumedKeys ?? listConsumedTutorKeys())
  const zones = params.attentionZones ?? []
  const level = params.level ?? null
  const faqPoolEnabled = Boolean(params.faqPoolEnabled)
  const out: MyPlanRecommendation[] = []
  const usedSkills = new Set<string>()

  for (const zone of zones) {
    if (out.length >= limit) break
    if (consumed.has(zone.skillTagId) || usedSkills.has(zone.skillTagId)) continue
    const task = tryZoneTask(zone, { level, faqPoolEnabled })
    if (!task) continue
    out.push(task)
    usedSkills.add(zone.skillTagId)
  }

  if (out.length < limit) {
    for (const curiosity of listTutorCuriosity(limit + 2)) {
      if (out.length >= limit) break
      const key = curiosity.canonicalKey
      if (key && (consumed.has(key) || usedSkills.has(key))) continue
      const task = tryCuriosityTask(curiosity, { level, faqPoolEnabled })
      if (!task) continue
      out.push(task)
      if (key) usedSkills.add(key)
    }
  }

  return out
}

export function selectTutorTask(params: {
  attentionZones?: AttentionZone[]
  consumedKeys?: string[]
  level?: LevelId | null
  faqPoolEnabled?: boolean
}): MyPlanRecommendation | null {
  return selectTutorTasks({ ...params, limit: 1 })[0] ?? null
}

/** Zones that need a background AI question (cache miss, not consumed, no FAQ canon). */
export function listTutorQuestionJobs(
  attentionZones: AttentionZone[],
  opts?: { level?: LevelId | null; faqPoolEnabled?: boolean }
): Array<{
  skillTagId: string
  title: string
  fingerprint: string
  errorCount: number
  sourceHint: string
}> {
  const consumed = new Set(listConsumedTutorKeys())
  const level = opts?.level ?? null
  const faqPoolEnabled = Boolean(opts?.faqPoolEnabled)
  const jobs = []
  for (const zone of attentionZones) {
    if (consumed.has(zone.skillTagId)) continue
    if (faqPoolEnabled && resolveFaqCanonForZone(zone, level)) continue
    const fingerprint = tutorQuestionFingerprint(zone.skillTagId, String(zone.errorCount))
    if (getCachedTutorQuestion(fingerprint)) continue
    jobs.push({
      skillTagId: zone.skillTagId,
      title: zone.title,
      fingerprint,
      errorCount: zone.errorCount,
      sourceHint: zone.sourceHint,
    })
    if (jobs.length >= TUTOR_CHIP_LIMIT) break
  }
  return jobs
}
