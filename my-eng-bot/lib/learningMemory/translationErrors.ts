/** Lightweight extract of translation ERROR protocol blocks (no Chat UI deps). */
export function extractTranslationErrorBlocks(text: string): {
  errorsBlock: string | null
  sayBlock: string | null
} {
  const errorsMatch = /(?:^|\n)\s*(?:\d+\)\s*)?Ошибки\s*:\s*([\s\S]*?)(?=(?:\n\s*(?:\d+\)\s*)?(?:Скажи|Say|Комментарий|Переведи)\s*:)|$)/i.exec(
    text
  )
  const sayMatch = /(?:^|\n)\s*(?:\d+\)\s*)?(?:Скажи|Say)\s*:\s*([^\n]+)/i.exec(text)
  const errorsBlock = errorsMatch?.[1]?.trim() || null
  const sayBlock = sayMatch?.[1]?.trim() || null
  if (!errorsBlock || /^[-—–•.\s]*$/.test(errorsBlock)) {
    return { errorsBlock: null, sayBlock }
  }
  return { errorsBlock, sayBlock }
}
