const BULB = '💡'

/**
 * Убирает все 💡 из текста: в UI карточка уже показывает метку «💡» один раз (на любой строке тела дубли не нужны).
 */
export function stripLeadingBulbEmojisForPrefixedCard(text: string): string {
  if (!text?.trim()) return text
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/💡/gu, '').replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n')
    .trim()
}

/** Маркеры протокола коррекции — в теле похвалы не нужны (остаётся только метка «✅» карточки). */
const PRAISE_CARD_STRIP_EMOJI_RE = /✅|🔤|💡|📖|✏️|🤔|⏱️/gu

/** Аналогично для карточки с меткой «✅» (успех в переводе): убираем дубли ✅ и прочие служебные эмодзи из тела. */
export function stripCheckEmojisForPrefixedCard(text: string): string {
  if (!text?.trim()) return text
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(PRAISE_CARD_STRIP_EMOJI_RE, '').replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n')
    .trim()
}

/**
 * Оставляет не более одной 💡 — только в начале текста; остальные вхождения удаляет.
 * Концовку оформляют другие эмодзи (задаёт модель по промпту).
 */
export function normalizeBulbOnlyAtStart(body: string): string {
  const t = body.trim()
  if (!t) return body
  const hadLeading = t.startsWith(BULB)
  const noBulbs = t.replace(/💡/gu, '')
  const collapsed = noBulbs
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .trim()
  if (!collapsed) return hadLeading ? BULB : t
  if (hadLeading) {
    const parts = collapsed.split(/\r?\n/)
    const head = `${BULB} ${parts[0] ?? ''}`.trim()
    return parts.length > 1 ? `${head}\n${parts.slice(1).join('\n')}` : head
  }
  return collapsed
}

/**
 * Обходит многострочные блоки «Комментарий_перевод:» и «Комментарий:» в ответе перевода.
 */
export function normalizeTranslationBulbEmojisInContent(content: string): string {
  if (!content?.trim()) return content
  if (!/💡/.test(content)) return content

  const lines = content.split(/\r?\n/)
  const out: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''

    const sup = /^(\s*(?:\d+[\.)]\s*)*)(Комментарий_перевод)\s*:\s*(.*)$/i.exec(line)
    if (sup) {
      const indent = sup[1] ?? ''
      const blockLines: string[] = [sup[3] ?? '']
      i++
      while (i < lines.length) {
        const next = lines[i] ?? ''
        if (/^\s*(?:\d+[\.)]\s*)*Комментарий(?!_)\s*:/i.test(next)) break
        if (
          /^\s*(?:\d+[\.)]\s*)*(Ошибки|Скажи|Повтори|Repeat|Say|Переведи|Следующ)/i.test(next)
        ) {
          break
        }
        blockLines.push(next)
        i++
      }
      const normalized = normalizeBulbOnlyAtStart(blockLines.join('\n'))
      out.push(`${indent}Комментарий_перевод: ${normalized}`)
      continue
    }

    const com = /^(\s*(?:\d+[\.)]\s*)*)(Комментарий)(?!_)\s*:\s*(.*)$/i.exec(line)
    if (com) {
      const indent = com[1] ?? ''
      const blockLines: string[] = [com[3] ?? '']
      i++
      while (i < lines.length) {
        const next = lines[i] ?? ''
        if (
          /^\s*(?:\d+[\.)]\s*)*(Комментарий_перевод|Ошибки|Скажи|Повтори|Repeat|Say|Переведи|Следующ|Комментарий)\s*:/i.test(
            next
          )
        ) {
          break
        }
        blockLines.push(next)
        i++
      }
      const normalized = normalizeBulbOnlyAtStart(blockLines.join('\n'))
      out.push(`${indent}Комментарий: ${normalized}`)
      continue
    }

    out.push(line)
    i++
  }

  return out.join('\n')
}
