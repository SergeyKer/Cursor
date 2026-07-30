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

/**
 * Same AttentionZones order as Now — no second scorer.
 * Prefill: FAQ canon (flag ON) → AI cache → curiosity.
 */
export function selectTutorTask(params: {
  attentionZones?: AttentionZone[]
  consumedKeys?: string[]
  level?: LevelId | null
  faqPoolEnabled?: boolean
}): MyPlanRecommendation | null {
  const consumed = new Set(params.consumedKeys ?? listConsumedTutorKeys())
  const zones = params.attentionZones ?? []
  const level = params.level ?? null
  const faqPoolEnabled = Boolean(params.faqPoolEnabled)

  for (const zone of zones) {
    if (consumed.has(zone.skillTagId)) continue

    if (faqPoolEnabled) {
      const faq = resolveFaqCanonForZone(zone, level)
      if (faq) {
        const action = buildOpenTutorAction({
          prefill: faq.questionRu,
          source: 'error_prompt',
          skillTagId: zone.skillTagId,
        })
        if (!action) continue
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
    if (!cached) continue
    const action = buildOpenTutorAction({
      prefill: cached,
      source: 'error_prompt',
      skillTagId: zone.skillTagId,
    })
    if (!action) continue
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

  const curiosity = listTutorCuriosity(1)[0]
  if (curiosity) {
    let prefill = curiosity.questionRu
    if (faqPoolEnabled) {
      const hit = matchLocalFaq(curiosity.questionRu, level)
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

  return null
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
    if (jobs.length >= 1) break
  }
  return jobs
}
