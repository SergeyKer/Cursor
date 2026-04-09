import { normalizeEnglishLearnerContractions } from '@/lib/englishLearnerContractions'

export type TranslationRepeatClampResult = {
  clamped: string
  changed: boolean
}

function normalizeRepeatSentenceEnding(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim()
  if (!compact) return ''
  const normalized = normalizeEnglishLearnerContractions(compact)
  return /[.!?]\s*$/.test(normalized) ? normalized : `${normalized}.`
}

/** Пары: есть ли концепт в русском задании → паттерны английских хвостов, которые убираем, если концепта нет. */
const PROMPT_ALIGNED_RULES: ReadonlyArray<{
  hasConceptInRu: (ruLower: string) => boolean
  enRemove: RegExp[]
}> = [
  {
    hasConceptInRu: (ru) => /выходн|уик-энд/i.test(ru),
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
    .trim()
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
  const clamped = normalizeRepeatSentenceEnding(out)
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
