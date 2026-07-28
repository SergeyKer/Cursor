import type { MyPlanAction } from '@/lib/myPlan/types'
import type { TutorCardSource, TutorCardViewModel } from '@/lib/tutor/types'
import { asRecord, compactText } from '@/lib/tutor/text'

/**
 * Stub builder for MyPlan tutor-card action (Phase 0 types only).
 * Does not select zones or call AI — Phase 4.
 */
export function buildOpenTutorAction(params: {
  prefill: string
  source: TutorCardSource
  skillTagId?: string
}): Extract<MyPlanAction, { kind: 'open_tutor' }> | null {
  const prefill = compactText(params.prefill, 280)
  if (!prefill) return null
  const skillTagId = compactText(params.skillTagId, 64) || undefined
  return {
    kind: 'open_tutor',
    prefill,
    source: params.source,
    ...(skillTagId ? { skillTagId } : {}),
  }
}

export function normalizeTutorCardViewModel(input: unknown): TutorCardViewModel | null {
  const row = asRecord(input)
  if (!row) return null
  const title = compactText(row.title, 120)
  const reason = compactText(row.reason, 200)
  const buttonLabel = compactText(row.buttonLabel, 40)
  const prefill = compactText(row.prefill, 280)
  const sourceRaw = compactText(row.source, 32)
  const source: TutorCardSource | null =
    sourceRaw === 'error_prompt' || sourceRaw === 'curiosity' ? sourceRaw : null
  if (!title || !reason || !buttonLabel || !prefill || !source) return null
  const skillTagId = compactText(row.skillTagId, 64) || undefined
  return {
    title,
    reason,
    buttonLabel,
    prefill,
    source,
    ...(skillTagId ? { skillTagId } : {}),
  }
}
