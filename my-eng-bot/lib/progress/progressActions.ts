import type { AttentionZone } from '@/lib/learningMemory/types'
import { featureFlags } from '@/lib/featureFlags'
import { buildMyPlanLiveInput } from '@/lib/myPlan/buildInput'
import { getMyPlanRecommendations, selectNowGoal } from '@/lib/myPlan/selectNowGoal'
import type { MyPlanAction, MyPlanRecommendation } from '@/lib/myPlan/types'
import type { RewardsState } from '@/lib/rewardsState'
import type { Settings } from '@/lib/types'

export type ProgressCtaVariant = 'launch' | 'action'

export type ProgressDetailKind = 'awards' | 'calendar' | 'remarks'

export type ProgressLaunchTarget =
  | { kind: 'my_plan' }
  | { kind: 'detail'; detail: ProgressDetailKind }
  | { kind: 'practice'; lessonId: string; mode: 'relaxed' | 'balanced' | 'challenge' }
  | { kind: 'lesson'; lessonId: string }
  | { kind: 'reference'; lessonId: string }
  | { kind: 'communication' }
  | { kind: 'engvo' }
  | { kind: 'vocabulary' }
  | { kind: 'quick_practice' }

export type ProgressNowCta = {
  variant: ProgressCtaVariant
  label: string
  ariaLabel: string
  target: ProgressLaunchTarget
  mainTaskId: string | null
  actionKind: string | null
}

export function mapMyPlanActionToTarget(action: MyPlanAction): ProgressLaunchTarget | null {
  switch (action.kind) {
    case 'resume_lesson':
    case 'open_lesson':
      return { kind: 'lesson', lessonId: action.lessonId }
    case 'open_reference':
      return { kind: 'reference', lessonId: action.lessonId }
    case 'start_practice':
      return { kind: 'practice', lessonId: action.lessonId, mode: action.mode }
    case 'reinforce_skill':
      if (action.lessonId) {
        return { kind: 'practice', lessonId: action.lessonId, mode: 'balanced' }
      }
      return { kind: 'quick_practice' }
    case 'quick_practice':
      return { kind: 'quick_practice' }
    case 'weak_spot':
      if (action.target === 'vocabulary') return { kind: 'vocabulary' }
      return { kind: 'quick_practice' }
    default:
      return null
  }
}

export function buildProgressNowCta(
  mainTask: MyPlanRecommendation | null,
  openMyPlanLabel: string,
  openMyPlanAria: string,
  programTask?: MyPlanRecommendation | null
): ProgressNowCta {
  const task = mainTask ?? programTask ?? null
  if (!task) {
    return {
      variant: 'action',
      label: openMyPlanLabel,
      ariaLabel: openMyPlanAria,
      target: { kind: 'my_plan' },
      mainTaskId: null,
      actionKind: null,
    }
  }

  const target = mapMyPlanActionToTarget(task.action)
  if (!target) {
    return {
      variant: 'action',
      label: openMyPlanLabel,
      ariaLabel: openMyPlanAria,
      target: { kind: 'my_plan' },
      mainTaskId: task.id,
      actionKind: task.action.kind,
    }
  }

  return {
    variant: 'launch',
    label: task.buttonLabel,
    ariaLabel: task.ariaLabel,
    target,
    mainTaskId: task.id,
    actionKind: task.action.kind,
  }
}

/** Повторить по зоне → практика; иначе Мой план. */
export function mapAttentionZoneToTarget(zone: AttentionZone): ProgressLaunchTarget {
  if (zone.lessonId && zone.chipActive) {
    return { kind: 'practice', lessonId: zone.lessonId, mode: 'balanced' }
  }
  return { kind: 'my_plan' }
}

export function buildProgressMyPlanSnapshot(
  settings: Settings,
  rewardsState: RewardsState | undefined,
  extras?: {
    attentionZones?: AttentionZone[]
    canUseAiReinforce?: boolean
  }
) {
  const input = buildMyPlanLiveInput(settings, rewardsState ?? null, extras)
  if (!featureFlags.myPlanNowGoalV1) {
    const flat = getMyPlanRecommendations(input)
    return {
      mainTask: flat[0] ?? null,
      secondary: flat.slice(1),
      programTask: null,
      programStatus: 'no_catalog' as const,
      input,
    }
  }
  const now = selectNowGoal(input)
  return {
    mainTask: now.mainTask,
    secondary: now.secondary,
    programTask: now.programStatus === 'active' ? now.programTask : null,
    programStatus: now.programStatus,
    input,
  }
}
