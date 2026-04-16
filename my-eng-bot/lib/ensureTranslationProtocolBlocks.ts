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
