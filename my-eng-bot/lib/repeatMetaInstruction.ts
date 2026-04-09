import { replaceTranslationRepeatInContent } from '@/lib/translationRepeatClamp'

/**
 * Модель иногда вставляет в «Повтори:» англоязычную мета-инструкцию (про раздел Repeat, проверку грамматики)
 * вместо фразы для повторения — убираем и подставляем эталон из предыдущего хода.
 */
const REPEAT_META_INSTRUCTION_PATTERNS: ReadonlyArray<RegExp> = [
  /\blet['']?s\s+check\b/i,
  /\blet['']?s\s+(?:verify|make sure|ensure|review)\b/i,
  /\bcheck\s+the\s+example\b/i,
  /\bthe\s+["']?repeat["']?\s+section\b/i,
  /\brepeat\s+section\b/i,
  /\bfor\s+any\s+grammar\s+mistakes\b/i,
  /\b(in|from)\s+the\s+["']?repeat["']?\s+section\b/i,
  /\bverify\s+(?:that|whether)\s+/i,
  /\baccording\s+to\s+the\s+(?:instructions|format|protocol)\b/i,
  /\boutput\s+(?:only|exactly)\b/i,
  /\bfollow(?:ing)?\s+the\s+(?:steps|format|instructions)\b/i,
  /\bmake\s+sure\s+(?:you|to)\s+(?:check|review)\b/i,
  /\bthe term\s+['']?/i,
  /\busually implies\b/i,
  /\bbetter suited for\b/i,
  /\bimplies a single\b/i,
  /\bit['']?s great that\b/i,
  /\byou (?:started|began) with\b/i,
  /\bgood job\b/i,
  /\bwell done\b/i,
]

export function extractFirstRepeatEnglishBody(content: string): string | null {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim())
    .filter(Boolean)
  const repeatLine = lines.find((line) =>
    /^[\s\-•]*(?:\d+[\.)]\s*)*(?:Повтори|Repeat|Say|Скажи)\s*:/i.test(line)
  )
  if (!repeatLine) return null
  const repeatText = repeatLine
    .replace(/^[\s\-•]*(?:\d+[\.)]\s*)*(?:Повтори|Repeat|Say|Скажи)\s*:\s*/i, '')
    .trim()
  return repeatText || null
}

export function isRepeatLineMetaInstruction(englishBody: string): boolean {
  const t = englishBody.trim()
  if (t.length < 10) return false
  return REPEAT_META_INSTRUCTION_PATTERNS.some((p) => p.test(t))
}

/**
 * Если тело «Повтори:» — служебная инструкция, заменяет на fallback (эталон из прошлого ассистента).
 * Без fallback возвращает исходный текст.
 */
export function sanitizeRepeatMetaInstructionInContent(
  content: string,
  fallbackEnglish: string | null | undefined
): string {
  const body = extractFirstRepeatEnglishBody(content)
  if (!body || !isRepeatLineMetaInstruction(body)) return content
  const fb = fallbackEnglish?.trim()
  if (!fb) return content
  return replaceTranslationRepeatInContent(content, fb)
}
