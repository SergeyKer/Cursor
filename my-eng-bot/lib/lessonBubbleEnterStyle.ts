import type { CSSProperties } from 'react'
import { LESSON_CARD_ENTER_MS } from '@/lib/lessonRevealTiming'

export type DetachedEnterMode = 'default' | 'reading'

/** Reading: no both+delay hide. Default: legacy staggered fill styles. */
export function resolveDetachedSectionEnterStyle(params: {
  enterMode: DetachedEnterMode
  shouldAnimate: boolean
  useStaggeredReveal: boolean
  bubbleIndex: number
}): CSSProperties | undefined {
  if (!params.shouldAnimate) return undefined
  if (params.enterMode === 'reading') return undefined
  return {
    animationDelay: params.useStaggeredReveal ? '0ms' : `${params.bubbleIndex * 80}ms`,
    animationDuration: params.useStaggeredReveal ? `${LESSON_CARD_ENTER_MS}ms` : undefined,
    animationFillMode: 'both',
  }
}
