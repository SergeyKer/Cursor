import type { Exercise } from '@/types/lesson'

export type VariantInfo = {
  current: number
  total: number
}

export function getVariantInfo(exercise?: Exercise | null): VariantInfo | null {
  const total = exercise?.variants?.length ?? 0
  if (total <= 1) return null

  return {
    current: (exercise?.currentVariantIndex ?? 0) + 1,
    total,
  }
}

export function getLessonRepeatFooterMessage(
  stepNumber?: number | null,
  variantInfo?: VariantInfo | null
): string | null {
  if (!variantInfo || (stepNumber !== 3 && stepNumber !== 4)) return null

  return variantInfo.current >= variantInfo.total
    ? `Последний рывок! (${variantInfo.current} из ${variantInfo.total}) 🎯`
    : `Ещё одно! (${variantInfo.current} из ${variantInfo.total}) 🔥`
}
