import { foldLatinHomoglyphsForEnglishMatch } from '@/lib/normalizeEnglishForRepeatMatch'

const ENGLISH_STOP = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'to',
  'of',
  'in',
  'on',
  'at',
  'for',
  'with',
  'from',
  'by',
  'as',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'am',
  'do',
  'does',
  'did',
  'have',
  'has',
  'had',
  'will',
  'would',
  'can',
  'could',
  'should',
  'may',
  'might',
  'must',
  'not',
  'no',
  'so',
  'very',
  'too',
  'also',
  'just',
  'only',
  'then',
  'than',
  'that',
  'this',
  'these',
  'those',
  'there',
  'here',
  'it',
  'its',
  'we',
  'you',
  'he',
  'she',
  'they',
  'them',
  'our',
  'your',
  'my',
  'his',
  'her',
  'their',
])

function tokenizeEnglishWords(text: string): string[] {
  return foldLatinHomoglyphsForEnglishMatch(text)
    .toLowerCase()
    .match(/[a-z']+/g)
    ?.map((token) => token.replace(/^'+|'+$/g, ''))
    .filter(Boolean) ?? []
}

function isContentWord(token: string): boolean {
  if (!token) return false
  if (!/[a-z]/i.test(token)) return false
  if (token.length < 3) return false
  return !ENGLISH_STOP.has(token.toLowerCase())
}

/** Строки серверного фолбэка «Есть хорошая основа, но…» — не использовать как целевой педагогический текст. */
export function isBoilerplateTranslationSupportTemplate(text: string): boolean {
  const t = text.replace(/\s+/g, ' ').trim().toLowerCase()
  if (!t) return false
  return (
    t.includes('есть хорошая основа, но нужно исправить основную неточность') ||
    t.includes('есть хорошая основа, но нужно исправить главную неточность')
  )
}

export function extractKommentariyPerevodBody(content: string): string | null {
  const lines = content.split(/\r?\n/)
  const idx = lines.findIndex((l) => /^[\s\-•]*(?:\d+[\.)]\s*)*Комментарий_перевод\s*:/i.test(l.trim()))
  if (idx < 0) return null
  const first = lines[idx]!
    .replace(/^[\s\-•]*(?:\d+[\.)]\s*)*Комментарий_перевод\s*:\s*/i, '')
    .trim()
  const parts: string[] = []
  if (first) parts.push(first)
  const breakRe = /^[\s\-•]*(?:\d+[\.)]\s*)*(Ошибки|Скажи|Say|Комментарий)\s*:/i
  for (let i = idx + 1; i < lines.length; i++) {
    const raw = lines[i] ?? ''
    const l = raw.trim()
    if (breakRe.test(l)) break
    if (l) parts.push(l)
  }
  const body = parts.join('\n').trim()
  return isSafePreservedTranslationSupportBody(body) ? body : null
}

export function isSafePreservedTranslationSupportBody(s: string): boolean {
  const t = s.replace(/\s+/g, ' ').trim()
  if (!t || t.length > 600) return false
  if (/^(Ошибка времени|Ошибка типа|Лексическая ошибка|Грамматическая ошибка|🔤|📖|✏️|🤔)/i.test(t)) return false
  if (/Ошибки:/i.test(t)) return false
  return true
}

/**
 * Короткая поддержка при отсутствии модельного «Комментарий_перевод:» (без шаблона «Есть хорошая основа, но…»).
 */
export function buildDeterministicTranslationSupportRu(
  userText: string,
  repeatEnglish: string,
  audience: 'child' | 'adult',
  mode: 'generic' | 'incomplete' = 'generic'
): string {
  const uTok = tokenizeEnglishWords(userText).filter(isContentWord)
  const rTok = tokenizeEnglishWords(repeatEnglish).filter(isContentWord)
  const max = Math.min(uTok.length, rTok.length)
  let best: { token: string; len: number; idx: number } | null = null
  for (let i = 0; i < max; i++) {
    if (uTok[i] !== rTok[i]) continue
    const tok = uTok[i] ?? ''
    const len = tok.length
    if (len < 4) continue
    if (!best || len > best.len || (len === best.len && i > best.idx)) {
      best = { token: tok, len, idx: i }
    }
  }

  const surface =
    best != null
      ? new RegExp(`\\b${best.token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').exec(userText)?.[0] ?? best.token
      : null

  const pointChild = 'ниже коротко, что поправить, и готовая формулировка'
  const pointAdult = 'ниже кратко, что поправить, и эталонная формулировка'

  if (mode === 'incomplete') {
    if (surface) {
      if (audience === 'child') {
        return `💡 Хорошее начало: «${surface}» использовано правильно, но перевод пока неполный.`
      }
      return `💡 Хорошее начало: «${surface}» использовано правильно, но перевод пока неполный.`
    }
    if (audience === 'child') {
      return '💡 Хорошее начало, но перевод пока неполный — добавь остальную часть предложения по образцу.'
    }
    return '💡 Хорошее начало, но перевод пока неполный — добавьте остальную часть предложения по образцу.'
  }

  if (surface) {
    if (audience === 'child') {
      return `💡 Ты удачно использовал «${surface}» в этой фразе — ${pointChild}.`
    }
    return `💡 Вы удачно использовали «${surface}» в этой фразе — ${pointAdult}.`
  }

  if (audience === 'child') {
    return `💡 По смыслу ты близко к заданию — давай доведём формулировку (${pointChild}).`
  }
  return `💡 По смыслу вы близки к заданию — давайте доведём формулировку (${pointAdult}).`
}
