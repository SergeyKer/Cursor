/**
 * Current/next drill axis для dialogue tense=`all`.
 */

import {
  buildTranslationAnyAxisPromptRules,
  resolveTranslationAnyAxes,
  type TranslationAnyAxesResult,
} from '@/lib/translationAnyAxis'
import type { AnyDrillAxis } from '@/lib/anyTensePool'

export type DialogueAnyAxesResult = TranslationAnyAxesResult

/** Same two-phase current/next resolver as translation. */
export const resolveDialogueAnyAxes = resolveTranslationAnyAxes

/** Dual rules: Повтори/grade = current; next English question = next. */
export function buildDialogueAnyAxisPromptRules(params: {
  current: AnyDrillAxis
  next: AnyDrillAxis
  tenseLabel: (id: string) => string
}): string {
  const curT = params.tenseLabel(params.current.tense)
  const nextT = params.tenseLabel(params.next.tense)
  return [
    '\n\nANY-TENSE DIALOGUE AXIS (strict):',
    `Current question axis (Комментарий / Повтори / grading the learner answer): Required tense=${curT}; CEFR=${params.current.effectiveLevel}; sentence type=${params.current.effectiveSentenceType}.`,
    `Next question axis (CORRECT answers only — the single next English question): Required tense=${nextT}; CEFR=${params.next.effectiveLevel}; sentence type=${params.next.effectiveSentenceType}.`,
    'WRONG or content-gap: output ONLY "Комментарий:" + "Повтори:" in the CURRENT axis tense. Do NOT ask a next question. Do NOT use the next-axis tense in Повтори.',
    'CORRECT: output ONLY the next English question in the NEXT axis tense (no Комментарий, no Повтори). Do not reuse the current-axis tense for that next question when the pool has another option.',
    'This dual-axis rule overrides any "ONLY one tense in all your sentences" instruction for the next-question line on CORRECT turns.',
  ].join(' ')
}

/** True when the reply advances to a new question (not Повтори/Комментарий freeze). */
export function detectDialogueAdvancedToNextDrill(content: string): boolean {
  const text = content.trim()
  if (!text) return false
  if (/(^|\n)\s*Повтори\s*:/i.test(text)) return false
  if (/(^|\n)\s*Комментарий\s*:/i.test(text)) return false
  return /\?/.test(text)
}

/** Keep translation helper name available for shared tests without duplicate logic. */
export { buildTranslationAnyAxisPromptRules }
