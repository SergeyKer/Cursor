/**
 * Постобработка EN→RU из /api/translate: точечные правки кальк и мусора без обнуления ответа.
 */

export function normalizeTranslationResult(text: string): string {
  const normalized = text
    .replace(
      /(^|\b)(Привет!\s*)?Как\s+(ты|вы)\s+обычно\s+заним(аешься|аетесь)\s+([^.?!]+?)([?.!])?(?=\s|$)/gi,
      (_, prefix: string, greeting: string, pronoun: string, _verb: string, topic: string) => {
        const isYou = pronoun.toLowerCase() === 'ты'
        const subject = isYou ? 'ты' : 'вы'
        const verb = isYou ? 'делаешь' : 'делаете'
        return `${prefix}${greeting ?? ''}Что ${subject} обычно ${verb}, когда речь заходит о ${topic.trim()}?`
      }
    )
    .replace(/\bзаниматься культурой\b/gi, 'интересоваться культурой')
    .replace(/\bзанимаешься культурой\b/gi, 'интересуешься культурой')
    .replace(/\bзанимаетесь культурой\b/gi, 'интересуетесь культурой')
    .replace(
      /^\s*Какое\s+хобби\s+(ты|вы)\s+(?:в\s+последнее\s+время|недавно)\s+увлекал(?:ся|ись)\?/gim,
      (_m: string, pronoun: string) =>
        `Каким хобби ${pronoun.toLowerCase()} в последнее время увлекал${pronoun.toLowerCase() === 'ты' ? 'ся' : 'ись'}?`
    )
    .replace(/\s+/g, ' ')
    .trim()

  return normalized
}

/** Известные кривые переводы с англ. «inspire(s)» внутри русской фразы. */
function fixRussianTranslationEnglishLeaks(text: string): string {
  let out = text.trim()
  if (!out) return out

  out = out.replace(
    /Вы\s+сейчас\s+попробуете\s+[''`"]?inspires?[''`"]?\s*\?/gi,
    'Что вас сейчас вдохновляет?'
  )
  out = out.replace(
    /Вы\s+попробуете\s+[''`"]?inspires?[''`"]?\s*\?/gi,
    'Что вас вдохновляет?'
  )
  return out.replace(/\s{2,}/g, ' ').trim()
}

export function applyTranslationQualityGate(text: string): string {
  let out = text
  out = out.replace(
    /^\s*Какое\s+хобби\s+(ты|вы)\s+(?:в\s+последнее\s+время|недавно)\s+увлекал(?:ся|ись)\?/gim,
    (_m: string, pronoun: string) =>
      `Каким хобби ${pronoun.toLowerCase()} в последнее время увлекал${pronoun.toLowerCase() === 'ты' ? 'ся' : 'ись'}?`
  )
  out = fixRussianTranslationEnglishLeaks(out)
  return out
}
