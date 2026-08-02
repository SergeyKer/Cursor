import type { TutorExplainAnswer } from '@/lib/tutor/types'

/** Hand-authored local Explain for golden-path FAQ → sheet (no API). */
export type LocalExplainPack = {
  id: string
  /** FAQ pool ids that resolve to this pack. */
  faqIds: readonly string[]
  /** Extra exact/alias match strings (normalized at lookup). */
  matchQueries?: readonly string[]
  /** Adult answer body; child may fall back to adult for Wave0. */
  answer: TutorExplainAnswer
}
