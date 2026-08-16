import { MAX_ATTENTION_ZONES, type AttentionZone } from '@/lib/learningMemory/types'

/** Витрина Прогресс = тот же топ, что ранкер. Не второй скорер. */
export const PROGRESS_SCREEN_ZONE_LIMIT = MAX_ATTENTION_ZONES

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
  | { kind: 'translation' }
  | { kind: 'dialogue' }
  | { kind: 'tutor' }
  | { kind: 'pronunciation' }

/** Закрепить: репетитор / практика / Мой план. Не второй ранкер. */
export function mapAttentionZoneToTarget(zone: AttentionZone): ProgressLaunchTarget {
  if (zone.sourceHint.includes('репетитор')) {
    return { kind: 'tutor' }
  }
  if (zone.lessonId && zone.chipActive) {
    return { kind: 'practice', lessonId: zone.lessonId, mode: 'balanced' }
  }
  return { kind: 'my_plan' }
}
