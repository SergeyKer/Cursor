import { normalizeEnglishLearnerContractions } from '@/lib/englishLearnerContractions'
import { RU_TOPIC_KEYWORD_TO_EN, normalizeRuTopicKeyword } from '@/lib/ruTopicKeywordMap'
import { stripEnglishRepeatConceptsNotInRuPrompt } from '@/lib/translationPromptConcepts'
import { stripLeadingRepeatRuPrompt } from '@/lib/translationProtocolLines'

export type TranslationRepeatClampResult = {
  clamped: string
  changed: boolean
}

const TRANSLATION_REPEAT_KEYWORDS_EN = new Set(Object.values(RU_TOPIC_KEYWORD_TO_EN))

/** Наречия частотности из словаря — выравниваем только если в русском задании есть своя пара. */
const FREQUENCY_EN = new Set(['sometimes', 'rarely', 'often', 'usually', 'always', 'never'])

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Нормализация конца предложения для строки «Повтори» (экспорт для сценариев без русского промпта). */
export function normalizeRepeatSentenceEnding(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim()
  if (!compact) return ''
  const normalized = normalizeEnglishLearnerContractions(compact)
  return /[.!?]\s*$/.test(normalized) ? normalized : `${normalized}.`
}

/**
 * «Выходные» в RU для правила weekend-adjunct: не только «выходные», но и типичные перефразы
 * (суббота/воскресенье), иначе clamp зря срезает on weekends.
 */
export function hasWeekendConceptInRuPrompt(ru: string): boolean {
  const s = ru.toLowerCase()
  if (/выходн|уик-энд/i.test(s)) return true
  if (/по\s+субботам|по\s+воскресеньям/i.test(s)) return true
  if (/(?:^|\s)суббот\w*\s+и\s+воскресен\w*/i.test(s)) return true
  if (/в\s+субботу\s+и\s+воскресенье/i.test(s)) return true
  return false
}

/** Пары: есть ли концепт в русском задании → паттерны английских хвостов, которые убираем, если концепта нет. */
const PROMPT_ALIGNED_RULES: ReadonlyArray<{
  hasConceptInRu: (ruLower: string) => boolean
  enRemove: RegExp[]
}> = [
  {
    hasConceptInRu: (ru) => hasWeekendConceptInRuPrompt(ru),
    enRemove: [
      /\s*,\s*\b(?:on|at)\s+(?:the\s+)?(?:weekend|weekends)\b/gi,
      /\s+\b(?:on|at)\s+(?:the\s+)?(?:weekend|weekends)\b/gi,
    ],
  },
  {
    hasConceptInRu: (ru) => /утр(ом|е)|по утрам/i.test(ru),
    enRemove: [/\s*,\s*\b(?:early\s+)?in\s+the\s+morning\b/gi, /\s+\b(?:early\s+)?in\s+the\s+morning\b/gi],
  },
  {
    hasConceptInRu: (ru) => /вечер(ом|е)|по вечерам/i.test(ru),
    enRemove: [/\s*,\s*\b(?:late\s+)?in\s+the\s+evening\b/gi, /\s+\b(?:late\s+)?in\s+the\s+evening\b/gi],
  },
  {
    hasConceptInRu: (ru) => /ночью|по ночам/i.test(ru),
    enRemove: [/\s*,\s*\b(?:late\s+)?at\s+night\b/gi, /\s+\b(?:late\s+)?at\s+night\s*(?=[.!?]|$)/gi],
  },
  {
    hasConceptInRu: (ru) => /дн(ём|ем)|после обеда|днём/i.test(ru),
    enRemove: [/\s*,\s*\bin\s+the\s+afternoon\b/gi, /\s+\bin\s+the\s+afternoon\b/gi],
  },
  {
    hasConceptInRu: (ru) => /по понедельникам|понедельникам|каждый понедельник/i.test(ru),
    enRemove: [/\s*,\s*\b(?:on\s+)?(?:every\s+)?Mondays?\b/gi, /\s+\b(?:on\s+)?(?:every\s+)?Mondays?\b/gi],
  },
  {
    hasConceptInRu: (ru) => /по будням|в будни/i.test(ru),
    enRemove: [/\s*,\s*\b(?:on\s+)?weekdays\b/gi, /\s+\b(?:on\s+)?weekdays\b/gi],
  },
  {
    hasConceptInRu: (ru) => /летом/i.test(ru),
    enRemove: [/\s*,\s*\bin\s+(?:the\s+)?summer\b/gi, /\s+\bin\s+(?:the\s+)?summer\b/gi],
  },
  {
    hasConceptInRu: (ru) => /зимой/i.test(ru),
    enRemove: [/\s*,\s*\bin\s+(?:the\s+)?winter\b/gi, /\s+\bin\s+(?:the\s+)?winter\b/gi],
  },
  {
    hasConceptInRu: (ru) => /весной/i.test(ru),
    enRemove: [/\s*,\s*\bin\s+(?:the\s+)?spring\b/gi, /\s+\bin\s+(?:the\s+)?spring\b/gi],
  },
  {
    hasConceptInRu: (ru) => /осенью/i.test(ru),
    enRemove: [/\s*,\s*\bin\s+(?:the\s+)?(?:autumn|fall)\b/gi, /\s+\bin\s+(?:the\s+)?(?:autumn|fall)\b/gi],
  },
]

function cleanupAfterRemovals(text: string): string {
  return text
    .replace(/\s*,\s*,/g, ',')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*\./g, '.')
    .replace(/\s+([?.!])/g, '$1')
    .trim()
}

/**
 * RU «заранее» → EN обычно «in advance»; модель/эталон иногда опускает хвост.
 */
export function ensureInAdvanceFromRuZaranee(ruPrompt: string, repeatEn: string): string {
  const ru = ruPrompt.trim().toLowerCase()
  if (!ru || !/заранее/i.test(ru)) return repeatEn.trim()
  const compact = repeatEn.replace(/\s+/g, ' ').trim()
  if (!compact) return compact
  const lower = compact.toLowerCase()
  if (/\bin advance\b|ahead of time|beforehand\b/.test(lower)) return compact
  const core = compact.replace(/[.!?]+$/, '').trim()
  return normalizeRepeatSentenceEnding(`${core} in advance`)
}

export function extractPromptKeywords(prompt: string): string[] {
  const tokens = prompt.toLowerCase().match(/[а-яё]+/gi) ?? []
  const out: string[] = []
  for (const token of tokens) {
    const normalized = normalizeRuTopicKeyword(token)
    const mapped = RU_TOPIC_KEYWORD_TO_EN[normalized]
    if (mapped && !out.includes(mapped)) out.push(mapped)
  }
  return out
}

function extractRepeatKeywords(repeatEn: string): string[] {
  const tokens = repeatEn.toLowerCase().match(/\b[a-z][a-z']+\b/gi) ?? []
  const out: string[] = []
  for (const token of tokens) {
    const normalized = token.toLowerCase()
    if (TRANSLATION_REPEAT_KEYWORDS_EN.has(normalized) && !out.includes(normalized)) {
      out.push(normalized)
    }
  }
  return out
}

function alignRepeatKeywordsToPrompt(repeatEn: string, ruPrompt: string): string | null {
  const promptKeywords = extractPromptKeywords(ruPrompt)
  if (promptKeywords.length === 0) return null

  const promptSet = new Set(promptKeywords)
  let out = repeatEn
  let anyChange = false

  for (let pass = 0; pass < 8; pass++) {
    const repeatKeywords = extractRepeatKeywords(out)
    if (repeatKeywords.length === 0) break

    const stray = repeatKeywords.filter((w) => !promptSet.has(w))
    const missing = promptKeywords.filter((w) => !repeatKeywords.includes(w))

    if (stray.length === 0) break
    /** Нечего подставлять из русского задания: подмена stray на «последний ключ» ломает фразы (напр. family → food). */
    if (missing.length === 0) break

    const strayFreq = stray.find((s) => FREQUENCY_EN.has(s))
    const missFreq = missing.find((m) => FREQUENCY_EN.has(m))

    let source: string | undefined
    let target: string | undefined

    if (strayFreq != null && missFreq != null) {
      source = strayFreq
      target = missFreq
    } else if (strayFreq != null && missFreq == null) {
      const rest = stray.filter((s) => !FREQUENCY_EN.has(s))
      if (rest.length === 0) break
      source = rest[0]
      target =
        missing.length > 0 ? missing[missing.length - 1] : promptKeywords[promptKeywords.length - 1]
    } else {
      source = stray[0]
      target =
        missing.length > 0 ? missing[missing.length - 1] : promptKeywords[promptKeywords.length - 1]
      if (missing.length === 0 && FREQUENCY_EN.has(target) && repeatKeywords.includes(target)) {
        break
      }
    }

    if (!source || !target || source === target) break

    const sourcePattern = new RegExp(`\\b${escapeRegExp(source)}\\b`, 'i')
    if (!sourcePattern.test(out)) break

    out = out.replace(sourcePattern, target)
    anyChange = true
  }

  return anyChange ? normalizeRepeatSentenceEnding(out) : null
}

/**
 * Срезает лишние социальные хвосты и выравнивает словарные ключи под русское задание.
 * Для вызова из route при лексическом несоответствии промпта (без полного clamp с правилами времени суток).
 */
export function alignRepeatEnglishToRuPromptKeywords(repeatEn: string, ruPrompt: string): string | null {
  const normalizedBefore = normalizeRepeatSentenceEnding(repeatEn.trim())
  let out = stripEnglishRepeatConceptsNotInRuPrompt(repeatEn.trim(), ruPrompt)
  out = cleanupAfterRemovals(out)
  const aligned = alignRepeatKeywordsToPrompt(out, ruPrompt)
  const candidate = aligned ?? normalizeRepeatSentenceEnding(out)
  return candidate === normalizedBefore ? null : candidate
}

/**
 * Убирает из английского «Повтори» обстоятельства, которых нет в русском задании
 * (чтобы модель не подмешивала провокации пользователя).
 */
export function clampTranslationRepeatToRuPrompt(repeatEn: string, ruPrompt: string | null): TranslationRepeatClampResult {
  const ru = ruPrompt?.trim() ?? ''
  if (!ru || !repeatEn.trim()) {
    return { clamped: repeatEn.trim(), changed: false }
  }

  const ruLower = ru.toLowerCase()
  const normalizedBefore = normalizeRepeatSentenceEnding(repeatEn)
  let out = repeatEn

  for (const rule of PROMPT_ALIGNED_RULES) {
    if (rule.hasConceptInRu(ruLower)) continue
    for (const re of rule.enRemove) {
      out = out.replace(re, ' ')
    }
  }

  out = cleanupAfterRemovals(out)
  out = stripEnglishRepeatConceptsNotInRuPrompt(out, ru)
  out = cleanupAfterRemovals(out)
  const aligned = alignRepeatKeywordsToPrompt(out, ru)
  let clamped = aligned ?? normalizeRepeatSentenceEnding(out)
  clamped = ensureInAdvanceFromRuZaranee(ru, clamped)
  const changed = clamped !== normalizedBefore

  return { clamped, changed }
}

export function replaceTranslationRepeatInContent(content: string, newRepeatEnglish: string): string {
  const normalized = normalizeRepeatSentenceEnding(newRepeatEnglish)
  if (!normalized) return content

  const lines = content.split(/\r?\n/)
  let found = false
  const lineRe =
    /^(\s*(?:ai|assistant)\s*:\s*)?([\s\-•]*(?:\d+[\.)]\s*)*)(?:Повтори|Repeat|Say)\s*:\s*[\s\S]*$/i

  const out = lines.map((line) => {
    if (!lineRe.test(line)) return line
    found = true
    return line.replace(lineRe, (_full, ai, bullet) => `${ai ?? ''}${bullet ?? ''}Повтори: ${normalized}`)
  })

  return found ? out.join('\n').trim() : content
}

/**
 * Финальная нормализация «Повтори:» под русское задание.
 * Если есть prior (скрытый __TRAN_REPEAT_REF__ или прошлое «Повтори:») — подставляем его; при наличии ruPrompt дополнительно clamp к русскому.
 * Если русского задания нет (цепочка только «Повтори»), prior всё равно заменяет несвязный текст модели.
 * Без prior и с ruPrompt — clamp ответа модели под русский промпт.
 */
export function enforceAuthoritativeTranslationRepeat(
  content: string,
  ruPrompt: string | null,
  priorRepeatEnglish: string | null
): string {
  if (priorRepeatEnglish?.trim()) {
    let prior = priorRepeatEnglish.trim()
    // Цепочка «Повтори» держит тот же эталон, но дополняем обязательные хвосты из RU
    // (например «заранее» → in advance), если их случайно срезали на прошлом шаге.
    if (ruPrompt?.trim()) {
      prior = ensureInAdvanceFromRuZaranee(ruPrompt, prior)
    }
    const clamped = normalizeRepeatSentenceEnding(prior)
    return replaceTranslationRepeatInContent(content, clamped)
  }
  if (!ruPrompt?.trim()) return content
  return applyTranslationRepeatSourceClampToContent(content, ruPrompt)
}

/**
 * Если «Повтори» можно сузить под ruPrompt — заменяет строку в полном тексте ответа.
 */
export function applyTranslationRepeatSourceClampToContent(content: string, ruPrompt: string | null): string {
  if (!ruPrompt?.trim()) return content

  const lines = content.split(/\r?\n/)
  let repeatBody: string | null = null
  for (const line of lines) {
    const trimmed = line.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim()
    const m = /^[\s\-•]*(?:\d+[\.)]\s*)*(Повтори|Repeat|Say)\s*:\s*(.*)$/i.exec(trimmed)
    if (m?.[2] != null && String(m[2]).trim()) {
      repeatBody = String(m[2]).trim()
      break
    }
  }
  if (!repeatBody) return content

  const { clamped, changed } = clampTranslationRepeatToRuPrompt(repeatBody, ruPrompt)
  if (!changed) return content
  return replaceTranslationRepeatInContent(content, clamped)
}

/** Тело первой строки «Повтори:|Repeat:|Say:» в тексте ответа ассистента. */
export function extractFirstTranslationRepeatEnglishBody(content: string): string | null {
  const lines = content.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim()
    const m = /^[\s\-•]*(?:\d+[\.)]\s*)*(Повтори|Repeat|Say)\s*:\s*(.*)$/i.exec(trimmed)
    if (m?.[2] != null && String(m[2]).trim()) {
      return String(m[2]).trim()
    }
  }
  return null
}

/**
 * Каноническое «Скажи:» = тот же английский эталон, что в «Повтори:» (после клампа/провокаций).
 * Вставляет строку сразу перед первой строкой Повтори|Repeat|Say; существующие строки Скажи удаляются.
 */
export function enforceAuthoritativeTranslationRepeatEnCue(content: string): string {
  const hasEnRepeat = /(?:^|\n)\s*(?:[\s\-•]*(?:\d+[\.)]\s*)*)?(?:Повтори|Repeat|Say)\s*:/im.test(content)
  if (!hasEnRepeat) return content

  const rawBody = extractFirstTranslationRepeatEnglishBody(content)
  if (!rawBody) return content

  const body = normalizeRepeatSentenceEnding(stripLeadingRepeatRuPrompt(rawBody))
  if (!body) return content

  const canonicalLine = `Скажи: ${body}`
  const lines = content.split(/\r?\n/)
  const filtered = lines.filter((line) => {
    const t = line.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim()
    return !/^[\s\-•]*(?:\d+[\.)]\s*)*Скажи\s*:/i.test(t)
  })

  let insertIdx = -1
  for (let i = 0; i < filtered.length; i++) {
    const t = filtered[i]!.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim()
    if (/^[\s\-•]*(?:\d+[\.)]\s*)*(Повтори|Repeat|Say)\s*:/i.test(t)) {
      insertIdx = i
      break
    }
  }

  if (insertIdx === -1) {
    return `${filtered.join('\n').trim()}\n${canonicalLine}`.trim()
  }
  filtered.splice(insertIdx, 0, canonicalLine)
  return filtered.join('\n').trim()
}
