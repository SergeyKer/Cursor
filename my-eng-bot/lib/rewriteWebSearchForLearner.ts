import type { NextRequest } from 'next/server'
import type { Audience, LevelId } from '@/lib/types'
import { callProviderChat } from '@/lib/callProviderChat'
import { buildCefrPromptBlock } from '@/lib/cefr/cefrSpec'

function buildRewriteDetailInstruction(detailLevel: 0 | 1 | 2): string {
  if (detailLevel === 2) {
    return 'Length: up to two short paragraphs; still stay inside the CEFR ceiling above.'
  }
  if (detailLevel === 1) {
    return 'Length: about 4–6 short sentences.'
  }
  return 'Length: 2–4 very short sentences only.'
}

function buildEnglishAudienceHint(audience: Audience): string {
  return audience === 'child'
    ? 'Audience: CHILD. Warm, friendly, concrete wording; short lines; no formal news-anchor tone; avoid frightening framing.'
    : 'Audience: ADULT. Neutral, respectful adult tone; clear and concise; not childish.'
}

/**
 * Второй проход после web-search: переписывает черновик под уровень и аудиторию.
 * Не добавляет URL, маркеры (i), приветствия.
 */
export async function rewriteWebSearchAnswerForLearner(params: {
  provider: 'openai' | 'openrouter'
  req: NextRequest
  rawAnswer: string
  level: LevelId
  audience: Audience
  detailLevel: 0 | 1 | 2
  userQuery: string
  /** Для level === "all": короткие образцы речи пользователя (латиница), чтобы не уходить сложнее их. */
  learnerEnglishSamples?: string[]
}): Promise<string | null> {
  const raw = params.rawAnswer.trim()
  if (!raw) return null

  const cefrBlock = buildCefrPromptBlock({
    level: params.level,
    audience: params.audience,
    mode: 'communication',
  })

  const adaptiveBlock =
    params.level === 'all'
      ? [
          'CEFR mode is adaptive ("all"). Infer the learner\'s English level ONLY from the recent user samples below.',
          'Match their apparent vocabulary and sentence length; do not jump to noticeably harder English than their samples.',
          'Recent user English samples (may be empty):',
          params.learnerEnglishSamples?.length
            ? params.learnerEnglishSamples.map((s, i) => `${i + 1}. ${s}`).join('\n')
            : '(none — keep plain simple English.)',
        ].join('\n')
      : ''

  const system = [
    'You rewrite web-search summaries for an English-learning chat app.',
    'Keep the same core facts, names, numbers, and dates. Do not invent new facts.',
    'Simplify vocabulary and grammar to fit the learner profile below.',
    'Output plain text only: no markdown, no bullet labels like "National News", no URLs, no source names, no "(i)" prefix, no greetings.',
    cefrBlock,
    buildEnglishAudienceHint(params.audience),
    buildRewriteDetailInstruction(params.detailLevel),
    adaptiveBlock,
  ]
    .filter(Boolean)
    .join('\n\n')

  const user = `User question:\n${params.userQuery.trim() || '(no question)'}\n\nDraft answer to rewrite:\n${raw}`

  const maxTokens = params.detailLevel === 2 ? 480 : params.detailLevel === 1 ? 340 : 240

  const res = await callProviderChat({
    provider: params.provider,
    req: params.req,
    apiMessages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    maxTokens,
  })

  if (!res.ok) return null
  const out = res.content.trim().replace(/^\(i\)\s*/i, '').trim()
  return out || null
}

export function collectLearnerEnglishSamples(messages: Array<{ role: string; content: string }>, maxSamples = 4): string[] {
  const out: string[] = []
  for (let i = messages.length - 1; i >= 0 && out.length < maxSamples; i--) {
    const m = messages[i]
    if (m?.role !== 'user' || typeof m.content !== 'string') continue
    const t = m.content.replace(/\s+/g, ' ').trim()
    if (!/[A-Za-z]/.test(t)) continue
    const short = t.length > 220 ? `${t.slice(0, 217)}...` : t
    out.push(short)
  }
  return out.reverse()
}
