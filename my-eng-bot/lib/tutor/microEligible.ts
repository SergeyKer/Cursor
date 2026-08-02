import type { TutorAnswerKind, TutorExplainAnswer, TutorMicroPack } from '@/lib/tutor/types'
import { TUTOR_MICRO_MIN_ITEMS } from '@/lib/tutor/types'

const STRONG_KINDS: ReadonlySet<TutorAnswerKind> = new Set([
  'grammar',
  'contrast',
  'form',
  'orthography',
])

/** Junk templates that must never ship in a micro pack. */
const JUNK_PROMPT_RE =
  /тема\s+сейчас|верно\s+ли\s+это\s+правило|мы\s+говорили\s+про|это\s+правило\s+про\s+другое\s+время/i

export function isMicroAnswerKindEligible(kind: TutorAnswerKind): boolean {
  return STRONG_KINDS.has(kind)
}

export function isJunkMicroPrompt(promptRu: string): boolean {
  return JUNK_PROMPT_RE.test(promptRu)
}

/**
 * Post-normalize gate: pack is safe to show as «Закрепить».
 * Prefer hide over junk.
 */
export function isTutorMicroPackEligible(
  pack: TutorMicroPack,
  answer: TutorExplainAnswer
): boolean {
  if (pack.items.length < TUTOR_MICRO_MIN_ITEMS) return false
  if (!pack.summaryRu.trim()) return false

  for (const item of pack.items) {
    if (isJunkMicroPrompt(item.promptRu)) return false
    if (item.options.length < 2) return false
    if (item.correctIndex < 0 || item.correctIndex >= item.options.length) return false
  }

  if (isMicroAnswerKindEligible(answer.answerKind)) return true

  // Weak kinds only if pack clearly drills form/example choice from Explain.
  return pack.items.some((item) => item.kind === 'pick_side' || item.kind === 'best_fit')
}

/**
 * Chip visibility (product): LLM flag + strong answerKind only.
 * localPack ignored — no local micro in product path.
 */
export function canOfferTutorMicro(
  answer: TutorExplainAnswer,
  opts?: {
    llmEnabled?: boolean
    /** @deprecated Ignored. Kept for call-site compat during migration. */
    localPack?: TutorMicroPack | null
  }
): boolean {
  if (opts?.llmEnabled && isMicroAnswerKindEligible(answer.answerKind)) return true
  return false
}
