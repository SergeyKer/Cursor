import type { AttentionZone } from '@/lib/learningMemory/types'

export type ProgressCtaVariant = 'launch' | 'expand' | 'action'

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

/** Повторить по зоне → практика; иначе Мой план. */
export function mapAttentionZoneToTarget(zone: AttentionZone): ProgressLaunchTarget {
  if (zone.lessonId && zone.chipActive) {
    return { kind: 'practice', lessonId: zone.lessonId, mode: 'balanced' }
  }
  return { kind: 'my_plan' }
}
