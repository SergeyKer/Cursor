import { featureFlags } from '@/lib/featureFlags'
import { getPracticeTopicProgress } from '@/lib/practice/practiceTopicProgressStorage'
import type { AttentionZone } from '@/lib/learningMemory/types'
import {
  CRITICAL_ZONE_ERROR_COUNT,
  INCOMPLETE_STALE_DAYS,
  MAX_SECONDARY,
  SOFT_RETURN_DAYS,
  type MyPlanCatalogTopic,
  type MyPlanInput,
  type MyPlanLessonProgressSlice,
  type MyPlanRecommendation,
  type NowGoalResult,
  type NowGoalType,
} from '@/lib/myPlan/types'
import {
  myPlanButton,
  myPlanTimeLabel,
  myPlanTitleIncomplete,
  myPlanTitleNext,
  myPlanTitlePractice,
  myPlanTitleReinforce,
  myPlanWhy,
  type MyPlanAudience,
} from '@/lib/uiCopy/myPlan'

function audienceOf(input: MyPlanInput): MyPlanAudience {
  return input.audience === 'child' ? 'child' : 'adult'
}

function isLessonIncomplete(p: { lastCompleted: string; completedSteps: number[] }): boolean {
  return (!p.lastCompleted || !p.lastCompleted.trim()) && p.completedSteps.length > 0
}

function isTheoryCompleted(p: { lastCompleted: string }): boolean {
  return Boolean(p.lastCompleted?.trim())
}

function catalogOrder(catalog: MyPlanInput['catalog'], lessonId: string): number {
  const row = catalog.find((t) => t.id === lessonId)
  return row?.order ?? 9999
}

function pickIncompleteLesson(input: MyPlanInput): MyPlanLessonProgressSlice | null {
  const candidates = Object.values(input.lessons).filter(isLessonIncomplete)
  if (candidates.length === 0) return null
  candidates.sort((a, b) => catalogOrder(input.catalog, a.lessonId) - catalogOrder(input.catalog, b.lessonId))
  return candidates[0] ?? null
}

function incompleteAgeDays(p: MyPlanLessonProgressSlice, nowMs: number): number | null {
  const iso = p.incompleteTouchedAtIso?.trim()
  if (!iso) return null
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return null
  return Math.max(0, (nowMs - t) / (24 * 60 * 60 * 1000))
}

function isIncompleteStale(p: MyPlanLessonProgressSlice, nowMs: number): boolean {
  const age = incompleteAgeDays(p, nowMs)
  return age != null && age >= INCOMPLETE_STALE_DAYS
}

function pickLatestCompletedTheory(input: MyPlanInput): MyPlanLessonProgressSlice | null {
  const done = Object.values(input.lessons).filter((p) => isTheoryCompleted(p))
  if (done.length === 0) return null
  done.sort((a, b) => {
    const ta = Date.parse(a.lastCompleted) || 0
    const tb = Date.parse(b.lastCompleted) || 0
    return tb - ta
  })
  return done[0] ?? null
}

function hasPracticeAfterTheory(input: MyPlanInput, lessonId: string, theoryCompletedAtIso: string): boolean {
  const t0 = Date.parse(theoryCompletedAtIso)
  if (!Number.isFinite(t0)) return false
  return input.practiceCompleted.some((s) => {
    if (s.lessonId !== lessonId || s.status !== 'completed') return false
    const at = s.completedAt ?? 0
    return at >= t0
  })
}

function pickNextLessonInProgram(input: MyPlanInput): MyPlanCatalogTopic | null {
  const sorted = [...input.catalog].filter((t) => t.enabled && t.hasTheory).sort((a, b) => a.order - b.order)
  for (const topic of sorted) {
    const p = input.lessons[topic.id]
    if (!p || !isTheoryCompleted(p)) return topic
  }
  return null
}

function isCriticalZone(zone: AttentionZone): boolean {
  return zone.errorCount >= CRITICAL_ZONE_ERROR_COUNT
}

function pickCriticalZone(zones: AttentionZone[]): AttentionZone | null {
  const critical = zones.filter(isCriticalZone)
  if (critical.length === 0) return null
  critical.sort((a, b) => b.score - a.score || b.errorCount - a.errorCount)
  return critical[0] ?? null
}

function lessonIdsOf(rec: MyPlanRecommendation): string[] {
  const a = rec.action
  if (a.kind === 'resume_lesson' || a.kind === 'open_lesson') return [a.lessonId]
  if (a.kind === 'start_practice') return [a.lessonId]
  if (a.kind === 'reinforce_skill' && a.lessonId) return [a.lessonId]
  return []
}

function skillIdsOf(rec: MyPlanRecommendation): string[] {
  if (rec.action.kind === 'reinforce_skill') return [rec.action.skillTagId]
  return []
}

function buildIncomplete(
  incomplete: MyPlanLessonProgressSlice,
  audience: MyPlanAudience
): MyPlanRecommendation {
  const title = incomplete.topic?.trim() || `Урок ${incomplete.lessonId}`
  return {
    id: 'continue-lesson',
    priority: 1,
    goalType: 'incomplete',
    title: myPlanTitleIncomplete(title, audience),
    subtitle: '',
    reasonLine: myPlanWhy('incomplete', audience),
    action: { kind: 'resume_lesson', lessonId: incomplete.lessonId },
    buttonLabel: myPlanButton('incomplete', audience),
    ariaLabel: `${myPlanButton('incomplete', audience)}: ${title}`,
    timeLabel: myPlanTimeLabel('short', audience),
  }
}

function buildReinforce(
  zone: AttentionZone,
  input: MyPlanInput,
  audience: MyPlanAudience
): MyPlanRecommendation {
  const canAi = Boolean(input.canUseAiReinforce)
  const title = zone.title?.trim() || zone.skillTagId
  const generation = canAi && zone.lessonId ? 'ai' : 'local'
  const buttonKind = generation === 'ai' ? 'reinforce_ai' : 'reinforce_local'

  if (zone.lessonId) {
    const catalog = input.catalog.find((t) => t.id === zone.lessonId)
    if (catalog?.hasPractice || generation === 'ai') {
      return {
        id: `reinforce-${zone.skillTagId}`,
        priority: 2,
        goalType: 'reinforce',
        title: myPlanTitleReinforce(title, audience),
        subtitle: '',
        reasonLine: myPlanWhy('reinforce', audience),
        action: {
          kind: 'reinforce_skill',
          skillTagId: zone.skillTagId,
          lessonId: zone.lessonId,
          generation,
          entrySource: 'my_plan',
        },
        buttonLabel: myPlanButton(buttonKind, audience),
        ariaLabel: `${myPlanButton(buttonKind, audience)}: ${title}`,
        timeLabel: myPlanTimeLabel(generation === 'ai' ? 'medium' : 'short', audience),
      }
    }
    return {
      id: `reinforce-lesson-${zone.skillTagId}`,
      priority: 2,
      goalType: 'reinforce',
      title: myPlanTitleReinforce(title, audience),
      subtitle: '',
      reasonLine: myPlanWhy('reinforce', audience),
      action: { kind: 'open_lesson', lessonId: zone.lessonId },
      buttonLabel: myPlanButton('next', audience),
      ariaLabel: `${myPlanButton('next', audience)}: ${title}`,
      timeLabel: myPlanTimeLabel('medium', audience),
    }
  }

  // Zone without lessonId — never a dead CTA: quick practice
  return {
    id: `reinforce-quick-${zone.skillTagId}`,
    priority: 2,
    goalType: 'reinforce',
    title: myPlanTitleReinforce(title, audience),
    subtitle: '',
    reasonLine: myPlanWhy('reinforce', audience),
    action: { kind: 'quick_practice', entrySource: 'my_plan' },
    buttonLabel: myPlanButton('reinforce_local', audience),
    ariaLabel: `${myPlanButton('reinforce_local', audience)}: ${title}`,
    timeLabel: myPlanTimeLabel('short', audience),
  }
}

function buildPracticeAfterTheory(
  latestTheory: MyPlanLessonProgressSlice,
  audience: MyPlanAudience
): MyPlanRecommendation {
  const topic = latestTheory.topic?.trim() || `Урок ${latestTheory.lessonId}`
  return {
    id: 'practice-after-theory',
    priority: 3,
    goalType: 'practice_after_theory',
    title: myPlanTitlePractice(topic, audience),
    subtitle: '',
    reasonLine: myPlanWhy('practice_after_theory', audience),
    action: {
      kind: 'start_practice',
      lessonId: latestTheory.lessonId,
      mode: 'challenge',
      entrySource: 'my_plan',
    },
    buttonLabel: myPlanButton('practice_after_theory', audience),
    ariaLabel: `${myPlanButton('practice_after_theory', audience)}: ${topic}`,
    timeLabel: myPlanTimeLabel('medium', audience),
  }
}

function buildNextLesson(next: MyPlanCatalogTopic, audience: MyPlanAudience): MyPlanRecommendation {
  return {
    id: `next-lesson-${next.id}`,
    priority: 4,
    goalType: 'next_lesson',
    title: myPlanTitleNext(next.title, audience),
    subtitle: '',
    reasonLine: myPlanWhy('next', audience),
    action: { kind: 'open_lesson', lessonId: next.id },
    buttonLabel: myPlanButton('next', audience),
    ariaLabel: `${myPlanButton('next', audience)}: ${next.title}`,
    timeLabel: myPlanTimeLabel('medium', audience),
  }
}

function buildSoftReturn(audience: MyPlanAudience): MyPlanRecommendation {
  return {
    id: 'return-after-break',
    priority: 5,
    goalType: 'soft_return',
    title: audience === 'child' ? 'С возвращением' : 'С возвращением',
    subtitle: '',
    reasonLine: myPlanWhy('soft_return', audience),
    action: { kind: 'quick_practice', entrySource: 'my_plan' },
    buttonLabel: myPlanButton('soft_return', audience),
    ariaLabel: myPlanButton('soft_return', audience),
    timeLabel: myPlanTimeLabel('short', audience),
  }
}

function buildWeakSpot(
  spot: { id: string; label: string },
  audience: MyPlanAudience
): MyPlanRecommendation {
  const target: 'vocabulary' | 'practice' = spot.id === 'vocab-errors' ? 'vocabulary' : 'practice'
  return {
    id: `weak-${spot.id}`,
    priority: 6,
    goalType: 'weak_spot',
    title: audience === 'child' ? `Повторим «${spot.label}»` : `Закрепить: ${spot.label}`,
    subtitle: '',
    reasonLine: myPlanWhy('reinforce', audience),
    action: { kind: 'weak_spot', spotId: spot.id, target },
    buttonLabel: myPlanButton('reinforce_local', audience),
    ariaLabel: myPlanButton('reinforce_local', audience),
    timeLabel: myPlanTimeLabel('short', audience),
  }
}

function collectCandidates(input: MyPlanInput, nowMs: number): MyPlanRecommendation[] {
  const audience = audienceOf(input)
  const zones = input.attentionZones ?? []
  const out: MyPlanRecommendation[] = []

  const incomplete = pickIncompleteLesson(input)
  const critical = pickCriticalZone(zones)
  const incompleteFreshWins =
    incomplete != null && !(isIncompleteStale(incomplete, nowMs) && critical != null)

  if (incomplete && incompleteFreshWins) {
    out.push(buildIncomplete(incomplete, audience))
  }

  if (critical) {
    out.push(buildReinforce(critical, input, audience))
  } else if (incomplete && !incompleteFreshWins) {
    // stale incomplete without critical — still show incomplete as candidate
    out.push(buildIncomplete(incomplete, audience))
  }

  const latestTheory = pickLatestCompletedTheory(input)
  const latestCatalog = latestTheory ? input.catalog.find((t) => t.id === latestTheory.lessonId) : null
  if (latestTheory && latestCatalog?.hasPractice) {
    const topicCupDone =
      featureFlags.practiceTopicCupsV1 && getPracticeTopicProgress(latestTheory.lessonId).cupClaimed
    if (!topicCupDone && !hasPracticeAfterTheory(input, latestTheory.lessonId, latestTheory.lastCompleted)) {
      out.push(buildPracticeAfterTheory(latestTheory, audience))
    }
  }

  const next = pickNextLessonInProgram(input)
  if (next) out.push(buildNextLesson(next, audience))

  const days = input.daysSinceLastActive
  if (days != null && days >= SOFT_RETURN_DAYS) {
    out.push(buildSoftReturn(audience))
  }

  const spot = input.weakSpots[0]
  if (spot) out.push(buildWeakSpot(spot, audience))

  // Non-critical zones as lower candidates (for secondary), skip if already critical used
  for (const zone of zones) {
    if (critical && zone.skillTagId === critical.skillTagId) continue
    if (zone.errorCount < 2) continue
    out.push({
      ...buildReinforce(zone, input, audience),
      id: `review-${zone.skillTagId}`,
      priority: 7,
    })
  }

  return out.sort((a, b) => a.priority - b.priority)
}

function dedupeSecondary(
  main: MyPlanRecommendation | null,
  candidates: MyPlanRecommendation[]
): MyPlanRecommendation[] {
  const usedLessons = new Set(main ? lessonIdsOf(main) : [])
  const usedSkills = new Set(main ? skillIdsOf(main) : [])
  const usedIds = new Set(main ? [main.id] : [])
  const secondary: MyPlanRecommendation[] = []

  for (const rec of candidates) {
    if (secondary.length >= MAX_SECONDARY) break
    if (usedIds.has(rec.id)) continue
    const lessons = lessonIdsOf(rec)
    const skills = skillIdsOf(rec)
    if (lessons.some((id) => usedLessons.has(id))) continue
    if (skills.some((id) => usedSkills.has(id))) continue
    secondary.push(rec)
    usedIds.add(rec.id)
    for (const id of lessons) usedLessons.add(id)
    for (const id of skills) usedSkills.add(id)
  }
  return secondary
}

/**
 * Единый ранкер «что делать сейчас»: 1 main + ≤2 secondary + status.
 */
export function selectNowGoal(input: MyPlanInput): NowGoalResult {
  const nowMs = input.nowMs ?? Date.now()
  const candidates = collectCandidates(input, nowMs)
  const mainTask = candidates[0] ?? null
  const secondary = dedupeSecondary(mainTask, candidates.slice(1))

  return {
    mainTask,
    secondary,
    status: {
      dailyStreak: input.rewards.dailyStreak,
      level: input.rewards.level ?? 1,
      totalXP: input.rewards.totalXP ?? 0,
    },
  }
}

/** Совместимость: плоский топ-3 из selectNowGoal. */
export function getMyPlanRecommendations(
  input: MyPlanInput,
  _options?: { occupiedLessonIds?: string[] }
): MyPlanRecommendation[] {
  const { mainTask, secondary } = selectNowGoal(input)
  const list = [...(mainTask ? [mainTask] : []), ...secondary]
  return list.slice(0, 3)
}

export type { NowGoalType }
