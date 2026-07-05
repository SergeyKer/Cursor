import { filterByChoiceGranularity, inferChoiceGranularity } from '@/lib/practice/choiceOptionGranularity'
import {
  inferGapWordSlot,
  isOptionCompatibleWithSlot,
  type GapWordSlot,
} from '@/lib/practice/gapWordSlot'

export type SanitizeCanonicalOptionsParams = {
  options: string[]
  targetAnswer: string
  prompt?: string
  granularity?: ReturnType<typeof inferChoiceGranularity>
}

export function sanitizeCanonicalOptions(params: SanitizeCanonicalOptionsParams): string[] | null {
  const { options, targetAnswer, prompt } = params
  if (!options || options.length < 2) return null

  const granularity =
    params.granularity ??
    inferChoiceGranularity({
      targetAnswer,
      prompt,
    })

  const filtered = filterByChoiceGranularity(options, granularity)
  if (filtered.length < 2) return null

  if (granularity !== 'word') return filtered

  const slot: GapWordSlot = inferGapWordSlot({ targetAnswer, prompt })
  const compatible = filtered.filter((item) => isOptionCompatibleWithSlot(item, slot, targetAnswer))
  if (compatible.length < 2) return null
  if (compatible.length !== filtered.length) return null
  return compatible
}
