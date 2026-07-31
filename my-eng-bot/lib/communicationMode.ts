import {
  buildCommunicationARuWarn,
  isCommunicationALevelForRuWarn,
  resolveCommunicationCefrBand,
} from '@/lib/communication/cefrBands'
import { normalizeCommunicationDetailText } from '@/lib/communicationReplyLanguage'
import type { Audience, LevelId } from '@/lib/types'

function stableHash32(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export function detectCommunicationDetailLevel(text: string): 0 | 1 | 2 {
  const normalized = normalizeCommunicationDetailText(text)

  if (normalized === 'еще подробнее') return 2
  if (normalized === 'even more detail' || normalized === 'even more details') return 2
  if (normalized === 'in even more detail' || normalized === 'in even more details') return 2

  if (normalized === 'подробнее') return 1
  if (normalized === 'more detail' || normalized === 'more details') return 1
  if (normalized === 'in more detail' || normalized === 'in more details') return 1

  return 0
}

/** Token budget for communication: depth increases volume, CEFR caps the ceiling. */
export function buildCommunicationMaxTokens(
  detailLevel: 0 | 1 | 2,
  baseMaxTokens: number,
  level: LevelId = 'a1',
  audience: Audience = 'adult'
): number {
  if (detailLevel === 0) return baseMaxTokens

  const child = audience === 'child'
  const band = resolveCommunicationCefrBand(level)

  if (band === 'a1' || band === 'a2') {
    if (detailLevel === 2) return Math.min(baseMaxTokens, child ? 420 : 520)
    return Math.min(baseMaxTokens, child ? 320 : 400)
  }
  if (band === 'b1' || band === 'b2') {
    if (detailLevel === 2) return Math.min(baseMaxTokens, 720)
    return Math.min(baseMaxTokens, 560)
  }
  if (band === 'c1' || band === 'c2') {
    if (detailLevel === 2) return Math.min(baseMaxTokens, 900)
    return Math.min(baseMaxTokens, 700)
  }
  // adaptive
  if (detailLevel === 2) return Math.min(baseMaxTokens, 768)
  return Math.min(baseMaxTokens, 560)
}

function pickEnFirstInvite(params: {
  audience: Audience
  level: LevelId
  seedText: string
}): string {
  const { audience, level, seedText } = params
  const band = resolveCommunicationCefrBand(level)
  const isChild = audience === 'child'
  const seed = stableHash32(`communication_first|en|${audience}|${level}|${seedText}`)
  const pick = (variants: string[]) => variants[seed % variants.length] ?? variants[0] ?? ''

  if (band === 'a1' || band === 'a2') {
    return isChild
      ? pick([
          'Hi! Let’s talk. What do you like?',
          'Hi! How are you? What do you like?',
          'Hello! Let’s start. What do you like to do?',
          'Hi! What do you want to talk about?',
        ])
      : pick([
          'Hello! How are you? What do you want to talk about?',
          'Hello! Let’s talk. What do you like?',
          'Hello! What do you want to talk about today?',
          'Hello! Let’s start. How are you?',
        ])
  }

  if (band === 'b1' || band === 'b2') {
    return isChild
      ? pick([
          'Hi! How’s it going? What would you like to talk about?',
          'Hi! Ready to chat? What’s interesting for you today?',
          'Hello! What should we talk about?',
        ])
      : pick([
          'Hello! How are you doing? What would you like to discuss?',
          'Hello! Good to see you. What would you like to talk about?',
          'Hello! What would you like to chat about today?',
          'Hello! What’s on your mind today?',
        ])
  }

  if (band === 'c1' || band === 'c2') {
    return pick([
      'Hello — good to connect. What would you like to dig into today?',
      'Hi. Ready when you are — what’s worth talking through?',
      'Hello. What’s the angle you want to explore today?',
    ])
  }

  // adaptive
  return isChild
    ? pick(['Hi! How are you? What do you want to talk about?', 'Hi! Let’s talk. What do you like?'])
    : pick([
        'Hello! How are you? What would you like to talk about?',
        'Hello! What would you like to chat about today?',
      ])
}

/**
 * First assistant bubble for communication.
 * Fixed A levels: RU meta warn + EN invite. B/C/all: EN only.
 */
export function buildCommunicationFirstMessage(params: {
  audience: Audience
  level?: LevelId
  seedText?: string | null
}): string {
  const audience = params.audience
  const level = params.level ?? 'a1'
  const seedText = params.seedText ?? ''
  const en = pickEnFirstInvite({ audience, level, seedText })
  if (isCommunicationALevelForRuWarn(level)) {
    return `${buildCommunicationARuWarn(audience)}\n${en}`
  }
  return en
}

export function buildCommunicationFallbackMessage(params: {
  audience: 'child' | 'adult'
  language: 'ru' | 'en'
  level?: LevelId
  firstTurn?: boolean
  seedText?: string | null
}): string {
  const { audience, language, level = 'a1', firstTurn = false, seedText = '' } = params

  if (firstTurn && language === 'en') {
    return buildCommunicationFirstMessage({ audience, level, seedText })
  }

  if (firstTurn && language === 'ru') {
    // Legacy path (should not run under EN-only product lock). Keep simple RU greetings.
    const seed = stableHash32(`communication_first|ru|${audience}|${seedText}`)
    const pick = (variants: string[]) => variants[seed % variants.length] ?? variants[0] ?? ''
    return audience === 'child'
      ? pick([
          'Привет! Как ты? Что хочешь обсудить?',
          'Привет! Как у тебя дела? О чём хочешь поговорить?',
          'Привет! Что нового? Что тебе сегодня интересно?',
        ])
      : pick([
          'Здравствуйте! Как вы? О чём хотите поговорить?',
          'Здравствуйте! Рад вас видеть. Чем займёмся сегодня?',
          'Здравствуйте! Что вам интересно обсудить?',
        ])
  }

  if (language === 'ru') {
    return audience === 'child'
      ? 'Уточни, пожалуйста, что ты имеешь в виду.'
      : 'Уточните, пожалуйста, что вы имеете в виду.'
  }

  return audience === 'child'
    ? 'What do you mean? Could you say that another way?'
    : 'Could you clarify what you mean?'
}

export function shouldPreferEnglishContinuationFallback(text: string, targetLang: 'ru' | 'en'): boolean {
  if (targetLang !== 'en') return false
  const t = text.trim()
  if (!t) return false
  const hasCyr = /[А-Яа-яЁё]/.test(t)
  const hasLat = /[A-Za-z]/.test(t)
  if (!(hasCyr && hasLat)) return false
  const latWords = t.match(/[A-Za-z]+(?:-[A-Za-z]+)*/g) ?? []
  const cyrWords = t.match(/[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)*/g) ?? []
  return latWords.length + cyrWords.length >= 2
}

export function buildCommunicationEnglishContinuationFallback(
  audience: 'child' | 'adult',
  level: LevelId = 'a1'
): string {
  const isLowLevel = ['starter', 'a1', 'a2'].includes(level)
  if (isLowLevel) {
    return audience === 'child'
      ? 'Okay. Let’s keep talking in English. What part do you like most?'
      : 'Okay. Let’s continue in English. What part do you want to talk about first?'
  }
  return audience === 'child'
    ? 'Got it. Let’s keep talking about this in English. What part interests you most?'
    : 'Got it. Let’s continue in English. What part would you like to discuss first?'
}

export function extractExplicitTranslateTarget(lastUserText: string): string | null {
  const text = lastUserText.trim()
  if (!text) return null

  const hasExplicitTranslateIntent =
    /перевед(и|ите)/gi.test(text) ||
    /нужен\s+перевод/gi.test(text) ||
    /перевод/gi.test(text) ||
    /\btranslate\b/i.test(text) ||
    /\btranslation\b/i.test(text)
  if (!hasExplicitTranslateIntent) return null

  const withoutIntent = text
    .replace(/нужен\s+перевод\s*[:\-]?\s*/gi, ' ')
    .replace(/перевед(и|ите)\s*(?:на\s+английский)?\s*[:\-]?\s*/gi, ' ')
    .replace(/перевод\s*[:\-]?\s*/gi, ' ')
    .replace(/translate\s*[:\-]?\s*/gi, ' ')
    .replace(/translation\s*[:\-]?\s*/gi, ' ')
    .replace(/^[\s:,-]+|[\s:,-]+$/g, '')
    .trim()

  return withoutIntent || null
}
