import { normalizeCommunicationDetailText } from '@/lib/communicationReplyLanguage'
import type { LevelId } from '@/lib/types'

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

export function buildCommunicationMaxTokens(detailLevel: 0 | 1 | 2, baseMaxTokens: number): number {
  if (detailLevel === 2) return 1024
  if (detailLevel === 1) return 768
  return baseMaxTokens
}

export function buildCommunicationFallbackMessage(params: {
  audience: 'child' | 'adult'
  language: 'ru' | 'en'
  level?: LevelId
  firstTurn?: boolean
  seedText?: string | null
}): string {
  const { audience, language, level = 'a1', firstTurn = false, seedText = '' } = params
  const isChild = audience === 'child'
  const isLowLevel = ['starter', 'a1', 'a2'].includes(level)

  if (firstTurn) {
    const seed = stableHash32(`communication_first|${language}|${audience}|${seedText}`)
    const pick = (variants: string[]) => variants[seed % variants.length] ?? variants[0] ?? ''

    if (language === 'ru') {
      return isChild
        ? pick([
            'Привет! Как ты? Что хочешь обсудить?',
            'Привет! Как у тебя дела? О чём хочешь поговорить?',
            'Привет! Что нового? Что тебе сегодня интересно?',
            'Привет! Что ты хочешь обсудить сегодня?',
            'Привет! Давай поговорим. Что тебя сейчас интересует?',
            'Привет! О чём хочешь поговорить сегодня?',
          ])
        : pick([
            'Здравствуйте! Как вы? О чём хотите поговорить?',
            'Здравствуйте! Рад вас видеть. Чем займёмся сегодня?',
            'Здравствуйте! Что вам интересно обсудить?',
            'Здравствуйте! Готовы поговорить? Что интересного у вас сегодня?',
            'Здравствуйте! О чём хотите поговорить сегодня?',
            'Здравствуйте! Чем могу быть полезен?',
          ])
    }
    return isChild
      ? isLowLevel
        ? pick([
            'Hi! How are you? What do you want to talk about?',
            'Hi! What do you want to talk about today?',
            'Hi! Let’s talk. What topic do you want?',
            'Hello! What do you want to practice today?',
          ])
        : pick([
            'Hi! How are you? What would you like to talk about?',
            'Hi! What’s up? What would you like to chat about?',
            'Hi! Ready to talk? What would you like to discuss?',
            'Hi! How’s it going? What should we talk about?',
            'Hey! What would you like to practice today?',
            'Hi there! What’s on your mind today?',
          ])
      : isLowLevel
        ? pick([
            'Hello! How are you? What do you want to talk about?',
            'Hello! What topic do you want to discuss today?',
            'Hello! Let’s talk. What should we discuss?',
            'Hello! What do you want to practice today?',
          ])
        : pick([
            'Hello! How are you doing? What would you like to discuss?',
            'Hello! Good to see you. What would you like to talk about?',
            'Hello! What would you like to chat about today?',
            'Hello! What is on your mind today?',
            'Hello! What would you like to explore today?',
            'Hello! How can I help you today?',
          ])
  }

  if (language === 'ru') {
    return isChild
      ? 'Уточни, пожалуйста, что ты имеешь в виду.'
      : 'Уточните, пожалуйста, что вы имеете в виду.'
  }

  return isChild
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
