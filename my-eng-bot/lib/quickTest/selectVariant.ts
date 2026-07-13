import type { QuickTestProgressState } from '@/lib/quickTest/types'
import { getQuickTestBankBySlug } from '@/lib/quickTest/catalog'

export const DEFAULT_VARIANT_ID = 'variant-1'

export function selectVariantId(input: {
  slug: string
  completedVariantIds: string[]
  requestedVariantId?: string | null
  /** Прямой deep link без query — всегда стабильный variant-1. */
  forceDefault?: boolean
}): string {
  const bank = getQuickTestBankBySlug(input.slug)
  if (!bank || bank.variants.length === 0) return DEFAULT_VARIANT_ID

  if (input.forceDefault) return DEFAULT_VARIANT_ID

  if (input.requestedVariantId) {
    const exists = bank.variants.some((v) => v.id === input.requestedVariantId)
    if (exists) return input.requestedVariantId
  }

  const completed = new Set(input.completedVariantIds)
  const next = bank.variants.find((v) => !completed.has(v.id))
  return next?.id ?? DEFAULT_VARIANT_ID
}

export function getCompletedVariantIds(
  progress: QuickTestProgressState,
  lessonId: string
): string[] {
  return progress.byLessonId[lessonId]?.completedVariantIds ?? []
}

export function markVariantCompleted(
  progress: QuickTestProgressState,
  lessonId: string,
  variantId: string
): QuickTestProgressState {
  const prev = progress.byLessonId[lessonId]?.completedVariantIds ?? []
  if (prev.includes(variantId)) return progress
  return {
    byLessonId: {
      ...progress.byLessonId,
      [lessonId]: { completedVariantIds: [...prev, variantId] },
    },
  }
}

export function hasAnotherVariant(slug: string, completedVariantIds: string[], currentVariantId: string): string | null {
  const bank = getQuickTestBankBySlug(slug)
  if (!bank) return null
  const completed = new Set([...completedVariantIds, currentVariantId])
  const next = bank.variants.find((v) => !completed.has(v.id))
  return next?.id ?? null
}
