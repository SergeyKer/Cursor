'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { parseCorrection } from '@/lib/parseCorrection'
import {
  dedupeTranslationPraiseParagraphs,
  extractTranslationErrorSynthAndPraiseFromComment,
  mergeErrorsBlockWithSyntheticFromComment,
  partitionEncouragementLinesFromTranslationErrorsPayload,
  stripTranslationErrorSubsectionLabels,
} from '@/lib/translationSyntheticErrorsBlock'
import {
  TRANSLATION_PROTOCOL_BLOCK_LINE,
  stripLeadingRepeatRuPrompt,
  stripWrappingQuotes,
} from '@/lib/translationProtocolLines'
import {
  stripCheckEmojisForPrefixedCard,
  stripLeadingBulbEmojisForPrefixedCard,
} from '@/lib/normalizeCommentBulbEmoji'
import { speak } from '@/lib/speech'
import { pickRecordingMimeType, shouldUseMediaRecorderFallback, sttLangFromLocale } from '@/lib/sttClient'
import { normalizeWebSearchSourceUrl } from '@/lib/openAiWebSearchShared'
import type { ChatMessage as ChatMessageType, Settings } from '@/lib/types'
import { stripWrappingQuotesFromDrillRussianLine } from '@/lib/extractSingleTranslationNextSentence'
import {
  extractCanonicalRepeatRefEnglishFromContent,
  stripTranslationCanonicalRepeatRefLine,
} from '@/lib/translationPromptAndRef'
import { isGenericTranslationMetaInvitation, splitTranslationInvitation } from '@/lib/translationInvitationUi'
import {
  hasTranslationSuccessProtocolFields,
  resolveTranslationProtocolStatus,
  resolveTranslationProtocolStatusFromFields,
} from '@/lib/translationProtocolStatus'
import type { TranslationProtocolStatus } from '@/lib/translationProtocolStatus'
import { PAGE_HOME_START_PRIMARY_BUTTON_CLASS } from '@/lib/homeCtaStyles'
import type { LearningLessonAction } from '@/lib/learningLessons'

interface ChatProps {
  messages: ChatMessageType[]
  settings: Settings
  loading: boolean
  searchingInternet?: boolean
  searchingInternetLang?: 'ru' | 'en'
  atLimit: boolean
  onSend: (text: string) => void
  firstMessageError?: string
  onRetryFirstMessage?: () => void
  lastMessageIsError?: boolean
  onRetryLastMessage?: () => void
  retryMessage?: string | null
  onRequestTranslation?: (index: number, text: string) => void
  loadingTranslationIndex?: number | null
  forceNextMicLang?: 'ru' | 'en' | null
  onConsumeForceNextMicLang?: () => void
  learningActions?: LearningLessonAction[]
  onSelectLearningAction?: (actionId: string) => void
}

/**
 * Локаль Web Speech только для режима общения — по последнему сообщению пользователя.
 * Есть кириллица → ru-RU (в т.ч. «прайс Bentley Continental 45»).
 * Только латиница → en-US. Только цифры/знаки → по inputPreference.
 */
function speechLocaleForCommunication(
  lastUserText: string | undefined,
  inputPreference: 'ru' | 'en'
): 'ru-RU' | 'en-US' {
  const t = lastUserText?.trim() ?? ''
  if (!t) return inputPreference === 'en' ? 'en-US' : 'ru-RU'
  const hasCyr = /[А-Яа-яЁё]/.test(t)
  const hasLat = /[A-Za-z]/.test(t)
  if (hasCyr && hasLat) return inputPreference === 'en' ? 'en-US' : 'ru-RU'
  if (hasCyr) return 'ru-RU'
  if (hasLat) return 'en-US'
  return inputPreference === 'en' ? 'en-US' : 'ru-RU'
}

type BubblePosition = 'solo' | 'first' | 'middle' | 'last'
type SectionTone = 'neutral' | 'amber' | 'emerald' | 'praise' | 'slate' | 'invite'
type AssistantSection = {
  key: string
  tone: SectionTone
  label: string
  text: string
  italic?: boolean
  small?: boolean
  singleLine?: boolean
  trailingAction?: 'speak'
  /** Без префикса «Переведи:»/«Переведи далее:», но с тем же акцентом, что у основного блока ассистента. */
  emphasizeMainText?: boolean
}

function getBubblePosition(
  previousRole: ChatMessageType['role'] | undefined,
  currentRole: ChatMessageType['role'],
  nextRole: ChatMessageType['role'] | undefined
): BubblePosition {
  const sameAsPrev = previousRole === currentRole
  const sameAsNext = nextRole === currentRole
  if (!sameAsPrev && !sameAsNext) return 'solo'
  if (!sameAsPrev && sameAsNext) return 'first'
  if (sameAsPrev && sameAsNext) return 'middle'
  return 'last'
}

function bubbleRadiusClass(isUser: boolean, pos: BubblePosition): string {
  // WhatsApp-логика: в группе скругления на стороне "стыка" уменьшаются.
  // Хвостики не используем: вместо этого делаем один угол более "острым".
  if (isUser) {
    // User справа
    // Три угла максимально круглые, нижний правый — чуть острее (как «ИИ печатает…»)
    if (pos === 'solo') return 'rounded-[1.2825rem] rounded-br-md'
    if (pos === 'first') return 'rounded-[1.2825rem] rounded-br-md'
    // Внутри группы чуть «сцепляем» верхний правый
    if (pos === 'middle') return 'rounded-[1.2825rem] rounded-tr-lg rounded-br-md'
    return 'rounded-[1.2825rem] rounded-tr-lg rounded-br-md'
  }

  // Assistant слева
  // Три угла максимально круглые, нижний левый — чуть острее (как «ИИ печатает…»)
  if (pos === 'solo') return 'rounded-[1.2825rem] rounded-bl-md'
  if (pos === 'first') return 'rounded-[1.2825rem] rounded-bl-md'
  // Внутри группы чуть «сцепляем» верхний левый
  if (pos === 'middle') return 'rounded-[1.2825rem] rounded-tl-lg rounded-bl-md'
  return 'rounded-[1.2825rem] rounded-tl-lg rounded-bl-md'
}

/**
 * Убирает из текста блока «Ошибки» подпункты без содержания (модель часто ставит «-» для пустых секций).
 */
export function filterTranslationErrorsDisplayText(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  const isPlaceholderBody = (body: string): boolean => {
    let t = body.replace(/\u00a0/g, ' ').trim()
    t = t.replace(/^["'`«]+|["'`»]+$/g, '').trim()
    if (!t) return true
    if (/^[-—–]+\.?$/u.test(t)) return true
    if (/^нет\.?$/iu.test(t)) return true
    if (/^(н\/д|n\/a)\.?$/iu.test(t)) return true
    if (/^none\.?$/iu.test(t)) return true
    if (/^(ошибок\s+нет|нет\s+ошибок|без\s+ошибок)\.?$/iu.test(t)) return true
    return false
  }

  /** Тело строки после эмодзи: либо «Метка: текст», либо сразу текст (без русских меток). */
  const subsectionLine =
    /^\s*(?:[-•*]\s*)?(🤔|🔤|✏️|📖)\s*(?:(?:Грамматика|Орфография|Лексика)\s*:\s*)?(.*)$/u
  const normalizeDisplayErrorLine = (line: string): string[] => {
    // В блоке «Ошибки» показываем обычные пунктирные маркеры вместо эмодзи.
    const withoutEmojiPrefix = line.replace(/^\s*(?:[-•*]\s*)?(?:🤔|🔤|✏️|📖)\s*/u, '- ')
    // Лексические пары вида «фильм - movie» отображаем стрелкой.
    const withArrow = withoutEmojiPrefix.replace(/\s+-\s+/g, ' → ').replace(/\s+/g, ' ').trim()
    // Если модель склеила несколько замен через ';', показываем каждую на отдельной строке.
    if (withArrow.includes('→') && withArrow.includes(';')) {
      const body = withArrow.replace(/^\-\s*/, '').trim()
      const chunks = body
        .split(/\s*;\s*/)
        .map((chunk) => chunk.replace(/^['"`«»]+|['"`«»]+$/g, '').trim())
        .filter(Boolean)
      if (chunks.length > 1) {
        return chunks.map((chunk) => `- ${chunk}`)
      }
    }
    return [withArrow]
  }
  const isVerbFormLabelWithSpellingDetail = (displayLine: string): boolean => {
    const t = displayLine.toLowerCase()
    return (
      /^\s*(?:[-•*]\s*)?🔤\s*/.test(displayLine) &&
      /ошибка\s+формы\s+глагола/i.test(t) &&
      /(spelling|орфограф|опечат)/i.test(t)
    )
  }

  /** Модель путает «тип предложения» с подсказкой заменить русское слово на английское. */
  const isSentenceTypeMislabeledTranslation = (displayLine: string): boolean => {
    const t = displayLine
    if (!/ошибка\s+типа\s+предложения/i.test(t)) return false
    if (/['"`«]?[а-яё]{2,}['"`»]?\s*(?:→|->)\s*['"`«]?[a-z]{2,}/i.test(t)) return true
    if (/вместо\s+['"`«]?[а-яё]{2,}/i.test(t) && /[a-z]{3,}/i.test(t)) return true
    if (/используйте\s+форму\s+['"`«]?[a-z]{2,}/i.test(t) && /[а-яё]{2,}/i.test(t)) return true
    return false
  }

  const out: string[] = []
  for (const line of trimmed.split(/\r?\n/)) {
    const displayLine = stripTranslationErrorSubsectionLabels(line)
    if (isVerbFormLabelWithSpellingDetail(displayLine)) continue
    if (isSentenceTypeMislabeledTranslation(displayLine)) continue
    const m = displayLine.match(subsectionLine)
    if (
      m &&
      isPlaceholderBody(m[2] ?? '') &&
      /\bЛексика\s*:\s*$/iu.test(displayLine)
    ) {
      out.push(...normalizeDisplayErrorLine(displayLine))
      continue
    }
    if (m && isPlaceholderBody(m[2] ?? '')) continue
    out.push(...normalizeDisplayErrorLine(displayLine))
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

const GENERIC_TRANSLATION_REPEAT_FALLBACK_EN = 'Write the correct English translation of the given Russian sentence.'

function isGenericTranslationRepeatUiText(text: string | null): boolean {
  if (!text) return false
  return text.trim().toLowerCase() === GENERIC_TRANSLATION_REPEAT_FALLBACK_EN.toLowerCase()
}

/** Убирает служебный префикс модели перед русским заданием в карточке «Переведи». */
export function stripTranslationMainMetaPrefixes(text: string): string {
  const withoutPrefix = text
    .replace(/^\s*(?:следующ(?:ее|ие)\s+предложени(?:е|я)\s*:\s*)+/i, '')
    .replace(/^\s*(?:\d+\)\s*)?(?:Переведи|Переведите)(?:\s+далее)?\s*:\s*/i, '')
    .replace(/^\s*(?:на\s+)?следующ(?:ую|ие)\s+тем(?:у|ы)\s*:\s*/i, '')
    .replace(/^\s*(?:следующ(?:ий|ая|ее)\s+вопрос\s*:\s*)+/i, '')
    .trim()
  return stripWrappingQuotesFromDrillRussianLine(withoutPrefix)
}

/**
 * Видимая строка задания «Переведи(те) [далее]: …» из текста карточки (для цикла ошибки перевода).
 */
function extractRussianTranslationDrillLine(displayText: string): string {
  const m =
    /(?:^|\n)\s*((?:Переведи|Переведите)(?:\s+далее)?\s*:\s*["'"«(]*\s*[А-Яа-яЁё][^\n]*)/im.exec(
      displayText
    )
  return m?.[1]?.trim() ?? ''
}

function stripTranslationInvitationPrefix(text: string): string {
  return text.replace(/^\s*(?:\d+\)\s*)?(?:Переведи|Переведите)(?:\s+далее)?\s*:\s*/i, '').trim()
}

function isPraiseLikeTranslationFeedback(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  if (/(?:^|[\s"«(])(молодец|отлично|супер|верно|правильно|хорошо)\b/i.test(t)) return true
  if (/(?:ты|вы)\s+правильно\s+(?:использовал(?:и)?|употребил(?:и)?|выбрал(?:и)?)/i.test(t)) return true
  if (/это\s+важно,\s*чтобы/i.test(t)) return true
  return false
}

function isLikelyRussianTranslationDrill(text: string): boolean {
  const body = stripTranslationInvitationPrefix(text)
  if (!body) return false
  if (!/[А-Яа-яЁё]/.test(body)) return false
  if (isPraiseLikeTranslationFeedback(body)) return false
  return true
}

/** Похвала — лёгкий зелёный тон; иначе янтарь (ошибка/коррекция), как до введения praise. */
export function commentToneForContent(comment: string): SectionTone {
  const normalized = comment.trim()
  const hasCorrectionSignal = /(?:проверь|исправ|ошиб|неверн|неправил|нужн|орфограф|лексическ|грамматик|spelling|word choice|verb form)/i.test(
    normalized
  )
  const praisePatterns = [
    /^(Отлично|Молодец|Верно|Хорошо|Супер|Правильно)[!.]?\s*/i,
    /^Ты\s+правильно(?:\s|$|[!.?,;:])/i,
    /^Ты\s+верно(?:\s|$|[!.?,;:])/i,
    /^Вы\s+правильно(?:\s|$|[!.?,;:])/i,
    /^Вы\s+верно(?:\s|$|[!.?,;:])/i,
  ]
  return !hasCorrectionSignal && praisePatterns.some((pattern) => pattern.test(normalized)) ? 'praise' : 'amber'
}

type CommentIcon = '✅' | '💡' | '⏱️' | '🔤' | '📖' | '✏️'

/** Подбирает Unicode-иконку для комментария по типу похвалы или ошибки. */
export function commentIconForContent(comment: string): CommentIcon {
  const normalized = comment.trim()
  const followsTypeBoundary = '(?:\\s|$|[:\\-–—.,!?])'
  const lexicalPattern = `(?:Лексическая\\s+ошибка|Ошибка\\s+лексическая|Ошибка\\s+лексики)`
  const spellingPattern = `(?:Орфографическая\\s+ошибка|Ошибка\\s+орфографическая|Ошибка\\s+правописания)`
  const grammarPattern = `(?:Ошибка\\s+типа\\s+предложения|Ошибка\\s+формы\\s+глагола|Ошибка\\s+согласования|Грамматическая\\s+ошибка|Ошибка\\s+грамматики)`
  const timePattern = `(?:Ошибка\\s+времени|Ошибка\\s+по\\s+времени|Время)`

  if (commentToneForContent(normalized) === 'praise') return '✅'
  if (new RegExp(`^${timePattern}${followsTypeBoundary}`, 'i').test(normalized)) return '⏱️'
  if (new RegExp(`^${grammarPattern}${followsTypeBoundary}`, 'i').test(normalized)) {
    return '🔤'
  }
  if (new RegExp(`^${lexicalPattern}${followsTypeBoundary}`, 'i').test(normalized)) return '📖'
  if (new RegExp(`^${spellingPattern}${followsTypeBoundary}`, 'i').test(normalized)) return '✏️'

  return '💡'
}

/** Первый блок комментария в переводе при ошибке: всегда подсказка 💡 (не ⏱️/другие типы по первой строке). */
export function commentLabelForTranslationFirstBlock(comment: string): CommentIcon {
  if (commentToneForContent(comment) === 'praise') {
    return commentIconForContent(comment)
  }
  return '💡'
}

/** Карточка «Прочитай вслух (+, ?, −)» в режиме «Перевод». Сейчас скрыта; включить — `true`. */
function buildAssistantSections(params: {
  comment: string | null
  /** Режим перевод, ошибка: только тело «Комментарий_перевод:» для первой янтарной карточки. */
  translationSupportComment?: string | null
  translationErrorCoachUi?: boolean
  /** Успешный drill перевода: первая карточка — ✅ (тон praise), а не янтарная 💡. */
  translationSuccessPraiseCard?: boolean
  /** Режим перевод, сценарий ошибки: разбор по пунктам под «Комментарий». */
  translationErrorsText?: string | null
  translationProtocolStatus?: TranslationProtocolStatus
  showOnlyRepeat: boolean
  hidePromptBlocks?: boolean
  repeatTextForCard: string | null
  /** Режим перевод, ошибка: эталон из «Скажи:» (англ.) для карточки повтора. */
  repeatRuTextForCard?: string | null
  mainBefore: string
  hideRussianNonQuestionMainBefore: boolean
  invitationText: string | null
  mainAfter: string
  mode: 'dialogue' | 'translation' | 'communication'
  /** Первое задание в чате — «Переведи:»; далее — «Переведи далее:». */
  translationHeadingWelcome?: boolean
}): AssistantSection[] {
  const {
    comment,
    translationSupportComment = null,
    translationErrorCoachUi = false,
    translationSuccessPraiseCard = false,
    translationErrorsText,
    translationProtocolStatus = 'prompt_only',
    showOnlyRepeat,
    hidePromptBlocks = false,
    repeatTextForCard,
    repeatRuTextForCard = null,
    mainBefore,
    hideRussianNonQuestionMainBefore,
    invitationText,
    mainAfter,
    mode,
    translationHeadingWelcome = true,
  } = params

  const hideAiLabel = mode === 'dialogue' || mode === 'communication'
  /** Режим перевода: приветственное задание — «Переведи:», следующие — «Переведи далее:». */
  const assistantMainHeadingLabel = (): string => {
    if (hideAiLabel) return ''
    return translationHeadingWelcome ? 'Переведи' : 'Переведи далее'
  }

  const sections: AssistantSection[] = []
  const isTranslationErrorRepeat = mode === 'translation' && translationProtocolStatus === 'error_repeat'
  const isTranslationSuccess = mode === 'translation' && translationProtocolStatus === 'success'
  const supportTrim = translationSupportComment?.trim() ?? ''
  if (isTranslationErrorRepeat) {
    if (supportTrim) {
      sections.push({
        key: 'translation-support',
        tone: 'amber',
        label: '💡',
        text: supportTrim,
        singleLine: !supportTrim.includes('\n'),
      })
    }
  } else if (isTranslationSuccess && translationSuccessPraiseCard && comment?.trim()) {
    const praiseText = comment.trim()
    sections.push({
      key: 'comment',
      tone: 'praise',
      label: '✅',
      text: praiseText,
      singleLine: !praiseText.includes('\n'),
    })
  } else if (
    comment &&
    !(isTranslationSuccess && translationSuccessPraiseCard && mainBefore?.trim())
  ) {
    sections.push({
      key: 'comment',
      tone: commentToneForContent(comment),
      label:
        mode === 'translation' ? commentLabelForTranslationFirstBlock(comment) : commentIconForContent(comment),
      text: comment,
      singleLine: true,
    })
  }
  if (mode === 'translation' && invitationText?.trim()) {
    const invitationTrim = invitationText.trim()
    if (!isGenericTranslationMetaInvitation(invitationTrim)) {
      sections.push({
        key: 'translation-invitation',
        tone: 'invite',
        label: assistantMainHeadingLabel(),
        text: invitationTrim,
        singleLine: !invitationTrim.includes('\n'),
        emphasizeMainText: hideAiLabel,
      })
    }
  }
  if (translationErrorsText?.trim() && mode === 'translation') {
    sections.push({
      key: 'translation-errors',
      tone: 'amber',
      label: '',
      text: translationErrorsText.trim(),
      singleLine: false,
    })
  }
  const repeatRuTrim = repeatRuTextForCard?.trim() ?? ''
  if (isTranslationErrorRepeat && repeatRuTrim) {
    const repeatEnCueBody = stripWrappingQuotes(stripLeadingRepeatRuPrompt(repeatRuTrim))
    if (repeatEnCueBody) {
      sections.push({
        key: 'repeat-translation',
        tone: 'emerald',
        label: 'Скажи',
        text: repeatEnCueBody,
        singleLine: true,
      })
    }
  }
  const isTranslationErrorCoach = isTranslationErrorRepeat || (mode === 'translation' && translationErrorCoachUi)
  const hideEnglishRepeatCard = isTranslationErrorCoach
  if (showOnlyRepeat && repeatTextForCard && !isTranslationErrorCoach) {
    sections.push({
      key: 'repeat',
      tone: 'emerald',
      label: 'Скажи',
      text: stripWrappingQuotes(repeatTextForCard),
      singleLine: true,
    })
  } else if (
    !hidePromptBlocks &&
    mainBefore &&
    !hideRussianNonQuestionMainBefore &&
    !isTranslationErrorCoach
  ) {
    sections.push({
      key: 'main',
      tone: 'neutral',
      label: assistantMainHeadingLabel(),
      text: mainBefore,
      // Для уроков/теории с \n рендерим как многострочный блок.
      singleLine: !mainBefore.includes('\n'),
      emphasizeMainText: hideAiLabel,
    })
  }
  if (!showOnlyRepeat && repeatTextForCard && !hideEnglishRepeatCard) {
    sections.push({
      key: 'repeat-inline',
      tone: 'emerald',
      label: 'Скажи',
      text: stripWrappingQuotes(repeatTextForCard),
      singleLine: true,
    })
  }
  // Блок с текстом «Переведи на английский.» не показываем — режим перевода уже задан в UI.
  // Хвост после «Переведи…» дублирует подсказку — отдельный блок «Доп. комментарий» не показываем.
  if (!hidePromptBlocks && mainAfter && !(mainBefore || invitationText) && !isTranslationErrorCoach) {
    sections.push({
      key: 'main-after',
      tone: 'neutral',
      label: assistantMainHeadingLabel(),
      text: mainAfter.replace(/\b(Say|Скажи):\s*/gi, 'Скажи: '),
      emphasizeMainText: hideAiLabel,
    })
  }
  return sections
}

/** Узкий экспорт для тестов: карточка похвалы при SUCCESS drill перевода. */
export function buildAssistantSectionsForTranslationSuccessTest(
  comment: string,
  options?: { mainBefore?: string }
): AssistantSection[] {
  return buildAssistantSections({
    comment,
    translationSuccessPraiseCard: true,
    translationErrorCoachUi: false,
    translationProtocolStatus: 'success',
    showOnlyRepeat: false,
    hidePromptBlocks: false,
    repeatTextForCard: null,
    mainBefore: options?.mainBefore ?? '',
    hideRussianNonQuestionMainBefore: false,
    invitationText: null,
    mainAfter: '',
    mode: 'translation',
  })
}

/** Узкий экспорт для тестов: русское задание + служебное приглашение — без дубля карточки «Переведи на английский». */
export function buildAssistantSectionsForTranslationDrillWithInvitationTest(options: {
  mainBefore: string
  invitationText: string | null
}): AssistantSection[] {
  return buildAssistantSections({
    comment: null,
    translationErrorCoachUi: false,
    translationProtocolStatus: 'prompt_only',
    translationSuccessPraiseCard: false,
    showOnlyRepeat: false,
    hidePromptBlocks: false,
    repeatTextForCard: null,
    mainBefore: options.mainBefore,
    hideRussianNonQuestionMainBefore: false,
    invitationText: options.invitationText,
    mainAfter: '',
    mode: 'translation',
    translationHeadingWelcome: true,
  })
}

/** Узкий экспорт для тестов: ошибка drill перевода — в UI должен остаться только repeat из `Скажи`. */
export function buildAssistantSectionsForTranslationErrorRepeatTest(options: {
  repeatTextForCard?: string | null
  repeatRuTextForCard?: string | null
  showOnlyRepeat?: boolean
  mode?: 'dialogue' | 'translation' | 'communication'
  translationErrorCoachUi?: boolean
  mainBefore?: string
  mainAfter?: string
}): AssistantSection[] {
  return buildAssistantSections({
    comment: null,
    translationSupportComment: null,
    translationErrorCoachUi: options.translationErrorCoachUi ?? true,
    translationProtocolStatus: (options.translationErrorCoachUi ?? true) ? 'error_repeat' : 'prompt_only',
    translationSuccessPraiseCard: false,
    translationErrorsText: null,
    showOnlyRepeat: options.showOnlyRepeat ?? false,
    hidePromptBlocks: false,
    repeatTextForCard: options.repeatTextForCard ?? null,
    repeatRuTextForCard: options.repeatRuTextForCard ?? null,
    mainBefore: options.mainBefore ?? '',
    hideRussianNonQuestionMainBefore: false,
    invitationText: null,
    mainAfter: options.mainAfter ?? '',
    mode: options.mode ?? 'translation',
    translationHeadingWelcome: false,
  })
}

/**
 * Успешный drill перевода: есть комментарий и нет повторного эталона для исправления.
 */
export function translationResponseHasSuccessShape(comment: string | null, repeat: string | null, repeatRu: string | null): boolean {
  return hasTranslationSuccessProtocolFields({
    comment,
    commentIsPraise: comment ? commentToneForContent(comment) === 'praise' : undefined,
    repeat,
    repeatRu,
  })
}

export function parseTranslationCoachBlocks(text: string): {
  translationSupportComment: string | null
  comment: string | null
  errorsBlock: string | null
  repeat: string | null
  repeatRu: string | null
  nextSentence: string
  invitation: string | null
} {
  const cleaned = text
    .split(/\r?\n/)
    .map((l) =>
      l
        .replace(/^\s*(?:ai|assistant)\s*:\s*/i, '')
        .trim()
        .replace(/^([\s\-•]*(?:\d+[\.)]\s*)*)Комментарий_ошибка\s*:/i, '$1Комментарий:')
    )
    .filter(Boolean)

  let translationSupportComment: string | null = null
  let comment: string | null = null
  let errorsBlock: string | null = null
  let repeat: string | null = null
  let repeatRu: string | null = null
  let invitation: string | null = null
  const body: string[] = []
  let collectingErrors = false
  let collectingSupport = false

  const splitInlineInvitation = (line: string): { before: string; invitation: string } | null => {
    const onlyColonInvite =
      /^\s*(?:\d+\)\s*)?((?:Переведи|Переведите)(?:\s+далее)?\s*:\s*[^\r\n]+)\s*$/i.exec(line)
    if (onlyColonInvite?.[1]) {
      const firstColon = line.indexOf(':')
      const tail = firstColon >= 0 ? line.slice(firstColon + 1) : ''
      // Не одна строка-приглашение, если после первого «:» есть второе «Переведи…» (склейка с «…английский»).
      // Не используем \b — в JS границы слова не работают для кириллицы.
      const hasSecondInviteInTail = /\s+(?:Переведи|Переведите)\s+/i.test(tail)
      if (!hasSecondInviteInTail) {
        return { before: '', invitation: onlyColonInvite[1].trim() }
      }
    }
    const onlyEnInvite =
      /^\s*(?:\d+\)\s*)?((?:Переведи|Переведите)\s+на\s+английский(?:\s+язык)?\.)\s*$/i.exec(line)
    if (onlyEnInvite?.[1]) {
      return { before: '', invitation: onlyEnInvite[1].trim() }
    }
    const m =
      /^(.*?)\s+((?:\d+\)\s*)?(?:Переведи|Переведите)(?:\s+далее)?\s*:\s*[^\r\n]+|(?:\d+\)\s*)?(?:Переведи|Переведите)\s+на\s+английский(?:\s+язык)?\.)\s*$/i.exec(
        line
      )
    if (!m?.[2]) return null
    return {
      before: (m[1] ?? '').trim().replace(/^\d+\)\s*/i, ''),
      invitation: m[2].replace(/^\s*\d+\)\s*/i, '').trim(),
    }
  }

  const isHeaderLine = (line: string): boolean =>
    TRANSLATION_PROTOCOL_BLOCK_LINE.test(line) ||
    /^\s*(?:\d+\)\s*)?[+\?-]\s*:/i.test(line) ||
    /^\s*(?:\d+\)\s*)?(?:Переведи|Переведите)(?=\s|:|$)/i.test(line)

  const parseInlineProtocolTail = (tail: string): void => {
    const partRe = /(Ошибки|Скажи|Say)\s*:\s*([\s\S]*?)(?=(?:(?:Ошибки|Скажи|Say)\s*:)|$)/gi
    let m: RegExpExecArray | null
    while ((m = partRe.exec(tail)) !== null) {
      const label = (m[1] ?? '').toLowerCase()
      const body = (m[2] ?? '').trim()
      if (!body) continue
      if (label === 'ошибки') {
        errorsBlock = errorsBlock ? `${errorsBlock}\n${body}` : body
        continue
      }
      if (label === 'скажи') {
        const normalized = stripLeadingRepeatRuPrompt(body).replace(/^\s*(?:Скажи|Say)\s*:\s*/i, '').trim()
        if (normalized) {
          repeatRu = normalized
          repeat = normalized
        }
        continue
      }
      repeat = body
    }
  }

  for (const line of cleaned) {
    if (collectingSupport) {
      if (isHeaderLine(line)) {
        collectingSupport = false
      } else {
        const inlineInvitation = splitInlineInvitation(line)
        if (inlineInvitation) {
          if (inlineInvitation.before) {
            translationSupportComment =
              translationSupportComment != null && translationSupportComment !== ''
                ? `${translationSupportComment}\n${inlineInvitation.before}`
                : `${translationSupportComment ?? ''}${inlineInvitation.before}`
          }
          if (inlineInvitation.invitation) {
            const inv = inlineInvitation.invitation
            const inviteBody = stripTranslationInvitationPrefix(inv)
            if (isLikelyRussianTranslationDrill(inv) || isGenericTranslationMetaInvitation(inv)) {
              invitation = inv
            } else if (inviteBody) {
              translationSupportComment =
                translationSupportComment != null && translationSupportComment !== ''
                  ? `${translationSupportComment}\n${inviteBody}`
                  : `${translationSupportComment ?? ''}${inviteBody}`
            }
          }
          collectingSupport = false
          continue
        }
        translationSupportComment =
          translationSupportComment != null && translationSupportComment !== ''
            ? `${translationSupportComment}\n${line}`
            : `${translationSupportComment ?? ''}${line}`
        continue
      }
    }

    if (collectingErrors) {
      if (isHeaderLine(line)) {
        collectingErrors = false
      } else {
        errorsBlock = !errorsBlock ? line : `${errorsBlock}\n${line}`
        continue
      }
    }

    // Только «Переведи на английский.» / «…английский язык.» без русского задания — не «Переведи далее: …».
    const pureMetaInvitation =
      /^\s*(?:\d+\)\s*)*((?:Переведи|Переведите)\s+на\s+английский(?:\s+язык)?\.)\s*$/i.exec(line)
    if (pureMetaInvitation?.[1]) {
      const meta = pureMetaInvitation[1].trim()
      // Не затираем уже выставленное «Переведи далее: …» / «Переведи: …» — иначе карточка пропадает в UI.
      if (!invitation || isGenericTranslationMetaInvitation(invitation)) {
        invitation = meta
      }
      continue
    }

    if (/^\s*(?:\d+\)\s*)?Комментарий_перевод\s*:/i.test(line)) {
      const rest = line.replace(/^\s*(?:\d+\)\s*)?Комментарий_перевод\s*:\s*/i, '').trim()
      const inlineInvitation = splitInlineInvitation(rest)
      if (inlineInvitation) {
        translationSupportComment = inlineInvitation.before || null
        if (inlineInvitation.invitation) invitation = inlineInvitation.invitation
        collectingSupport = false
      } else {
        translationSupportComment = rest
        collectingSupport = true
      }
      continue
    }
    if (/^Комментарий(?:_ошибка)?\s*:/i.test(line)) {
      const rawComment = line.replace(/^Комментарий(?:_ошибка)?\s*:\s*/i, '').trim()
      const inlineProtocolMatch = /(?:Ошибки|Скажи|Say)\s*:/i.exec(rawComment)
      if (inlineProtocolMatch && inlineProtocolMatch.index >= 0) {
        const splitAt = inlineProtocolMatch.index
        const commentHead = rawComment
          .slice(0, splitAt)
          .replace(/[—–\-:;,\s]+$/g, '')
          .trim()
        const protocolTail = rawComment.slice(splitAt).trim()
        comment = commentHead || null
        parseInlineProtocolTail(protocolTail)
      } else {
        comment = rawComment || null
      }
      continue
    }
    if (/^\s*(?:\d+\)\s*)?Ошибки\s*:/i.test(line)) {
      const rest = line.replace(/^\s*(?:\d+\)\s*)?Ошибки\s*:\s*/i, '').trim()
      errorsBlock = rest
      collectingErrors = true
      continue
    }
    if (/^[\s\-•]*(?:\d+\)\s*)*(?:Скажи|Say)\s*:/i.test(line)) {
      const raw = line.replace(/^[\s\-•]*(?:\d+\)\s*)*(?:Скажи|Say)\s*:\s*/i, '').trim()
      const normalized = stripLeadingRepeatRuPrompt(raw).replace(/^\s*(?:Скажи|Say)\s*:\s*/i, '').trim() || null
      repeatRu = normalized
      repeat = normalized
      continue
    }
    const inlineInvitation = splitInlineInvitation(line)
    if (inlineInvitation) {
      const before = inlineInvitation.before
      const inv = inlineInvitation.invitation
      if (inv) {
        const inviteBody = stripTranslationInvitationPrefix(inv)
        if (isLikelyRussianTranslationDrill(inv) || isGenericTranslationMetaInvitation(inv)) {
          invitation = inv
        } else if (inviteBody) {
          comment = comment ? `${comment}\n${inviteBody}` : inviteBody
        }
      }
      if (before) body.push(before)
      continue
    }
    body.push(line.replace(/^\d+\)\s*/i, ''))
  }
  const trimmedErrors = errorsBlock?.trim() ?? ''
  const trimmedSupport = translationSupportComment?.trim() ?? ''
  return {
    translationSupportComment: trimmedSupport ? trimmedSupport : null,
    comment,
    errorsBlock: trimmedErrors ? trimmedErrors : null,
    repeat,
    repeatRu,
    nextSentence: body.join('\n').trim(),
    invitation,
  }
}

function extractTranslationCommentAndPrompt(text: string): { comment: string | null; promptText: string } {
  const trimmed = text.trim()
  if (!trimmed) return { comment: null, promptText: '' }
  const m = /^(.*?[.!?])\s+([\s\S]+)$/.exec(trimmed)
  if (!m) return { comment: null, promptText: trimmed }
  const first = (m[1] ?? '').trim()
  const tail = (m[2] ?? '').trim()
  if (!first || !tail) return { comment: null, promptText: trimmed }

  const looksLikeFeedback =
    /^(Комментарий(?:_ошибка)?\s*:|Отлично|Молодец|Верно|Хорошо|Супер|Правильно|Почти|Нужно|Попробуй|Исправ)/i.test(first)
  const looksLikeRuSentence = /[А-Яа-яЁё]/.test(tail)
  const looksLikeEnFeedback = /[A-Za-z]/.test(first) && /^[A-Za-z0-9 ,.'!?-]+$/.test(first)
  const tailStartsWithRu = /^[\s"'«(]*[А-Яа-яЁё]/.test(tail)
  if (looksLikeFeedback && looksLikeRuSentence) {
    const normalized = first.replace(/^Комментарий(?:_ошибка)?\s*:\s*/i, '').trim()
    return { comment: normalized || first, promptText: tail }
  }
  // Частый кейс translation: "Try again. Кошка ест."
  if (looksLikeEnFeedback && looksLikeRuSentence && tailStartsWithRu) {
    return { comment: first, promptText: tail }
  }
  return { comment: null, promptText: trimmed }
}

export function condenseTranslationCommentToErrors(comment: string): string {
  const normalized = comment
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) =>
      line
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean)
    )
    .map((sentence) => sentence.replace(/\s+/g, ' ').trim())

  if (normalized.length === 0) return comment.trim()

  const normalizeSmotri = (s: string) =>
    s
      // Приводим: "Ошибка ... . Смотри — ..." -> "Ошибка ... — ..."
      .replace(/(Ошибка[^.!?]*?)\.\s*(Смотри|Смотрите)\s*—/gi, '$1 —')
      .replace(/(Ошибка[^.!?]*?)\s*(Смотри|Смотрите)\s*—/gi, '$1 —')

  return normalized.map(normalizeSmotri).join('\n')
}

/** Для режима «Перевод»: есть ли у ассистента видимая карточка с русским заданием (как в MessageBubble). */
export function computeAssistantTranslationMainCardMeta(message: ChatMessageType): {
  effectiveMainBefore: string
  hideTranslationPromptBlocks: boolean
} {
  const { comment, rest } = parseCorrection(stripTranslationCanonicalRepeatRefLine(message.content))
  const displayText = rest
  const { mainBefore } = splitTranslationInvitation(displayText)
  let effectiveComment = comment
  let effectiveMainBefore = mainBefore
  let repeatTextForCard: string | null = null
  let hideTranslationMainCardForErrorRepeat = false

  const blocks = parseTranslationCoachBlocks(displayText)
  const translationProtocolStatus = resolveTranslationProtocolStatusFromFields({
    comment: blocks.comment ?? effectiveComment,
    commentIsPraise:
      (blocks.comment ?? effectiveComment) != null
        ? commentToneForContent(blocks.comment ?? effectiveComment ?? '') === 'praise'
        : undefined,
    translationSupportComment: blocks.translationSupportComment,
    errorsBlock: blocks.errorsBlock,
    repeat: blocks.repeat,
    repeatRu: blocks.repeatRu,
  })
  const translationSuccessShape = translationProtocolStatus === 'success'
  if (blocks.comment) effectiveComment = condenseTranslationCommentToErrors(blocks.comment)
  if (blocks.repeat) repeatTextForCard = blocks.repeat
  if (blocks.nextSentence) {
    const cleanedNextSentence = blocks.nextSentence
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(
        (line) =>
          Boolean(line) &&
          !TRANSLATION_PROTOCOL_BLOCK_LINE.test(line) &&
          !/^[+\?-]\s*:/i.test(line) &&
          !/^(?:Переведи|Переведите)(?:\s+далее)?\s*:/i.test(line)
      )
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    const fallbackFromInline = blocks.nextSentence
      .replace(
          /(?:Комментарий_перевод|Комментарий|Ошибки|Скажи|Say)\s*:[^.\n!?]*[.!?]?/gi,
        ' '
      )
      .replace(/[+\?-]\s*:[^.\n!?]*[.!?]?/g, ' ')
      .replace(/(?:Переведи|Переведите)[^.]*\./gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    effectiveMainBefore = cleanedNextSentence || fallbackFromInline || blocks.nextSentence
  } else {
    const extracted = extractTranslationCommentAndPrompt(mainBefore)
    if (!effectiveComment && extracted.comment) {
      effectiveComment = condenseTranslationCommentToErrors(extracted.comment)
    }
    effectiveMainBefore = extracted.promptText
  }
  if ((blocks.repeat || blocks.repeatRu) && !translationSuccessShape) {
    const extractedDrill = extractRussianTranslationDrillLine(displayText)
    const fromParsed = effectiveMainBefore.trim()
    const drillCandidate =
      [extractedDrill, fromParsed].find((s) => s && /[А-Яа-яЁё]/.test(s)) ?? ''
    if (drillCandidate) {
      hideTranslationMainCardForErrorRepeat = false
      effectiveMainBefore = drillCandidate
    } else {
      hideTranslationMainCardForErrorRepeat = true
      effectiveMainBefore = ''
    }
  }
  if (isGenericTranslationRepeatUiText(repeatTextForCard)) {
    repeatTextForCard = null
  }
  if (effectiveMainBefore) effectiveMainBefore = stripTranslationMainMetaPrefixes(effectiveMainBefore)

  const translationErrorCoachUi = translationProtocolStatus === 'error_repeat'
  const hideTranslationPromptBlocks =
    ((Boolean(repeatTextForCard) || Boolean(blocks.repeatRu)) &&
      !String(effectiveMainBefore ?? '').trim()) ||
    hideTranslationMainCardForErrorRepeat ||
    translationErrorCoachUi

  return { effectiveMainBefore, hideTranslationPromptBlocks }
}

/** Русская строка задания из последнего сообщения ассистента с карточкой «Переведи» (для ответа-ошибки без повтора задания). */
function findPriorTranslationDrillRussianLine(messages: ChatMessageType[], beforeIndex: number): string | null {
  for (let j = beforeIndex - 1; j >= 0; j--) {
    if (messages[j]?.role !== 'assistant') continue
    const { effectiveMainBefore } = computeAssistantTranslationMainCardMeta(messages[j])
    const t = effectiveMainBefore.trim()
    if (t) return t
  }
  return null
}

export default function Chat({
  messages,
  settings,
  loading,
  searchingInternet = false,
  searchingInternetLang = 'ru',
  atLimit,
  onSend,
  firstMessageError,
  onRetryFirstMessage,
  lastMessageIsError,
  onRetryLastMessage,
  retryMessage,
  onRequestTranslation,
  loadingTranslationIndex,
  forceNextMicLang,
  onConsumeForceNextMicLang,
  learningActions = [],
  onSelectLearningAction,
}: ChatProps) {
  const [input, setInput] = React.useState('')
  const [inputFocused, setInputFocused] = React.useState(false)
  const [listening, setListening] = React.useState(false)
  const [selectedLessonActionByMessage, setSelectedLessonActionByMessage] = React.useState<Record<number, string>>({})
  const isLearningFlow = learningActions.length > 0 || Object.keys(selectedLessonActionByMessage).length > 0
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaChunksRef = useRef<BlobPart[]>([])
  const mediaStopTimerRef = useRef<number | null>(null)
  /** Если `onstop` у MediaRecorder не сработал (редко на WebKit), принудительно освобождаем микрофон. */
  const mediaRecorderStopFallbackTimerRef = useRef<number | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const releaseMediaRecorderResources = useCallback(() => {
    if (mediaStopTimerRef.current != null) {
      window.clearTimeout(mediaStopTimerRef.current)
      mediaStopTimerRef.current = null
    }
    if (mediaRecorderStopFallbackTimerRef.current != null) {
      window.clearTimeout(mediaRecorderStopFallbackTimerRef.current)
      mediaRecorderStopFallbackTimerRef.current = null
    }
    const rec = mediaRecorderRef.current
    if (rec && rec.state !== 'inactive') {
      try {
        rec.stop()
      } catch {
        // ignore
      }
    }
    mediaRecorderRef.current = null
    const stream = mediaStreamRef.current
    if (stream) {
      for (const track of stream.getTracks()) track.stop()
    }
    mediaStreamRef.current = null
    mediaChunksRef.current = []
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const t = input.trim()
    if (!t || loading || atLimit) return
    onSend(t)
    setInput('')
  }

  const startListening = useCallback(async () => {
    if (typeof window === 'undefined') return

    const LISTENING_MAX_MS = 25_000
    const MEDIA_FALLBACK_MAX_MS = settings.mode === 'communication' ? 12_000 : 15_000
    const isCommunication = settings.mode === 'communication'
    const SpeechRecognitionAPI =
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition

    const forcedLocale =
      forceNextMicLang === 'ru' ? 'ru-RU' : forceNextMicLang === 'en' ? 'en-US' : null
    const lastUserText = isCommunication
      ? messages
          .filter((m) => m.role === 'user')
          .map((m) => m.content)
          .slice(-1)[0]
      : undefined
    const preferredLocale =
      settings.mode === 'communication'
        ? (forcedLocale ?? speechLocaleForCommunication(lastUserText, settings.communicationInputExpectedLang))
        : ('en-US' as const)

    const sttLangForApi: 'ru' | 'en' | 'auto' =
      forcedLocale != null
        ? sttLangFromLocale(forcedLocale)
        : isCommunication
          ? 'auto'
          : sttLangFromLocale(preferredLocale)

    const startMediaRecorderFallback = async (sttLang: 'ru' | 'en' | 'auto') => {
      if (!window.isSecureContext) {
        setInput('[Голосовой ввод работает только в защищённом контексте (HTTPS).]')
        return
      }
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        setInput('[Распознавание речи не поддерживается в этом браузере]')
        return
      }

      releaseMediaRecorderResources()
      setInput('')

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        mediaStreamRef.current = stream
        const mimeType = pickRecordingMimeType((mime) => MediaRecorder.isTypeSupported(mime))
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
        mediaRecorderRef.current = recorder
        mediaChunksRef.current = []
        setListening(true)

        recorder.ondataavailable = (e: BlobEvent) => {
          if (e.data && e.data.size > 0) {
            mediaChunksRef.current.push(e.data)
          }
        }

        recorder.onerror = () => {
          releaseMediaRecorderResources()
          setListening(false)
          setInput('[Ошибка записи аудио. Попробуйте ещё раз.]')
        }

        recorder.onstop = async () => {
          if (mediaRecorderStopFallbackTimerRef.current != null) {
            window.clearTimeout(mediaRecorderStopFallbackTimerRef.current)
            mediaRecorderStopFallbackTimerRef.current = null
          }
          const chunks = mediaChunksRef.current.slice()
          releaseMediaRecorderResources()
          setListening(false)
          if (!chunks.length) return

          const effectiveMimeType = mimeType || recorder.mimeType || 'application/octet-stream'
          const blob = new Blob(chunks, { type: effectiveMimeType })
          const fileName = effectiveMimeType.includes('mp4') ? 'speech.mp4' : effectiveMimeType.includes('webm') ? 'speech.webm' : 'speech.wav'
          const formData = new FormData()
          formData.append('audio', blob, fileName)
          if (sttLang !== 'auto') {
            formData.append('lang', sttLang)
          }

          try {
            const res = await fetch('/api/stt', {
              method: 'POST',
              body: formData,
            })
            const data = (await res.json()) as { text?: string; error?: string }
            if (!res.ok || !data.text) {
              setInput('[Не удалось распознать речь. Попробуйте ещё раз или введите текст.]')
              return
            }
            setInput(data.text.trim())
          } catch {
            setInput('[Ошибка сети при распознавании речи. Попробуйте ещё раз.]')
          }
        }

        const timesliceMs = 100
        recorder.start(timesliceMs)
        mediaStopTimerRef.current = window.setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop()
          }
        }, MEDIA_FALLBACK_MAX_MS)
      } catch (error) {
        releaseMediaRecorderResources()
        setListening(false)
        const code =
          (error as { name?: string; message?: string }).name ??
          (error as { message?: string }).message ??
          ''
        if (/notallowederror|permission/i.test(code.toLowerCase())) {
          setInput('[Нет доступа к микрофону. Разрешите микрофон для этого сайта и попробуйте снова.]')
          return
        }
        if (/notfounderror|devicesnotfounderror/i.test(code.toLowerCase())) {
          setInput('[Микрофон не найден на устройстве.]')
          return
        }
        if (/security|secure/i.test(code.toLowerCase())) {
          setInput('[Голосовой ввод работает только в защищённом контексте (HTTPS).]')
          return
        }
        setInput('[Не удалось записать аудио. Попробуйте ещё раз.]')
      }
    }

    const startBrowserSpeechRecognition = (lang: 'ru-RU' | 'en-US') => {
      if (!SpeechRecognitionAPI) {
        void startMediaRecorderFallback(sttLangForApi)
        return
      }

      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
      setInput('')

      const rec = new SpeechRecognitionAPI()
      rec.lang = lang
      rec.continuous = false
      rec.interimResults = false
      let gotTranscript = false
      let timedOut = false
      let safetyTimeoutId: number | null = null

      const clearSafetyTimeout = () => {
        if (safetyTimeoutId != null) {
          window.clearTimeout(safetyTimeoutId)
          safetyTimeoutId = null
        }
      }

      rec.addEventListener('start', () => {
        setListening(true)
        if (!isCommunication) return
        clearSafetyTimeout()
        safetyTimeoutId = window.setTimeout(() => {
          safetyTimeoutId = null
          if (recognitionRef.current !== rec || gotTranscript) return
          timedOut = true
          try {
            rec.stop()
          } catch {
            // ignore
          }
        }, LISTENING_MAX_MS)
      })

      rec.onresult = (event: SpeechRecognitionEvent) => {
        const last = event.results.length - 1
        const text = event.results[last]?.[0]?.transcript ?? ''
        const trimmed = text.trim()
        if (!trimmed) return
        if (isCommunication) clearSafetyTimeout()
        gotTranscript = true
        setInput(trimmed)
      }

      rec.onend = () => {
        if (isCommunication) clearSafetyTimeout()
        if (recognitionRef.current === rec) {
          if (isCommunication && timedOut && !gotTranscript) {
            recognitionRef.current = null
            setListening(false)
            setInput(
              '[Распознавание затянулось. Скажите короче или введите текст с клавиатуры (включая цифры и знаки).]'
            )
            return
          }
          recognitionRef.current = null
          setListening(false)
        }
      }

      rec.onerror = (event: Event) => {
        if (isCommunication) clearSafetyTimeout()
        const err = (event as unknown as { error?: string; message?: string }).error
        const msg = (event as unknown as { message?: string }).message
        const code = (err ?? msg ?? '').toString()
        if (/^aborted$/i.test(code)) {
          if (recognitionRef.current === rec) {
            recognitionRef.current = null
            setListening(false)
          }
          return
        }
        if (/not-allowed|permission/i.test(code)) {
          setInput('[Нет доступа к микрофону. Разрешите микрофон для этого сайта и попробуйте снова.]')
        } else if (/no-speech/i.test(code)) {
          setInput('[Речь не распознана. Скажите фразу ещё раз чуть громче.]')
        } else if (/network/i.test(code)) {
          setInput('[Ошибка сети при распознавании речи. Попробуйте ещё раз.]')
        } else if (code) {
          setInput(`[Ошибка распознавания речи: ${code}]`)
        }
        if (recognitionRef.current === rec) {
          recognitionRef.current = null
          setListening(false)
        }

        if (/service-not-allowed|not-allowed|audio-capture|network/i.test(code)) {
          void startMediaRecorderFallback(sttLangForApi)
        }
      }

      recognitionRef.current = rec
      try {
        rec.start()
      } catch {
        void startMediaRecorderFallback(sttLangForApi)
      }
    }

    const useFallback = shouldUseMediaRecorderFallback({
      hasSpeechRecognition: Boolean(SpeechRecognitionAPI),
      userAgent: window.navigator.userAgent,
    })

    if (useFallback) {
      await startMediaRecorderFallback(sttLangForApi)
    } else {
      startBrowserSpeechRecognition(preferredLocale)
    }

    if (forcedLocale) onConsumeForceNextMicLang?.()
  }, [
    settings.mode,
    settings.communicationInputExpectedLang,
    messages,
    forceNextMicLang,
    onConsumeForceNextMicLang,
    releaseMediaRecorderResources,
  ])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
      recognitionRef.current = null
    }
    if (mediaStopTimerRef.current != null) {
      window.clearTimeout(mediaStopTimerRef.current)
      mediaStopTimerRef.current = null
    }
    const rec = mediaRecorderRef.current
    if (rec && rec.state !== 'inactive') {
      try {
        rec.stop()
      } catch {
        // ignore
      }
    }
    if (mediaRecorderRef.current != null) {
      if (mediaRecorderStopFallbackTimerRef.current != null) {
        window.clearTimeout(mediaRecorderStopFallbackTimerRef.current)
      }
      mediaRecorderStopFallbackTimerRef.current = window.setTimeout(() => {
        mediaRecorderStopFallbackTimerRef.current = null
        if (mediaStreamRef.current != null || mediaRecorderRef.current != null) {
          releaseMediaRecorderResources()
        }
      }, 2500)
    }
    setListening(false)
  }, [releaseMediaRecorderResources])

  const SHOW_TYPING_DELAY_MS = 220
  const [showTypingIndicator, setShowTypingIndicator] = useState(false)
  const typingDelayTimerRef = useRef<number | null>(null)

  // Чтобы индикатор "ИИ печатает…" не мигал при очень быстром ответе от сервера,
  // показываем его только после небольшой задержки, если loading всё ещё true.
  useEffect(() => {
    if (!loading || messages.length === 0) {
      if (typingDelayTimerRef.current) window.clearTimeout(typingDelayTimerRef.current)
      typingDelayTimerRef.current = null
      setShowTypingIndicator(false)
      return
    }

    if (typingDelayTimerRef.current) window.clearTimeout(typingDelayTimerRef.current)
    typingDelayTimerRef.current = window.setTimeout(() => {
      setShowTypingIndicator(true)
    }, SHOW_TYPING_DELAY_MS)

    return () => {
      if (typingDelayTimerRef.current) window.clearTimeout(typingDelayTimerRef.current)
      typingDelayTimerRef.current = null
    }
  }, [loading, messages.length])

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const INPUT_MAX_HEIGHT_PX = 260
  const INPUT_GAP_PX = 10
  /** База 0.625rem (как `pt-2.5`) + safe-area / клавиатура (`--vv-bottom-inset`), без затирания нижней части `py` инлайном. */
  const INPUT_COMPOSER_PADDING_BOTTOM =
    'calc(0.625rem + max(env(safe-area-inset-bottom, 0px), var(--vv-bottom-inset)))'

  const adjustInputHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const h = Math.min(el.scrollHeight, INPUT_MAX_HEIGHT_PX)
    el.style.height = `${h}px`
  }, [])

  const syncComposerHeight = useCallback(() => {
    const form = formRef.current
    if (!form || typeof window === 'undefined') return
    const root = document.documentElement
    const rect = form.getBoundingClientRect()
    const height = Math.max(0, Math.round(rect.height))
    root.style.setProperty('--chat-input-height', `${height}px`)
  }, [])

  React.useEffect(() => {
    adjustInputHeight()
  }, [input, adjustInputHeight])

  React.useEffect(() => {
    syncComposerHeight()
    const form = formRef.current
    if (!form || typeof window === 'undefined') return

    let raf = 0
    const scheduleSync = () => {
      if (raf) return
      raf = window.requestAnimationFrame(() => {
        raf = 0
        syncComposerHeight()
      })
    }

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleSync) : null
    observer?.observe(form)

    window.addEventListener('resize', scheduleSync, { passive: true })
    window.addEventListener('orientationchange', scheduleSync, { passive: true })

    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      observer?.disconnect()
      window.removeEventListener('resize', scheduleSync)
      window.removeEventListener('orientationchange', scheduleSync)
    }
  }, [syncComposerHeight])

  React.useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    // Для первого экрана урока показываем начало сообщения (верх),
    // а не прокручиваем к кнопкам внизу.
    if (isLearningFlow && messages.length === 1) {
      el.scrollTop = 0
      return
    }
    if (isLearningFlow && messages.length > 1) {
      // В уроке после выбора кнопки выравниваем по новому пузырю ИИ:
      // предыдущая неактивная кнопка должна уходить выше видимой области.
      const lastAssistantIndex = messages.length - 1
      const target = el.querySelector<HTMLElement>(`[data-message-index="${lastAssistantIndex}"][data-role="assistant"]`)
      if (target) {
        const top = Math.max(0, target.offsetTop - 8)
        el.scrollTo({ top, behavior: 'smooth' })
        return
      }
    }
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, isLearningFlow])

  // Индекс последнего assistant-сообщения нужен, чтобы автоскрывать
  // карточку перевода у предыдущих сообщений.
  const lastAssistantIndex = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === 'assistant') return i
    }
    return -1
  }, [messages])

  /** Первое сообщение ассистента с видимой карточкой русского задания (подпись «Переведи:», не «… далее»). */
  const firstTranslationMainExerciseIndex = React.useMemo(() => {
    if (settings.mode !== 'translation') return -1
    for (let j = 0; j < messages.length; j++) {
      if (messages[j].role !== 'assistant') continue
      const { effectiveMainBefore, hideTranslationPromptBlocks } = computeAssistantTranslationMainCardMeta(messages[j])
      if (effectiveMainBefore.trim() && !hideTranslationPromptBlocks) return j
    }
    return -1
  }, [messages, settings.mode])

  const lastMessageRole = messages[messages.length - 1]?.role ?? null
  const canShowTypingIndicator = showTypingIndicator && loading && lastMessageRole === 'user'

  React.useEffect(() => {
    if (messages.length === 0) setSelectedLessonActionByMessage({})
  }, [messages.length])

  /** Диалог и общение — MyEng; тренировка перевода — без изменений. */
  const isSearchingIndicatorEnglish = settings.mode === 'communication' && searchingInternetLang === 'en'
  const sendButtonLabelShort = 'Send'
  const sendButtonLabelLong =
    settings.mode === 'communication' && settings.communicationInputExpectedLang === 'en' ? 'Send' : 'Отправить'
  const typingIndicatorText =
    settings.mode === 'translation'
      ? `ИИ печатает${retryMessage ? `… ${retryMessage}` : '…'}`
      : searchingInternet
        ? isSearchingIndicatorEnglish
          ? 'MyEng is searching the web...'
          : 'MyEng ищет в интернете...'
        : `MyEng печатает${retryMessage ? `… ${retryMessage}` : '...'}`

  return (
    <div className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,var(--chat-wallpaper)_0%,var(--chat-wallpaper-soft)_100%)]">
      <div className="chat-shell-x flex min-h-0 flex-1 flex-col py-2 sm:py-3">
        <div className="mx-auto flex min-h-0 flex-1 w-full max-w-[29rem] flex-col">
          <div className="flex min-h-0 flex-1 w-full flex-col overflow-hidden rounded-[1.15rem] border border-white/55 bg-[rgba(255,255,255,0.28)] shadow-sm backdrop-blur-[2px]">
            <div
              ref={scrollContainerRef}
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[linear-gradient(180deg,var(--chat-message-wallpaper)_0%,var(--chat-message-wallpaper-soft)_100%)] p-2.5 sm:p-3"
              style={{
                paddingBottom: `calc(0.625rem + var(--chat-input-height) + ${INPUT_GAP_PX}px)`,
                scrollPaddingBottom: `calc(0.625rem + var(--chat-input-height) + ${INPUT_GAP_PX}px)`,
              }}
            >
              {messages.length === 0 && (
                <p className="text-center text-[var(--text-muted)]">
                  MyEng печатает...
                </p>
              )}
              {messages.map((msg, i) => {
                const defaultBubblePosition = getBubblePosition(messages[i - 1]?.role, msg.role, messages[i + 1]?.role)
                const bubblePosition =
                  isLearningFlow && msg.role === 'assistant'
                    ? 'solo'
                    : defaultBubblePosition

                return (
                  <React.Fragment key={i}>
                    <MessageBubble
                      message={msg}
                      messageIndex={i}
                      activeAssistantIndex={lastAssistantIndex}
                      voiceId={settings.voiceId}
                      mode={settings.mode}
                      bubblePosition={bubblePosition}
                      onRequestTranslation={onRequestTranslation}
                      isLoadingTranslation={loadingTranslationIndex === i}
                      translationHeadingWelcome={
                        settings.mode !== 'translation' ||
                        msg.role !== 'assistant' ||
                        firstTranslationMainExerciseIndex < 0 ||
                        i === firstTranslationMainExerciseIndex
                      }
                      translationDrillRuFallback={
                        settings.mode === 'translation' && msg.role === 'assistant' && i > 0
                          ? findPriorTranslationDrillRussianLine(messages, i)
                          : null
                      }
                    />
                    {firstMessageError &&
                      onRetryFirstMessage &&
                      messages.length === 1 &&
                      msg.role === 'assistant' &&
                      msg.content === firstMessageError && (
                        <div className="mt-2 rounded-lg border border-amber-500/50 bg-amber-50 p-2.5">
                          <p className="mb-2 text-sm font-medium text-[var(--text)]">
                            Что сделать:
                          </p>
                          <ol className="mb-3 list-inside list-decimal space-y-1 text-xs text-[var(--text-muted)]">
                            <li>Нажмите кнопку меню (три полоски) слева.</li>
                            <li>Вставьте ключ с сайта openrouter.ai в поле «Ключ OpenRouter».</li>
                            <li>Нажмите «Сохранить».</li>
                            <li>Нажмите «Попробовать снова» ниже.</li>
                          </ol>
                          <button
                            type="button"
                            onClick={onRetryFirstMessage}
                            disabled={loading}
                            className="btn-3d rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
                          >
                            Попробовать снова
                          </button>
                        </div>
                      )}
                    {i === messages.length - 1 &&
                      lastMessageIsError &&
                      onRetryLastMessage &&
                      !(messages.length === 1 && msg.content === firstMessageError) && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={onRetryLastMessage}
                            disabled={loading}
                            className="btn-3d rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
                          >
                            Повторить
                          </button>
                        </div>
                      )}
                    {!loading &&
                      msg.role === 'assistant' &&
                      learningActions.length > 0 &&
                      onSelectLearningAction &&
                      (() => {
                        const selectedActionId = selectedLessonActionByMessage[i] ?? null
                        const isCurrentStep = i === messages.length - 1
                        if (!selectedActionId && !isCurrentStep) return null
                        const visibleActions = selectedActionId
                          ? learningActions.filter((action) => action.id === selectedActionId)
                          : learningActions
                        if (visibleActions.length === 0) return null
                        const actionBlockSpacingClass = selectedActionId ? 'mt-2 mb-2' : 'mt-1.5 mb-1.5'
                        return (
                          <div className={`${actionBlockSpacingClass} flex justify-end`}>
                            <div className="flex w-fit flex-col items-end gap-2">
                              {visibleActions.map((action) => {
                                const isDisabled = selectedActionId === action.id
                                return (
                                  <button
                                    key={action.id}
                                    type="button"
                                    onClick={() => {
                                      if (isDisabled) return
                                      setSelectedLessonActionByMessage((prev) => ({ ...prev, [i]: action.id }))
                                      onSelectLearningAction(action.id)
                                    }}
                                    disabled={isDisabled}
                                    className={
                                      isDisabled
                                        ? 'btn-3d-menu inline-flex w-fit max-w-full items-center justify-center rounded-xl border border-gray-300 bg-gradient-to-b from-gray-400 to-gray-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 touch-manipulation min-h-[44px] cursor-default'
                                        : PAGE_HOME_START_PRIMARY_BUTTON_CLASS
                                    }
                                  >
                                    {action.label}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })()}
                  </React.Fragment>
                )
              })}
              {canShowTypingIndicator && messages.length > 0 && (
                <div className="mt-1.5 flex justify-start">
                  <span
                    className="rounded-xl border border-gray-200 bg-[var(--chat-section-neutral)] px-3 py-2 text-[14px] italic text-[var(--text)] shadow-sm"
                    title={searchingInternet ? 'Поиск информации в интернете' : 'Ожидание ответа от ИИ'}
                  >
                    {typingIndicatorText}
                  </span>
                </div>
              )}
            </div>
            <div
              // Важно для iOS: paddingBottom может оставаться (safe-area / visual viewport),
              // и если фон полупрозрачный — пользователь видит "серую панель".
              // Делаем обёртку прозрачной, чтобы в резерве просвечивал фон чата.
              className="shrink-0 border-t border-white/55 bg-transparent px-2.5 pt-2.5 sm:px-3"
              style={{
                paddingBottom: INPUT_COMPOSER_PADDING_BOTTOM,
              }}
            >
              <form
                ref={formRef}
                onSubmit={handleSubmit}
                className="flex w-full items-center gap-2 rounded-[1.1rem] border border-white/70 bg-white/90 px-2.5 py-1.5 shadow-sm sm:px-3"
              >
                <button
                  type="button"
                  onClick={listening ? stopListening : startListening}
                  className={`btn-3d flex h-11 min-h-[44px] shrink-0 items-center justify-center rounded-lg p-2.5 touch-manipulation ${
                    listening
                      ? 'bg-red-500/20 text-red-600'
                      : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  }`}
                  title={listening ? 'Остановить' : 'Голосовой ввод'}
                  aria-label={listening ? 'Остановить запись' : 'Голосовой ввод'}
                >
                  {listening ? (
                    <span className="h-5 w-5 rounded-full bg-red-500 animate-pulse" />
                  ) : (
                    <MicIcon />
                  )}
                </button>
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      formRef.current?.requestSubmit()
                    }
                  }}
                  placeholder={
                    inputFocused
                      ? ''
                      : settings.mode === 'communication'
                        ? settings.communicationInputExpectedLang === 'en'
                          ? 'Reply...'
                          : 'Ответ...'
                        : 'Reply...'
                  }
                  className="min-w-0 flex-1 resize-none overflow-y-hidden rounded-[1rem] border border-emerald-100 bg-white px-3 py-2 min-h-[44px] text-[var(--text)] placeholder:text-[var(--text-muted)] text-base leading-[1.45rem] focus:outline-none focus:ring-0"
                  style={{ maxHeight: INPUT_MAX_HEIGHT_PX }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading || atLimit}
                  className="btn-3d inline-flex touch-manipulation items-center justify-center rounded-lg bg-emerald-600 px-3.5 py-1.5 min-h-[44px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600"
                  aria-label={sendButtonLabelLong}
                >
                  <span className="sm:hidden">{sendButtonLabelShort}</span>
                  <span className="hidden sm:inline">{sendButtonLabelLong}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function isErrorLikeMessage(content: string): boolean {
  return (
    content === 'Не удалось загрузить ответ. Проверьте сеть и настройки сервера.' ||
    content.startsWith('ИИ не отвечает') ||
    content.startsWith('Модель вернула некорректный ответ') ||
    content.startsWith('Модель вернула пустой ответ') ||
    content.startsWith('Диалог слишком длинный') ||
    content.startsWith('Ответ занял слишком много времени') ||
    content.startsWith('Загрузка занимает слишком много времени') ||
    content.startsWith('Не удалось получить ответ') ||
    content.includes('OPENROUTER_API_KEY') ||
    content.startsWith('Неверный ключ') ||
    content.startsWith('Превышен лимит') ||
    content.startsWith('Сервис ИИ временно') ||
    content.startsWith('ИИ сейчас перегружен и немного «ушёл отдыхать»') ||
    content.startsWith('Слишком много запросов к ИИ') ||
    content.startsWith('Сейчас ИИ недоступен')
  )
}

function detectTextLang(text: string): 'ru' | 'en' {
  const cyrCount = (text.match(/[А-Яа-яЁё]/g) ?? []).length
  const latCount = (text.match(/[A-Za-z]/g) ?? []).length
  return latCount > cyrCount ? 'en' : 'ru'
}

function extractRepeatPrompt(text: string): { repeatText: string } | null {
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    // Модель иногда добавляет префиксы "AI:"/"Assistant:" перед служебными строками.
    const line = lines[i].replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim()
    if (!line) continue
    const m = /^(Скажи|Say)\s*:?\s*(.*)$/i.exec(line)
    if (!m) continue
    let afterKeyword = (m[2] ?? '').trim()
    // Если после "Скажи:" на этой строке пусто или только ":", смотрим следующую непустую строку
    if (!afterKeyword || /^[:.]$/.test(afterKeyword)) {
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j].trim()
        if (next) {
          afterKeyword = next
          break
        }
      }
    }
    const firstSentenceMatch = afterKeyword.match(/^[^.!?]+[.!?]?/)
    const repeatText = (firstSentenceMatch ? firstSentenceMatch[0] : afterKeyword).trim()
    if (!repeatText || repeatText.length < 2 || /^[:\s.]*$/.test(repeatText)) return null
    return { repeatText }
  }
  return null
}

function MessageBubble({
  message,
  messageIndex,
  activeAssistantIndex,
  voiceId,
  mode,
  bubblePosition,
  onRequestTranslation,
  isLoadingTranslation,
  translationHeadingWelcome = true,
  translationDrillRuFallback = null,
}: {
  message: ChatMessageType
  messageIndex: number
  activeAssistantIndex: number
  voiceId: string
  mode: 'dialogue' | 'translation' | 'communication'
  bubblePosition: BubblePosition
  onRequestTranslation?: (index: number, text: string) => void
  isLoadingTranslation?: boolean
  /** Первое задание перевода в чате — подпись «Переведи:»; иначе «Переведи далее:». */
  translationHeadingWelcome?: boolean
  /** Если в ответе только протокол ошибки — подставить русское задание из предыдущего хода ассистента. */
  translationDrillRuFallback?: string | null
}) {
  const isUser = message.role === 'user'
  const isInternetMessage =
    message.role === 'assistant' &&
    (Boolean(message.webSearchTriggered) || (message.webSearchSources?.length ?? 0) > 0)
  const visibleContent =
    message.role === 'assistant' && !isInternetMessage
      ? stripTranslationCanonicalRepeatRefLine(message.content.replace(/^\s*\(i\)\s*/i, '').trimStart())
      : message.content
  const [showTranslation, setShowTranslation] = React.useState(false)
  const translationRequestedRef = useRef(false)
  const prevTranslationErrorRef = useRef<string | undefined>(undefined)
  const prevActiveAssistantIndexRef = useRef(activeAssistantIndex)
  const { comment, rest } =
    message.role === 'assistant' ? parseCorrection(visibleContent) : { comment: null, rest: visibleContent }

  const displayText = message.role === 'assistant' ? rest : visibleContent
  /** На ошибке перевода не показываем «Переведи далее:» — только «Переведи:» для того же задания. */
  let translationMainDrillHeadingWelcome = translationHeadingWelcome
  const isTranslationMode = mode === 'translation' && !isUser
  const { mainBefore, invitation: invitationText, mainAfter } =
    isTranslationMode && displayText
      ? splitTranslationInvitation(displayText)
      : { mainBefore: displayText ?? '', invitation: null as string | null, mainAfter: '' }
  const isCommunicationEnglish = !isUser && mode === 'communication' && detectTextLang(displayText ?? '') === 'en'

  // При правильном ответе ИИ пишет похвалу (Комментарий: Отлично! / Молодец! и т.д.) — блок "Правильно:" не показываем
  const isCorrectAnswerPraise = Boolean(comment && /^(Отлично|Молодец|Верно|Хорошо|Супер|Правильно)[!.]?\s*/i.test(comment.trim()))
  const repeatPrompt = !isUser && !isTranslationMode ? extractRepeatPrompt(mainBefore) : null
  // Если это похвала (ответ правильный), игнорируем "Скажи:" даже если модель его вывела.
  // Иначе UI может зациклиться на повторении.
  const effectiveRepeatPrompt = isCorrectAnswerPraise ? null : repeatPrompt
  let repeatTextForCard = effectiveRepeatPrompt?.repeatText ?? null

  const handleSpeak = () => {
    // Для озвучки:
    // 1) если есть "Скажи", озвучиваем только его;
    // 2) иначе озвучиваем основной текст, убрав служебные префиксы Скажи/Say.
    const base = repeatTextForCard || rest || visibleContent
    const speakText = base
      ? base.replace(/^(Скажи|Say)\s*:?\s*/i, '').trim()
      : ''
    if (speakText) speak(speakText, voiceId)
  }

  const textToTranslate = repeatTextForCard || rest || visibleContent
  const errorLike = !isUser && isErrorLikeMessage(visibleContent)
  const hasSpeakableText =
    !isUser && mode !== 'translation' && Boolean(textToTranslate) && !errorLike && (mode !== 'communication' || isCommunicationEnglish)
  const hasTranslationData = !isUser && Boolean(message.translation)
  const hasTranslationError = !isUser && Boolean(message.translationError)
  const hasTranslationButton = !isUser && mode !== 'translation' && !errorLike && (mode === 'dialogue' || isCommunicationEnglish)
  const showSpeakButton = hasSpeakableText
  const webSearchSources = message.webSearchSources ?? []
  const showAllWebSearchSources = Boolean(message.webSearchSourcesShowAll)
  const visibleWebSearchSources = showAllWebSearchSources ? webSearchSources : webSearchSources.slice(0, 5)
  const webSearchSourcesHiddenCount = message.webSearchSourcesHiddenCount ?? 0
  const showWebSearchSources = !isUser && Boolean(message.webSearchSourcesRequested)
  // Дополнительная UI-страховка: если модель нарушила формат и выдала русскую "мета" строку
  // (кириллица, без вопроса) — не показываем её как "AI: ...".
  const hideRussianNonQuestionMainBefore =
    !isUser &&
    !isTranslationMode &&
    !errorLike &&
    isCorrectAnswerPraise &&
    Boolean(mainBefore) &&
    /[А-Яа-яЁё]/.test(mainBefore) &&
    !/\?\s*$/.test(mainBefore)
  let effectiveComment = comment
  let effectiveTenseRef: string | null = null
  let effectiveThreeFormsText: string | null = null
  let effectiveMainBefore = mainBefore
  let effectiveInvitationText = invitationText
  let hideTranslationMainCardForErrorRepeat = false
  let translationErrorsText: string | null = null
  let translationSupportComment: string | null = null
  let translationErrorCoachUi = false
  let translationProtocolStatus: TranslationProtocolStatus = 'prompt_only'
  let repeatRuForCard: string | null = null
  let translationSuccessShape = false
  if (!isUser && isTranslationMode) {
    const blocks = parseTranslationCoachBlocks(displayText)
    const hiddenRepeatRef = extractCanonicalRepeatRefEnglishFromContent(message.content)?.trim() ?? ''
    const translationProtocolStatusFromBlocks = resolveTranslationProtocolStatusFromFields({
      comment: blocks.comment ?? effectiveComment,
      commentIsPraise:
        (blocks.comment ?? effectiveComment) != null
          ? commentToneForContent(blocks.comment ?? effectiveComment ?? '') === 'praise'
          : undefined,
      translationSupportComment: blocks.translationSupportComment,
      errorsBlock: blocks.errorsBlock,
      repeat: blocks.repeat,
      repeatRu: blocks.repeatRu,
    })
    translationSuccessShape = translationProtocolStatusFromBlocks === 'success'
    const { praiseFromComment } = extractTranslationErrorSynthAndPraiseFromComment(blocks.comment?.trim() ?? '')
    const { errorsRest, praiseFromErrors } = partitionEncouragementLinesFromTranslationErrorsPayload(
      blocks.errorsBlock?.trim() ?? ''
    )
    const praiseForSupport = dedupeTranslationPraiseParagraphs([praiseFromErrors, praiseFromComment])
    translationSupportComment = (() => {
      const base = blocks.translationSupportComment?.trim() ?? ''
      const extra = praiseForSupport.length ? praiseForSupport.join('\n\n') : ''
      if (!base && !extra) return null
      if (!base) return extra
      if (!extra) return base
      return `${base}\n\n${extra}`
    })()
    translationErrorCoachUi = translationProtocolStatusFromBlocks === 'error_repeat'
    if (blocks.comment) {
      const praiseFromParseCorrection = Boolean(comment && commentToneForContent(comment) === 'praise')
      const condensedComment = condenseTranslationCommentToErrors(blocks.comment)
      if (translationSuccessShape && praiseFromParseCorrection) {
        const base = effectiveComment?.trim() ?? ''
        const extra = condensedComment.trim()
        if (extra && !base.includes(extra)) {
          effectiveComment = [base, extra].filter(Boolean).join('\n')
        }
      } else {
        effectiveComment = condensedComment
      }
    }
    if (blocks.repeat) repeatTextForCard = blocks.repeat
    repeatRuForCard = blocks.repeatRu
    if (!repeatRuForCard && !translationSuccessShape && hiddenRepeatRef) {
      repeatRuForCard = hiddenRepeatRef
    }
    const errorsFromPayload = errorsRest.trim()
    const errorsMerged = mergeErrorsBlockWithSyntheticFromComment(errorsFromPayload, blocks.comment)
    const errorsResolved = filterTranslationErrorsDisplayText(errorsMerged.trim())
    translationErrorsText = Boolean(!translationSuccessShape && errorsResolved)
      ? errorsResolved
      : null
    if (blocks.nextSentence) {
      const cleanedNextSentence = blocks.nextSentence
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => {
          if (!line) return false
          if (TRANSLATION_PROTOCOL_BLOCK_LINE.test(line)) return false
          if (/^[+\?-]\s*:/i.test(line)) return false
          if (/^(?:Переведи|Переведите)(?:\s+далее)?\s*:/i.test(line)) {
            // Строка задания «Переведи далее: …» целиком нужна для карточки; отбрасываем только «Переведи на английский.».
            return /:\s*[А-Яа-яЁё]/.test(line)
          }
          return true
        })
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      const fallbackFromInline = blocks.nextSentence
        .replace(
          /(?:Комментарий_перевод|Комментарий|Ошибки|Скажи|Say)\s*:[^.\n!?]*[.!?]?/gi,
          ' '
        )
        .replace(/[+\?-]\s*:[^.\n!?]*[.!?]?/g, ' ')
        .replace(/(?:^|\n)\s*(?:\d+\)\s*)?(?:Переведи|Переведите)\s+на\s+английский(?:\s+язык)?\.\s*/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      effectiveMainBefore = cleanedNextSentence || fallbackFromInline || blocks.nextSentence
    } else {
      const extracted = extractTranslationCommentAndPrompt(mainBefore)
      if (!effectiveComment && extracted.comment) {
        effectiveComment = condenseTranslationCommentToErrors(extracted.comment)
      }
      effectiveMainBefore = extracted.promptText
    }
    const ruFbTrim = translationDrillRuFallback?.trim() ?? ''
    if ((blocks.repeat || blocks.repeatRu) && !translationSuccessShape) {
      const extractedDrill = extractRussianTranslationDrillLine(displayText)
      const fromParsed = effectiveMainBefore.trim()
      const drillCandidateRaw =
        [ruFbTrim, extractedDrill, fromParsed].find((s) => s && /[А-Яа-яЁё]/.test(s)) ?? ''
      if (drillCandidateRaw) {
        hideTranslationMainCardForErrorRepeat = false
        effectiveMainBefore = drillCandidateRaw
      } else {
        hideTranslationMainCardForErrorRepeat = true
        effectiveMainBefore = ''
        effectiveInvitationText = null
        translationMainDrillHeadingWelcome = true
      }
    }
    if (blocks.invitation) effectiveInvitationText = blocks.invitation
    if (effectiveInvitationText && !isGenericTranslationMetaInvitation(effectiveInvitationText)) {
      const invitationBody = stripTranslationInvitationPrefix(effectiveInvitationText)
      if (!isLikelyRussianTranslationDrill(effectiveInvitationText) && invitationBody) {
        if (translationSuccessShape) {
          const merged = [effectiveComment?.trim() ?? '', invitationBody].filter(Boolean).join('\n')
          effectiveComment = merged || effectiveComment
        }
        effectiveInvitationText = null
      }
    }
    if (effectiveMainBefore) effectiveMainBefore = stripTranslationMainMetaPrefixes(effectiveMainBefore)
    if (effectiveInvitationText && isGenericTranslationMetaInvitation(effectiveInvitationText)) {
      effectiveInvitationText = null
    }
    if (ruFbTrim && hideTranslationMainCardForErrorRepeat && !String(effectiveMainBefore ?? '').trim()) {
      effectiveMainBefore = stripTranslationMainMetaPrefixes(ruFbTrim)
      hideTranslationMainCardForErrorRepeat = false
    }
    translationProtocolStatus = resolveTranslationProtocolStatus({
      mode,
      translationSuccessShape,
      translationErrorCoachUi,
    })
  }
  if (isGenericTranslationRepeatUiText(repeatTextForCard)) {
    repeatTextForCard = null
  }
  // SUCCESS в translation: держим только короткий praise-комментарий без старых служебных блоков.
  const translationPraiseDisplayText =
    !isUser && isTranslationMode && translationSuccessShape
      ? (effectiveComment?.trim() || null)
      : null
  const translationSuccessPraiseCard = Boolean(translationPraiseDisplayText)
  const showOnlyRepeat = !isTranslationMode && Boolean(repeatTextForCard)
  // Источник истины: в error-repeat показываем только коррекционные карточки.
  const hideTranslationPromptBlocks =
    (isTranslationMode && translationProtocolStatus === 'error_repeat') || hideTranslationMainCardForErrorRepeat

  const mainAfterVisibleForBubble =
    Boolean(mainAfter) && !effectiveMainBefore && !effectiveInvitationText
  const hasContent = isUser
    ? Boolean(message.content)
    : Boolean(
        effectiveComment ||
          translationPraiseDisplayText ||
          (translationErrorCoachUi && translationSupportComment) ||
          translationErrorsText ||
          effectiveMainBefore ||
          (translationErrorCoachUi && repeatRuForCard) ||
          (mainAfterVisibleForBubble ? mainAfter : false) ||
          effectiveInvitationText ||
          rest ||
          message.content ||
          message.translation
      )
  const isBubbleEnd = bubblePosition === 'solo' || bubblePosition === 'last'
  const rowSpacingClass = isBubbleEnd ? 'mb-2.5' : 'mb-0.5'
  const radius = bubbleRadiusClass(isUser, bubblePosition)
  const assistantSections = isUser
    ? []
    : buildAssistantSections({
        comment: translationSuccessPraiseCard ? translationPraiseDisplayText : effectiveComment,
        translationSupportComment,
        translationErrorCoachUi,
        translationProtocolStatus,
        translationSuccessPraiseCard,
        translationErrorsText,
        showOnlyRepeat,
        hidePromptBlocks: hideTranslationPromptBlocks,
        repeatTextForCard,
        repeatRuTextForCard: repeatRuForCard,
        mainBefore: effectiveMainBefore,
        hideRussianNonQuestionMainBefore,
        invitationText: effectiveInvitationText,
        mainAfter,
        mode,
        translationHeadingWelcome: translationMainDrillHeadingWelcome,
      })

  React.useEffect(() => {
    if (!showTranslation) {
      translationRequestedRef.current = false
      return
    }
    if (hasTranslationData || !onRequestTranslation || !textToTranslate.trim()) return
    if (translationRequestedRef.current) return
    translationRequestedRef.current = true
    onRequestTranslation(messageIndex, textToTranslate)
  }, [showTranslation, hasTranslationData, onRequestTranslation, textToTranslate, messageIndex])

  React.useEffect(() => {
    const currentError = message.translationError
    const prevError = prevTranslationErrorRef.current
    prevTranslationErrorRef.current = currentError

    if (!showTranslation) return

    // Авто-сворачивание при любой ошибке перевода (пустой ответ, таймаут, сеть),
    // только в момент появления ошибки, чтобы при повторном клике "Перевод"
    // панель не схлопывалась и пользователь увидел результат.
    const isTranslationError = typeof currentError === 'string' && currentError.length > 0
    const justAppeared = prevError !== currentError
    if (isTranslationError && justAppeared) {
      setShowTranslation(false)
    }
  }, [showTranslation, message.translationError])

  // При появлении нового assistant-сообщения закрываем переводы
  // у всех предыдущих карточек.
  React.useEffect(() => {
    const prevActiveAssistantIndex = prevActiveAssistantIndexRef.current
    prevActiveAssistantIndexRef.current = activeAssistantIndex

    if (!showTranslation) return
    if (prevActiveAssistantIndex === activeAssistantIndex) return
    if (activeAssistantIndex < 0) return
    if (messageIndex !== activeAssistantIndex) setShowTranslation(false)
  }, [activeAssistantIndex, messageIndex, showTranslation])

  if (!hasContent) return null

  return (
    <div
      data-message-index={messageIndex}
      data-role={message.role}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${rowSpacingClass}`}
    >
      <div
        className={`relative flex min-w-0 max-w-[90%] flex-col px-3 py-2 text-[15px] leading-[1.45] shadow-sm ${radius} ${
          isUser
            ? 'border border-[var(--chat-user-bubble-border)] bg-[var(--chat-user-bubble)] text-[var(--chat-user-text)]'
            : 'border border-[var(--chat-assistant-border)] bg-[var(--chat-assistant-shell)] text-[var(--text)] backdrop-blur-[2px]'
        }`}
      >
        {isUser ? (
          <>
            <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.45] font-normal">
              {message.content}
            </p>
          </>
        ) : (
          <>
            {assistantSections.length > 0 && (
              <div className="space-y-1.5" role="alert">
                {assistantSections.map((section) => (
                  <SectionCard
                    key={section.key}
                    tone={section.tone}
                    label={section.label}
                    text={section.text}
                    italic={section.italic}
                    small={section.small}
                    singleLine={section.singleLine}
                    trailingAction={section.trailingAction}
                    onSpeak={section.trailingAction === 'speak' ? handleSpeak : undefined}
                    inlineMarkdownBold
                    emphasizeMainText={section.emphasizeMainText}
                  />
                ))}
              </div>
            )}
            {(showSpeakButton || hasTranslationButton) && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {showSpeakButton && (
                  <button
                    type="button"
                    onClick={handleSpeak}
                    className="btn-3d-subtle flex w-fit items-center justify-center gap-1 rounded-full border border-[var(--border)] bg-white/80 px-2.5 py-0.5 text-xs text-[var(--text-muted)] hover:bg-white hover:text-[var(--text)]"
                    title="Озвучить"
                  >
                    <SpeakerIcon /> Озвучить
                  </button>
                )}
                {hasTranslationButton && (
                  <button
                    type="button"
                    onClick={() => setShowTranslation((v) => !v)}
                    className="btn-3d-subtle flex w-fit items-center justify-center gap-1.5 rounded-full border border-[var(--border)] bg-white/80 px-2.5 py-0.5 text-xs text-[var(--text-muted)] hover:bg-white hover:text-[var(--text)]"
                    title={showTranslation ? 'Скрыть перевод' : 'Показать перевод'}
                  >
                    {!showTranslation && (
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          hasTranslationData ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        aria-hidden
                      />
                    )}
                    {showTranslation ? 'Скрыть перевод' : 'Перевод'}
                  </button>
                )}
              </div>
            )}
            {showWebSearchSources && (
              <div className="mt-2 rounded-xl border border-slate-200 bg-[var(--chat-section-slate)] px-3 py-2 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-600">
                  Источники
                </p>
                {webSearchSources.length > 0 ? (
                  <ul className="mt-1.5 space-y-1 text-sm leading-snug text-[var(--text)]">
                    {visibleWebSearchSources.map((source, index) => {
                      const cleanUrl = normalizeWebSearchSourceUrl(source.url)
                      return (
                        <li key={`${cleanUrl}-${index}`} className="break-words">
                          {source.title ? (
                            <div className="text-[13px] font-medium text-slate-700">{source.title}</div>
                          ) : null}
                          <a
                            href={cleanUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="underline underline-offset-2 decoration-slate-500 text-slate-700 hover:text-slate-900"
                          >
                            {cleanUrl}
                          </a>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="mt-1.5 text-sm italic text-[var(--text-muted)]">
                    Источники не найдены.
                  </p>
                )}
                {!showAllWebSearchSources && webSearchSources.length > visibleWebSearchSources.length && (
                  <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                    Найдено источников: {webSearchSources.length} (показано 5).
                  </p>
                )}
                {webSearchSourcesHiddenCount > 0 && (
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Скрыто устаревших источников: {webSearchSourcesHiddenCount}.
                  </p>
                )}
              </div>
            )}
            {(showTranslation && hasTranslationData && message.translation) || hasTranslationError || (showTranslation && !hasTranslationData && !hasTranslationError) ? (
              <div className="mt-2">
                {showTranslation && hasTranslationData && message.translation && (
                  <SectionCard tone="slate" label="Перевод" text={message.translation} small singleLine />
                )}
                {hasTranslationError && (
                  <SectionCard
                    tone="amber"
                    label="Перевод"
                    text={mode === 'dialogue' ? (message.translationError ?? 'Перевод не пришёл, нажми ещё раз.') : 'Перевод не пришёл, нажми ещё раз.'}
                    small
                    singleLine
                  />
                )}
                {showTranslation && !hasTranslationData && !hasTranslationError && isLoadingTranslation && (
                  <SectionCard
                    tone="slate"
                    label="Перевод"
                    text="Загрузка перевода…"
                    small
                    singleLine
                    textItalic
                  />
                )}
                {showTranslation && !hasTranslationData && !hasTranslationError && !isLoadingTranslation && (
                  <SectionCard
                    tone="amber"
                    label="Перевод"
                    text="Не удалось загрузить перевод. Нажми «Перевод» ещё раз."
                    small
                    singleLine
                  />
                )}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

/** Только режим «Общение»: `**фрагмент**` → жирный текст без буквальных звёздочек. */
function renderCommunicationBoldInline(text: string): React.ReactNode {
  const re = /\*\*([\s\S]*?)\*\*/g
  const nodes: React.ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(text.slice(last, m.index))
    }
    const inner = m[1] ?? ''
    nodes.push(
      <strong key={`md-bold-${m.index}`} className="font-semibold">
        {inner}
      </strong>
    )
    last = m.index + m[0].length
  }
  if (last < text.length) {
    nodes.push(text.slice(last))
  }
  if (nodes.length === 0) return text
  return nodes.map((n, i) => <React.Fragment key={i}>{n}</React.Fragment>)
}

function SectionCard({
  tone,
  label,
  text,
  italic,
  textItalic,
  small,
  singleLine,
  trailingAction,
  onSpeak,
  inlineMarkdownBold,
  emphasizeMainText,
}: {
  tone: SectionTone
  label: string
  text: string
  italic?: boolean
  textItalic?: boolean
  small?: boolean
  singleLine?: boolean
  trailingAction?: 'speak'
  onSpeak?: () => void
  /** Только `communication`: жирный по парам `**...**` в теле текста. */
  inlineMarkdownBold?: boolean
  /** Режимы «Диалог» и «Общение»: без префикса, стиль как у основного блока ассистента. */
  emphasizeMainText?: boolean
}) {
  const toneClass =
    tone === 'amber'
      ? 'border-amber-100 bg-[var(--chat-section-amber)]'
      : tone === 'emerald'
        ? 'border-emerald-100 bg-[var(--chat-section-emerald)]'
        : tone === 'praise'
          ? 'border-emerald-200/70 bg-[var(--chat-section-praise)]'
          : tone === 'slate'
            ? 'border-slate-200 bg-[var(--chat-section-slate)]'
          : tone === 'invite'
            ? 'border-slate-200 bg-white/85'
            : 'border-gray-200 bg-[var(--chat-section-neutral)]'

  const labelClass =
    tone === 'amber'
      ? 'text-amber-700'
      : tone === 'emerald'
        ? 'text-emerald-700'
        : tone === 'praise'
          ? 'text-emerald-600'
          : tone === 'slate'
            ? 'text-slate-600'
          : tone === 'invite'
            ? 'text-slate-700'
            : 'text-gray-600'

  const isAiInline =
    singleLine &&
    (label === 'AI' || label === 'Переведи' || label === 'Переведи далее' || Boolean(emphasizeMainText))
  const hasLabel = label.trim().length > 0
  const labelTrimmed = label.trim()
  const textResolved =
    typeof text === 'string' && labelTrimmed === '💡'
      ? stripLeadingBulbEmojisForPrefixedCard(text)
      : typeof text === 'string' && labelTrimmed === '✅'
        ? stripCheckEmojisForPrefixedCard(text)
        : text
  const iconOnlyLabelPattern = /^(?:[\u00A9\u00AE\u203C-\u3299]|[\uD83C-\uDBFF][\uDC00-\uDFFF]|\s)+$/
  const labelIsIconOnly =
    labelTrimmed === '✅' ||
    labelTrimmed === '💡' ||
    labelTrimmed === '⏱️' ||
    labelTrimmed === '🔤' ||
    labelTrimmed === '📖' ||
    labelTrimmed === '✏️' ||
    iconOnlyLabelPattern.test(labelTrimmed)
  const isCompactServiceLine = singleLine && italic && !hasLabel
  const isTextItalic = textItalic ?? italic
  const bodyContent = inlineMarkdownBold ? renderCommunicationBoldInline(textResolved as string) : textResolved
  // Смотрим исходный text: при inlineMarkdownBold тело часто ReactNode, не string — иначе теряем pre-wrap.
  const preserveNewLines = singleLine && typeof textResolved === 'string' && textResolved.includes('\n')

  return (
    <section
      className={`block min-w-0 w-full max-w-full self-stretch rounded-xl border shadow-sm ${
        isCompactServiceLine ? 'px-2.5 py-1.5' : 'px-3 py-2'
      } ${
        singleLine ? 'flex items-start' : ''
      } ${toneClass}`}
      role="note"
    >
      {singleLine ? (
        <div
          className={`min-w-0 max-w-full ${preserveNewLines ? 'whitespace-pre-wrap' : 'whitespace-normal'} break-words font-sans ${
            small ? 'text-[14px] leading-snug' : 'text-[15px] leading-[1.45]'
          } text-[var(--text)]`}
          title={
            hasLabel
              ? labelIsIconOnly
                ? `${label} ${textResolved}`
                : `${label}: ${textResolved}`
              : textResolved
          }
        >
          {hasLabel && (
            <>
              <span
                className={`${isAiInline ? 'font-semibold text-gray-700' : `font-medium ${labelClass}`}`}
              >
                {label}
                {!labelIsIconOnly ? ':' : null}
              </span>
              {!(typeof textResolved === 'string' && textResolved.startsWith('\n')) ? ' ' : null}
            </>
          )}
          <span
            className={
              isAiInline
                ? 'text-gray-900'
                : isTextItalic
                  ? 'font-serif italic text-[var(--invitation)]'
                  : 'text-[var(--text)]'
            }
          >
            {bodyContent}
          </span>
          {trailingAction === 'speak' && onSpeak && (
            <button
              type="button"
              onClick={onSpeak}
              className="ml-1 inline-flex h-6 w-6 translate-y-[1px] items-center justify-center rounded-full border border-emerald-200 bg-white/80 text-emerald-700 hover:bg-white hover:text-emerald-800"
              title="Озвучить"
              aria-label="Озвучить"
            >
              <SpeakerIcon />
            </button>
          )}
        </div>
      ) : (
        <>
          {hasLabel && <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${labelClass}`}>{label}</p>}
          <p
            className={`${hasLabel ? 'mt-0.5' : ''} whitespace-pre-wrap break-words ${
              small ? 'text-xs leading-snug' : 'text-[15px] leading-[1.45]'
            } ${italic ? 'font-serif italic text-[var(--invitation)]' : 'font-sans text-[var(--text)]'}`}
          >
            {bodyContent}
          </p>
        </>
      )}
    </section>
  )
}

function MicIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
      />
    </svg>
  )
}

function SpeakerIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
      />
    </svg>
  )
}
