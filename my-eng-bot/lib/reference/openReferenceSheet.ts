import { resolveReferenceTarget } from '@/lib/reference/resolveReferenceTarget'
import type { ReferenceSheet } from '@/lib/reference/types'
import { trackReferenceEvent } from '@/lib/reference/analytics'

export type OpenReferenceSheetInput = {
  lessonId?: string | null
  topicKey?: string | null
  runtimeSheet?: ReferenceSheet | null
}

export type OpenReferenceSheetResolved =
  | { kind: 'lesson'; lessonId: string; sheet: ReferenceSheet }
  | { kind: 'runtime'; sheet: ReferenceSheet }
  | { kind: 'prebuilt'; sheet: ReferenceSheet; topicKey: string }
  | { kind: 'missing' }

/**
 * Thin wrapper: open-path resolve (no generate).
 * Generate/reject live in resolveReferenceTarget.
 */
export function resolveOpenReferenceSheet(
  input: OpenReferenceSheetInput
): OpenReferenceSheetResolved {
  const r = resolveReferenceTarget(input)
  if (r.kind === 'runtime') return r
  if (r.kind === 'lesson') {
    trackReferenceEvent('reference_local_hit', { lessonId: r.lessonId })
    return r
  }
  if (r.kind === 'prebuilt') {
    trackReferenceEvent('reference_prebuilt_hit', { topicKey: r.topicKey })
    return r
  }
  if (r.kind === 'reject') {
    trackReferenceEvent('reference_reject', { reason: r.reason })
  }
  return { kind: 'missing' }
}
