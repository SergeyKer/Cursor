import type { SentenceType } from '@/lib/types'
import {
  isTranslationNextRussianMetaInstruction,
  stripWrappingQuotesFromDrillRussianLine,
} from '@/lib/extractSingleTranslationNextSentence'
import {
  fallbackTranslationSentenceForContext,
  normalizeDrillRuSentenceForSentenceType,
} from '@/lib/translationMode'
import { extractRussianTranslationTaskFromAssistantContent } from '@/lib/translationPromptAndRef'

export type TranslationFirstTurnFailReason =
  | 'missing_ru_task'
  | 'missing_english_invite'
  | 'multiple_ru_sentences'
  | 'ru_task_meta_only'
  | 'extra_lines_after_invite'

function isStandaloneTranslationIntroSentence(sentence: string): boolean {
  const normalized = sentence.replace(/\s+/g, ' ').trim().replace(/[.!?…]+$/g, '').trim()
  return /^(?:Теперь|А теперь|Следующее предложение|Далее|Переведи далее)$/i.test(normalized)
}

/** Дробит русское drill-тело на самостоятельные предложения (эвристика по . ! ?). */
export function splitRussianDrillSentenceUnits(ru: string): string[] {
  const base = stripWrappingQuotesFromDrillRussianLine(ru.replace(/\s+/g, ' ').trim())
  if (!base || !/[А-Яа-яЁё]/.test(base)) return []
  return base
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !isStandaloneTranslationIntroSentence(s))
    .filter((s) => /[А-Яа-яЁё]/.test(s))
}

/**
 * Проверяет контракт первого хода перевода после `ensureFirstTranslationInvitation`:
 * одно RU-предложение + строка-приглашение «Переведи на английский…».
 */
export function validateTranslationFirstTurnPostInvite(content: string): TranslationFirstTurnFailReason[] {
  const reasons: TranslationFirstTurnFailReason[] = []
  const trimmed = content.trim()
  if (!trimmed) {
    reasons.push('missing_ru_task')
    return reasons
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim())
    .filter(Boolean)

  if (lines.length > 2) {
    reasons.push('extra_lines_after_invite')
  }

  const hasInvite = /(?:^|\n)\s*(?:[\s\-•]*(?:\d+[\.)]\s*)*)?Переведи\s+на\s+английск/i.test(trimmed)
  if (!hasInvite) {
    reasons.push('missing_english_invite')
  }

  const ru = extractRussianTranslationTaskFromAssistantContent(trimmed)
  if (!ru?.trim() || !/[А-Яа-яЁё]/.test(ru)) {
    reasons.push('missing_ru_task')
    return reasons
  }

  const ruBody = stripWrappingQuotesFromDrillRussianLine(ru.trim())
  if (isTranslationNextRussianMetaInstruction(ruBody)) {
    reasons.push('ru_task_meta_only')
  }

  const units = splitRussianDrillSentenceUnits(ru)
  if (units.length === 0) {
    reasons.push('missing_ru_task')
  } else if (units.length > 1) {
    reasons.push('multiple_ru_sentences')
  }

  return reasons
}

export type TranslationFirstTurnContractParams = {
  content: string
  topic: string
  tense: string
  level: string
  audience: 'child' | 'adult'
  sentenceType: SentenceType
  seedText: string
}

export type TranslationFirstTurnContractResult = {
  content: string
  replaced: boolean
  reasons: TranslationFirstTurnFailReason[]
}

/**
 * Если контракт нарушен — подставляет детерминированный RU drill из `fallbackTranslationSentenceForContext`
 * (без дополнительного вызова LLM).
 */
export function applyTranslationFirstTurnContractGuard(
  params: TranslationFirstTurnContractParams
): TranslationFirstTurnContractResult {
  const reasons = validateTranslationFirstTurnPostInvite(params.content)
  if (reasons.length === 0) {
    return { content: params.content, replaced: false, reasons: [] }
  }

  const ru = fallbackTranslationSentenceForContext({
    topic: params.topic,
    tense: params.tense,
    level: params.level,
    audience: params.audience,
    seedText: `${params.seedText}|first-turn-guard|${reasons.join(',')}`,
    sentenceType: params.sentenceType,
  })
  const normalized = normalizeDrillRuSentenceForSentenceType(ru, params.sentenceType)
  return {
    content: `${normalized}\nПереведи на английский язык.`,
    replaced: true,
    reasons,
  }
}

/** Обёртка с логированием для маршрута чата. */
export function runTranslationFirstTurnContractGuard(params: TranslationFirstTurnContractParams): string {
  const r = applyTranslationFirstTurnContractGuard(params)
  if (r.replaced) {
    console.info('[chat][translation-first-turn-guard]', { reasons: r.reasons })
  }
  return r.content
}
