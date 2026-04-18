import type { Audience, SentenceType } from '@/lib/types'

type BuildTranslationTaskIdParams = {
  ruPrompt: string | null
  tense: string
  level: string
  sentenceType: SentenceType
  audience: Audience
}

type ShouldEnterTranslationJunkFlowParams = {
  userText: string
  hasLatinLetters: boolean
  hasCyrillicLetters: boolean
  lowSignalInput: boolean
  likelyLatinNoise: boolean
  verdictReasons: readonly string[]
}

const TRANSLATION_JUNK_REASONS_WHITELIST = new Set([
  'empty_answer',
  'gibberish_in_answer',
  'non_english_answer',
])

function normalizeTaskPart(text: string | null): string {
  if (!text) return ''
  return text.replace(/\s+/g, ' ').trim().toLowerCase()
}

export function buildTranslationTaskId(params: BuildTranslationTaskIdParams): string | null {
  const ru = normalizeTaskPart(params.ruPrompt)
  if (!ru) return null
  const tense = normalizeTaskPart(params.tense)
  const level = normalizeTaskPart(params.level)
  const sentenceType = normalizeTaskPart(params.sentenceType)
  const audience = normalizeTaskPart(params.audience)
  return [ru, tense, level, sentenceType, audience].join('|')
}

export function shouldEnterTranslationJunkFlow(params: ShouldEnterTranslationJunkFlowParams): boolean {
  const trimmedUserText = params.userText.trim()
  if (!trimmedUserText) return true

  const hasWhitelistedVerdictReason = params.verdictReasons.some((reason) =>
    TRANSLATION_JUNK_REASONS_WHITELIST.has(reason)
  )
  if (hasWhitelistedVerdictReason) return true

  // Чисто кириллический ответ без английских букв — крайний случай для junk.
  if (params.hasCyrillicLetters && !params.hasLatinLetters) return true

  // Полный мусор в латинице — тоже крайний случай.
  if (params.likelyLatinNoise) return true

  // Низкосигнальный ответ считаем junk только когда совсем нет латиницы.
  if (params.lowSignalInput && !params.hasLatinLetters) return true

  // Непустой ответ вообще без латиницы/кириллицы (символы, эмодзи и т.п.).
  if (!params.hasLatinLetters && !params.hasCyrillicLetters) return true

  return false
}
