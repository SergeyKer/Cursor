import {
  extractCanonicalRepeatRefEnglishFromContent,
  extractLocalGoldEnglishForVerdict,
  TRAN_CANONICAL_REPEAT_REF_MARKER,
} from '@/lib/translationPromptAndRef'
import { clampTranslationRepeatToRuPrompt } from '@/lib/translationRepeatClamp'

/** Пробуем не вызывать отдельный gold-LLM: ref из ответа модели или из «Скажи:». */
export function isTranslationSinglePassGoldEnabled(): boolean {
  const v = process.env.TRANSLATION_SINGLE_PASS_GOLD
  if (v === undefined || v === '') return true
  return v !== '0' && v !== 'false' && v !== 'no'
}

/** Если нет ref после single-pass — вызывать translateRussianPromptToGoldEnglish. */
export function isTranslationGoldApiFallbackEnabled(): boolean {
  const v = process.env.TRANSLATION_GOLD_API_FALLBACK
  if (v === undefined || v === '') return true
  return v !== '0' && v !== 'false' && v !== 'no'
}

/** Строгий reference-first для режима перевода: при включении не ослабляем вердикт эвристиками UI. */
export function isTranslationStrictReferenceFirstEnabled(): boolean {
  const v = process.env.TRANSLATION_STRICT_REFERENCE_FIRST
  if (v === undefined || v === '') return true
  return v !== '0' && v !== 'false' && v !== 'no'
}

/**
 * После пересборки SUCCESS-блока вернуть скрытый __TRAN__, если модель уже выдала его в сыром ответе.
 */
export function appendPreservedHiddenRefFromOriginal(
  rebuiltAssistantText: string,
  originalModelContent: string,
  ruPrompt: string | null
): string {
  const ru = ruPrompt?.trim() ?? ''
  if (!ru) return rebuiltAssistantText
  if (rebuiltAssistantText.includes(`${TRAN_CANONICAL_REPEAT_REF_MARKER}:`)) return rebuiltAssistantText
  const rawRef = extractCanonicalRepeatRefEnglishFromContent(originalModelContent)
  if (!rawRef?.trim()) return rebuiltAssistantText
  const { clamped } = clampTranslationRepeatToRuPrompt(rawRef.trim(), ru)
  const line = (clamped?.trim() || rawRef.trim()) || ''
  if (!line) return rebuiltAssistantText
  return `${rebuiltAssistantText.trim()}\n${TRAN_CANONICAL_REPEAT_REF_MARKER}: ${line}`
}

/**
 * Дописать __TRAN__ из скрытой строки (если парсер её нашёл) или из «Скажи:», если маркера ещё нет.
 */
export function appendHiddenRefFromVisibleCue(assistantText: string, ruPrompt: string | null): string {
  const ru = ruPrompt?.trim() ?? ''
  if (!ru) return assistantText
  if (assistantText.includes(`${TRAN_CANONICAL_REPEAT_REF_MARKER}:`)) return assistantText
  const fromCue = extractLocalGoldEnglishForVerdict(assistantText, ru)
  if (!fromCue?.trim()) return assistantText
  const { clamped } = clampTranslationRepeatToRuPrompt(fromCue.trim(), ru)
  const line = (clamped?.trim() || fromCue.trim()) || ''
  if (!line) return assistantText
  return `${assistantText.trim()}\n${TRAN_CANONICAL_REPEAT_REF_MARKER}: ${line}`
}
