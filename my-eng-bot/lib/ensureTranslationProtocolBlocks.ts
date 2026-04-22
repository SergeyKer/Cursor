import {
  stripTranslationCommentLabel,
} from '@/lib/translationCommentCoach'
import { buildDeterministicTranslationSupportRu } from '@/lib/translationSupportFallback'
import { stripLeadingRepeatRuPrompt } from '@/lib/translationProtocolLines'
import { normalizeRepeatSentenceEnding } from '@/lib/translationRepeatClamp'
import {
  dedupeTranslationPraiseParagraphs,
  extractTranslationErrorSynthAndPraiseFromComment,
  mergeErrorsBlockWithSyntheticFromComment,
  partitionEncouragementLinesFromTranslationErrorsPayload,
} from '@/lib/translationSyntheticErrorsBlock'
import { resolveTranslationProtocolStatusFromFields } from '@/lib/translationProtocolStatus'
import { normalizeSupportiveCommentForErrorsBlock } from '@/lib/normalizeSupportiveCommentForErrorsBlock'

type TranslationPromptKind = 'question' | 'negative' | 'declarative'

function detectTranslationPromptKind(prompt: string | null | undefined): TranslationPromptKind | null {
  const compact = String(prompt ?? '').replace(/\s+/g, ' ').trim().toLowerCase()
  if (!compact) return null
  if (compact.endsWith('?')) return 'question'
  if (/(^|[\s(«"'])((?:не|никогда|ничего|никто|нигде))(?:$|[\s,.!?»"')])/i.test(compact)) {
    return 'negative'
  }
  return 'declarative'
}

function buildNeutralTranslationSupport(audience: 'child' | 'adult'): string {
  return audience === 'child'
    ? 'Вижу, что ты стараешься. Давай спокойно поправим это ниже.'
    : 'Вижу, что вы стараетесь. Давайте спокойно поправим это ниже.'
}

function supportHasFalseStructurePraise(
  supportComment: string,
  promptKind: TranslationPromptKind | null
): boolean {
  if (!promptKind) return false
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
  const auxiliaryQuestionCue =
    /\b(?:do|does|did)\s+(?:i|you|we|they|he|she|it)\b/i
  const declarativePraise = /(?:утвердительн\w+\s+форм\w*|повествовательн\w+\s+форм\w*|declarative|statement)/i
  const affirmativePraise = /(?:positive wording|affirmative(?:\s+form)?|утвердительн\w+\s+форм\w*|без\s+отрицания)/i
  const negativePraise = /(?:negative(?:\s+form)?|negation|отрицани\w+\s+форм\w*|с\s+отрицани\w*)/i

  if (promptKind !== 'question' && (questionPraise.test(compact) || auxiliaryQuestionCue.test(compact))) {
    return true
  }
  if (promptKind === 'question' && declarativePraise.test(compact)) return true
  if (promptKind === 'negative' && affirmativePraise.test(compact)) return true
  if (promptKind !== 'negative' && negativePraise.test(compact)) return true
  return false
}

function sanitizeTranslationSupportAgainstPrompt(params: {
  supportComment: string
  fallbackPrompt: string | null
  audience: 'child' | 'adult'
}): string {
  const promptKind = detectTranslationPromptKind(params.fallbackPrompt)
  if (!supportHasFalseStructurePraise(params.supportComment, promptKind)) {
    return params.supportComment
  }
  return buildNeutralTranslationSupport(params.audience)
}

export function ensureTranslationProtocolBlocks(
  content: string,
  params: {
    tense: string
    topic: string
    level: string
    audience: 'child' | 'adult'
    fallbackPrompt: string | null
    /** Для серверного фолбэка «Комментарий_перевод:» при пустой поддержке модели. */
    userAnswerForSupportFallback?: string | null
    /** Если модель не вывела «Скажи:», подставить эталон (gold / prior ref). */
    repeatEnglishFallback?: string | null
  }
): string {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim())
    .filter(Boolean)

  let supportBlock: string | null = null
  let comment: string | null = null
  let errorsBlock: string | null = null
  let repeat: string | null = null
  let repeatRu: string | null = null
  let hasPraise = false
  let collectingErrors = false
  let collectingSupport = false
  let praiseFromErrorsPayload: string | null = null
  let skipUntilProtocolHeader = false

  const isProtocolHeaderAfterSupportOrErrors = (l: string) =>
    /^[\s\-•]*(?:\d+[\.)]\s*)*(Комментарий_перевод|Ошибки|Скажи|Say|Комментарий)\s*:/i.test(l) ||
    /^\s*(?:\d+\)\s*)?(?:Переведи|Переведите)(?=\s|:|$)/i.test(l)

  for (const line of lines) {
    if (skipUntilProtocolHeader) {
      if (isProtocolHeaderAfterSupportOrErrors(line)) {
        skipUntilProtocolHeader = false
      } else {
        continue
      }
    }
    if (collectingSupport) {
      if (isProtocolHeaderAfterSupportOrErrors(line)) {
        collectingSupport = false
      } else {
        supportBlock = supportBlock != null && supportBlock !== '' ? `${supportBlock}\n${line}` : `${supportBlock ?? ''}${line}`
        continue
      }
    }

    if (collectingErrors) {
      if (isProtocolHeaderAfterSupportOrErrors(line)) {
        collectingErrors = false
      } else {
        errorsBlock = !errorsBlock ? line : `${errorsBlock}\n${line}`
        continue
      }
    }

    if (/^[\s\-•]*(?:\d+[\.)]\s*)*Комментарий_перевод\s*:/i.test(line)) {
      const rest = line.replace(/^[\s\-•]*(?:\d+[\.)]\s*)*Комментарий_перевод\s*:\s*/i, '').trim()
      supportBlock = rest
      collectingSupport = true
      continue
    }

    if (/^[\s\-•]*(?:\d+[\.)]\s*)*Комментарий_ошибка\s*:/i.test(line)) {
      continue
    }
    if (/^[\s\-•]*(?:\d+[\.)]\s*)*Комментарий\s*:/i.test(line)) {
      const c = line.replace(/^[\s\-•]*(?:\d+[\.)]\s*)*Комментарий\s*:\s*/i, '').trim()
      comment = `Комментарий: ${c}`.trim()
      hasPraise = /^(Отлично|Молодец|Верно|Хорошо|Супер|Правильно)\b/i.test(c)
      continue
    }
    if (/^[\s\-•]*(?:\d+[\.)]\s*)*Ошибки\s*:/i.test(line)) {
      const rest = line.replace(/^[\s\-•]*(?:\d+[\.)]\s*)*Ошибки\s*:\s*/i, '').trim()
      errorsBlock = rest
      collectingErrors = true
      continue
    }
    if (/^[\s\-•]*(?:\d+[\.)]\s*)*Формы\s*:/i.test(line)) {
      skipUntilProtocolHeader = true
      continue
    }
    if (/^[\s\-•]*(?:\d+[\.)]\s*)*Время\s*:/i.test(line)) {
      continue
    }
    if (/^[\s\-•]*(?:\d+[\.)]\s*)*Конструкция\s*:/i.test(line)) {
      skipUntilProtocolHeader = true
      continue
    }
    if (/^[\s\-•]*(?:\d+[\.)]\s*)*(?:\+|\?|-)\s*:/.test(line)) {
      continue
    }
    if (/^[\s\-•]*(?:\d+[\.)]\s*)*Скажи\s*:/i.test(line)) {
      const raw = line.replace(/^[\s\-•]*(?:\d+[\.)]\s*)*Скажи\s*:\s*/i, '').trim()
      const body = stripLeadingRepeatRuPrompt(raw)
      if (body) {
        repeatRu = `Скажи: ${body}`
        continue
      }
      // Иначе — как общий случай (Скажи|Say): не терять строку, если тело не распарсилось.
    }
    if (/^[\s\-•]*(?:\d+[\.)]\s*)*(Скажи|Say)\s*:/i.test(line)) {
      repeat = line.replace(
        /^[\s\-•]*(?:\d+[\.)]\s*)*(Скажи|Say)\s*:\s*/i,
        'Скажи: '
      ).trim()
      continue
    }
  }

  const hasErrorShape = Boolean(
    (supportBlock?.trim() ?? '') || (errorsBlock?.trim() ?? '') || repeat || repeatRu
  )
  if (!comment && !hasErrorShape) {
    comment =
      'Комментарий: Есть неточность в грамматике. Давайте сверимся с образцом в блоке «Скажи».'
  }
  if (!hasPraise && repeat) {
    const repeatBody = repeat.replace(/^[\s\-•]*(?:\d+[\.)]\s*)*Скажи\s*:\s*/i, '').trim()
    if (!repeatBody || /^[–—-]\s*$/.test(repeatBody)) {
      repeat = null
    }
  }

  const hadExplicitComment = Boolean(comment)
  const commentBodyOnly = comment ? stripTranslationCommentLabel(comment).trim() : ''
  const protocolStatus = resolveTranslationProtocolStatusFromFields({
    comment: hadExplicitComment ? commentBodyOnly : null,
    commentIsPraise: hadExplicitComment ? hasPraise : undefined,
    translationSupportComment: supportBlock,
    errorsBlock,
    repeat,
    repeatRu,
  })
  const needsErrorProtocol = protocolStatus === 'error_repeat'
  if (needsErrorProtocol && commentBodyOnly) {
    const merged = mergeErrorsBlockWithSyntheticFromComment(String(errorsBlock ?? '').trim(), commentBodyOnly)
    if (merged) {
      errorsBlock = merged
    }
  }
  if (needsErrorProtocol) {
    const part = partitionEncouragementLinesFromTranslationErrorsPayload(String(errorsBlock ?? '').trim())
    praiseFromErrorsPayload = part.praiseFromErrors
    errorsBlock = part.errorsRest.trim() ? part.errorsRest : null
  }
  // Error branch is determined by repeat presence.
  // Even when "Комментарий:" starts with praise words (e.g. "Хорошо, что ..."),
  // we still need a supportive "Комментарий_перевод:" block for UI consistency.
  if (needsErrorProtocol && !(supportBlock?.trim() ?? '')) {
    const say = repeatRu ?? repeat
    let repeatEnForSupport: string | null = null
    if (say) {
      const raw = say.replace(/^[\s\-•]*(?:\d+[\.)]\s*)*(?:Скажи|Say)\s*:\s*/i, '').trim()
      const body = stripLeadingRepeatRuPrompt(raw).trim()
      repeatEnForSupport = body || null
    } else if (params.repeatEnglishFallback?.trim()) {
      const body = stripLeadingRepeatRuPrompt(params.repeatEnglishFallback.trim()).trim()
      repeatEnForSupport = body || null
    }
    const userTrim = params.userAnswerForSupportFallback?.trim() ?? ''
    if (userTrim && repeatEnForSupport) {
      supportBlock = buildDeterministicTranslationSupportRu(userTrim, repeatEnForSupport, params.audience)
    } else {
      supportBlock =
        params.audience === 'child'
          ? '💡 Есть хорошая основа, но нужно исправить главную неточность по образцу ниже.'
          : '💡 Есть хорошая основа, но нужно исправить основную неточность по образцу ниже.'
    }
  }
  if (needsErrorProtocol && !(String(errorsBlock ?? '').trim())) {
    errorsBlock = commentBodyOnly ? `🤔 ${commentBodyOnly}` : '🤔 Исправьте основную ошибку по образцу.'
  }
  if (needsErrorProtocol && supportBlock?.trim() && String(errorsBlock ?? '').trim()) {
    supportBlock = normalizeSupportiveCommentForErrorsBlock(supportBlock, params.audience)
  }

  if (needsErrorProtocol) {
    const { praiseFromComment } = extractTranslationErrorSynthAndPraiseFromComment(commentBodyOnly)
    const praiseBundle = dedupeTranslationPraiseParagraphs([praiseFromErrorsPayload, praiseFromComment])
    if (praiseBundle.length) {
      const pb = praiseBundle.join('\n\n')
      supportBlock = supportBlock?.trim() ? `${supportBlock.trim()}\n\n${pb}` : pb
    }
  }
  if (needsErrorProtocol && supportBlock?.trim()) {
    supportBlock = sanitizeTranslationSupportAgainstPrompt({
      supportComment: supportBlock,
      fallbackPrompt: params.fallbackPrompt,
      audience: params.audience,
    })
  }

  const out: string[] = []
  const supportTrim = supportBlock != null ? String(supportBlock).trim() : ''
  if (supportTrim) {
    const supportLines = supportTrim.split(/\r?\n/)
    out.push(`Комментарий_перевод: ${supportLines[0] ?? ''}`.trim())
    for (let i = 1; i < supportLines.length; i++) {
      const sl = supportLines[i] ?? ''
      if (sl.trim()) out.push(sl)
    }
  }
  if (comment && !needsErrorProtocol) {
    out.push(comment)
  }
  if (errorsBlock != null && String(errorsBlock).trim()) {
    out.push(`Ошибки:\n${String(errorsBlock).trim()}`)
  }
  if (repeat && !repeatRu) {
    const repeatBody = repeat.replace(/^[\s\-•]*(?:\d+[\.)]\s*)*Скажи\s*:\s*/i, '').trim()
    const en = normalizeRepeatSentenceEnding(stripLeadingRepeatRuPrompt(repeatBody))
    if (en) repeatRu = `Скажи: ${en}`
  }
  let sayLine = repeatRu ?? repeat
  if (needsErrorProtocol && !String(sayLine ?? '').trim() && params.repeatEnglishFallback?.trim()) {
    const fb = normalizeRepeatSentenceEnding(stripLeadingRepeatRuPrompt(params.repeatEnglishFallback.trim()))
    if (fb) {
      sayLine = `Скажи: ${fb}`
    }
  }
  if (sayLine) out.push(sayLine)
  return out.join('\n').trim()
}
