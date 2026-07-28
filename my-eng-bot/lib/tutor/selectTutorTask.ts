import type { AttentionZone } from '@/lib/learningMemory/types'
import type { MyPlanRecommendation } from '@/lib/myPlan/types'
import { listTutorCuriosity } from '@/lib/tutor/curiosityStore'
import {
  getCachedTutorQuestion,
  listConsumedTutorKeys,
  tutorQuestionFingerprint,
} from '@/lib/tutor/tutorQuestionCache'
import { TUTOR_CHAT_COPY } from '@/lib/uiCopy/tutorChat'
import { buildOpenTutorAction } from '@/lib/tutor/tutorCardStub'

/**
 * Same AttentionZones order as Now — no second scorer.
 * Prefill only from cached AI question or curiosity (never fake AI template).
 */
export function selectTutorTask(params: {
  attentionZones?: AttentionZone[]
  consumedKeys?: string[]
}): MyPlanRecommendation | null {
  const consumed = new Set(params.consumedKeys ?? listConsumedTutorKeys())
  const zones = params.attentionZones ?? []

  for (const zone of zones) {
    if (consumed.has(zone.skillTagId)) continue
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
    const action = buildOpenTutorAction({
      prefill: curiosity.questionRu,
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

/** Zones that need a background AI question (cache miss, not consumed). */
export function listTutorQuestionJobs(attentionZones: AttentionZone[]): Array<{
  skillTagId: string
  title: string
  fingerprint: string
  errorCount: number
  sourceHint: string
}> {
  const consumed = new Set(listConsumedTutorKeys())
  const jobs = []
  for (const zone of attentionZones) {
    if (consumed.has(zone.skillTagId)) continue
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
