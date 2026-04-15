/**
 * Служебная строка протокола без русского задания: в карточках чата не показываем
 * (режим «Перевод» уже задан в интерфейсе).
 */
export function isGenericTranslationMetaInvitation(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  return /^(?:Переведи|Переведите)\s+на\s+английский(?:\s+язык)?\.?\s*$/i.test(t)
}

/**
 * Разбор приглашения «Переведи …» для UI режима перевода.
 * Нельзя обрезать на первой точке — иначе «Переведи далее: Теперь. Я люблю…» превращается в «…: Теперь.».
 */
export function splitTranslationInvitation(text: string): {
  mainBefore: string
  invitation: string | null
  mainAfter: string
} {
  const colonInvite =
    /^\s*((?:\d+\)\s*)?(?:Переведи|Переведите)(?:\s+далее)?\s*:\s*[^\r\n]+)/i.exec(text)
  if (colonInvite?.[1] != null && colonInvite.index !== undefined) {
    const invitation = colonInvite[1].trim()
    const mainBefore = text.slice(0, colonInvite.index).trimEnd()
    const mainAfter = text.slice(colonInvite.index + colonInvite[0].length).trimStart()
    return { mainBefore, invitation, mainAfter }
  }

  const withColon = text.match(
    /\s+(?:\d+\)\s*)?((?:Переведи|Переведите)(?:\s+далее)?\s*:\s*[^\r\n]+)/i
  )
  if (withColon?.[1] != null && withColon.index !== undefined) {
    const invitation = withColon[1].trim()
    const mainBefore = text.slice(0, withColon.index).trimEnd()
    const mainAfter = text.slice(withColon.index + withColon[0].length).trimStart()
    return { mainBefore, invitation, mainAfter }
  }

  const onEnglishAtStart =
    /^\s*((?:\d+\)\s*)?(?:Переведи|Переведите)\s+на\s+английский(?:\s+язык)?\.)/i.exec(text)
  if (onEnglishAtStart?.[1] != null && onEnglishAtStart.index !== undefined) {
    const invitation = onEnglishAtStart[1].trim()
    const mainBefore = text.slice(0, onEnglishAtStart.index).trimEnd()
    const mainAfter = text.slice(onEnglishAtStart.index + onEnglishAtStart[0].length).trimStart()
    return { mainBefore, invitation, mainAfter }
  }

  const onEnglishOnly = text.match(
    /\s+(?:\d+\)\s*)?((?:Переведи|Переведите)\s+на\s+английский(?:\s+язык)?\.)/i
  )
  if (onEnglishOnly?.[1] != null && onEnglishOnly.index !== undefined) {
    const invitation = onEnglishOnly[1].trim()
    const mainBefore = text.slice(0, onEnglishOnly.index).trimEnd()
    const mainAfter = text.slice(onEnglishOnly.index + onEnglishOnly[0].length).trimStart()
    return { mainBefore, invitation, mainAfter }
  }

  return { mainBefore: text, invitation: null, mainAfter: '' }
}
