/** Тело обычного «Комментарий:» / «Комментарий_ошибка:» до следующего служебного заголовка. */
export function extractTranslationDrillPlainCommentBody(raw: string): string {
  const t = raw.trim()
  const block =
    /(?:^|\n)\s*Комментарий(?:_ошибка)?\s*:\s*([\s\S]*?)(?=\n\s*(?:[\s\-•\d.)]*)(?:(?:Переведи|Переведите)(?:\s+далее)?\s*:|(?:Скажи|Say)\s*:|Ошибки\s*:|Комментарий_перевод\s*:))/im.exec(
      t
    )
  if (block?.[1]) return block[1].trim()
  const oneLine = /(?:^|\n)\s*Комментарий(?:_ошибка)?\s*:\s*([^\n]+)/im.exec(t)
  return (oneLine?.[1] ?? '').trim()
}

/**
 * Текст после «Комментарий:» в drill перевода — похвала, а не коррекция.
 * Общий для API-нормализации и UI (`commentToneForContent`).
 */
export function translationDrillCommentBodyLooksLikePraise(commentBody: string): boolean {
  const normalized = commentBody.trim()
  if (!normalized) return false
  if (
    /(?:проверь|исправ|ошиб|неверн|неправил|нужн|орфограф|лексическ|грамматик|spelling|word choice|verb form)/i.test(
      normalized
    )
  ) {
    return false
  }
  const praisePatterns = [
    /^(Отлично|Молодец|Верно|Хорошо|Супер|Правильно)(?:[\s!,.?:;"'»)]|$)/i,
    /^Ты\s+правильно(?:\s|$|[!.?,;:])/i,
    /^Ты\s+верно(?:\s|$|[!.?,;:])/i,
    /^Вы\s+правильно(?:\s|$|[!.?,;:])/i,
    /^Вы\s+верно(?:\s|$|[!.?,;:])/i,
    /^Круто(?=[\s!,.?:;"'»)]|$)/iu,
    /^Замечаю(?=[\s!,.?:;"'»)]|$)/iu,
    /^Хорошая(?=[\s!,.?:;"'»)]|$)/iu,
    /^Блестяще(?=[\s!,.?:;"'»)]|$)/iu,
    /^Вы\s+отлично(?=[\s!,.?:;"'»)]|$)/iu,
    /^Отличная\s+работа(?=[\s!,.?:;"'»)]|$)/iu,
  ]
  return praisePatterns.some((p) => p.test(normalized))
}
