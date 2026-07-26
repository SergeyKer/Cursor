import { normalizeEnglishForRepeatMatch } from '@/lib/normalizeEnglishForRepeatMatch'
import {
  buildDeterministicTranslationSupportRu,
  isSafePreservedTranslationSupportBody,
} from '@/lib/translationSupportFallback'

export type TranslationClauseShape = 'question' | 'negative' | 'declarative'

export function detectEnglishClauseShape(text: string | null | undefined): TranslationClauseShape | null {
  const raw = String(text ?? '').trim()
  if (!raw) return null
  const normalized = normalizeEnglishForRepeatMatch(raw)
  if (!normalized) return null

  if (/\?\s*$/.test(raw) || isLikelyEnglishQuestionNormalized(normalized)) {
    return 'question'
  }
  if (isLikelyEnglishNegativeNormalized(normalized, raw)) {
    return 'negative'
  }
  return 'declarative'
}

function isLikelyEnglishQuestionNormalized(normalized: string): boolean {
  return /^(what|when|where|why|how|who|which|whose|do|does|did|is|are|am|was|were|have|has|had|will|would|can|could|should|may|might|must)\b/i.test(
    normalized
  )
}

function isLikelyEnglishNegativeNormalized(normalized: string, raw: string): boolean {
  if (
    /\b(?:not|don't|doesn't|didn't|won't|can't|isn't|aren't|wasn't|weren't|haven't|hasn't|hadn't)\b/i.test(
      normalized
    )
  ) {
    return true
  }
  // Expanded / curly-apostrophe surfaces that normalize may leave as "do not".
  if (/\b(?:do|does|did|is|are|was|were|have|has|had|will|can)\s+not\b/i.test(normalized)) {
    return true
  }
  if (/\b\w+n't\b/i.test(raw) || /\b\w+n’t\b/i.test(raw)) {
    return true
  }
  return false
}

export function detectRussianClauseShape(prompt: string | null | undefined): TranslationClauseShape | null {
  const compact = String(prompt ?? '').replace(/\s+/g, ' ').trim().toLowerCase()
  if (!compact) return null
  if (compact.endsWith('?')) return 'question'
  if (/(^|[\s(«"'])((?:не|никогда|ничего|никто|нигде))(?:$|[\s,.!?»"')])/i.test(compact)) {
    return 'negative'
  }
  return 'declarative'
}

export function shapesCompatible(
  userShape: TranslationClauseShape | null,
  goldShape: TranslationClauseShape | null
): boolean {
  if (!userShape || !goldShape) return true
  return userShape === goldShape
}

export function buildClauseShapeMismatchSupportRu(
  goldShape: TranslationClauseShape,
  audience: 'child' | 'adult'
): string {
  if (audience === 'child') {
    if (goldShape === 'negative') {
      return 'Неверно: тут нужно с отрицанием. Ниже подсказка и эталон.'
    }
    if (goldShape === 'question') {
      return 'Неверно: тут нужен вопрос. Ниже подсказка и эталон.'
    }
    return 'Неверно: тут нужно без отрицания и без вопроса. Ниже подсказка и эталон.'
  }
  if (goldShape === 'negative') {
    return 'Неверно: нужен отрицательный вариант. Ниже — что поправить и эталон.'
  }
  if (goldShape === 'question') {
    return 'Неверно: нужен вопрос. Ниже — что поправить и эталон.'
  }
  return 'Неверно: нужен утвердительный вариант. Ниже — что поправить и эталон.'
}

export function clauseShapeMismatchReasonRu(goldShape: TranslationClauseShape): string {
  if (goldShape === 'negative') return 'нужно отрицание'
  if (goldShape === 'question') return 'нужен вопрос'
  return 'нужно утверждение'
}

function buildNeutralTranslationSupport(audience: 'child' | 'adult'): string {
  return audience === 'child'
    ? 'Вижу, что ты стараешься. Сейчас спокойно поправим ключевой момент ниже.'
    : 'Вижу, что вы стараетесь. Сейчас спокойно поправим ключевой момент ниже.'
}

export function supportHasFalseStructurePraise(
  supportComment: string,
  targetShape: TranslationClauseShape | null
): boolean {
  if (!targetShape) return false
  const compact = supportComment.replace(/\s+/g, ' ').trim()
  if (!compact) return false

  const praiseCue =
    /(?:^|[.!?]\s*)(?:💡\s*)?(?:отлично|молодец|хорошо|верно|правильно|здорово|круто|хорошее начало|отличное начало|ты правильно|ты верно|вы правильно|вы верно|ты молодец|вы молодец)/i
  const explicitValidationCue =
    /(?:правильн\w*\s+(?:использовал|использовали|сделал|сделали|построил|построили)|хорош(?:ее|ий)\s+начал\w*|отличн(?:ое|ый)\s+начал\w*|верно\s+построил\w*)/i
  const hasPositiveSignal = praiseCue.test(compact) || explicitValidationCue.test(compact)
  if (!hasPositiveSignal) return false

  const questionPraise =
    /(?:для\s+вопроса|вопросительн\w+\s+форм\w*|question(?:\s+form)?|question word|вопрос\w*)/i
  const auxiliaryQuestionCue = /\b(?:do|does|did)\s+(?:i|you|we|they|he|she|it)\b/i
  const declarativePraise =
    /(?:утвердительн\w+\s+форм\w*|повествовательн\w+\s+форм\w*|declarative|statement)/i
  const affirmativePraise =
    /(?:positive wording|affirmative(?:\s+form)?|утвердительн\w+\s+форм\w*|без\s+отрицания)/i
  const negativePraise =
    /(?:negative(?:\s+form)?|negation|отрицани\w*\s+форм\w*|отрицательн\w*|с\s+отрицани\w*)/i
  const negationTokenPraise =
    /(?:использовал\w*|использовали|правильно\s+показывает|требуется).{0,40}\b(?:don't|doesn't|didn't|do\s+not|does\s+not|did\s+not|not)\b|(?:\b(?:don't|doesn't|didn't|not)\b).{0,40}(?:правильно|требуется|верно)/i

  if (targetShape !== 'question' && (questionPraise.test(compact) || auxiliaryQuestionCue.test(compact))) {
    return true
  }
  if (targetShape === 'question' && declarativePraise.test(compact)) return true
  if (targetShape === 'negative' && affirmativePraise.test(compact)) return true
  if (targetShape !== 'negative' && (negativePraise.test(compact) || negationTokenPraise.test(compact))) {
    return true
  }
  return false
}

function surfaceBreaksGoldShape(surface: string, goldShape: TranslationClauseShape): boolean {
  const surfaceShape = detectEnglishClauseShape(surface)
  if (!surfaceShape) return false
  if (goldShape === 'declarative' && surfaceShape !== 'declarative') return true
  if (goldShape === 'negative' && surfaceShape === 'declarative' && /\b(?:don't|doesn't|didn't|not)\b/i.test(surface)) {
    return false
  }
  // Praising a negation token when gold is not negative.
  if (goldShape !== 'negative' && /\b(?:don't|doesn't|didn't|won't|can't)\b/i.test(surface)) {
    return true
  }
  return false
}

/**
 * Единый арбитр текста «Комментарий_перевод» для ERROR-протокола.
 * Источник истины по типу — английский gold; RU — доп. проверка false praise.
 */
export function resolveTranslationErrorSupport(params: {
  modelSupport: string | null | undefined
  userText: string | null | undefined
  goldEnglish: string | null | undefined
  ruPrompt?: string | null
  audience: 'child' | 'adult'
}): string {
  const audience = params.audience
  const userText = params.userText?.trim() ?? ''
  const goldEnglish = params.goldEnglish?.trim() ?? ''
  const modelSupport = (params.modelSupport ?? '').replace(/^\s*💡\s*/u, '').trim()

  const userShape = detectEnglishClauseShape(userText)
  const goldShape = detectEnglishClauseShape(goldEnglish)

  if (userText && goldEnglish && goldShape && !shapesCompatible(userShape, goldShape)) {
    return buildClauseShapeMismatchSupportRu(goldShape, audience)
  }

  const ruShape = detectRussianClauseShape(params.ruPrompt)
  const praiseTarget = goldShape ?? ruShape

  if (modelSupport && isSafePreservedTranslationSupportBody(modelSupport)) {
    // Gold shape wins over RU: never keep praise that conflicts with gold.
    if (goldShape && supportHasFalseStructurePraise(modelSupport, goldShape)) {
      return buildNeutralTranslationSupport(audience)
    }
    if (!goldShape && supportHasFalseStructurePraise(modelSupport, praiseTarget)) {
      return buildNeutralTranslationSupport(audience)
    }
    return modelSupport
  }

  if (userText && goldEnglish) {
    const deterministic = buildDeterministicTranslationSupportRu(userText, goldEnglish, audience, 'generic')
    const surfaceMatch = /[«"]([^»"]+)[»"]/.exec(deterministic)
    const surface = surfaceMatch?.[1]?.trim() ?? ''
    if (goldShape && surface && surfaceBreaksGoldShape(surface, goldShape)) {
      return buildNeutralTranslationSupport(audience)
    }
    return deterministic
  }

  return buildNeutralTranslationSupport(audience)
}

/** Совместимы ли shapes user/gold (удобно для force incomplete-ветки). */
export function translationClauseShapesCompatible(
  userText: string | null | undefined,
  goldEnglish: string | null | undefined
): boolean {
  return shapesCompatible(detectEnglishClauseShape(userText), detectEnglishClauseShape(goldEnglish))
}
