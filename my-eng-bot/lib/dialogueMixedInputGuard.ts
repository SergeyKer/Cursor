export type DialogueMixedInputValidationReason =
  | 'missing_comment_or_repeat'
  | 'repeat_contains_cyrillic'
  | 'missing_comment_translation'

function hasMixedLatinAndCyrillic(text: string): boolean {
  return /[A-Za-z]/.test(text) && /[А-Яа-яЁё]/.test(text)
}

function extractCommentAndRepeat(content: string): { comment: string | null; repeat: string | null } {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:ai|assistant)\s*:\s*/i, '').trim())
    .filter(Boolean)
  const commentLine = lines.find((line) => /^Комментарий\s*:/i.test(line)) ?? null
  const repeatLine = lines.find((line) => /^(Скажи|Say)\s*:/i.test(line)) ?? null
  return {
    comment: commentLine ? commentLine.replace(/^Комментарий\s*:\s*/i, '').trim() : null,
    repeat: repeatLine ? repeatLine.replace(/^(Скажи|Say)\s*:\s*/i, '').trim() : null,
  }
}

function hasCommentTranslation(comment: string, userText: string): boolean {
  const ruTokens = Array.from(new Set((userText.match(/[А-Яа-яЁё]+/g) ?? []).map((t) => t.toLowerCase()).filter((t) => t.length >= 2)))
  if (ruTokens.length === 0) return false
  const lowerComment = comment.toLowerCase()
  const mentionsRuToken = ruTokens.some((token) => lowerComment.includes(token))
  if (!mentionsRuToken) return false
  const hasEnglish = /[A-Za-z]/.test(comment)
  if (!hasEnglish) return false
  return /(?:=|->|means|означает|это\s+|—|–|-)/i.test(comment)
}

export function validateDialogueMixedInputOutput(params: {
  userText?: string
  content: string
}): { ok: boolean; reason?: DialogueMixedInputValidationReason } {
  const userText = params.userText?.trim() ?? ''
  if (!userText || !hasMixedLatinAndCyrillic(userText)) return { ok: true }

  const { comment, repeat } = extractCommentAndRepeat(params.content)
  if (!repeat || !comment) {
    return { ok: false, reason: 'missing_comment_or_repeat' }
  }

  if (/[А-Яа-яЁё]/.test(repeat) || !/[A-Za-z]/.test(repeat)) {
    return { ok: false, reason: 'repeat_contains_cyrillic' }
  }

  if (!hasCommentTranslation(comment, userText)) {
    return { ok: false, reason: 'missing_comment_translation' }
  }

  return { ok: true }
}

