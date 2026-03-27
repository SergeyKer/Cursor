const RUSSIAN_LETTERS_RE = /[А-Яа-яЁё]/

const AWKWARD_COMMENT_PATTERNS: RegExp[] = [
  /вы\s+уже\s+пробовали\s+море/i,
  /вы\s+уже\s+попробовали\s+море/i,
  /пробовали\s+море/i,
  /пробовать\s+море/i,
  /вы\s+уже\s+были\s+море/i,
  /вы\s+уже\s+ходили\s+море/i,
  /вы\s+уже\s+ездили\s+море/i,
  /вы\s+уже\s+отдыхали\s+море/i,
  /вы\s+уже\s+купались\s+море/i,
  /вы\s+уже\s+плавали\s+море/i,
]

function stripAssistantPrefix(line: string): string {
  return line.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim()
}

function normalizeLine(line: string): string {
  return stripAssistantPrefix(line).replace(/\s+/g, ' ').trim()
}

function getDialogueLines(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => normalizeLine(line))
    .filter(Boolean)
}

function hasAwkwardRussianComment(text: string): boolean {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return false
  return AWKWARD_COMMENT_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function validateDialogueRussianNaturalness(params: {
  content: string
  mode?: string
}): { ok: boolean; reason?: 'russian_naturalness_mismatch' } {
  if (params.mode !== 'dialogue') return { ok: true }

  const lines = getDialogueLines(params.content)
  const commentLine = lines.find((line) => /^\s*Комментарий\s*:/i.test(line))
  if (commentLine) {
    const commentBody = commentLine.replace(/^\s*Комментарий\s*:\s*/i, '').trim()
    if (!RUSSIAN_LETTERS_RE.test(commentBody)) {
      return { ok: false, reason: 'russian_naturalness_mismatch' }
    }
    if (hasAwkwardRussianComment(commentBody)) {
      return { ok: false, reason: 'russian_naturalness_mismatch' }
    }
  }

  for (const line of lines) {
    if (!RUSSIAN_LETTERS_RE.test(line)) continue
    if (/^\s*Комментарий\s*:/i.test(line)) continue
    if (/^\s*(Повтори|Repeat|Say)\s*:/i.test(line)) continue
    return { ok: false, reason: 'russian_naturalness_mismatch' }
  }

  return { ok: true }
}
