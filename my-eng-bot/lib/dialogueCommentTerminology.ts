export function normalizeDialogueCommentTerminology(content: string): string {
  const lines = content.split(/\r?\n/)
  const commentIndex = lines.findIndex((line) => /^Комментарий\s*:/i.test(line.trim()))
  if (commentIndex < 0) return content

  const raw = lines[commentIndex] ?? ''
  const body = raw.replace(/^Комментарий\s*:\s*/i, '').trim()
  if (!body) return content

  const hasGrammarContext = /(?:tense|article|врем|артикл|грамматик)/i.test(body)
  let normalized = body
    .replace(/\barticles\b/gi, 'артикли')
    .replace(/\barticle\b/gi, 'артикль')
    .replace(/\btense\b/gi, 'время')

  if (hasGrammarContext) {
    normalized = normalized
      .replace(/(^|\s)с\s+время(?:м)?\s+и\s+стат(?:ей|ьи|ьями|ья)(?=$|[\s,.;:!?])/gi, '$1со временем и артиклями')
      .replace(/(^|\s)с\s+время(?:м)?\s+и\s+артикл(?:ей|ями|и)?(?=$|[\s,.;:!?])/gi, '$1со временем и артиклями')
      .replace(/(^|\s)и\s+стат(?:ей|ьи|ьями|ья)(?=$|[\s,.;:!?])/gi, '$1и артиклями')
  }

  if (normalized === body) return content
  lines[commentIndex] = `Комментарий: ${normalized}`.replace(/\s+/g, ' ').trim()
  return lines.join('\n').trim()
}
